import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { assignments, db, events, participants, type Event, type Participant } from "./db";
import { MAX_WISHES } from "./format";
import { adminLink, participantLink, participantsOf, wishesOf } from "./queries";
import { sendMail } from "./email/send";
import {
  allDoneMail,
  celebrantInviteMail,
  drawResultMail,
  guestWishlistMail,
  inviteMail,
  reminderMail,
} from "./email/templates";

export type BulkResult = { sent: number; failed: number };

async function markInvited(ids: string[]) {
  if (ids.length) await db().update(participants).set({ invitedAt: new Date() }).where(inArray(participants.id, ids));
}

/** The right "stage" email for one participant (invite / wishlist / draw result). */
export async function sendStageMail(event: Event, p: Participant): Promise<{ ok: boolean; error?: string }> {
  const link = participantLink(p.id);
  if (event.type === "birthday") {
    if (p.role === "celebrant") {
      const r = await sendMail(celebrantInviteMail(event, p, link, MAX_WISHES.birthday), {
        kind: "invite",
        eventId: event.id,
        participantId: p.id,
      });
      if (r.ok) await markInvited([p.id]);
      return r.ok ? { ok: true } : r;
    }
    if (!event.sharedAt) return { ok: false, error: "Norų sąrašas dar neišsiųstas svečiams" };
    const [celebrant] = await db()
      .select()
      .from(participants)
      .where(and(eq(participants.eventId, event.id), eq(participants.role, "celebrant")));
    if (!celebrant) return { ok: false, error: "Nėra jubiliato" };
    const w = await wishesOf(celebrant.id);
    const r = await sendMail(guestWishlistMail(event, p, celebrant.name, w, link), {
      kind: "wishlist",
      eventId: event.id,
      participantId: p.id,
    });
    if (r.ok) await markInvited([p.id]);
    return r.ok ? { ok: true } : r;
  }

  if (event.status === "drawn") {
    const [a] = await db()
      .select({ r: participants })
      .from(assignments)
      .innerJoin(participants, eq(participants.id, assignments.receiverId))
      .where(and(eq(assignments.eventId, event.id), eq(assignments.giverId, p.id)));
    if (!a) return { ok: false, error: "Nerasta pora" };
    const w = await wishesOf(a.r.id);
    const r = await sendMail(drawResultMail(event, p, a.r.name, w, link), {
      kind: "result",
      eventId: event.id,
      participantId: p.id,
    });
    return r.ok ? { ok: true } : r;
  }

  const r = await sendMail(inviteMail(event, p, link, MAX_WISHES[event.type]), {
    kind: "invite",
    eventId: event.id,
    participantId: p.id,
  });
  if (r.ok) await markInvited([p.id]);
  return r.ok ? { ok: true } : r;
}

export async function sendStageMails(event: Event, list: Participant[]): Promise<BulkResult> {
  let sent = 0;
  let failed = 0;
  for (const p of list) {
    const r = await sendStageMail(event, p);
    if (r.ok) sent++;
    else failed++;
  }
  return { sent, failed };
}

export async function sendReminders(event: Event): Promise<BulkResult> {
  const list = (await participantsOf(event.id)).filter(
    (p) => !p.completedAt && (event.type !== "birthday" || p.role === "celebrant"),
  );
  let sent = 0;
  let failed = 0;
  for (const p of list) {
    const r = await sendMail(reminderMail(event, p, participantLink(p.id)), {
      kind: "reminder",
      eventId: event.id,
      participantId: p.id,
    });
    if (r.ok) sent++;
    else failed++;
  }
  return { sent, failed };
}

/** Notify the host once when everyone (or the celebrant) is done. */
export async function maybeNotifyAllDone(eventId: string) {
  const list = await participantsOf(eventId);
  const [ev] = await db().select().from(events).where(eq(events.id, eventId));
  if (!ev || ev.allDoneNotifiedAt) return;
  const birthday = ev.type === "birthday";
  const done = birthday
    ? list.some((p) => p.role === "celebrant" && p.completedAt)
    : list.length > 0 && list.every((p) => p.completedAt);
  if (!done) return;
  const claimed = await db()
    .update(events)
    .set({ allDoneNotifiedAt: new Date() })
    .where(and(eq(events.id, eventId), isNull(events.allDoneNotifiedAt)))
    .returning({ id: events.id });
  if (claimed.length === 0) return;
  await sendMail(allDoneMail(ev, ev.hostEmail, adminLink(ev.id), birthday), { kind: "all_done", eventId });
}

export async function touchEvent(eventId: string) {
  await db().update(events).set({ updatedAt: sql`now()` }).where(eq(events.id, eventId));
}
