import type { Event } from "./db/schema";

export type EventType = Event["type"];

export const THEMES: Record<
  EventType,
  { label: string; emoji: string; accent: string; soft: string; text: string; btn: string; ring: string }
> = {
  christmas: {
    label: "Kalėdos",
    emoji: "🎄",
    accent: "#b91c1c",
    soft: "bg-red-50",
    text: "text-red-700",
    btn: "bg-red-700 hover:bg-red-800",
    ring: "border-red-200",
  },
  birthday: {
    label: "Gimtadienis",
    emoji: "🎂",
    accent: "#7c3aed",
    soft: "bg-violet-50",
    text: "text-violet-700",
    btn: "bg-violet-700 hover:bg-violet-800",
    ring: "border-violet-200",
  },
  custom: {
    label: "Kita proga",
    emoji: "🎁",
    accent: "#0f766e",
    soft: "bg-teal-50",
    text: "text-teal-700",
    btn: "bg-teal-700 hover:bg-teal-800",
    ring: "border-teal-200",
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
