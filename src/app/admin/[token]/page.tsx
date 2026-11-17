import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  addParticipant,
  deleteEvent,
  draw,
  remind,
  removeParticipant,
  resendOne,
  resetDraw,
  sendInvites,
  shareWishlist,
  updateEvent,
} from "@/app/actions/admin";
import { CopyButton } from "@/components/CopyButton";
import { Flash } from "@/components/Flash";
import { ProgressRing } from "@/components/ProgressRing";
import { Step } from "@/components/Step";
import { SubmitButton } from "@/components/SubmitButton";
import { emailConfigured } from "@/lib/email/send";
import { MIN_DRAW_PARTICIPANTS } from "@/lib/draw";
import { THEMES, formatDate, formatMoney, isPast, MAX_WISHES } from "@/lib/format";
import { adminLink, loadAdminView, participantLink } from "@/lib/queries";

export const metadata: Metadata = { title: "Valdymas", robots: { index: false, follow: false } };

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ m?: string; t?: string; created?: string }>;
};

function Hidden({ token }: { token: string }) {
  return <input type="hidden" name="token" value={token} />;
}

export default async function AdminPage({ params, searchParams }: Props) {
  const { token } = await params;
  const sp = await searchParams;
  const view = await loadAdminView(token);
  if (!view) notFound();
  const { event, participants, celebrant, claimed } = view;
  const theme = THEMES[event.type];
  const birthday = event.type === "birthday";
  const drawn = event.status === "drawn";
  const past = isPast(event);
  const money = formatMoney(event.budgetAmount, event.currency);
  const members = participants.filter((p) => p.role === "member");
  const done = participants.filter((p) => p.completedAt).length;
  const notInvited = participants.filter((p) =>
    birthday ? !p.invitedAt && (p.role === "celebrant" || event.sharedAt) : !p.invitedAt,
  ).length;
  const allDone = participants.length > 0 && done === participants.length;
  const canEdit = !past && !drawn;

  const drawnAt = event.drawnAt
    ? new Intl.DateTimeFormat("lt-LT", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Vilnius" }).format(event.drawnAt)
    : "";
  const statusLabel = past ? "Įvyko" : drawn ? "Burtai ištraukti" : birthday && event.sharedAt ? "Sąrašas išsiųstas" : "Renkami norai";
  const ring = birthday
    ? { done: claimed, total: celebrant?.wishCount ?? 0, label: "Rezervuota dovanų" }
    : { done, total: participants.length, label: "Baigė pildyti" };

  return (
    <div className="space-y-6" style={{ "--accent": theme.stroke } as React.CSSProperties}>
      <Flash m={sp.m} t={sp.t} />
      {!emailConfigured() && process.env.VERCEL ? (
        <Flash t="err" m="El. laiškų siuntimas nesukonfigūruotas (GMAIL_USER / GMAIL_APP_PASSWORD). Kol kas nukopijuokite nuorodas ir išsiųskite patys." />
      ) : null}

      {sp.created ? (
        <div className={`card border ${theme.ring}`}>
          <h2 className="text-lg font-bold">Proga sukurta 🎉</h2>
          <p className="mt-2 text-sm text-muted">
            Tai jūsų valdymo puslapis. Išsaugokite nuorodą: išsiuntėme ją ir į {event.hostEmail}. Niekam jos
            neperduokite.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <code className="max-w-full truncate rounded-lg bg-void/80 px-3 py-2 text-xs text-muted">{adminLink(event.id)}</code>
            <CopyButton text={adminLink(event.id)} />
          </div>
        </div>
      ) : null}

      <section className="card relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full opacity-25 blur-3xl"
          style={{ background: theme.stroke }}
        />
        <div className="relative flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className={`text-sm font-semibold ${theme.text}`}>
              {theme.emoji} {theme.label}
              <span className="ml-2 rounded-full border border-line px-2 py-0.5 text-xs font-medium text-muted">{statusLabel}</span>
            </p>
            <h1 className="mt-2 text-2xl leading-tight font-bold sm:text-3xl">{event.title}</h1>
          </div>
          <ProgressRing {...ring} stroke={theme.stroke} />
        </div>
        <dl className="relative mt-6 grid grid-cols-3 gap-3 border-t border-line pt-5 text-sm">
          <div>
            <dt className="text-muted">Suma</dt>
            <dd className="mt-1 font-semibold">{money ?? "nenurodyta"}</dd>
          </div>
          <div>
            <dt className="text-muted">Data</dt>
            <dd className="mt-1 font-semibold">{formatDate(event.exchangeDate)}</dd>
          </div>
          <div>
            <dt className="text-muted">Norai iki</dt>
            <dd className="mt-1 font-semibold">{formatDate(event.wishlistDeadline) ?? "nenurodyta"}</dd>
          </div>
        </dl>
      </section>

      {past ? (
        <section className="card text-sm text-muted">
          Proga jau įvyko. Duomenys bus automatiškai ištrinti praėjus 30 dienų po progos datos.
        </section>
      ) : birthday ? (
        <section className="card">
          <ol>
            <Step n={1} title="Jubiliatas surašo norus" state={celebrant?.completedAt ? "done" : "active"}>
              {celebrant?.completedAt ? (
                <p>{celebrant.name} surašė {celebrant.wishCount} norus.</p>
              ) : celebrant?.invitedAt ? (
                <>
                  <p>Kvietimas išsiųstas. Laukiame, kol {celebrant.name} surašys norus.</p>
                  <form action={remind}>
                    <Hidden token={token} />
                    <SubmitButton className="btn-secondary">Priminti</SubmitButton>
                  </form>
                </>
              ) : (
                <form action={sendInvites}>
                  <Hidden token={token} />
                  <SubmitButton className={`btn ${theme.btn}`}>Siųsti kvietimą jubiliatui</SubmitButton>
                </form>
              )}
            </Step>
            <Step
              n={2}
              title="Sąrašas svečiams"
              state={event.sharedAt && notInvited === 0 ? "done" : celebrant?.completedAt ? "active" : "todo"}
            >
              {event.sharedAt && notInvited === 0 ? (
                <p>Sąrašas išsiųstas {members.length} svečiams.</p>
              ) : (
                <form action={shareWishlist}>
                  <Hidden token={token} />
                  <SubmitButton className={`btn ${theme.btn}`} disabled={!celebrant?.completedAt}>
                    {event.sharedAt ? `Siųsti naujiems (${notInvited})` : `Siųsti svečiams (${members.length})`}
                  </SubmitButton>
                </form>
              )}
            </Step>
            <Step n={3} title="Svečiai renkasi dovanas" state={event.sharedAt ? "active" : "todo"} last>
              <p>Rezervuota {claimed} iš {celebrant?.wishCount ?? 0}. Jubiliatas nemato, kas ką pasirinko.</p>
            </Step>
          </ol>
        </section>
      ) : (
        <section className="card">
          <ol>
            <Step n={1} title="Kvietimai" state={notInvited === 0 ? "done" : "active"}>
              {notInvited === 0 ? (
                <p>Visi {participants.length} dalyviai gavo kvietimus.</p>
              ) : (
                <form action={sendInvites}>
                  <Hidden token={token} />
                  <SubmitButton className={`btn ${theme.btn}`} disabled={drawn}>
                    Siųsti kvietimus ({notInvited})
                  </SubmitButton>
                </form>
              )}
            </Step>
            <Step n={2} title="Norų sąrašai" state={allDone || drawn ? "done" : notInvited === 0 ? "active" : "todo"}>
              {allDone ? (
                <p>Visi baigė pildyti.</p>
              ) : (
                <>
                  <p>
                    Baigė {done} iš {participants.length}.
                  </p>
                  {!drawn ? (
                    <form action={remind}>
                      <Hidden token={token} />
                      <SubmitButton className="btn-secondary">Priminti nebaigusiems</SubmitButton>
                    </form>
                  ) : null}
                </>
              )}
            </Step>
            <Step n={3} title="Burtai" state={drawn ? "done" : allDone ? "active" : "todo"} last>
              {drawn ? (
                <>
                  <p>Ištraukta {drawnAt}. Kas kam dovanoja, žino tik patys dalyviai.</p>
                  <form action={resetDraw}>
                    <Hidden token={token} />
                    <SubmitButton
                      className="btn-secondary"
                      confirmText="Atšaukti burtus? Visi gaus laišką, kad ankstesnis rezultatas nebegalioja."
                    >
                      Atšaukti burtus
                    </SubmitButton>
                  </form>
                </>
              ) : (
                <>
                  <p>
                    {participants.length < MIN_DRAW_PARTICIPANTS
                      ? `Burtams reikia bent ${MIN_DRAW_PARTICIPANTS} dalyvių.`
                      : allDone
                        ? "Viskas paruošta. Kiekvienas gaus laišką su savo pora."
                        : `Dar nebaigė ${participants.length - done}. Rekomenduojame palaukti.`}
                  </p>
                  <form action={draw}>
                    <Hidden token={token} />
                    {!allDone ? <input type="hidden" name="force" value="1" /> : null}
                    <SubmitButton
                      className={`btn ${allDone ? `${theme.btn} px-6 py-3 text-base` : "border border-line bg-white/5 text-ink hover:bg-white/10"}`}
                      disabled={participants.length < MIN_DRAW_PARTICIPANTS}
                      pendingText="Traukiama ir siunčiama…"
                      confirmText={
                        allDone
                          ? "Traukti burtus ir išsiųsti laiškus visiems?"
                          : "Ne visi baigė, jų norų sąrašas bus tuščias. Vis tiek traukti?"
                      }
                    >
                      {allDone ? "Traukti burtus" : "Traukti vis tiek"}
                    </SubmitButton>
                  </form>
                </>
              )}
            </Step>
          </ol>
        </section>
      )}

      <section className="card">
        <h2 className="mb-2 text-lg font-bold">
          Dalyviai <span className="text-muted">{participants.length}</span>
        </h2>
        <ul className="divide-y divide-line">
          {participants.map((p) => {
            const showWishes = !birthday || p.role === "celebrant";
            const status = birthday && p.role === "member"
              ? p.completedAt
                ? "🎁 Rezervavo dovaną"
                : p.invitedAt
                  ? "Gavo sąrašą"
                  : "Laukia sąrašo"
              : p.completedAt
                ? `✅ Baigė (${p.wishCount}/${MAX_WISHES[event.type]})`
                : p.invitedAt
                  ? `✏️ Pildo${p.wishCount ? ` (${p.wishCount})` : ""}`
                  : "Kvietimas neišsiųstas";
            const canSend = !birthday || p.role === "celebrant" || Boolean(event.sharedAt);
            return (
              <li key={p.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                <span
                  aria-hidden
                  className={`font-display flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${
                    p.completedAt ? "border-[var(--accent)] text-[var(--accent)] shadow-[0_0_14px_-4px_var(--accent)]" : "border-line text-muted"
                  }`}
                >
                  {p.name.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="font-medium">
                    {p.name}{" "}
                    {p.role === "celebrant" ? <span className="text-xs text-rose">🎂 jubiliatas</span> : null}
                    {p.isHost ? <span className="ml-1 text-xs text-muted">(jūs)</span> : null}
                  </p>
                  <p className="truncate text-xs text-muted">{p.email}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {showWishes || birthday ? status : null}
                    {p.lastEmailStatus === "failed" ? (
                      <span className="ml-2 text-rose" title={p.lastEmailError ?? ""}>
                        ⚠️ laiškas nepasiekė
                      </span>
                    ) : null}
                  </p>
                </div>
                </div>
                {!past ? (
                  <div className="flex flex-wrap gap-2">
                    {canSend ? (
                      <form action={resendOne}>
                        <Hidden token={token} />
                        <input type="hidden" name="participantId" value={p.id} />
                        <SubmitButton className="btn-secondary" pendingText="Siunčiama…">
                          {drawn ? "Siųsti rezultatą" : p.invitedAt ? "Siųsti dar kartą" : "Siųsti"}
                        </SubmitButton>
                      </form>
                    ) : null}
                    <CopyButton text={participantLink(p.id)} label="Nuoroda" />
                    {canEdit && p.role !== "celebrant" ? (
                      <form action={removeParticipant}>
                        <Hidden token={token} />
                        <input type="hidden" name="participantId" value={p.id} />
                        <SubmitButton className="btn-secondary text-rose" confirmText={`Pašalinti ${p.name}?`}>
                          ✕
                        </SubmitButton>
                      </form>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
        {drawn && !birthday ? (
          <p className="mt-3 text-xs text-muted">
            Pastaba: atidarę dalyvio nuorodą pamatytumėte jo porą – naudokite tik jei reikia persiųsti nuorodą.
          </p>
        ) : null}

        {canEdit ? (
          <form action={addParticipant} className="mt-4 grid gap-2 border-t border-line pt-4 sm:grid-cols-[1fr_1fr_auto]">
            <Hidden token={token} />
            <input name="name" className="input" placeholder="Vardas" required maxLength={60} aria-label="Vardas" />
            <input name="email" type="email" className="input" placeholder="El. paštas" required aria-label="El. paštas" />
            <SubmitButton className="btn-secondary py-2.5">Pridėti dalyvį</SubmitButton>
          </form>
        ) : null}
      </section>

      {!past ? (
        <details className="card">
          <summary className="font-display cursor-pointer text-sm font-bold">Redaguoti progos informaciją</summary>
          <form action={updateEvent} className="mt-4 space-y-4">
            <Hidden token={token} />
            <div>
              <label className="label" htmlFor="title">
                Pavadinimas
              </label>
              <input id="title" name="title" className="input" defaultValue={event.title} required maxLength={100} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="label" htmlFor="budgetAmount">
                  Suma
                </label>
                <div className="flex gap-2">
                  <input id="budgetAmount" name="budgetAmount" className="input" inputMode="decimal" defaultValue={event.budgetAmount ?? ""} />
                  <select name="currency" className="input w-24" defaultValue={event.currency} aria-label="Valiuta">
                    <option>EUR</option>
                    <option>USD</option>
                    <option>GBP</option>
                    <option>PLN</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label" htmlFor="exchangeDate">
                  Data
                </label>
                <input id="exchangeDate" name="exchangeDate" type="date" className="input" defaultValue={event.exchangeDate} required />
              </div>
              <div>
                <label className="label" htmlFor="wishlistDeadline">
                  Norai iki
                </label>
                <input id="wishlistDeadline" name="wishlistDeadline" type="date" className="input" defaultValue={event.wishlistDeadline ?? ""} />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="message">
                Žinutė
              </label>
              <textarea id="message" name="message" rows={2} maxLength={500} className="input" defaultValue={event.message ?? ""} />
            </div>
            <SubmitButton>Išsaugoti</SubmitButton>
          </form>
        </details>
      ) : null}

      <section className="card border-rose/30">
        <h2 className="text-base font-bold text-rose">Ištrinti progą</h2>
        <p className="mt-1 text-sm text-muted">Bus negrįžtamai ištrinti visi dalyviai, norai ir burtų rezultatai.</p>
        <form action={deleteEvent} className="mt-3">
          <Hidden token={token} />
          <SubmitButton
            className="btn border border-rose/50 text-rose hover:bg-rose/10"
            confirmText="Tikrai ištrinti progą ir visus duomenis? To atšaukti negalima."
          >
            Ištrinti
          </SubmitButton>
        </form>
      </section>
    </div>
  );
}
