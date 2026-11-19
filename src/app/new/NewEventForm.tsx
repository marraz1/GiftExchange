"use client";

import { startTransition, useActionState, useState } from "react";
import { createEvent, type CreateState } from "../actions/create";
import { SubmitButton } from "@/components/SubmitButton";

type T = "christmas" | "birthday" | "custom";

const TYPES: Array<{ id: T; label: string; emoji: string; btn: string; ring: string }> = [
  { id: "christmas", label: "Kalėdos", emoji: "🎄", btn: "bg-ice text-void hover:bg-cyan-200 shadow-[0_0_24px_-6px_var(--color-ice)]", ring: "ring-ice border-ice/60 bg-ice/10 text-ice" },
  { id: "birthday", label: "Gimtadienis", emoji: "🎂", btn: "bg-rose text-void hover:bg-pink-300 shadow-[0_0_24px_-6px_var(--color-rose)]", ring: "ring-rose border-rose/60 bg-rose/10 text-rose" },
  { id: "custom", label: "Kita proga", emoji: "🎁", btn: "bg-mint text-void hover:bg-emerald-200 shadow-[0_0_24px_-6px_var(--color-mint)]", ring: "ring-mint border-mint/60 bg-mint/10 text-mint" },
];

const DEFAULT_TITLES: Record<T, string> = {
  christmas: `Kalėdos ${new Date().getFullYear()}`,
  birthday: "",
  custom: "",
};

