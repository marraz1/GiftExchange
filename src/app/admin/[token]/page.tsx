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

  return (
    <div className="space-y-6">
      <Flash m={sp.m} t={sp.t} />
      {!emailConfigured() && process.env.VERCEL ? (
        <Flash t="err" m="El. laiškų siuntimas nesukonfigūruotas (GMAIL_USER / GMAIL_APP_PASSWORD). Kol kas nukopijuokite nuorodas ir išsiųskite patys." />
      ) : null}

      {sp.created ? (
        <div className={`card border-2 ${theme.ring} ${theme.soft}`}>
          <h2 className="text-lg font-bold">🎉 Proga sukurta!</h2>
          <p className="mt-1 text-sm text-gray-700">
            Tai jūsų <strong>valdymo puslapis</strong>. Išsaugokite šią nuorodą (taip pat išsiuntėme ją į{" "}
            {event.hostEmail}). Niekam jos neperduokite.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code className="max-w-full truncate rounded bg-white px-2 py-1 text-xs">{adminLink(event.id)}</code>
            <CopyButton text={adminLink(event.id)} />
          </div>
        </div>
      ) : null}

      <section className="card">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className={`text-sm font-semibold ${theme.text}`}>
              {theme.emoji} {theme.label}
            </p>
            <h1 className="text-2xl font-bold">{event.title}</h1>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${theme.soft} ${theme.text}`}>
            {past ? "Įvyko" : drawn ? "Burtai ištraukti" : birthday && event.sharedAt ? "Sąrašas išsiųstas" : "Renkami norai"}
          </span>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-gray-500">Suma</dt>
            <dd className="font-semibold">{money ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Data</dt>
            <dd className="font-semibold">{formatDate(event.exchangeDate)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Norai iki</dt>
            <dd className="font-semibold">{formatDate(event.wishlistDeadline) ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">{birthday ? "Rezervuota" : "Baigė"}</dt>
            <dd className="font-semibold">
              {birthday ? `${claimed} / ${celebrant?.wishCount ?? 0}` : `${done} / ${participants.length}`}
            </dd>
          </div>
        </dl>
      </section>

      {past ? (
        <section className="card text-sm text-gray-600">
          Proga jau įvyko. Duomenys bus automatiškai ištrinti praėjus 30 dienų po progos datos.
        </section>
      ) : birthday ? (
        <section className="card space-y-4">
          <h2 className="font-semibold">Veiksmai</h2>
          <ol className="space-y-4 text-sm">
            <li className="flex flex-wrap items-center justify-between gap-3">
              <span>
                <strong>1.</strong> Pakviesti jubiliatą surašyti norus{" "}
                {celebrant?.completedAt ? "✅" : celebrant?.invitedAt ? "(išsiųsta, laukiama)" : ""}
              </span>
              <div className="flex gap-2">
                {!celebrant?.invitedAt ? (
                  <form action={sendInvites}>
                    <Hidden token={token} />
                    <SubmitButton className={`btn ${theme.btn}`}>Siųsti kvietimą</SubmitButton>
                  </form>
                ) : !celebrant.completedAt ? (
                  <form action={remind}>
                    <Hidden token={token} />
                    <SubmitButton className="btn-secondary">Priminti</SubmitButton>
                  </form>
                ) : null}
              </div>
            </li>
            <li className="flex flex-wrap items-center justify-between gap-3">
              <span>
                <strong>2.</strong> Išsiųsti norų sąrašą svečiams ({members.length})
                {event.sharedAt ? " ✅" : ""}
              </span>
              {!event.sharedAt || notInvited > 0 ? (
                <form action={shareWishlist}>
                  <Hidden token={token} />
                  <SubmitButton
                    className={`btn ${theme.btn}`}
                    disabled={!celebrant?.completedAt}
                    title={!celebrant?.completedAt ? "Jubiliatas dar nesurašė norų" : undefined}
                  >
                    {event.sharedAt ? `Siųsti naujiems (${notInvited})` : "Siųsti svečiams"}
                  </SubmitButton>
                </form>
              ) : null}
            </li>
            <li>
              <strong>3.</strong> Svečiai rezervuoja dovanas. Jubiliatas nemato, kas ką pasirinko.
            </li>
          </ol>
        </section>
      ) : (
        <section className="card space-y-4">
          <h2 className="font-semibold">Veiksmai</h2>
          {!drawn ? (
            <>
              <div className="flex flex-wrap gap-2">
                <form action={sendInvites}>
                  <Hidden token={token} />
                  <SubmitButton className={`btn ${theme.btn}`} disabled={notInvited === 0}>
                    ✉️ Siųsti kvietimus{notInvited ? ` (${notInvited})` : ""}
                  </SubmitButton>
                </form>
                <form action={remind}>
                  <Hidden token={token} />
                  <SubmitButton className="btn-secondary" disabled={allDone}>
                    ⏰ Priminti nebaigusiems
                  </SubmitButton>
                </form>
              </div>
              <div className="rounded-xl border border-dashed border-gray-300 p-4">
                <p className="text-sm text-gray-700">
                  {participants.length < MIN_DRAW_PARTICIPANTS
                    ? `Burtams reikia bent ${MIN_DRAW_PARTICIPANTS} dalyvių.`
                    : allDone
                      ? "Visi baigė – galite traukti burtus! Kiekvienas gaus laišką su savo pora."
                      : `Dar nebaigė ${participants.length - done}. Rekomenduojame palaukti.`}
                </p>
                <form action={draw} className="mt-3">
                  <Hidden token={token} />
                  {!allDone ? <input type="hidden" name="force" value="1" /> : null}
                  <SubmitButton
                    className={`btn ${allDone ? theme.btn : "bg-gray-500 hover:bg-gray-600"}`}
                    disabled={participants.length < MIN_DRAW_PARTICIPANTS}
                    pendingText="Traukiama ir siunčiama…"
                    confirmText={
                      allDone
                        ? "Traukti burtus ir išsiųsti laiškus visiems?"
                        : "Ne visi baigė – jų norų sąrašas bus tuščias. Vis tiek traukti?"
                    }
                  >
                    🎲 {allDone ? "Traukti burtus" : "Traukti vis tiek"}
                  </SubmitButton>
                </form>
              </div>
            </>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <p>
                🎲 Burtai ištraukti{" "}
                {event.drawnAt ? new Intl.DateTimeFormat("lt-LT", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Vilnius" }).format(event.drawnAt) : ""}
                . Kas kam dovanoja, žino tik patys dalyviai.
              </p>
              <form action={resetDraw}>
                <Hidden token={token} />
                <SubmitButton
                  className="btn-secondary"
                  confirmText="Atšaukti burtus? Visi gaus laišką, kad ankstesnis rezultatas nebegalioja."
                >
                  Atšaukti burtus
                </SubmitButton>
              </form>
            </div>
          )}
        </section>
      )}

      <section className="card">
        <h2 className="mb-3 font-semibold">
          Dalyviai <span className="text-gray-400">({participants.length})</span>
        </h2>
        <ul className="divide-y divide-gray-100">
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
              <li key={p.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium">
                    {p.name}{" "}
                    {p.role === "celebrant" ? <span className="text-xs text-violet-700">🎂 jubiliatas</span> : null}
                    {p.isHost ? <span className="ml-1 text-xs text-gray-500">(jūs)</span> : null}
                  </p>
                  <p className="truncate text-xs text-gray-500">{p.email}</p>
                  <p className="text-xs">
                    {showWishes || birthday ? status : null}
                    {p.lastEmailStatus === "failed" ? (
                      <span className="ml-2 text-red-700" title={p.lastEmailError ?? ""}>
                        ⚠️ laiškas nepasiekė
                      </span>
                    ) : null}
                  </p>
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
                        <SubmitButton className="btn-secondary text-red-700" confirmText={`Pašalinti ${p.name}?`}>
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
          <p className="mt-3 text-xs text-gray-500">
            Pastaba: atidarę dalyvio nuorodą pamatytumėte jo porą – naudokite tik jei reikia persiųsti nuorodą.
          </p>
        ) : null}

        {canEdit ? (
          <form action={addParticipant} className="mt-4 grid gap-2 border-t border-gray-100 pt-4 sm:grid-cols-[1fr_1fr_auto]">
            <Hidden token={token} />
            <input name="name" className="input" placeholder="Vardas" required maxLength={60} aria-label="Vardas" />
            <input name="email" type="email" className="input" placeholder="El. paštas" required aria-label="El. paštas" />
            <SubmitButton className={`btn ${theme.btn}`}>+ Pridėti</SubmitButton>
          </form>
        ) : null}
      </section>

      {!past ? (
        <details className="card">
          <summary className="cursor-pointer font-semibold">Redaguoti progos informaciją</summary>
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

      <section className="card border-red-200">
        <h2 className="font-semibold text-red-800">Ištrinti progą</h2>
        <p className="mt-1 text-sm text-gray-600">Bus negrįžtamai ištrinti visi dalyviai, norai ir burtų rezultatai.</p>
        <form action={deleteEvent} className="mt-3">
          <Hidden token={token} />
          <SubmitButton
            className="btn bg-red-700 hover:bg-red-800"
            confirmText="Tikrai ištrinti progą ir visus duomenis? To atšaukti negalima."
          >
            Ištrinti
          </SubmitButton>
        </form>
      </section>
    </div>
  );
}
