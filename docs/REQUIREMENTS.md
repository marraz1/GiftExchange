# Gift Exchange – reikalavimai

> **Priimti sprendimai (2026-11-16)** – jie keičia žemiau esančius punktus:
> - Viskas tik nemokamuose planuose (Vercel Hobby, Neon Free).
> - El. laiškai siunčiami per **Gmail SMTP** (Nodemailer + App password), ne per Resend – Resend be nuosavo (mokamo) domeno leidžia siųsti tik sau.
> - **Gimtadienis** veikia kitaip: burtų nėra. Jubiliatas surašo iki 10 norų, organizatorius išsiunčia sąrašą svečiams, svečiai rezervuoja dovanas (kiti mato, kad užimta; jubiliatas nemato).
> - Suma – rekomenduojama vienos dovanos (gimtadieniui – vieno svečio) suma.
> - Nuorodos – HMAC pasirašytos (`<id>.<parašas>`), todėl hostas gali bet kada nukopijuoti dalyvio nuorodą; ištrynus dalyvį nuoroda nebegalioja.

## 1. Tikslas
Svetainė dovanų keitimuisi („Secret Santa“ principu) organizuoti: organizatorius (hostas) sukuria progą, įveda dalyvius, kiekvienas per asmeninę nuorodą įrašo 3 norus, hostas paspaudžia **Draw**, ir kiekvienas el. paštu gauna, kam dovanoja ir ką tas žmogus nori. Niekas negauna savęs.

## 2. Technologijos
| Sritis | Pasirinkimas |
|---|---|
| Framework | Next.js (App Router, TypeScript), Server Actions / Route Handlers |
| Hostingas | Vercel |
| DB | Neon Postgres (`@neondatabase/serverless`), ORM – Drizzle + migracijos |
| El. paštas | Resend + React Email šablonai |
| UI | Tailwind CSS, mobile-first |
| Validacija | Zod |
| Testai | Vitest (logika, draw), Playwright (E2E) |

