export function Flash({ m, t }: { m?: string; t?: string }) {
  if (!m) return null;
  const err = t === "err";
  return (
    <div
      role={err ? "alert" : "status"}
      className={`mb-4 flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${
        err ? "border-rose/40 bg-rose/10 text-pink-100" : "border-mint/40 bg-mint/10 text-emerald-100"
      }`}
    >
      <span aria-hidden className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${err ? "bg-rose" : "bg-mint"}`} />
      {m}
    </div>
  );
}
