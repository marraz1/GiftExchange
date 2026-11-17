import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({ db: () => ({ insert: () => ({ values: async () => {} }) }), emailLog: {} }));

import { emailProvider, sendMail } from "./send";

const mail = { to: "ona@test.lt", subject: "Labas", html: "<p>Labas</p>", text: "Labas" };
const meta = { kind: "invite" };

describe("sendMail via Resend", () => {
  beforeEach(() => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_FROM", "Dovanos <dovanos@pavyzdys.lt>");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("prefers Resend when the key is set", () => {
    vi.stubEnv("GMAIL_USER", "x@gmail.com");
    vi.stubEnv("GMAIL_APP_PASSWORD", "abcd");
    expect(emailProvider()).toBe("resend");
  });

  it("posts the email to the Resend API", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: "1" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await sendMail(mail, meta)).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer re_test");
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({ from: "Dovanos <dovanos@pavyzdys.lt>", to: ["ona@test.lt"], subject: "Labas" });
  });

  it("retries once on 429", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 429 }))
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await sendMail(mail, meta)).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("reports Resend's error message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ message: "You can only send testing emails to your own email address" }), {
          status: 403,
        }),
      ),
    );
    const r = await sendMail(mail, meta);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("only send testing emails");
  });
});
