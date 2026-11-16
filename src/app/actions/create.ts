"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, events, participants } from "@/lib/db";
import { adminLink, recentEmails } from "@/lib/queries";
import { makeToken } from "@/lib/tokens";
import { sendMail } from "@/lib/email/send";
import { adminCreatedMail } from "@/lib/email/templates";
import {
  emailSchema,
  eventDetailsSchema,
  findDuplicates,
  MAX_PARTICIPANTS,
  nameSchema,
  parsePeople,
  str,
  type ParsedPerson,
} from "@/lib/validation";
import { MIN_DRAW_PARTICIPANTS } from "@/lib/draw";

export type CreateState = { errors: string[]; values: Record<string, string> } | null;

const typeSchema = z.enum(["christmas", "birthday", "custom"]);

export async function createEvent(_prev: CreateState, fd: FormData): Promise<CreateState> {
  const values: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string") values[k] = v;
  const errors: string[] = [];
  const fail = () => ({ errors, values });

  const type = typeSchema.safeParse(str(fd, "type"));
  if (!type.success) {
    errors.push("Pasirinkite progos tipą");
    return fail();
  }
  const hostName = nameSchema.safeParse(str(fd, "hostName"));
  const hostEmail = emailSchema.safeParse(str(fd, "hostEmail"));
  if (!hostName.success) errors.push(`Jūsų vardas: ${hostName.error.issues[0].message}`);
  if (!hostEmail.success) errors.push(`Jūsų el. paštas: ${hostEmail.error.issues[0].message}`);

  const details = eventDetailsSchema.safeParse({
    title: str(fd, "title"),
    budgetAmount: str(fd, "budgetAmount"),
    currency: str(fd, "currency") || "EUR",
    exchangeDate: str(fd, "exchangeDate"),
    wishlistDeadline: str(fd, "wishlistDeadline"),
    message: str(fd, "message"),
  });
  if (!details.success) errors.push(...details.error.issues.map((i) => i.message));

  const parsed = parsePeople(str(fd, "people"));
  errors.push(...parsed.errors);
  if (errors.length || !hostName.success || !hostEmail.success || !details.success) return fail();

  const host: ParsedPerson = { name: hostName.data, email: hostEmail.data };
  type NewP = ParsedPerson & { role: "member" | "celebrant"; isHost: boolean };
  const list: NewP[] = parsed.people.map((p) => ({ ...p, role: "member", isHost: false }));

  if (type.data === "birthday") {
    if (fd.get("celebrantIsHost") === "on") {
      list.unshift({ ...host, role: "celebrant", isHost: true });
    } else {
      const cn = nameSchema.safeParse(str(fd, "celebrantName"));
      const ce = emailSchema.safeParse(str(fd, "celebrantEmail"));
      if (!cn.success) errors.push(`Jubiliato vardas: ${cn.error.issues[0].message}`);
      if (!ce.success) errors.push(`Jubiliato el. paštas: ${ce.error.issues[0].message}`);
      if (cn.success && ce.success) list.unshift({ name: cn.data, email: ce.data, role: "celebrant", isHost: false });
      if (fd.get("hostParticipates") === "on") list.push({ ...host, role: "member", isHost: true });
    }
    if (list.filter((p) => p.role === "member").length < 1) errors.push("Pridėkite bent vieną svečią");
  } else {
    if (fd.get("hostParticipates") === "on") list.unshift({ ...host, role: "member", isHost: true });
    if (list.length < MIN_DRAW_PARTICIPANTS)
      errors.push(`Reikia bent ${MIN_DRAW_PARTICIPANTS} dalyvių (dabar ${list.length})`);
  }
  if (list.length > MAX_PARTICIPANTS) errors.push(`Daugiausia ${MAX_PARTICIPANTS} dalyvių`);
  errors.push(...findDuplicates(list));
  if (errors.length) return fail();

  if ((await recentEmails({ recipient: host.email, kind: "admin_created" })) >= 5) {
    errors.push("Per daug progų sukurta per pastarąją valandą. Pabandykite vėliau.");
    return fail();
  }

  const d = details.data;
  const eventId = await db().transaction(async (tx) => {
    const [ev] = await tx
      .insert(events)
      .values({
        type: type.data,
        title: d.title,
        hostName: host.name,
        hostEmail: host.email,
        budgetAmount: d.budgetAmount,
        currency: d.currency,
        exchangeDate: d.exchangeDate,
        wishlistDeadline: d.wishlistDeadline,
        message: d.message,
      })
      .returning({ id: events.id });
    await tx.insert(participants).values(list.map((p) => ({ ...p, eventId: ev.id })));
    return ev.id;
  });

  const [ev] = await db().select().from(events).where(eq(events.id, eventId));
  await sendMail(adminCreatedMail(ev, host.email, adminLink(eventId)), { kind: "admin_created", eventId });

  redirect(`/admin/${makeToken("admin", eventId)}?created=1`);
}