Aplinkos kintamieji: `DATABASE_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, `APP_URL`, `TOKEN_SECRET`.

## 3. Rolės
- **Hostas** – sukuria progą, valdo dalyvius, siunčia kvietimus, daro Draw. Gali būti ir dalyvis.
- **Dalyvis** – per asmeninę nuorodą įrašo norus ir pažymi „Baigiau“.
- Paskyrų MVP nėra: prieiga per slaptas nuorodas (tokenus).

## 4. Funkciniai reikalavimai

### 4.1 Progos sukūrimas (hostas)
- F1. Pasirinkti progos tipą: **Kalėdos**, **Gimtadienis**, **Kita (savas pavadinimas)**. Tipas lemia temą (spalvos, ikonos, el. laiškų tekstai).
- F2. Laukai: pavadinimas (privalomas), hosto vardas ir el. paštas (privalomi), dovanos suma (skaičius + valiuta, numatyta EUR), keitimosi data (privaloma, ne praeityje), norų pildymo terminas (neprivalomas, ≤ keitimosi datos), papildoma žinutė dalyviams (neprivaloma, iki 500 simb.).
- F3. Sukūrus hostui siunčiamas laiškas su **administravimo nuoroda** (vienintelis būdas grįžti į valdymą). Nuoroda rodoma ir ekrane po sukūrimo.

### 4.2 Dalyviai
- F4. Pridėti dalyvius: vardas (privalomas, unikalus progoje) + el. paštas (privalomas, validus). Galimas masinis įvedimas (eilutė = `Vardas, email`).
- F5. Hostas gali pažymėti „Aš irgi dalyvauju“ – tampa dalyviu automatiškai.
- F6. Minimalus dalyvių skaičius – **3** (su 2 iškart aišku, kas ką traukė). Maksimalus – 100.
- F7. Dalyvius galima redaguoti / šalinti iki Draw. Po Draw – užrakinta (žr. 4.6).
- F8. (v2) Išimtys: poros, kurios neturi traukti viena kitos.

### 4.3 Kvietimai
- F9. Mygtukas „Siųsti kvietimus“ – kiekvienam dalyviui siunčiamas laiškas su **asmenine unikalia nuoroda** (`/p/{token}`), progos info (pavadinimas, suma, data, terminas, žinutė).
- F10. Galima pakartotinai išsiųsti kvietimą vienam dalyviui ir nukopijuoti jo nuorodą (jei laiškas nepasiekė – hostas gali persiųsti per messenger).
- F11. Naujai pridėtam dalyviui kvietimas siunčiamas atskirai.
- F12. Kvietimo statusas: neišsiųsta / išsiųsta / nepavyko (Resend klaida).

> Pastaba: idėjoje minima „pagal savo vardą“. Rekomenduojama asmeninė nuoroda (tokenas susietas su vardu), o ne bendra nuoroda su vardo pasirinkimu – kitaip bet kas galėtų pildyti už kitą. Bendra nuoroda su vardų sąrašu gali būti v2 opcija (su patvirtinimu per el. paštą).

### 4.4 Dalyvio puslapis
- F13. Atidarius nuorodą rodoma: „Sveikas, {Vardas}!“, progos info, suma, data, terminas.
- F14. **Iki 10 norų** (idėja ar daiktas; 2026-11-19 padidinta nuo 3): pavadinimas (privalomas bent 1, iki 200 simb.), neprivaloma nuoroda (URL) ir komentaras. Iš pradžių rodomi 3 laukai, mygtuku „Pridėti dar vieną norą“ – daugiau.
- F15. Mygtukas **„Baigiau“** – išsaugo ir pažymi dalyvį kaip užbaigusį. Iki Draw galima grįžti ir redaguoti (statusas lieka „baigė“, bet atnaujinami norai).
- F16. Po Draw dalyvio puslapis rodo, kam jis dovanoja ir to žmogaus norus (dubliuoja el. laišką, jei šis dingo).
- F17. Neteisingas / panaikintas tokenas → 404 puslapis be informacijos nutekėjimo.

### 4.5 Hosto valdymo skydelis (`/admin/{token}`)
- F18. Dalyvių sąrašas su statusais: kvietimas (išsiųstas/ne), norai (pildoma/baigė), progresas „7/10 baigė“.
- F19. Hostas **nemato** dalyvių norų ir poravimo rezultatų (kad ir pats galėtų dalyvauti slaptai).
- F20. Mygtukas „Priminti“ – siunčia priminimą tiems, kas dar nebaigė.
- F21. Progos duomenų redagavimas iki Draw.
- F22. Progos ištrynimas (su patvirtinimu) – ištrinami visi duomenys.

### 4.6 Draw
- F23. **Draw** aktyvus, kai visi dalyviai pažymėjo „Baigiau“. Jei ne visi – hostas gali spausti „Draw vis tiek“ su įspėjimu (nebaigusių norai bus tušti / „norų nenurodė“).
- F24. Algoritmas: atsitiktinis **vienas ciklas** (sumaišyti sąrašą kriptografiškai saugiu `crypto.randomInt` Fisher–Yates, i-tasis dovanoja (i+1)-ajam, paskutinis – pirmam). Garantuoja: niekas negauna savęs, kiekvienas gauna ir dovanoja lygiai vieną kartą. Su išimtimis (v2) – kartojimas / backtracking.
- F25. Draw vykdomas DB transakcijoje; progos statusas `drawn`, pakartotinis paspaudimas nieko nedaro (idempotentiškumas).
- F26. Po Draw kiekvienam dalyviui siunčiamas laiškas: „Tu dovanoji **{Vardas}**“, jo 3 norai, suma, keitimosi data.
- F27. Hostas mato laiškų siuntimo statusą ir gali pakartoti nepavykusį (tas pats rezultatas, ne naujas draw).
- F28. „Perdaryti draw“ (reset) – tik su aiškiu įspėjimu; visiems siunčiamas naujas laiškas „ankstesnis rezultatas negalioja“.

### 4.7 El. laiškai (Resend)
| Laiškas | Gavėjas | Kada |
|---|---|---|
| Progos sukūrimas + admin nuoroda | Hostas | Sukūrus |
| Kvietimas | Dalyvis | Hostas paspaudžia „Siųsti“ |
| Priminimas | Nebaigę dalyviai | Hostas paspaudžia / (v2) automatiškai likus 2 d. iki termino |
| „Visi baigė“ | Hostas | Paskutiniam dalyviui paspaudus „Baigiau“ |
| Draw rezultatas | Kiekvienas dalyvis | Po Draw |
| (v2) Priminimas apie keitimąsi | Visi | Likus 1 d. iki datos (Vercel Cron) |

- Laiškai lietuviškai, su progos tema, turi tekstinę versiją.
- Siuntimas per Resend batch API (iki 100 per užklausą); `email_log` lentelė saugo statusą ir Resend ID.
- Domeno verifikacija Resend'e (SPF/DKIM) būtina produkcijai.

## 5. Duomenų modelis (Neon Postgres)
```
events
  id uuid pk, type enum('christmas','birthday','custom'), title text,
  host_name text, host_email text, admin_token_hash text unique,
  budget_amount numeric(10,2) null, currency char(3) default 'EUR',
  exchange_date date, wishlist_deadline date null, message text null,
  status enum('draft','collecting','drawn') default 'draft',
  drawn_at timestamptz null, created_at, updated_at

participants
  id uuid pk, event_id fk -> events on delete cascade,
  name text, email text, token_hash text unique,
  is_host bool default false,
  invited_at timestamptz null, completed_at timestamptz null,
  created_at
  unique(event_id, lower(name)), unique(event_id, lower(email))

wishes
  id uuid pk, participant_id fk on delete cascade,
  position smallint check (1..3), title text, url text null, note text null
  unique(participant_id, position)

