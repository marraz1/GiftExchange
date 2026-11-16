import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { claimWish, unclaimWish } from "@/app/actions/participant";
import { WishesForm } from "./WishesForm";
import { Flash } from "@/components/Flash";
import { SubmitButton } from "@/components/SubmitButton";
import type { Wish } from "@/lib/db";
import { THEMES, formatDate, formatMoney, isPast, MAX_WISHES, safeUrl } from "@/lib/format";
import { loadParticipantView } from "@/lib/queries";

export const metadata: Metadata = { title: "Mano norai", robots: { index: false, follow: false } };

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ m?: string; t?: string }>;
};

function WishView({ w }: { w: Pick<Wish, "title" | "url" | "note"> }) {
  const url = safeUrl(w.url);
  return (
    <>
      <span className="font-medium">{w.title}</span>
      {url ? (
        <>
          {" "}
          –{" "}
          <a href={url} target="_blank" rel="noopener noreferrer nofollow" className="text-ice underline">
            nuoroda
          </a>
        </>
      ) : null}
      {w.note ? <span className="block text-sm text-muted">{w.note}</span> : null}
    </>
  );
}

export default async function ParticipantPage({ params, searchParams }: Props) {
  const { token } = await params;
  const sp = await searchParams;
  const view = await loadParticipantView(token);
  if (!view) notFound();
  const { event, participant, own, receiver, celebrant } = view;
  const theme = THEMES[event.type];
  const past = isPast(event);
  const money = formatMoney(event.budgetAmount, event.currency);
  const birthday = event.type === "birthday";
  const isGuest = birthday && participant.role === "member";
  const max = MAX_WISHES[event.type];
  const locked =
    past || (!birthday && event.status === "drawn") || (birthday && Boolean(event.sharedAt));

  return (
    <div className="space-y-6">
      <section className={`card border ${theme.ring}`}>
        <p className={`text-sm font-semibold ${theme.text}`}>
          {theme.emoji} {event.title}
        </p>
        <h1 className="mt-2 text-3xl font-bold break-words sm:text-4xl">Labas, {participant.name}!</h1>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          {money ? (
            <div>
              <dt className="text-muted">{birthday ? "Suma vienam" : "Dovanos suma"}</dt>
              <dd className="font-semibold">{money}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-muted">Data</dt>
            <dd className="font-semibold">{formatDate(event.exchangeDate)}</dd>
          </div>
          {event.wishlistDeadline ? (
            <div>
              <dt className="text-muted">Norai iki</dt>
              <dd className="font-semibold">{formatDate(event.wishlistDeadline)}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-muted">Organizatorius</dt>
            <dd className="font-semibold">{event.hostName}</dd>
          </div>
        </dl>
        {event.message ? (
          <p className="mt-4 whitespace-pre-wrap rounded-lg bg-void/60/5 p-3 text-sm text-ink/85">{event.message}</p>
        ) : null}
      </section>

      <Flash m={sp.m} t={sp.t} />

      {receiver ? (
        <section className="card relative overflow-hidden text-center">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -top-32 mx-auto h-72 w-72 rounded-full opacity-30 blur-3xl"
            style={{ background: "conic-gradient(from 90deg, var(--color-ice), var(--color-violet), var(--color-rose), var(--color-ice))" }}
          />
          <p className="relative text-sm text-muted">Jūs dovanojate</p>
          <p className="reveal aurora-text font-display relative my-4 text-[clamp(2.5rem,12vw,4.5rem)] leading-none font-bold break-words">
            {receiver.name}
          </p>
          <p className="relative text-sm text-muted">🤫 Niekam nesakykite</p>
          <div className="relative mt-8 rounded-2xl border border-line bg-void/50 p-5 text-left">
            <h2 className="mb-3 text-sm font-bold">{receiver.name} norai</h2>
            {receiver.wishes.length ? (
              <ol className="list-decimal space-y-3 pl-5 marker:text-muted">
                {receiver.wishes.map((w) => (
                  <li key={w.id}>
                    <WishView w={w} />
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted">Norų nenurodė – teks sugalvoti patiems 🙂</p>
            )}
          </div>
        </section>
      ) : null}

      {isGuest ? (
        <section className="card">
          {!event.sharedAt || !celebrant ? (
            <p className="text-muted">Jubiliato norų sąrašas dar neparuoštas. Gausite laišką, kai jis bus paruoštas.</p>
          ) : (
            <>
              <h2 className="mb-1 text-lg font-semibold">🎂 {celebrant.name} norai</h2>
              <p className="mb-4 text-sm text-muted">
                Pasirinkite, ką dovanosite – kiti svečiai matys, kad dovana užimta. {celebrant.name} to nematys.
              </p>
              <ul className="space-y-3">
                {celebrant.wishes.map((w) => {
                  const mine = w.claimedById === participant.id;
                  const taken = w.claimedById && !mine;
                  return (
                    <li
                      key={w.id}
                      className={`flex flex-col gap-2 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
                        mine ? "border-mint/50 bg-mint/10" : taken ? "border-line bg-void/60/5 opacity-60" : "border-line"
                      }`}
                    >
                      <div className={taken ? "line-through" : ""}>
                        <WishView w={w} />
                      </div>
                      {past ? null : mine ? (
                        <form action={unclaimWish}>
                          <input type="hidden" name="token" value={token} />
                          <input type="hidden" name="wishId" value={w.id} />
                          <SubmitButton className="btn-secondary">✓ Jūsų · atšaukti</SubmitButton>
                        </form>
                      ) : taken ? (
                        <span className="text-sm text-muted">Jau pasirinkta</span>
                      ) : (
                        <form action={claimWish}>
                          <input type="hidden" name="token" value={token} />
                          <input type="hidden" name="wishId" value={w.id} />
                          <SubmitButton className={`btn ${theme.btn}`}>Dovanosiu aš</SubmitButton>
                        </form>
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>
      ) : (
        <section className="card">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Mano norai</h2>
            {participant.completedAt ? (
              <span className="rounded-full bg-mint/15 px-3 py-1 text-xs font-semibold text-mint">✅ Baigta</span>
            ) : null}
          </div>
          {locked ? (
            own.length ? (
              <ol className="list-decimal space-y-2 pl-5">
                {own.map((w) => (
                  <li key={w.id}>
                    <WishView w={w} />
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted">Norų nenurodėte.</p>
            )
          ) : (
            <WishesForm
              key={`${sp.m ?? ""}-${participant.completedAt?.getTime() ?? 0}`}
              token={token}
              max={max}
              wishes={own}
              completed={Boolean(participant.completedAt)}
              birthday={birthday}
              btnClass={theme.btn}
            />
          )}
        </section>
      )}
    </div>
  );
}
