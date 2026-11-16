import type { Event, Participant, Wish } from "../db/schema";
import { THEMES, escapeHtml as e, formatDate, formatMoney, safeUrl } from "../format";
import type { Mail } from "./send";

type Ev = Pick<
  Event,
  "type" | "title" | "hostName" | "budgetAmount" | "currency" | "exchangeDate" | "wishlistDeadline" | "message"
>;
type WishLike = Pick<Wish, "title" | "url" | "note">;

function layout(ev: Ev, heading: string, bodyHtml: string, cta?: { label: string; href: string }): string {
  const t = THEMES[ev.type];
  const button = cta
    ? `<p style="margin:28px 0"><a href="${e(cta.href)}" style="background:${t.accent};color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;display:inline-block">${e(cta.label)}</a></p>
       <p style="font-size:12px;color:#6b7280">Jei mygtukas neveikia, nukopijuokite nuorodą:<br><span style="word-break:break-all">${e(cta.href)}</span></p>`
    : "";
  return `<!doctype html><html lang="lt"><body style="margin:0;background:#f3f4f6;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111827">
<div style="max-width:560px;margin:0 auto;padding:24px 16px">
<div style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
<div style="background:${t.accent};color:#fff;padding:20px 24px;font-size:20px;font-weight:700">${t.emoji} ${e(ev.title)}</div>
<div style="padding:24px">
<h1 style="font-size:20px;margin:0 0 16px">${heading}</h1>
${bodyHtml}
${button}
</div></div>
<p style="font-size:12px;color:#9ca3af;text-align:center;margin-top:16px">Šis laiškas išsiųstas, nes ${e(ev.hostName)} pakvietė jus į dovanų keitimąsi.</p>
</div></body></html>`;
}

function details(ev: Ev): { html: string; text: string } {
  const rows: Array<[string, string]> = [];
  const money = formatMoney(ev.budgetAmount, ev.currency);
  if (money) rows.push(["Dovanos suma", money]);
  rows.push(["Keitimosi data", formatDate(ev.exchangeDate)!]);
  if (ev.wishlistDeadline) rows.push(["Norus surašyti iki", formatDate(ev.wishlistDeadline)!]);
  rows.push(["Organizatorius", ev.hostName]);
  const html =
    `<table style="border-collapse:collapse;margin:12px 0;font-size:14px">` +
    rows
      .map(
        ([k, v]) =>
          `<tr><td style="padding:4px 16px 4px 0;color:#6b7280">${e(k)}</td><td style="padding:4px 0;font-weight:600">${e(v)}</td></tr>`,
      )
      .join("") +
    `</table>` +
    (ev.message
      ? `<blockquote style="margin:12px 0;padding:12px 16px;background:#f9fafb;border-left:3px solid #d1d5db;white-space:pre-wrap">${e(ev.message)}</blockquote>`
      : "");
  const text = rows.map(([k, v]) => `${k}: ${v}`).join("\n") + (ev.message ? `\n\n${ev.message}` : "");
  return { html, text };
}

function wishList(wishes: WishLike[]): { html: string; text: string } {
  if (wishes.length === 0)
    return { html: `<p><em>Norų nenurodė – teks sugalvoti patiems 🙂</em></p>`, text: "Norų nenurodė." };
  const html =
    `<ol style="padding-left:20px;margin:12px 0">` +
    wishes
      .map((w) => {
        const url = safeUrl(w.url);
        return `<li style="margin:0 0 10px"><strong>${e(w.title)}</strong>${
          url ? ` – <a href="${e(url)}">nuoroda</a>` : ""
        }${w.note ? `<br><span style="color:#4b5563">${e(w.note)}</span>` : ""}</li>`;
      })
      .join("") +
    `</ol>`;
  const text = wishes
    .map((w, i) => `${i + 1}. ${w.title}${w.url ? ` (${w.url})` : ""}${w.note ? ` – ${w.note}` : ""}`)
    .join("\n");
  return { html, text };
}

