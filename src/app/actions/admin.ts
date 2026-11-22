"use server";

import { and, eq, sql } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { assignments, db, events, participants, type Event } from "@/lib/db";
import { drawCycle, MIN_DRAW_PARTICIPANTS } from "@/lib/draw";
import { sendMail } from "@/lib/email/send";
import { drawResetMail } from "@/lib/email/templates";
import { isPast } from "@/lib/format";
import { maybeNotifyAllDone, sendReminders, sendStageMail, sendStageMails, type BulkResult } from "@/lib/mailers";
import { getEventByAdminToken, participantsOf, recentEmails } from "@/lib/queries";
import {
  emailSchema,
  eventDetailsSchema,
  findDuplicates,
  MAX_PARTICIPANTS,
  nameSchema,
  str,
} from "@/lib/validation";

function back(token: string, msg: string, kind: "ok" | "err" = "ok"): never {
  redirect(`/admin/${token}?${new URLSearchParams({ m: msg, t: kind })}`);
}

async function requireEvent(fd: FormData, opts: { allowPast?: boolean } = {}) {
  const token = str(fd, "token");
  const event = await getEventByAdminToken(token);
  if (!event) notFound();
  if (!opts.allowPast && isPast(event)) back(token, "Proga jau įvyko – keitimai nebegalimi.", "err");
  return { token, event };
}

function bulkMsg(prefix: string, r: BulkResult): string {
  if (r.sent === 0 && r.failed === 0) return `${prefix}: nėra kam siųsti.`;
  return `${prefix}: išsiųsta ${r.sent}${r.failed ? `, nepavyko ${r.failed} (žr. sąrašą)` : ""}.`;
}

function assertNotDrawn(token: string, event: Event) {
  if (event.status === "drawn") back(token, "Burtai jau ištraukti – dalyvių keisti nebegalima.", "err");
}

export async function sendInvites(fd: FormData) {
  const { token, event } = await requireEvent(fd);
  const list = (await participantsOf(event.id)).filter((p) => {
    if (p.invitedAt) return false;
    if (event.type === "birthday") return p.role === "celebrant" || Boolean(event.sharedAt);
    return event.status !== "drawn";
  });
  const r = await sendStageMails(event, list);
  back(token, bulkMsg("Kvietimai", r), r.failed ? "err" : "ok");
}

export async function resendOne(fd: FormData) {
  const { token, event } = await requireEvent(fd);
  const pid = str(fd, "participantId");
  const [p] = await db()
    .select()
    .from(participants)
    .where(and(eq(participants.id, pid), eq(participants.eventId, event.id)));
  if (!p) back(token, "Dalyvis nerastas.", "err");
  const recent =
    (await recentEmails({ participantId: p.id, kind: "invite" })) +
    (await recentEmails({ participantId: p.id, kind: "result" })) +
    (await recentEmails({ participantId: p.id, kind: "wishlist" }));
  if (recent >= 3) back(token, `${p.name}: per daug laiškų per valandą. Nukopijuokite nuorodą ir persiųskite patys.`, "err");
  const r = await sendStageMail(event, p);
  back(token, r.ok ? `Laiškas išsiųstas: ${p.name}` : `Nepavyko išsiųsti (${p.name}): ${r.error}`, r.ok ? "ok" : "err");
}

export async function addParticipant(fd: FormData) {
  const { token, event } = await requireEvent(fd);
  assertNotDrawn(token, event);
  const name = nameSchema.safeParse(str(fd, "name"));
  const email = emailSchema.safeParse(str(fd, "email"));
  if (!name.success) back(token, name.error.issues[0].message, "err");
  if (!email.success) back(token, email.error.issues[0].message, "err");
  const existing = await participantsOf(event.id);
  if (existing.length >= MAX_PARTICIPANTS) back(token, `Daugiausia ${MAX_PARTICIPANTS} dalyvių.`, "err");
  const dups = findDuplicates([...existing, { name: name.data, email: email.data }]);
  if (dups.length) back(token, dups[0], "err");
  await db().insert(participants).values({ eventId: event.id, name: name.data, email: email.data });
  // A new person means "everyone is done" may no longer hold.
  await db().update(events).set({ allDoneNotifiedAt: null }).where(eq(events.id, event.id));
  back(token, `Pridėta: ${name.data}. Nepamirškite išsiųsti kvietimo.`);
}

export async function removeParticipant(fd: FormData) {
  const { token, event } = await requireEvent(fd);
  assertNotDrawn(token, event);
  const pid = str(fd, "participantId");
  const [p] = await db()
    .select()
    .from(participants)
    .where(and(eq(participants.id, pid), eq(participants.eventId, event.id)));
  if (!p) back(token, "Dalyvis nerastas.", "err");
  if (p.role === "celebrant") back(token, "Jubiliato pašalinti negalima.", "err");
  await db().delete(participants).where(eq(participants.id, p.id));
  await maybeNotifyAllDone(event.id);
  back(token, `Pašalinta: ${p.name}. Jo nuoroda nebegalioja.`);
}

