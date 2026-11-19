# GiftExchange

Nemokama svetainė slaptam dovanų keitimuisi: Kalėdoms, gimtadieniams ir kitoms progoms.

- **Kalėdos / Kita proga** – organizatorius sukuria progą ir įveda dalyvius, kiekvienas per asmeninę nuorodą
  surašo iki 10 norų ir pažymi „Baigiau“, organizatorius traukia burtus, kiekvienas el. paštu gauna, kam dovanoja
  ir ką tas žmogus nori. Savęs niekas negauna.
- **Gimtadienis** – jubiliatas surašo iki 10 norų, svečiai gauna sąrašą ir rezervuoja, ką dovanos (jubiliatas
  nemato, kas ką pasirinko).

Reikalavimai: [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md)

## Technologijos (viskas nemokama)

| Sritis | Kas | Planas |
|---|---|---|
| Svetainė | Next.js 16 (App Router, Server Actions), Tailwind 4 | — |
| Hostingas + cron | Vercel | Hobby (nemokamas) |
| Duomenų bazė | Neon Postgres + Drizzle ORM | Free |
| El. laiškai | Gmail SMTP per Nodemailer | nemokamas (~500 laiškų/d.) |

## Aplinkos kintamieji

Žr. [`.env.example`](.env.example).

| Kintamasis | Paskirtis |
|---|---|
| `DATABASE_URL` | Neon prisijungimo eilutė |
| `TOKEN_SECRET` | Slaptas raktas nuorodų pasirašymui (`openssl rand -base64 32`). **Nekeiskite** – pasikeitus visos nuorodos nustos veikti |
| `GMAIL_USER` | Gmail adresas, iš kurio siunčiami laiškai |
| `GMAIL_APP_PASSWORD` | Gmail „App password“ (ne įprastas slaptažodis) |
| `APP_URL` | Svetainės adresas, pvz. `https://gift-exchange.vercel.app` (Vercel'yje neprivalomas) |
| `CRON_SECRET` | Apsaugo `/api/cron/cleanup` (Vercel jį perduoda automatiškai) |

### Gmail App password

1. Google paskyroje įjunkite **2-Step Verification**: <https://myaccount.google.com/security>.
2. Atidarykite <https://myaccount.google.com/apppasswords>, sukurkite slaptažodį (pvz. „GiftExchange“).
3. 16 simbolių slaptažodį įrašykite į `GMAIL_APP_PASSWORD`, o savo Gmail adresą – į `GMAIL_USER`.

Be šių kintamųjų vietinėje aplinkoje laiškai tik išvedami į konsolę.

## Vietinis paleidimas

```bash
npm install
cp .env.example .env.local   # užpildykite reikšmes
npm run db:migrate           # sukuria lenteles Neon DB
npm run dev
```

## Komandos

- `npm test` – unit testai (burtų algoritmas, nuorodų parašai)
- `npm run typecheck` – TypeScript patikra
- `npm run db:generate` – nauja migracija pakeitus `src/lib/db/schema.ts`

## Struktūra

```
src/app/                 puslapiai: /, /new, /admin/[token], /p/[token], /recover, /privatumas
src/app/actions/         Server Actions (kūrimas, valdymas, dalyvio veiksmai)
src/app/api/cron/cleanup kasdien ištrina progas praėjus 30 d. po datos
src/lib/draw.ts          burtų algoritmas (vienas atsitiktinis ciklas – niekas negauna savęs)
src/lib/tokens.ts        HMAC pasirašytos nuorodos
src/lib/email/           Gmail SMTP siuntimas ir laiškų šablonai
src/lib/db/schema.ts     duomenų modelis
drizzle/                 SQL migracijos
```
