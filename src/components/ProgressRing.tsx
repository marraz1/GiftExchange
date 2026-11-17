/** Circular progress with the count in the middle. */
export function ProgressRing({ done, total, stroke, label }: { done: number; total: number; stroke: string; label: string }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const pct = total ? done / total : 0;
  return (
    <div
      className="relative h-24 w-24 shrink-0 rounded-full"
      style={{ boxShadow: pct >= 1 ? `0 0 36px -10px ${stroke}` : undefined }}
      role="img" aria-label={`${label}: ${done} iš ${total}`}>
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="var(--color-line)" strokeWidth="6" />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset .6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-xl font-bold">
          {done}/{total}
        </span>
      </div>
    </div>
  );
}