export function adminCreatedMail(ev: Ev, hostEmail: string, adminLink: string): Mail {
  const d = details(ev);
  return {
    to: hostEmail,
    subject: `Jūsų proga „${ev.title}“ sukurta`,
    html: layout(
      ev,
      `Proga sukurta!`,
      `<p>Labas, ${e(ev.hostName)}! Žemiau – jūsų <strong>administravimo nuoroda</strong>. Ją išsaugokite: tik per ją galėsite siųsti kvietimus ir traukti burtus. Niekam jos neperduokite.</p>${d.html}`,
      { label: "Atidaryti valdymą", href: adminLink },
    ),
    text: `Labas, ${ev.hostName}!\n\nProga „${ev.title}“ sukurta. Administravimo nuoroda (išsaugokite, niekam neperduokite):\n${adminLink}\n\n${d.text}`,
  };
}

export function adminRecoverMail(
  ev: Ev,
  hostEmail: string,
  items: Array<{ title: string; link: string }>,
): Mail {
  const list = items.map((i) => `<li><a href="${e(i.link)}">${e(i.title)}</a></li>`).join("");
  return {
    to: hostEmail,
    subject: "Jūsų progų administravimo nuorodos",
    html: layout(ev, "Jūsų progos", `<p>Štai visų jūsų aktyvių progų valdymo nuorodos:</p><ul>${list}</ul>`),
    text: `Jūsų progų valdymo nuorodos:\n\n${items.map((i) => `${i.title}: ${i.link}`).join("\n")}`,
  };
}

export function inviteMail(ev: Ev, p: Pick<Participant, "name" | "email">, link: string, wishCount: number): Mail {
  const d = details(ev);
  return {
    to: p.email,
    subject: `${THEMES[ev.type].emoji} Kvietimas: ${ev.title}`,
    html: layout(
      ev,
      `Labas, ${e(p.name)}!`,
      `<p>${e(ev.hostName)} kviečia jus į dovanų keitimąsi. Paspauskite mygtuką ir surašykite iki ${wishCount} norų ar idėjų – ką norėtumėte gauti. Kai baigsite, paspauskite „Baigiau“.</p><p>Kai visi baigs, bus traukiami burtai, ir el. paštu sužinosite, kam dovanojate.</p>${d.html}`,
      { label: "Surašyti mano norus", href: link },
    ),
    text: `Labas, ${p.name}!\n\n${ev.hostName} kviečia jus į dovanų keitimąsi „${ev.title}“. Surašykite iki ${wishCount} norų:\n${link}\n\n${d.text}`,
  };
}

export function celebrantInviteMail(ev: Ev, p: Pick<Participant, "name" | "email">, link: string, wishCount: number): Mail {
  const d = details(ev);
  return {
    to: p.email,
    subject: `🎂 Surašykite savo gimtadienio norus`,
    html: layout(
      ev,
      `Labas, ${e(p.name)}!`,
      `<p>${e(ev.hostName)} organizuoja dovanas jūsų gimtadieniui. Surašykite iki ${wishCount} norų ar idėjų – svečiai juos pamatys ir pasirinks, ką dovanoti. Jūs nematysite, kas ką pasirinko 🤫</p>${d.html}`,
      { label: "Surašyti mano norus", href: link },
    ),
    text: `Labas, ${p.name}!\n\n${ev.hostName} organizuoja dovanas jūsų gimtadieniui. Surašykite norus:\n${link}\n\n${d.text}`,
  };
}

