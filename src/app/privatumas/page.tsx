import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privatumas" };

export default function PrivacyPage() {
  return (
    <article className="card space-y-3 text-sm leading-relaxed text-ink/85">
      <h1 className="text-2xl font-bold text-ink">Privatumo politika</h1>
      <p>
        Saugome tik tai, ko reikia dovanų keitimuisi: organizatoriaus ir dalyvių vardus, el. pašto adresus, dalyvių
        įrašytus norus ir burtų rezultatus.
      </p>
      <p>
        El. pašto adresai naudojami tik šios progos laiškams (kvietimams, priminimams ir burtų rezultatams). Jų
        neperduodame trečiosioms šalims ir nesiunčiame reklamos.
      </p>
      <p>
        Prieiga prie duomenų – tik per slaptas nuorodas. Organizatorius nemato dalyvių norų ir burtų rezultatų.
      </p>
      <p>
        Visi progos duomenys automatiškai ištrinami praėjus 30 dienų po progos datos. Organizatorius gali bet kada
        ištrinti progą ir visus jos duomenis valdymo puslapyje.
      </p>
      <p>Norėdami, kad jūsų duomenys būtų ištrinti anksčiau, kreipkitės į progos organizatorių.</p>
    </article>
  );
}
