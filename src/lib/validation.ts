import { z } from "zod";
import { todayLt } from "./format";

export const CURRENCIES = ["EUR", "USD", "GBP", "PLN"] as const;
export const MAX_PARTICIPANTS = 100;

const EMAIL_RE = /[^\s<>,;:"]+@[^\s<>,;:"]+\.[^\s<>,;:"]+/;

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .regex(/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/, "Neteisingas el. pašto adresas");

export const nameSchema = z
  .string()
  .trim()
  .min(1, "Įveskite vardą")
  .max(60, "Vardas per ilgas (iki 60 simbolių)");

export type ParsedPerson = { name: string; email: string };

/**
 * Parses lines like `Jonas, jonas@pastas.lt`, `Jonas <jonas@pastas.lt>` or
 * `Jonas jonas@pastas.lt`. Returns people and per-line errors.
 */
export function parsePeople(input: string): { people: ParsedPerson[]; errors: string[] } {
  const people: ParsedPerson[] = [];
  const errors: string[] = [];
  input
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((line, i) => {
      const m = line.match(EMAIL_RE);
      if (!m) {
        errors.push(`${i + 1} eilutė („${line}“): nerastas el. paštas`);
        return;
      }
      const name = line
        .replace(m[0], "")
        .replace(/[<>()[\]]/g, "")
        .replace(/[,;\t:-]+\s*$/, "")
        .replace(/^\s*[,;\t:-]+/, "")
        .trim();
      const n = nameSchema.safeParse(name);
      const em = emailSchema.safeParse(m[0]);
      if (!n.success) errors.push(`${i + 1} eilutė: ${n.error.issues[0].message}`);
      else if (!em.success) errors.push(`${i + 1} eilutė: ${em.error.issues[0].message}`);
      else people.push({ name: n.data, email: em.data });
    });
  return { people, errors };
}

export function findDuplicates(people: ParsedPerson[]): string[] {
  const errors: string[] = [];
  const names = new Set<string>();
  const emails = new Set<string>();
  for (const p of people) {
    const n = p.name.toLocaleLowerCase("lt");
    if (names.has(n)) errors.push(`Vardas „${p.name}“ kartojasi – pridėkite pavardės raidę`);
    if (emails.has(p.email)) errors.push(`El. paštas ${p.email} kartojasi`);
    names.add(n);
    emails.add(p.email);
  }
  return errors;
}

const optionalDate = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .pipe(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Neteisinga data").nullable());

export const eventDetailsSchema = z
  .object({
    title: z.string().trim().min(1, "Įveskite pavadinimą").max(100, "Pavadinimas per ilgas"),
    budgetAmount: z
      .string()
      .trim()
      .transform((v) => (v === "" ? null : v.replace(",", ".")))
      .pipe(
        z
          .string()
          .regex(/^\d{1,6}(\.\d{1,2})?$/, "Suma turi būti skaičius (pvz. 20 arba 15.50)")
          .nullable(),
      ),
    currency: z.enum(CURRENCIES),
    exchangeDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pasirinkite keitimosi datą"),
    wishlistDeadline: optionalDate,
    message: z
      .string()
      .trim()
      .max(500, "Žinutė per ilga (iki 500 simbolių)")
      .transform((v) => (v === "" ? null : v)),
  })
  .superRefine((v, ctx) => {
    const today = todayLt();
    if (v.exchangeDate < today)
      ctx.addIssue({ code: "custom", path: ["exchangeDate"], message: "Keitimosi data negali būti praeityje" });
    if (v.wishlistDeadline && v.wishlistDeadline < today)
      ctx.addIssue({ code: "custom", path: ["wishlistDeadline"], message: "Terminas negali būti praeityje" });
    if (v.wishlistDeadline && v.wishlistDeadline > v.exchangeDate)
      ctx.addIssue({
        code: "custom",
        path: ["wishlistDeadline"],
        message: "Norų terminas turi būti ne vėliau nei keitimosi data",
      });
  });

export const wishSchema = z.object({
  title: z.string().trim().max(200, "Noras per ilgas (iki 200 simbolių)"),
  url: z
    .string()
    .trim()
    .max(1000)
    .transform((v) => (v === "" ? null : v))
    .pipe(
      z
        .string()
        .refine((u) => /^https?:\/\//i.test(u) && URL.canParse(u), "Nuoroda turi prasidėti http:// arba https://")
        .nullable(),
    ),
  note: z
    .string()
    .trim()
    .max(300, "Komentaras per ilgas (iki 300 simbolių)")
    .transform((v) => (v === "" ? null : v)),
});

export function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
}