assignments
  event_id fk, giver_id fk -> participants, receiver_id fk -> participants,
  primary key(event_id, giver_id), unique(event_id, receiver_id),
  check (giver_id <> receiver_id)

email_log
  id uuid pk, event_id fk, participant_id fk null, kind text,
  resend_id text null, status enum('queued','sent','failed'), error text null, created_at
```
Tokenai: 32 baitų atsitiktiniai (base64url), DB saugomas tik SHA-256 hash.

## 6. Puslapiai / maršrutai
| Kelias | Paskirtis |
|---|---|
| `/` | Pradžia: paaiškinimas + „Sukurti progą“ |
| `/new` | Progos kūrimo forma (tipas, laukai, dalyviai) |
| `/admin/[token]` | Hosto skydelis |
| `/p/[token]` | Dalyvio norų forma / draw rezultatas |
| `/api/cron/reminders` | (v2) Vercel Cron priminimams |

Mutacijos – Server Actions su Zod validacija; kiekvienas veiksmas tikrina tokeną ir progos statusą.

## 7. Nefunkciniai reikalavimai
- **Saugumas:** tokenai neatspėjami, nerodomi loguose; rate limiting kūrimui ir laiškų siuntimui (pvz., max 5 progos/val. iš IP, max 3 kvietimų pakartojimai/dalyviui/val.); `noindex` asmeniniams puslapiams; XSS apsauga (React escaping, URL validacija norų nuorodoms – tik http/https).
- **Privatumas (BDAR):** saugomi tik vardai ir el. paštai; duomenys automatiškai ištrinami praėjus 30 d. po keitimosi datos (Cron); privatumo politikos puslapis; hostas gali ištrinti viską bet kada.
- **UX:** mobile-first, veikia be registracijos, kiekviena forma ≤ 1 ekrano mobiliajame; WCAG 2.1 AA kontrastas, klaviatūros navigacija.
- **Kalba:** LT (MVP), struktūra paruošta EN (i18n raktai).
- **Našumas:** puslapiai < 2 s LCP 4G ryšiu; Neon serverless driver.
- **Patikimumas:** Draw ir laiškų siuntimas atskirti – Draw įrašomas transakcija, laiškai siunčiami po to su pakartojimo galimybe.

## 8. Kraštutiniai atvejai
- Dalyvis pašalinamas po kvietimo → jo tokenas nebegalioja.
- Pasikartojantis vardas / el. paštas progoje → validacijos klaida.
- Bandymas keisti norus po Draw → tik skaitymo režimas.
- Resend klaida / bounce → statusas „nepavyko“, hostas gali kopijuoti nuorodą rankiniu būdu.
- Keitimosi data praėjo → proga archyvuojama, veiksmai užrakinti.
- Hostas pametė admin nuorodą → (MVP) forma „atsiųsti admin nuorodą iš naujo“ į hosto el. paštą.

## 9. Etapai
**MVP:** 4.1–4.7 (be v2 žymėtų), duomenų modelis, Vercel + Neon + Resend diegimas, draw unit testai, 1 E2E scenarijus (sukurti → 3 dalyviai užpildo → draw → laiškai).

**v2:** išimtys (poros), automatiniai priminimai (Cron), hosto paskyra (Neon Auth / magic link) su progų istorija, bendra nuoroda su vardo pasirinkimu, anoniminis klausimas gavėjui („koks dydis?“), EN kalba, šablonas „kartoti praėjusių metų progą“.

## 10. Priėmimo kriterijai (MVP)
1. Hostas per < 2 min sukuria progą su 5 dalyviais ir išsiunčia kvietimus.
2. Kiekvienas dalyvis gauna laišką su unikalia nuoroda, kuri rodo jo vardą.
3. Dalyvis įrašo 1–3 norus ir pažymi „Baigiau“; hostas mato statusą.
4. Draw negalimas su < 3 dalyviais.
5. Po Draw: 1000 atsitiktinių paleidimų teste – niekada savęs, kiekvienas gavėjas unikalus.
6. Kiekvienas dalyvis gauna laišką su gavėjo vardu ir jo norais; hostas nemato poravimo.
7. Pakartotinis Draw paspaudimas nesukuria naujo rezultato.
8. Svetainė veikia Vercel'e su Neon DB ir Resend laiškais iš verifikuoto domeno.

## 11. Atviri klausimai
- Gimtadienio proga: ar tai toks pat „Secret Santa“ tarp visų, ar visi dovanoja vienam jubiliatui (tada draw nereikia – tik bendras norų sąrašas / pinigų rinkimas)?
- Ar suma – rekomenduojamas biudžetas vienai dovanai, ar bendras rinkimas?
- Ar hostas turi matyti dalyvių norus (pvz., kai pats nedalyvauja)?
- Domeno pavadinimas el. laiškams (Resend reikalauja verifikuoto domeno).
