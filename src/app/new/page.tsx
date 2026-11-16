import type { Metadata } from "next";
import { NewEventForm } from "./NewEventForm";

export const metadata: Metadata = { title: "Nauja proga" };

export default async function NewPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  const initial = type === "birthday" || type === "custom" ? type : "christmas";
  return (
    <div className="pt-4">
      <h1 className="mb-6 text-3xl font-bold">Nauja proga</h1>
      <NewEventForm initialType={initial} />
    </div>
  );
}
