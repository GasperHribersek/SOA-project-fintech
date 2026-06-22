# ZAGOVOR — Naloga 2 (Mikrostoritve)

Moj del projekta: **transactions-service** in **budget-service**.

---

## 1. Kaj je point naloge 2

Naloga 2 je jedro projekta — razvoj mikrostoritev. Bistvo:
- Vsaka storitev = ena samostojna funkcionalnost, svoja baza, svoj Docker container.
- Storitve so **neodvisne**, a se znajo **med seboj klicati** preko mreže (HTTP).
- Vse skupaj se zapakira in zažene z enim `docker-compose up`.

Konkretne zahteve iz `navodila/naloga2.txt`:
1. Načrt mikrostoritev
2. **≥2 GET, ≥2 POST, ≥2 PUT, ≥2 DELETE** v vsaki storitvi
3. Vsaka storitev ima **lastno bazo**
4. **Dockerfile** za vsako storitev
5. Dobre prakse + optimizacija (alpine slike, obvladovanje povezav z bazo)
6. Vsaka storitev se **povezuje z eno drugo**
7. V skupini **≥3 različna ogrodja**

---

## 2. Moj del = 2 mikrostoritvi

Ker je skupina 3–4 člane, vsak naredi vsaj 2 mikrostoritvi (naloga1.txt). Moji dve sta:

| Storitev | Port | Mapa | Kaj počne |
|---|---|---|---|
| **transactions-service** | 3003 | `transactions-service/` | Upravljanje transakcij uporabnika |
| **budget-service** | 3004 | `budget-service/` | Upravljanje proračunov (limit + poraba) |

Obe sta v **Node.js + Express**, z **PostgreSQL** bazo.

---

## 3. Kje je kaj (struktura storitve)

Obe storitvi imata enako zgradbo (primer transactions-service):

```
transactions-service/
├── Dockerfile                 ← pakiranje v container
├── package.json               ← odvisnosti (express, pg, jsonwebtoken...)
├── .env                       ← nastavitve (DB, port, JWT, RabbitMQ)
└── src/
    ├── index.js               ← vstopna točka: zažene strežnik, middleware
    ├── db/pool.js             ← povezava na PostgreSQL bazo
    ├── models/Transaction.js  ← SQL za kreiranje tabele
    ├── routes/transactions.js ← VSI endpointi (GET/POST/PUT/DELETE)
    ├── middleware/auth.js     ← JWT preverjanje (naloga3)
    ├── utils/logger.js        ← RabbitMQ logiranje (naloga4)
    └── swagger.js             ← API dokumentacija
```

---

## 4. Zahteva: 2×GET / 2×POST / 2×PUT / 2×DELETE

Najpomembnejša točka. Vse je v `routes/`.

### transactions-service (`src/routes/transactions.js`)
| Metoda | Pot | Kaj |
|---|---|---|
| GET | `/transactions` | vse transakcije uporabnika |
| GET | `/transactions/:id` | ena transakcija po ID |
| POST | `/transactions` | nova transakcija |
| POST | `/transactions/import` | masovni uvoz |
| PUT | `/transactions/:id` | posodobi celotno |
| PUT | `/transactions/:id/category` | posodobi le kategorijo |
| DELETE | `/transactions/:id` | izbriši eno |
| DELETE | `/transactions/user/me` | izbriši vse uporabnikove |

### budget-service (`src/routes/budgets.js`)
| Metoda | Pot | Kaj |
|---|---|---|
| GET | `/budgets` | vsi proračuni |
| GET | `/budgets/:id` | en proračun |
| POST | `/budgets` | nov proračun |
| POST | `/budgets/update-spend` | povečaj porabo |
| PUT | `/budgets/:id` | posodobi celoten |
| PUT | `/budgets/:id/limit` | posodobi le limit |
| DELETE | `/budgets/:id` | izbriši enega |
| DELETE | `/budgets/user/me` | izbriši vse |

✅ Vsaka storitev ima točno **2 od vsake** metode (in nekaj več).

---

## 5. Zahteva: lastna baza

