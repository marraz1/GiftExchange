import Link from "next/link";
import { Flash } from "@/components/Flash";

const steps = [
  ["Sukurkite progą", "Suma, data ir dalyvių sąrašas. Registruotis nereikia."],
  ["Visi surašo norus", "Kiekvienas gauna asmeninę nuorodą ir įrašo iki 3 norų."],
  ["Ištraukite burtus", "Kiekvienas el. paštu sužino, kam dovanoja ir ką tas žmogus nori."],
];

const occasions = [
  { href: "/new?type=christmas", emoji: "🎄", label: "Kalėdos", cls: "border-ice/40 hover:border-ice hover:shadow-[0_0_32px_-8px_var(--color-ice)]" },
  { href: "/new?type=birthday", emoji: "🎂", label: "Gimtadienis", cls: "border-rose/40 hover:border-rose hover:shadow-[0_0_32px_-8px_var(--color-rose)]" },
  { href: "/new?type=custom", emoji: "🎁", label: "Kita proga", cls: "border-mint/40 hover:border-mint hover:shadow-[0_0_32px_-8px_var(--color-mint)]" },
];

export default async function Home({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  return (
    <div className="space-y-14 pt-8">
      <Flash m={m} />
      <section>
        <h1 className="font-display text-[clamp(2.6rem,9vw,5rem)] leading-[0.95] font-bold">
          Kas kam
          <br />
          <span className="aurora-text">dovanoja?</span>
        </h1>
        <p className="mt-6 max-w-md text-lg text-muted">
          Slaptas dovanų keitimasis šeimai, draugams ar kolegoms. Nemokamai ir be registracijos.
        </p>
        <div className="mt-8 grid grid-cols-3 gap-3 sm:max-w-lg">
          {occasions.map((o) => (
            <Link
              key={o.href}
              href={o.href}
              className={`flex flex-col items-center gap-2 rounded-2xl border bg-panel/60 px-2 py-4 text-sm font-semibold transition ${o.cls}`}
            >
              <span className="text-3xl" aria-hidden>
                {o.emoji}
              </span>
              {o.label}
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-6 text-xl font-bold">Kaip tai veikia</h2>
        <ol className="grid gap-4 sm:grid-cols-3">
          {steps.map(([title, text], i) => (
            <li key={title} className="relative rounded-3xl border border-line bg-panel/50 p-5">
              <span className="font-display text-4xl font-bold text-line">{i + 1}</span>
              <h3 className="mt-3 font-display text-sm font-bold">{title}</h3>
              <p className="mt-2 text-sm text-muted">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex gap-4 rounded-3xl border border-rose/30 bg-rose/5 p-5 sm:p-7">
        <span className="text-3xl" aria-hidden>
          🎂
        </span>
        <div>
          <h2 className="text-base font-bold">Gimtadienis veikia kitaip</h2>
          <p className="mt-2 text-sm text-muted">
            Jubiliatas surašo norus, o svečiai pasirenka, ką dovanos, kad dovanos nesikartotų. Jubiliatas nemato, kas
            ką pasirinko.
          </p>
        </div>
      </section>
    </div>
  );
}
