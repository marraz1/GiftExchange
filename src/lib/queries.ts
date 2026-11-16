import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { assignments, db, emailLog, events, participants, wishes, type Event, type Participant, type Wish } from "./db";
import { makeToken, verifyToken } from "./tokens";
import { appUrl } from "./env";

export const adminLink = (eventId: string) => `${appUrl()}/admin/${makeToken("admin", eventId)}`;
export const participantLink = (participantId: string) => `${appUrl()}/p/${makeToken("participant", participantId)}`;

export async function getEventByAdminToken(token: string): Promise<Event | null> {
  const id = verifyToken("admin", token);
  if (!id) return null;
  const [ev] = await db().select().from(events).where(eq(events.id, id));
  return ev ?? null;
}

export type ParticipantRow = Participant & {
  wishCount: number;
  lastEmailStatus: string | null;
  lastEmailError: string | null;
};

export async function loadAdminView(token: string) {
  const event = await getEventByAdminToken(token);
  if (!event) return null;
  const rows = await db()
    .select({
      p: participants,
      wishCount: sql<number>`(select count(*)::int from ${wishes} w where w.participant_id = ${participants.id})`,
      lastEmailStatus: sql<string | null>`(select l.status from ${emailLog} l where l.participant_id = ${participants.id} order by l.created_at desc limit 1)`,
      lastEmailError: sql<string | null>`(select l.error from ${emailLog} l where l.participant_id = ${participants.id} order by l.created_at desc limit 1)`,
    })
    .from(participants)
    .where(eq(participants.eventId, event.id))
    .orderBy(sql`${participants.role} = 'celebrant' desc`, asc(participants.createdAt));
  const list: ParticipantRow[] = rows.map((r) => ({
    ...r.p,
    wishCount: r.wishCount,
    lastEmailStatus: r.lastEmailStatus,
    lastEmailError: r.lastEmailError,
  }));
  let claimed = 0;
  const celebrant = list.find((p) => p.role === "celebrant") ?? null;
  if (event.type === "birthday" && celebrant) {
    const [c] = await db()
      .select({ n: sql<number>`count(*)::int` })
      .from(wishes)
      .where(and(eq(wishes.participantId, celebrant.id), sql`${wishes.claimedById} is not null`));
    claimed = c?.n ?? 0;
  }
  return { event, participants: list, celebrant, claimed };
}

export async function getParticipantByToken(token: string) {
  const id = verifyToken("participant", token);
  if (!id) return null;
  const [row] = await db()
    .select({ p: participants, e: events })
    .from(participants)
    .innerJoin(events, eq(events.id, participants.eventId))
    .where(eq(participants.id, id));
  return row ? { participant: row.p, event: row.e } : null;
}

export async function wishesOf(participantId: string): Promise<Wish[]> {
  return db().select().from(wishes).where(eq(wishes.participantId, participantId)).orderBy(asc(wishes.position));
}

export async function loadParticipantView(token: string) {
  const base = await getParticipantByToken(token);
  if (!base) return null;
  const { participant, event } = base;
  const own = await wishesOf(participant.id);

  let receiver: { name: string; wishes: Wish[] } | null = null;
  if (event.type !== "birthday" && event.status === "drawn") {
    const [a] = await db()
      .select({ r: participants })
      .from(assignments)
      .innerJoin(participants, eq(participants.id, assignments.receiverId))
      .where(and(eq(assignments.eventId, event.id), eq(assignments.giverId, participant.id)));
    if (a) receiver = { name: a.r.name, wishes: await wishesOf(a.r.id) };
  }

  let celebrant: { name: string; wishes: Wish[] } | null = null;
  if (event.type === "birthday" && participant.role === "member") {
    const [c] = await db()
      .select()
      .from(participants)
      .where(and(eq(participants.eventId, event.id), eq(participants.role, "celebrant")));
    if (c) celebrant = { name: c.name, wishes: await wishesOf(c.id) };
  }

  return { event, participant, own, receiver, celebrant };
}

export async function participantsOf(eventId: string, ids?: string[]) {
  return db()
    .select()
    .from(participants)
    .where(ids ? and(eq(participants.eventId, eventId), inArray(participants.id, ids)) : eq(participants.eventId, eventId))
    .orderBy(asc(participants.createdAt));
}

/** Number of emails of a kind sent to a recipient/participant within the last hour. */
export async function recentEmails(where: { participantId?: string; recipient?: string; kind: string }) {
  const conds = [eq(emailLog.kind, where.kind), sql`${emailLog.createdAt} > now() - interval '1 hour'`];
  if (where.participantId) conds.push(eq(emailLog.participantId, where.participantId));
  if (where.recipient) conds.push(sql`lower(${emailLog.recipient}) = ${where.recipient.toLowerCase()}`);
  const [r] = await db()
    .select({ n: sql<number>`count(*)::int` })
    .from(emailLog)
    .where(and(...conds));
  return r?.n ?? 0;
}