- Vsaka storitev ima **svojo ločeno PostgreSQL bazo** — ne deljeno.
- Povezava: `src/db/pool.js` uporablja `pg` connection **pool** (ne ena povezava na zahtevek
  — to je optimizacija iz točke 5 navodil).
- V `docker-compose.yml`:
  - `transactions-db` (Postgres) → baza `transactionsdb`, port 5434
  - `budget-db` (Postgres) → baza `budgetdb`, port 5435
- Tabela se ustvari samodejno ob zagonu (`models/Transaction.js`, klicano iz `index.js`
  → `waitForDB()` + `createTable`).

**Za zagovor:** v skupini uporabljamo več tipov baz — auth/user uporabljata MySQL,
analytics + moji dve uporabljata PostgreSQL.

---

## 6. Zahteva: Dockerfile + optimizacija

`transactions-service/Dockerfile`:
```dockerfile
FROM node:20-alpine            # alpine = majhna slika (zahteva iz točke 5)
WORKDIR /app
COPY package*.json ./
RUN npm install --production   # le produkcijske odvisnosti
COPY . .
EXPOSE 3003
CMD ["node", "src/index.js"]
```
Točke za zagovor: **alpine** osnovna slika (manjša velikost), `--production` (brez dev
paketov), `COPY package*.json` ločeno pred `COPY . .` (Docker layer caching).

---

## 7. Zahteva: povezava z drugo storitvijo ⭐

Najbolj verjetno vprašano.

**Scenarij:** ko uporabnik ustvari transakcijo, mora to vplivati na porabo proračuna.

V `transactions-service/src/routes/transactions.js`:
- Na vrhu definirana funkcija `syncBudgetSpend()` in `BUDGET_SERVICE_URL`
  (`http://budget-service:3004`).
- V `POST /transactions` handlerju se po vstavitvi v bazo pokliče:

```js
await syncBudgetSpend(req, amount);
```

Ta naredi HTTP `POST` na `budget-service` `/budgets/update-spend` in **poveča porabo**
(`spent`) v proračunu. Pri tem **posreduje naprej JWT žeton in correlation ID**.

➡️ **Za zagovor:** to je prava medstoritvena komunikacija — `transactions-service` ne ve,
kako budget hrani podatke, samo pokliče njegov API. Če budget pade, transakcija vseeno uspe
(`try/catch` — graceful degradation).

V Dockerju se kličeta po **imenu containerja** (`budget-service`), ne po `localhost` — to
omogoča Docker mreža `fintech-network`.

---

## 8. Zahteva: ≥3 ogrodja v skupini

Na ravni skupine:
- **Express (Node.js)** — moji storitvi + auth + user
- **Flask (Python)** — analytics_server
- **Next.js (React)** — sua_ui frontend

✅ ≥3 ogrodij. Moj prispevek: Express + PostgreSQL + pg pool.

---

## 9. Kako vse skupaj poženem (za demo)

```bash
docker-compose up --build -d
```
To zgradi in zažene vse: baze, RabbitMQ, vse storitve. Moji storitvi sta dosegljivi na:
- Transactions Swagger: `http://localhost:3003/api-docs`
- Budget Swagger: `http://localhost:3004/api-docs`

**Demo tok:** prijava (auth-service) → dobim JWT → `POST /transactions` z
`Authorization: Bearer <token>` → transakcija se shrani **in** se samodejno posodobi poraba
v budget-service → preverim z `GET /budgets`.

---

## 10. Najverjetnejša vprašanja na zagovoru

| Vprašanje | Odgovor |
|---|---|
| "Pokaži 2 GET/POST/PUT/DELETE" | `routes/transactions.js` in `routes/budgets.js` (tabela zgoraj) |
| "Kako se storitvi povezujeta?" | transactions POST kliče budget `/update-spend` preko axios, po imenu containerja v Docker mreži |
| "Kje je lastna baza?" | vsaka svoj Postgres container; `db/pool.js` + docker-compose |
| "Kako optimiziraš vire?" | connection pool (`pg`), alpine slike, `npm install --production` |
| "Zakaj mikrostoritve in ne monolit?" | neodvisno skaliranje/razvoj/namestitev, odpornost (naloga2.txt tabela) |

---
---

