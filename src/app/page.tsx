import Link from "next/link";
import { Flash } from "@/components/Flash";

const steps = [
  ["📝", "Sukurkite progą", "Kalėdos, gimtadienis ar kita proga – suma, data ir dalyvių sąrašas."],
  ["✉️", "Išsiųskite kvietimus", "Kiekvienas gauna asmeninę nuorodą ir surašo iki 3 norų."],
  ["✅", "Visi pažymi „Baigiau“", "Valdymo skydelyje matote, kas jau baigė."],
  ["🎲", "Traukite burtus", "Kiekvienas el. paštu gauna, kam dovanoja ir ką tas žmogus nori. Savęs niekas negauna."],
];

export default async function Home({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  return (
    <div className="space-y-10 pt-6">
      <Flash m={m} />
      <section className="text-center">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Slaptas dovanų keitimasis</h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-gray-600">
          Be registracijos ir nemokamai. Surašykite dalyvius, leiskite jiems įrašyti norus ir ištraukite, kas kam
          dovanoja.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/new?type=christmas" className="btn bg-red-700 px-6 py-3 text-base hover:bg-red-800">
            🎄 Kalėdos
          </Link>
          <Link href="/new?type=birthday" className="btn bg-violet-700 px-6 py-3 text-base hover:bg-violet-800">
            🎂 Gimtadienis
          </Link>
          <Link href="/new?type=custom" className="btn bg-teal-700 px-6 py-3 text-base hover:bg-teal-800">
            🎁 Kita proga
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {steps.map(([icon, title, text], i) => (
          <div key={title} className="card">
            <div className="text-2xl">{icon}</div>
            <h2 className="mt-2 font-semibold">
              {i + 1}. {title}
            </h2>
            <p className="mt-1 text-sm text-gray-600">{text}</p>
          </div>
        ))}
      </section>

      <section className="card text-sm text-gray-600">
        <h2 className="mb-2 font-semibold text-gray-900">🎂 Gimtadienis veikia kitaip</h2>
        Jubiliatas surašo norus, o svečiai mato sąrašą ir rezervuoja, ką dovanos – kad dovanos nesikartotų.
        Jubiliatas nemato, kas ką pasirinko.
      </section>
    </div>
  );
}
