import { describe, expect, it } from "vitest";
import { makeToken, verifyToken } from "./tokens";

const id = "3f2b8c1e-1d2a-4b5c-9d8e-7f6a5b4c3d2e";

describe("tokens", () => {
  it("round-trips", () => {
    expect(verifyToken("participant", makeToken("participant", id))).toBe(id);
  });
  it("is bound to the kind", () => {
    expect(verifyToken("admin", makeToken("participant", id))).toBeNull();
  });
  it("rejects tampering", () => {
    const t = makeToken("admin", id);
    expect(verifyToken("admin", t.slice(0, -1) + (t.endsWith("A") ? "B" : "A"))).toBeNull();
    expect(verifyToken("admin", "3f2b8c1e-1d2a-4b5c-9d8e-7f6a5b4c3d2f" + t.slice(36))).toBeNull();
    expect(verifyToken("admin", "garbage")).toBeNull();
    expect(verifyToken("admin", "")).toBeNull();
  });
});