# ZAGOVOR — Naloga 3 (Varnost / JWT)

Izbrana **Možnost A** (lastni JWT žetoni, deljena skrivnost). NE SSO ponudnik (to bi bila Možnost B).

## 1. Kaj je point naloge 3

Zavarovati komunikacijo med odjemalcem in storitvami z **JWT žetoni**:
- Ena storitev (**auth-service**) ob prijavi izda **JWT žeton**.
- Odjemalec ga pošilja v glavi vsakega zahtevka: `Authorization: Bearer <token>`.
- Vsaka storitev žeton **preveri** (veljavnost + kdo je uporabnik), preden izvede operacijo.
- Verifikacija prek **deljene skrivnosti** (`JWT_SECRET`) — vsaka storitev sama preveri podpis,
  brez klica na auth.
- Na odjemalcu se napake (neveljaven/potekel žeton) prikažejo kot **toast** sporočila.

### Zakaj Možnost A (in ne B)?
- Lasten auth-service izda žeton z `jwt.sign(...)` — brez Auth0/Okta.
- Payload ima točno zahtevane atribute: `sub`, `name`, `iat`, `exp`.
- Verifikacija z deljeno skrivnostjo — navodila A to izrecno dovolijo.
- Možnost B bi zahtevala zunanji SSO + refresh token tok, ki ga nimamo.
- Žeton velja 24h (`expiresIn: '24h'`), brez refresh mehanizma — za A povsem v redu.

## 2. Moj del

Auth-service (izdaja žetonov) je delo drugega člana. **Moja naloga pri 3** je, da sta obe
moji storitvi (transactions + budget) **zaščiteni** — preverjata JWT na vsakem zaščitenem
endpointu. To je v `transactions-service/src/middleware/auth.js` in
`budget-service/src/middleware/auth.js`.

## 3. Kje je kaj

### Izdaja žetona (kontekst — auth-service)
`auth-service/src/controllers/authController.js` (~vrstica 88), ob prijavi:
```js
const token = jwt.sign(
  {
    sub: user.id.toString(),  // Subject = ID uporabnika
    name: user.username,      // ime
    email: user.email
  },
  JWT_SECRET,
  { expiresIn: '24h' }        // iat in exp doda jwt.sign samodejno
);
```
Payload vsebuje vse 4 zahtevane atribute: **`sub`, `name`, `iat`, `exp`**.

### Preverjanje žetona (MOJ del) — `src/middleware/auth.js`
```js
const jwt = require("jsonwebtoken");

module.exports = function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];   // del za "Bearer "

  if (!token) {
    return res.status(401).json({ error: "Manjka JWT token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);  // preveri podpis + potek
    req.user = { id: decoded.sub, name: decoded.name };         // izvleče uporabnika
    next();
  } catch (err) {
    return res.status(403).json({ error: "Neveljaven ali potekel JWT" });
  }
};
```

### Uporaba na endpointih — `routes/transactions.js`, `routes/budgets.js`
```js
router.get("/", auth, async (req, res) => {
  const userId = req.user.id;   // ID iz žetona, ne od odjemalca
  ...
});
```

## 4. Ključne točke za zagovor

**a) Deljena skrivnost** — vse storitve uporabljajo isti `JWT_SECRET` (`soa-je-kul`),
nastavljen v `docker-compose.yml` in `.env`. Zato moja storitev sama preveri žeton, brez
klica na auth (hitreje, bolj odporno).

**b) Varnost podatkov** — `userId` se nikoli ne zaupa odjemalcu, vzame se iz `req.user.id`
(iz žetona). SQL filtrira `WHERE userId=$1` → uporabnik vidi samo svoje podatke.

**c) HTTP statusi** — `401` = žeton manjka; `403` = žeton neveljaven/potekel.

**d) Posredovanje žetona naprej (povezava z nalogo 2)** — ko transactions kliče budget
(`syncBudgetSpend`), posreduje isti `Authorization` header naprej:
```js
headers: { Authorization: req.headers.authorization, ... }
```
Varnost se ohrani skozi celo verigo storitev.

**e) Swagger** — v `swagger.js` definiran `bearerAuth` scheme; v Swagger UI gumb "Authorize"
za testiranje zaščitenih endpointov.