export function NewEventForm({ initialType }: { initialType: T }) {
  const [state, action, busy] = useActionState<CreateState, FormData>(createEvent, null);
  const v = state?.values ?? {};
  const [type, setType] = useState<T>((v.type as T) || initialType);
  const [celebrantIsHost, setCelebrantIsHost] = useState(v.celebrantIsHost === "on");
  const t = TYPES.find((x) => x.id === type)!;
  const birthday = type === "birthday";

  return (
    <form
      onSubmit={(e) => {
        // Submit manually so React does not reset the fields when validation fails.
        e.preventDefault();
        const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
        startTransition(() => action(fd));
      }}
      className="space-y-6">
      {state?.errors.length ? (
        <div role="alert" className="rounded-2xl border border-rose/40 bg-rose/10 px-4 py-3 text-sm text-pink-100">
          <p className="font-semibold">Pataisykite:</p>
          <ul className="mt-1 list-disc pl-5">
            {state.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <fieldset className="card">
        <legend className="sr-only">Progos tipas</legend>
        <p className="label">Proga</p>
        <div className="grid grid-cols-3 gap-2">
          {TYPES.map((x) => (
            <label
              key={x.id}
              className={`cursor-pointer rounded-xl border border-line p-3 text-center text-sm font-medium transition ${
                type === x.id ? `ring-2 ${x.ring}` : "hover:bg-void/60/5"
              }`}
            >
              <input
                type="radio"
                name="type"
                value={x.id}
                checked={type === x.id}
                onChange={() => setType(x.id)}
                className="sr-only"
              />
              <span className="block text-2xl">{x.emoji}</span>
              {x.label}
            </label>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted">
          {birthday
            ? "Jubiliatas surašo norus, svečiai rezervuoja, ką dovanos. Burtų nėra."
            : "Kiekvienas surašo iki 10 norų, tada traukiami burtai – kiekvienas dovanoja vienam žmogui."}
        </p>
      </fieldset>

      <section className="card space-y-4">
        <div>
          <label className="label" htmlFor="title">
            Pavadinimas
          </label>
          <input
            id="title"
            name="title"
            className="input"
            required
            maxLength={100}
            placeholder={birthday ? "Pvz. Tomo 30-asis gimtadienis" : "Pvz. Kalėdos su šeima"}
            defaultValue={v.title ?? DEFAULT_TITLES[initialType]}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="budgetAmount">
              {birthday ? "Suma vienam svečiui" : "Dovanos suma"} <span className="text-muted/70">(nebūtina)</span>
            </label>
            <div className="flex gap-2">
              <input
                id="budgetAmount"
                name="budgetAmount"
                inputMode="decimal"
                className="input"
                placeholder="20"
                defaultValue={v.budgetAmount}
              />
              <select name="currency" className="input w-24" defaultValue={v.currency ?? "EUR"} aria-label="Valiuta">
                <option>EUR</option>
                <option>USD</option>
                <option>GBP</option>
                <option>PLN</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="exchangeDate">
              {birthday ? "Gimtadienio data" : "Keitimosi data"}
            </label>
            <input id="exchangeDate" name="exchangeDate" type="date" className="input" required defaultValue={v.exchangeDate} />
          </div>
          <div>
            <label className="label" htmlFor="wishlistDeadline">
              Norus surašyti iki <span className="text-muted/70">(nebūtina)</span>
            </label>
            <input id="wishlistDeadline" name="wishlistDeadline" type="date" className="input" defaultValue={v.wishlistDeadline} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="message">
            Žinutė dalyviams <span className="text-muted/70">(nebūtina)</span>
          </label>
          <textarea
            id="message"
            name="message"
            rows={2}
            maxLength={500}
            className="input"
            placeholder="Pvz. Keisimės dovanomis per Kūčių vakarienę pas močiutę."
            defaultValue={v.message}
          />
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="font-semibold">Jūs (organizatorius)</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="hostName">
              Vardas
            </label>
            <input id="hostName" name="hostName" className="input" required maxLength={60} defaultValue={v.hostName} />
          </div>
          <div>
            <label className="label" htmlFor="hostEmail">
              El. paštas
            </label>
            <input id="hostEmail" name="hostEmail" type="email" className="input" required defaultValue={v.hostEmail} />
          </div>
        </div>
        <p className="text-xs text-muted">Į šį adresą atsiųsime valdymo nuorodą.</p>

        {birthday ? (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="celebrantIsHost"
              checked={celebrantIsHost}
              onChange={(e) => setCelebrantIsHost(e.target.checked)}
            />
            Jubiliatas esu aš
          </label>
        ) : null}
        {!birthday || !celebrantIsHost ? (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="hostParticipates" defaultChecked={v.hostParticipates === "on" || !state} />
            {birthday ? "Aš irgi dovanosiu (būsiu svečias)" : "Aš irgi dalyvauju keitimesi"}
          </label>
        ) : null}
      </section>

      {birthday && !celebrantIsHost ? (
        <section className="card space-y-4">
          <h2 className="font-semibold">🎂 Jubiliatas</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="celebrantName">
                Vardas
              </label>
              <input id="celebrantName" name="celebrantName" className="input" maxLength={60} defaultValue={v.celebrantName} />
            </div>
            <div>
              <label className="label" htmlFor="celebrantEmail">
                El. paštas
              </label>
              <input id="celebrantEmail" name="celebrantEmail" type="email" className="input" defaultValue={v.celebrantEmail} />
            </div>
          </div>
          <p className="text-xs text-muted">Jubiliatas gaus nuorodą surašyti savo norus.</p>
        </section>
      ) : null}

      <section className="card space-y-2">
        <label className="font-semibold" htmlFor="people">
          {birthday ? "Svečiai" : "Kiti dalyviai"}
        </label>
        <p className="text-sm text-muted">
          Po vieną eilutėje: <code className="rounded bg-void/60/10 px-1">Vardas, el.paštas</code>
          {birthday ? "" : " · iš viso reikia bent 3 dalyvių"}
        </p>
        <textarea
          id="people"
          name="people"
          rows={6}
          className="input font-mono text-sm"
          placeholder={"Ona, ona@pastas.lt\nJonas, jonas@pastas.lt\nRūta, ruta@pastas.lt"}
          defaultValue={v.people}
        />
      </section>

      <SubmitButton busy={busy} className={`btn w-full py-3 text-base ${t.btn}`} pendingText="Kuriama…">
        {t.emoji} Sukurti progą
      </SubmitButton>
    </form>
  );
}
