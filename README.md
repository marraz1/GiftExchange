# GiftExchange

Nemokama svetainė slaptam dovanų keitimuisi: Kalėdoms, gimtadieniams ir kitoms progoms.

- **Kalėdos / Kita proga** – organizatorius sukuria progą ir įveda dalyvius, kiekvienas per asmeninę nuorodą
  surašo iki 3 norų ir pažymi „Baigiau“, organizatorius traukia burtus, kiekvienas el. paštu gauna, kam dovanoja
  ir ką tas žmogus nori. Savęs niekas negauna.
- **Gimtadienis** – jubiliatas surašo iki 6 norų, svečiai gauna sąrašą ir rezervuoja, ką dovanos (jubiliatas
  nemato, kas ką pasirinko).

Reikalavimai: [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md)

## Technologijos (viskas nemokama)

| Sritis | Kas | Planas |
|---|---|---|
| Svetainė | Next.js 16 (App Router, Server Actions), Tailwind 4 | — |
| Hostingas + cron | Vercel | Hobby (nemokamas) |
| Duomenų bazė | Neon Postgres + Drizzle ORM | Free |
| El. laiškai | Resend (atsarginis variantas – Gmail SMTP) | Free: 3000 laiškų/mėn., 100/d. |

## Aplinkos kintamieji

Žr. [`.env.example`](.env.example).

| Kintamasis | Paskirtis |
|---|---|
| `DATABASE_URL` | Neon prisijungimo eilutė |
| `TOKEN_SECRET` | Slaptas raktas nuorodų pasirašymui (`openssl rand -base64 32`). **Nekeiskite** – pasikeitus visos nuorodos nustos veikti |
| `RESEND_API_KEY` | Resend API raktas (resend.com → API Keys) |
| `EMAIL_FROM` | Siuntėjas, pvz. `Dovanų keitimasis <dovanos@jusu-domenas.lt>`. Reikia patvirtinto domeno |
| `APP_URL` | Svetainės adresas, pvz. `https://gift-exchange.vercel.app` (Vercel'yje neprivalomas) |
| `CRON_SECRET` | Apsaugo `/api/cron/cleanup` (Vercel jį perduoda automatiškai) |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD` | Nebūtina: Gmail SMTP vietoje Resend, jei `RESEND_API_KEY` nenustatytas |

### Resend

1. Užsiregistruokite <https://resend.com> (nemokamai) ir sukurkite API raktą: **API Keys → Create API Key** (teisė „Sending access“).
2. Raktą įrašykite į `RESEND_API_KEY`.
3. **Svarbu:** kol nepatvirtintas domenas, Resend leidžia siųsti laiškus **tik į jūsų Resend paskyros el. paštą**
   (siuntėjas `onboarding@resend.dev`). Tikriems dalyviams reikia domeno:
   **Domains → Add Domain**, įrašykite Resend pateiktus DNS įrašus pas domeno registratorių, palaukite patvirtinimo
   ir nustatykite `EMAIL_FROM`, pvz. `Dovanų keitimasis <dovanos@jusu-domenas.lt>`.

Be jokio el. pašto rakto vietinėje aplinkoje laiškai tik išvedami į konsolę.

## Vietinis paleidimas

```bash
npm install
cp .env.example .env.local   # užpildykite reikšmes
npm run db:migrate           # sukuria lenteles Neon DB
npm run dev
```

## Komandos

- `npm test` – unit testai (burtų algoritmas, nuorodų parašai, Resend siuntimas)
- `npm run typecheck` – TypeScript patikra
- `npm run db:generate` – nauja migracija pakeitus `src/lib/db/schema.ts`

## Struktūra

```
src/app/                 puslapiai: /, /new, /admin/[token], /p/[token], /recover, /privatumas
src/app/actions/         Server Actions (kūrimas, valdymas, dalyvio veiksmai)
src/app/api/cron/cleanup kasdien ištrina progas praėjus 30 d. po datos
src/lib/draw.ts          burtų algoritmas (vienas atsitiktinis ciklas – niekas negauna savęs)
src/lib/tokens.ts        HMAC pasirašytos nuorodos
src/lib/email/           Resend (arba Gmail SMTP) siuntimas ir laiškų šablonai
src/lib/db/schema.ts     duomenų modelis
drizzle/                 SQL migracijos
```