**f) Odjemalec lovi napake → toast** (frontend, del Možnosti A) —
`sua_ui/lib/error-handler.ts` + `components/ui/toast.tsx`, ob `401/403` prikaže toast.

## 5. Demo tok za zagovor

1. **Brez žetona:** `GET http://localhost:3003/transactions` → `401 Manjka JWT token`.
2. **Prijava:** `POST http://localhost:3001/api/auth/login` → dobiš `token`.
3. **Z žetonom:** isti GET z glavo `Authorization: Bearer <token>` → `200` + podatki.
4. **Pokvarjen žeton:** spremeniš en znak → `403 Neveljaven ali potekel JWT`.

## 6. Pričakovana vprašanja

| Vprašanje | Odgovor |
|---|---|
| "Katera možnost, A ali B?" | A — lastni JWT, deljena skrivnost (ne SSO) |
| "Kako preveriš žeton?" | `jwt.verify(token, JWT_SECRET)` v `middleware/auth.js` |
| "Kateri atributi so v žetonu?" | `sub`, `name`, `iat`, `exp` (+ email) |
| "Zakaj ti ni treba klicati auth-service?" | deljena skrivnost — vsaka storitev sama preveri podpis |
| "Razlika 401 vs 403?" | 401 = manjka žeton, 403 = neveljaven/potekel |
| "Kako preprečiš dostop do tujih podatkov?" | `userId` iz žetona; SQL filtrira po `req.user.id` |
| "Kako ostane varnost pri klicu budget?" | transactions posreduje `Authorization` header naprej |

---
---

# ZAGOVOR — Naloga 4 (Messaging / RabbitMQ logiranje)

## 1. Kaj je point naloge 4

Vpeljati **asinhrono beleženje (logging)** preko sporočilnega posrednika **RabbitMQ**
(vzorec Messaging):
- Vsaka mikrostoritev ob klicih ustvari **log** in ga **ne piše neposredno v bazo**, ampak
  ga **pošlje v RabbitMQ** (sporočilno vrsto).
- Logi se pošiljajo preko **Exchange → Queue**.
- Vsak log nosi **correlation ID** — za sledenje isti zahtevi skozi več storitev.
- Struktura loga: `<timestamp> <LogType> <URL> <CorrelationId> <imeAplikacije> - <Sporočilo>`.
- Ločena storitev **log-service** zna iz vrste prenesti loge in jih shraniti/brati/brisati.

**Zakaj posrednik?** Storitve so razbremenjene (logiranje ne blokira zahtevka), logi so
centralizirani, sistem je odporen (če pade log-service, sporočila čakajo v vrsti).

## 2. Moj del

`log-service` (porabnik vrste) je skupna/drugi član. **Moja naloga pri 4** je, da obe moji
storitvi (transactions + budget) **proizvajata loge in jih pošiljata v RabbitMQ s correlation
ID**. To je v `transactions-service/src/utils/logger.js` in
`budget-service/src/utils/logger.js` (+ vključitev v `index.js`).

## 3. Kje je kaj

### a) Logger — `src/utils/logger.js`
Razred `Logger`, ki se ob zagonu poveže na RabbitMQ in pripravi Exchange + Queue:
```js
this.exchange = 'logs_exchange';     // moj Exchange
this.queue = 'logging_queue';        // logging queue
await this.channel.assertExchange(this.exchange, 'fanout', { durable: true });
await this.channel.assertQueue(this.queue, { durable: true });
await this.channel.bindQueue(this.queue, this.exchange, '');
```
Metoda `log()` zgradi log v predpisani strukturi in ga objavi:
```js
const logMessage = `${timestamp} ${level} ${url} Correlation: ${correlationId} [${serviceName}] - ${message}`;
this.channel.publish(this.exchange, '', Buffer.from(JSON.stringify(logData)), { persistent: true });
```
Ujema se z vzorcem:
`2020-12-15 16:26:04 INFO http://... Correlation: 123 [transactions-service] - <sporočilo>`