export function guestWishlistMail(
  ev: Ev,
  guest: Pick<Participant, "name" | "email">,
  celebrantName: string,
  wishes: WishLike[],
  link: string,
): Mail {
  const d = details(ev);
  const w = wishList(wishes);
  return {
    to: guest.email,
    subject: `🎂 ${celebrantName} gimtadienis – norų sąrašas`,
    html: layout(
      ev,
      `Labas, ${e(guest.name)}!`,
      `<p>Štai ką norėtų gauti <strong>${e(celebrantName)}</strong>:</p>${w.html}<p>Paspauskite mygtuką ir pasirinkite (rezervuokite), ką dovanosite – kad dovanos nesidubliuotų.</p>${d.html}`,
      { label: "Pasirinkti dovaną", href: link },
    ),
    text: `Labas, ${guest.name}!\n\n${celebrantName} norai:\n${w.text}\n\nPasirinkite, ką dovanosite:\n${link}\n\n${d.text}`,
  };
}

export function reminderMail(ev: Ev, p: Pick<Participant, "name" | "email">, link: string): Mail {
  const deadline = ev.wishlistDeadline ? ` iki ${formatDate(ev.wishlistDeadline)}` : "";
  return {
    to: p.email,
    subject: `⏰ Priminimas: ${ev.title}`,
    html: layout(
      ev,
      `Labas, ${e(p.name)}!`,
      `<p>Primename: dar nesurašėte savo norų ir nepaspaudėte „Baigiau“. Prašome tai padaryti${e(deadline)}, kad galėtume traukti burtus.</p>`,
      { label: "Surašyti norus", href: link },
    ),
    text: `Labas, ${p.name}!\n\nPrimename surašyti norus${deadline}:\n${link}`,
  };
}

export function allDoneMail(ev: Ev, hostEmail: string, adminLink: string, birthday: boolean): Mail {
  const body = birthday
    ? `<p>Jubiliatas surašė savo norus. Dabar galite išsiųsti norų sąrašą svečiams.</p>`
    : `<p>Visi dalyviai surašė norus ir paspaudė „Baigiau“. Galite traukti burtus!</p>`;
  return {
    to: hostEmail,
    subject: birthday ? `Norai surašyti: ${ev.title}` : `Visi baigė – galima traukti burtus: ${ev.title}`,
    html: layout(ev, `Labas, ${e(ev.hostName)}!`, body, { label: "Atidaryti valdymą", href: adminLink }),
    text: `${birthday ? "Jubiliatas surašė norus." : "Visi dalyviai baigė – galite traukti burtus."}\n${adminLink}`,
  };
}

export function drawResultMail(
  ev: Ev,
  giver: Pick<Participant, "name" | "email">,
  receiverName: string,
  wishes: WishLike[],
  link: string,
): Mail {
  const d = details(ev);
  const w = wishList(wishes);
  return {
    to: giver.email,
    subject: `${THEMES[ev.type].emoji} Burtai ištraukti – sužinokite, kam dovanojate`,
    html: layout(
      ev,
      `Labas, ${e(giver.name)}!`,
      `<p>Burtai ištraukti! Jūs dovanojate:</p>
       <p style="font-size:26px;font-weight:800;margin:8px 0 16px;color:${THEMES[ev.type].accent}">${e(receiverName)}</p>
       <p>${e(receiverName)} norai:</p>${w.html}
       <p style="color:#6b7280">🤫 Niekam nesakykite!</p>${d.html}`,
      { label: "Peržiūrėti svetainėje", href: link },
    ),
    text: `Labas, ${giver.name}!\n\nBurtai ištraukti. Jūs dovanojate: ${receiverName}\n\nNorai:\n${w.text}\n\n${d.text}\n\n${link}`,
  };
}

export function drawResetMail(ev: Ev, p: Pick<Participant, "name" | "email">): Mail {
  return {
    to: p.email,
    subject: `Burtai bus traukiami iš naujo: ${ev.title}`,
    html: layout(
      ev,
      `Labas, ${e(p.name)}!`,
      `<p>Organizatorius ${e(ev.hostName)} atšaukė ankstesnius burtus. <strong>Ankstesnis rezultatas nebegalioja.</strong> Netrukus gausite naują laišką.</p>`,
    ),
    text: `Labas, ${p.name}!\n\nAnkstesni burtai „${ev.title}“ atšaukti ir nebegalioja. Netrukus gausite naują laišką.`,
  };
}