export async function remind(fd: FormData) {
  const { token, event } = await requireEvent(fd);
  if (event.type !== "birthday") assertNotDrawn(token, event);
  if ((await recentEmails({ recipient: event.hostEmail, kind: "reminder_batch" })) >= 2)
    back(token, "Priminimai jau siųsti neseniai. Pabandykite po valandos.", "err");
  const r = await sendReminders(event);
  await db().execute(
    sql`insert into email_log (event_id, kind, recipient, status) values (${event.id}, 'reminder_batch', ${event.hostEmail}, 'sent')`,
  );
  back(token, bulkMsg("Priminimai", r), r.failed ? "err" : "ok");
}

export async function draw(fd: FormData) {
  const { token, event } = await requireEvent(fd);
  if (event.type === "birthday") back(token, "Gimtadienio progoje burtų nėra.", "err");
  assertNotDrawn(token, event);
  const list = await participantsOf(event.id);
  if (list.length < MIN_DRAW_PARTICIPANTS) back(token, `Burtams reikia bent ${MIN_DRAW_PARTICIPANTS} dalyvių.`, "err");
  const notDone = list.filter((p) => !p.completedAt);
  if (notDone.length && fd.get("force") !== "1")
    back(token, `Dar nebaigė: ${notDone.map((p) => p.name).join(", ")}.`, "err");

  const pairs = drawCycle(list.map((p) => p.id));
  const ok = await db().transaction(async (tx) => {
    const updated = await tx
      .update(events)
      .set({ status: "drawn", drawnAt: new Date(), updatedAt: new Date() })
      .where(and(eq(events.id, event.id), eq(events.status, "collecting")))
      .returning({ id: events.id });
    if (updated.length === 0) return false;
    await tx
      .insert(assignments)
      .values(pairs.map((p) => ({ eventId: event.id, giverId: p.giver, receiverId: p.receiver })));
    return true;
  });
  if (!ok) back(token, "Burtai jau ištraukti.", "err");

  const drawn = { ...event, status: "drawn" as const };
  const r = await sendStageMails(drawn, list);
  back(token, bulkMsg("Burtai ištraukti! Laiškai", r), r.failed ? "err" : "ok");
}

export async function resetDraw(fd: FormData) {
  const { token, event } = await requireEvent(fd);
  if (event.status !== "drawn") back(token, "Burtai dar netraukti.", "err");
  await db().transaction(async (tx) => {
    await tx.delete(assignments).where(eq(assignments.eventId, event.id));
    await tx
      .update(events)
      .set({ status: "collecting", drawnAt: null, updatedAt: new Date() })
      .where(eq(events.id, event.id));
  });
  const list = await participantsOf(event.id);
  for (const p of list) await sendMail(drawResetMail(event, p), { kind: "reset", eventId: event.id, participantId: p.id });
  back(token, "Burtai atšaukti. Dalyviai informuoti. Galite traukti iš naujo.");
}

export async function shareWishlist(fd: FormData) {
  const { token, event } = await requireEvent(fd);
  if (event.type !== "birthday") back(token, "Tik gimtadienio progai.", "err");
  const list = await participantsOf(event.id);
  const celebrant = list.find((p) => p.role === "celebrant");
  if (!celebrant?.completedAt) back(token, "Jubiliatas dar nesurašė norų.", "err");
  const sharedAt = event.sharedAt ?? new Date();
  if (!event.sharedAt) await db().update(events).set({ sharedAt }).where(eq(events.id, event.id));
  const guests = list.filter((p) => p.role === "member" && !p.invitedAt);
  const r = await sendStageMails({ ...event, sharedAt }, guests);
  back(token, bulkMsg("Norų sąrašas svečiams", r), r.failed ? "err" : "ok");
}

export async function updateEvent(fd: FormData) {
  const { token, event } = await requireEvent(fd);
  const d = eventDetailsSchema.safeParse({
    title: str(fd, "title"),
    budgetAmount: str(fd, "budgetAmount"),
    currency: str(fd, "currency") || "EUR",
    exchangeDate: str(fd, "exchangeDate"),
    wishlistDeadline: str(fd, "wishlistDeadline"),
    message: str(fd, "message"),
  });
  if (!d.success) back(token, d.error.issues.map((i) => i.message).join(" "), "err");
  await db()
    .update(events)
    .set({ ...d.data, updatedAt: new Date() })
    .where(eq(events.id, event.id));
  back(token, "Progos informacija atnaujinta.");
}

export async function deleteEvent(fd: FormData) {
  const { event } = await requireEvent(fd, { allowPast: true });
  await db().delete(events).where(eq(events.id, event.id));
  redirect(`/?${new URLSearchParams({ m: "Proga ir visi jos duomenys ištrinti." })}`);
}

export async function setEditsAfterDraw(fd: FormData) {
  const { token, event } = await requireEvent(fd);
  if (event.type === "birthday") back(token, "Gimtadienio progoje burtų nėra.", "err");
  const allow = str(fd, "value") === "1";
  await db()
    .update(events)
    .set({ allowEditsAfterDraw: allow, updatedAt: new Date() })
    .where(eq(events.id, event.id));
  back(
    token,
    allow
      ? "Dalyviai gali keisti norus ir po burtų. Dovanotojas gaus laišką apie pakeitimus."
      : "Norų keitimas po burtų išjungtas.",
  );
}