### b) Correlation ID — `correlationMiddleware`
```js
req.correlationId = req.headers['x-correlation-id'] || uuidv4();
res.setHeader('X-Correlation-Id', req.correlationId);
```
Če zahtevek že ima correlation ID (iz druge storitve), ga obdrži; sicer ustvari novega.

### c) Avtomatsko logiranje — `loggingMiddleware`
Loga ob prejemu zahtevka in ob zaključku (status + trajanje). ERROR za status ≥ 400, sicer INFO.

### d) Vključitev — `src/index.js`
```js
const logger = getLogger("transactions-service");
app.use(correlationMiddleware("transactions-service"));
app.use(loggingMiddleware(logger));
```

### e) RabbitMQ v `docker-compose.yml`
```yaml
rabbitmq:
  image: rabbitmq:3-management-alpine
  ports: ["5672:5672", "15672:15672"]   # AMQP + Management UI
```
Povezava prek `RABBITMQ_URL: amqp://admin:admin123@rabbitmq:5672`.

## 4. Correlation ID skozi storitve (ključno!)

Ko transactions kliče budget (naloga 2), **posreduje correlation ID naprej**:
```js
// transactions-service/src/routes/transactions.js → syncBudgetSpend()
headers: {
  Authorization: req.headers.authorization,
  "X-Correlation-Id": req.correlationId,   // isti ID gre v budget
}
```
En zahtevek (ustvari transakcijo → posodobi proračun) ustvari loge v **obeh** storitvah z
**istim correlation ID** → popolna sledljivost.

## 5. Storitev za branje logov (kontekst — log-service)

`log-service` je porabnik vrste z 3 endpointi (`routes/logRoutes.js`):
- `POST /logs` → prenese vse loge iz `logging_queue` v bazo
- `GET /logs/{datumOd}/{datumDo}` → izpiše loge med datumoma
- `DELETE /logs` → izbriše vse loge

Moji storitvi sta **proizvajalca**, log-service je **porabnik** iste vrste `logging_queue`.

## 6. Demo tok za zagovor

1. Zaženeš sistem → RabbitMQ UI: `http://localhost:15672` (admin / admin123).
2. `POST /transactions` (z žetonom) → log se pojavi v konzoli in v vrsti `logging_queue`.
3. Ker transactions kliče budget, vidiš loge v **obeh** storitvah z **istim** correlation ID.
4. `POST http://localhost:5002/logs` → log-service prenese loge iz vrste v bazo.
5. `GET http://localhost:5002/logs/2026-01-01/2026-12-31` → izpiše shranjene loge.

## 7. Pričakovana vprašanja

| Vprašanje | Odgovor |
|---|---|
| "Kateri posrednik?" | RabbitMQ, lastna instanca v docker-compose |
| "Exchange / Queue?" | `logs_exchange` (fanout, durable) → `logging_queue` |
| "Kako pošiljaš log?" | `channel.publish()` v `utils/logger.js`, ne pišem v bazo direktno |
| "Kaj je correlation ID in zakaj?" | ID, ki sledi zahtevi skozi več storitev; iz headerja ali nov `uuid` |
| "Kako ID potuje med storitvama?" | transactions ga posreduje budgetu prek `X-Correlation-Id` headerja |
| "Struktura loga?" | `timestamp LEVEL URL Correlation: id [service] - msg` |
| "Zakaj asinhrono prek vrste?" | razbremenitev storitev, odpornost, centralizacija logov |

---
---

# ZAGOVOR — Naloga 5 (Statistika + Cloud namestitev)

## 1. Kaj je point naloge 5

Razviti **ločeno statistično storitev**, nameščeno v **oblaku (PaaS)**, ki beleži statistiko
klicev API-jev:
- Poveže se na **cloud bazo**.
- Ima **Swagger** in **4 klice**:
  - `GET` zadnji klican endpoint
  - `GET` najpogosteje klican endpoint
  - `GET` število klicev po posameznem endpointu
  - `POST` posodobi podatke — ta klic **oddaljeno kličejo druge storitve** in javijo, katera
    je bila klicana (telo: `{ klicanaStoritev: ... }`)
- Namestiti na cloud ponudnika (Azure / Render / Railway ...).
- Frontend dobi podstran s prikazom statistike.

