import type { Event } from "./db/schema";

export type EventType = Event["type"];

/** `accent` is for emails (light background); the class names are for the dark site. */
export const THEMES: Record<
  EventType,
  { label: string; emoji: string; accent: string; soft: string; text: string; btn: string; ring: string; stroke: string }
> = {
  christmas: {
    label: "Kalėdos",
    emoji: "🎄",
    accent: "#0e7490",
    soft: "bg-ice/10",
    text: "text-ice",
    btn: "bg-ice text-void hover:bg-cyan-200 shadow-[0_0_24px_-6px_var(--color-ice)]",
    ring: "border-ice/40",
    stroke: "var(--color-ice)",
  },
  birthday: {
    label: "Gimtadienis",
    emoji: "🎂",
    accent: "#be185d",
    soft: "bg-rose/10",
    text: "text-rose",
    btn: "bg-rose text-void hover:bg-pink-300 shadow-[0_0_24px_-6px_var(--color-rose)]",
    ring: "border-rose/40",
    stroke: "var(--color-rose)",
  },
  custom: {
    label: "Kita proga",
    emoji: "🎁",
    accent: "#047857",
    soft: "bg-mint/10",
    text: "text-mint",
    btn: "bg-mint text-void hover:bg-emerald-200 shadow-[0_0_24px_-6px_var(--color-mint)]",
    ring: "border-mint/40",
    stroke: "var(--color-mint)",
  },
};

export const MAX_WISHES: Record<EventType, number> = { christmas: 3, custom: 3, birthday: 6 };

export function formatMoney(amount: string | null, currency: string): string | null {
  if (amount == null) return null;
  const n = Number(amount);
  if (!Number.isFinite(n)) return null;
  return new Intl.NumberFormat("lt-LT", {
    style: "currency",
    currency,
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n);
}

export function formatDate(d: string | null): string | null {
  if (!d) return null;
  const [y, m, day] = d.split("-").map(Number);
  return new Intl.DateTimeFormat("lt-LT", { year: "numeric", month: "long", day: "numeric" }).format(
    new Date(Date.UTC(y, m - 1, day)),
  );
}

/** Today's date in Lithuania as YYYY-MM-DD. */
export function todayLt(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Vilnius" }).format(new Date());
}

/** The event is over the day after the exchange date. */
export function isPast(event: Pick<Event, "exchangeDate">): boolean {
  return todayLt() > event.exchangeDate;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function safeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}
