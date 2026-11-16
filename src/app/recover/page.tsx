import type { Metadata } from "next";
import { recoverAdmin } from "@/app/actions/recover";
import { Flash } from "@/components/Flash";
import { SubmitButton } from "@/components/SubmitButton";

export const metadata: Metadata = { title: "Valdymo nuoroda" };

export default async function RecoverPage({ searchParams }: { searchParams: Promise<{ m?: string; t?: string }> }) {
  const { m, t } = await searchParams;
  return (
    <div className="mx-auto max-w-md space-y-4 pt-6">
      <h1 className="text-2xl font-bold">Pamiršote valdymo nuorodą?</h1>
      <p className="text-sm text-muted">
        Įveskite el. paštą, kurį nurodėte kurdami progą. Atsiųsime visų jūsų aktyvių progų valdymo nuorodas.
      </p>
      <Flash m={m} t={t} />
      <form action={recoverAdmin} className="card space-y-3">
        <label className="label" htmlFor="email">
          El. paštas
        </label>
        <input id="email" name="email" type="email" required className="input" />
        <SubmitButton pendingText="Siunčiama…">Atsiųsti nuorodas</SubmitButton>
      </form>
    </div>
  );
}
