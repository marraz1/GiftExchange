"use client";

import { startTransition, useActionState } from "react";
import { saveWishes, type WishesState } from "@/app/actions/participant";
import { SubmitButton } from "@/components/SubmitButton";

type W = { title: string; url: string | null; note: string | null };

export function WishesForm({
  token,
  max,
  wishes,
  completed,
  birthday,
  btnClass,
}: {
  token: string;
  max: number;
  wishes: W[];
  completed: boolean;
  birthday: boolean;
  btnClass: string;
}) {
  const [state, action, busy] = useActionState<WishesState, FormData>(saveWishes, null);
  const v = state?.values;
  const val = (field: "title" | "url" | "note", n: number) =>
    v ? (v[`${field}_${n}`] ?? "") : (wishes[n - 1]?.[field] ?? "");

  return (
    <form
      onSubmit={(e) => {
        // Submit manually so React does not reset the fields when validation fails.
        e.preventDefault();
        const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
        startTransition(() => action(fd));
      }}
      className="space-y-5">
      <input type="hidden" name="token" value={token} />
      {state?.error ? (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.error}
        </div>
      ) : null}
      <p className="text-sm text-gray-600">
        Įrašykite iki {max} norų ar idėjų – daiktą, patirtį ar tiesiog kryptį (pvz. „gera knyga apie keliones“).
        {birthday ? " Svečiai matys šį sąrašą ir pasirinks, ką dovanoti." : " Juos matys tik tas, kuris jums dovanos."}
      </p>
      {Array.from({ length: max }, (_, i) => {
        const n = i + 1;
        return (
          <fieldset key={n} className="space-y-2 rounded-xl border border-gray-200 p-3">
            <legend className="px-1 text-sm font-semibold text-gray-700">{n} noras</legend>
            <input
              name={`title_${n}`}
              className="input"
              placeholder="Ką norėtumėte gauti?"
              maxLength={200}
              defaultValue={val("title", n)}
              aria-label={`${n} noras`}
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                name={`url_${n}`}
                type="url"
                className="input text-sm"
                placeholder="Nuoroda (nebūtina)"
                maxLength={1000}
                defaultValue={val("url", n)}
                aria-label={`${n} noro nuoroda`}
              />
              <input
                name={`note_${n}`}
                className="input text-sm"
                placeholder="Dydis, spalva… (nebūtina)"
                maxLength={300}
                defaultValue={val("note", n)}
                aria-label={`${n} noro komentaras`}
              />
            </div>
          </fieldset>
        );
      })}
      <div className="flex flex-wrap gap-2">
        <SubmitButton busy={busy} name="intent" value="complete" className={`btn ${btnClass} px-6 py-3 text-base`} pendingText="Saugoma…">
          ✅ {completed ? "Išsaugoti" : "Baigiau"}
        </SubmitButton>
        {!completed ? (
          <SubmitButton busy={busy} name="intent" value="save" className="btn-secondary" pendingText="Saugoma…">
            Išsaugoti juodraštį
          </SubmitButton>
        ) : null}
      </div>
      {!birthday ? (
        <p className="text-xs text-gray-500">
          Norus galite keisti, kol organizatorius neištraukė burtų. Burtų rezultatą gausite el. paštu.
        </p>
      ) : null}
    </form>
  );
}
