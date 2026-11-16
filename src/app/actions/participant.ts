"use server";

import { and, eq, isNull } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db, participants, wishes } from "@/lib/db";
import { isPast, MAX_WISHES } from "@/lib/format";
import { maybeNotifyAllDone } from "@/lib/mailers";
import { getParticipantByToken } from "@/lib/queries";
import { str, wishSchema } from "@/lib/validation";

function back(token: string, msg: string, kind: "ok" | "err" = "ok"): never {
  redirect(`/p/${token}?${new URLSearchParams({ m: msg, t: kind })}`);
}

async function requireParticipant(fd: FormData) {
  const token = str(fd, "token");
  const found = await getParticipantByToken(token);
  if (!found) notFound();
  if (isPast(found.event)) back(token, "Proga jau įvyko – keitimai nebegalimi.", "err");
  return { token, ...found };
}

export type WishesState = { error: string; values: Record<string, string> } | null;

export async function saveWishes(_prev: WishesState, fd: FormData): Promise<WishesState> {
  const { token, event, participant } = await requireParticipant(fd);
  const values: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string") values[k] = v;
  const invalid = (error: string): WishesState => ({ error, values });
  const complete = str(fd, "intent") === "complete";

  if (event.type === "birthday" && participant.role !== "celebrant")
    back(token, "Svečiai norų nerašo – pasirinkite dovaną iš sąrašo.", "err");
  if (event.type !== "birthday" && event.status === "drawn")
    back(token, "Burtai jau ištraukti – norų keisti nebegalima.", "err");
  if (event.type === "birthday" && event.sharedAt)
    back(token, "Norų sąrašas jau išsiųstas svečiams – keisti nebegalima.", "err");

  const max = MAX_WISHES[event.type];
  const items: Array<{ title: string; url: string | null; note: string | null }> = [];
  for (let i = 1; i <= max; i++) {
    const w = wishSchema.safeParse({
      title: str(fd, `title_${i}`),
      url: str(fd, `url_${i}`),
      note: str(fd, `note_${i}`),
    });
    if (!w.success) return invalid(`${i} noras: ${w.error.issues[0].message}`);
    if (!w.data.title) {
      if (w.data.url || w.data.note) return invalid(`${i} noras: įrašykite pavadinimą`);
      continue;
    }
    items.push(w.data);
  }
  if (complete && items.length === 0) return invalid("Įrašykite bent vieną norą.");

  await db().transaction(async (tx) => {
    await tx.delete(wishes).where(eq(wishes.participantId, participant.id));
    if (items.length)
      await tx
        .insert(wishes)
        .values(items.map((w, i) => ({ ...w, participantId: participant.id, position: i + 1 })));
    if (complete && !participant.completedAt)
      await tx.update(participants).set({ completedAt: new Date() }).where(eq(participants.id, participant.id));
    if (!complete && items.length === 0 && participant.completedAt)
      await tx.update(participants).set({ completedAt: null }).where(eq(participants.id, participant.id));
  });

  if (complete) await maybeNotifyAllDone(event.id);
  back(token, complete ? "Ačiū! Jūsų norai išsaugoti ir pažymėta, kad baigėte. 🎉" : "Išsaugota.");
}

async function requireGuest(fd: FormData) {
  const ctx = await requireParticipant(fd);
  const { token, event, participant } = ctx;
  if (event.type !== "birthday" || participant.role !== "member" || !event.sharedAt)
    back(token, "Šis veiksmas negalimas.", "err");
  const [celebrant] = await db()
    .select()
    .from(participants)
    .where(and(eq(participants.eventId, event.id), eq(participants.role, "celebrant")));
  if (!celebrant) back(token, "Nėra jubiliato.", "err");
  return { ...ctx, celebrant };
}

export async function claimWish(fd: FormData) {
  const { token, participant, celebrant } = await requireGuest(fd);
  const res = await db()
    .update(wishes)
    .set({ claimedById: participant.id, claimedAt: new Date() })
    .where(
      and(eq(wishes.id, str(fd, "wishId")), eq(wishes.participantId, celebrant.id), isNull(wishes.claimedById)),
    )
    .returning({ id: wishes.id });
  if (res.length === 0) back(token, "Šią dovaną jau kažkas pasirinko.", "err");
  await db().update(participants).set({ completedAt: new Date() }).where(eq(participants.id, participant.id));
  back(token, "Dovana rezervuota jums! 🎁");
}

export async function unclaimWish(fd: FormData) {
  const { token, participant, celebrant } = await requireGuest(fd);
  await db()
    .update(wishes)
    .set({ claimedById: null, claimedAt: null })
    .where(
      and(
        eq(wishes.id, str(fd, "wishId")),
        eq(wishes.participantId, celebrant.id),
        eq(wishes.claimedById, participant.id),
      ),
    );
  const [still] = await db()
    .select({ id: wishes.id })
    .from(wishes)
    .where(eq(wishes.claimedById, participant.id))
    .limit(1);
  if (!still) await db().update(participants).set({ completedAt: null }).where(eq(participants.id, participant.id));
  back(token, "Rezervacija atšaukta.");
}
