export function Flash({ m, t }: { m?: string; t?: string }) {
  if (!m) return null;
  const err = t === "err";
  return (
    <div
      role={err ? "alert" : "status"}
      className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
        err ? "border-red-200 bg-red-50 text-red-800" : "border-green-200 bg-green-50 text-green-800"
      }`}
    >
      {m}
    </div>
  );
}
