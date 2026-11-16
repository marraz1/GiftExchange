/** One step of a vertical sequence (invitations → wishes → draw). */
export function Step({
  n,
  title,
  state,
  last,
  children,
}: {
  n: number;
  title: string;
  state: "done" | "active" | "todo";
  last?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <li className="relative flex gap-4 pb-7 last:pb-0">
      {!last ? (
        <span
          aria-hidden
          className={`absolute top-9 bottom-0 left-[17px] w-px ${state === "done" ? "bg-[var(--accent)]/60" : "bg-line"}`}
        />
      ) : null}
      <span
        className={`font-display z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${
          state === "done"
            ? "border-[var(--accent)] bg-[var(--accent)] text-void"
            : state === "active"
              ? "border-[var(--accent)] text-[var(--accent)] shadow-[0_0_16px_-2px_var(--accent)]"
              : "border-line text-muted"
        }`}
      >
        {state === "done" ? "✓" : n}
      </span>
      <div className="min-w-0 flex-1 pt-1">
        <h3 className={`font-display text-base font-bold ${state === "todo" ? "text-muted" : ""}`}>{title}</h3>
        {children ? <div className="mt-2 space-y-3 text-sm text-muted">{children}</div> : null}
      </div>
    </li>
  );
}