**Bistvo:** vsaka storitev ob klicu "javi" statistični storitvi v oblaku, kateri endpoint je
bil klican; ta zbira števce.

## 2. Moj del

`statistics-service` je razvil/namestil drug član. **Moja naloga pri 5** je, da obe moji
storitvi (transactions + budget) **oddaljeno javljata vsak klic** statistični storitvi v
oblaku (POST `klicanaStoritev`). To je v `transactions-service/src/index.js` in
`budget-service/src/index.js` (statistics tracking middleware).

## 3. Kje je kaj

### a) Javljanje statistike (MOJ del) — `src/index.js`
```js
const STATISTICS_SERVICE_URL =
  process.env.STATISTICS_SERVICE_URL ||
  "https://selfless-perception-production.up.railway.app";   // cloud (Railway)

app.use((req, res, next) => {
  res.on("finish", () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {       // le uspešni klici
      axios.post(`${STATISTICS_SERVICE_URL}/api/stats/update`, {
        klicanaStoritev: `transactions-service: ${req.method} ${req.path}`
      }, { timeout: 3000 })
      .catch(err => console.error('Failed to track endpoint:', err.message));
    }
  });
  next();
});
```
Ključno za zagovor:
- POST z **`{ klicanaStoritev: ... }`** — točno format iz navodil.
- Kliče se na **oddaljeno cloud storitev** (Railway URL), ne lokalno.
- `res.on("finish")` → javim po obdelavi, **asinhrono** (ne blokira odgovora).
- `.catch()` → če statistika pade, moja storitev normalno deluje (graceful).

### b) Statistična storitev (kontekst — `statistics-service`)
- **4 endpointi** (`routes/statisticsRoutes.js` + `controllers/statisticsController.js`):
  - `GET /api/stats/last-called` → zadnji (`ORDER BY last_called DESC LIMIT 1`)
  - `GET /api/stats/most-frequent` → najpogostejši (`ORDER BY call_count DESC LIMIT 1`)
  - `GET /api/stats/all` → vsi z števci
  - `POST /api/stats/update` → poveča števec za `klicanaStoritev` (ali vstavi nov zapis)
- **Cloud baza:** MySQL (`config/database.js`), podpira Railway env spremenljivke.
- **Swagger** na `/swagger`.

### c) Frontend podstran
`sua_ui/app/statistics/page.tsx` → prikaže število klicev po endpointu (`GET /api/stats/all`).

## 4. Cloud namestitev

Nameščeno na **Railway** (PaaS, brez kreditne kartice — alternativa Azure/Render). Bere env
spremenljivke, ki jih Railway injicira za MySQL bazo.
URL: `https://selfless-perception-production.up.railway.app`.
Storitev **dejansko teče v oblaku** — moji storitvi se nanjo povezujeta preko interneta.

## 5. Demo tok za zagovor

1. Narediš nekaj klicev: `GET /transactions`, `POST /transactions`, `GET /budgets`...
2. Vsak uspešen klic se asinhrono javi cloud statistiki.
3. Preveriš v oblaku:
   - `GET .../api/stats/last-called` → npr. `transactions-service: POST /transactions`
   - `GET .../api/stats/most-frequent` → najbolj klican
   - `GET .../api/stats/all` → seznam s števci
4. Frontend `http://localhost:3000/statistics` → graf/tabela klicev.

## 6. Pričakovana vprašanja

| Vprašanje | Odgovor |
|---|---|
| "Kako storitev javi statistiko?" | `axios.post('/api/stats/update', { klicanaStoritev })` v `index.js` |
| "Kdaj javiš?" | po obdelavi (`res.on('finish')`), le pri 2xx, asinhrono |
| "Kaj če statistika pade?" | `.catch()` — moja storitev deluje naprej |
| "Kje je nameščeno?" | Railway (cloud PaaS), MySQL cloud baza |
| "Katere 4 klice ima?" | last-called, most-frequent, all, update (POST) |
| "Kje je format `klicanaStoritev`?" | telo POST zahtevka, točno po navodilih |
| "Kje je frontend prikaz?" | `sua_ui/app/statistics/page.tsx` (`GET /api/stats/all`) |
