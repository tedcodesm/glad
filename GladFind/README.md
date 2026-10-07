# GlandFind

Kenya's medical search platform — connecting patients with hospitals, specialist services and
insurance-compatible care across all 47 counties.

This repository is an npm-workspace monorepo:

| Workspace | Stack | Purpose |
| --------- | ----- | ------- |
| `server/` | Node 20+, ESM, Express-free `node:http` router, Mongoose 9 | REST API |
| `client/` | React 19, Vite 8, React Router 7, Tailwind 3.4 | Single-page web client |

---

## Quick start

```bash
npm install          # installs both workspaces
npm run dev          # API on :3000, client on :5173
```

Then open <http://localhost:5173>.

`npm run dev` starts both processes together. To run them separately:

```bash
npm run start --workspace server
npm run dev   --workspace client
```

### No database required

The API defaults to `DATA_DRIVER=memory`, which serves the whole product from an in-process
seed dataset (6 hospitals, 27 services, 13 service categories, 7 insurance providers). Nothing
is installed, nothing is lost on restart — the app works immediately after `npm install`.

Copy `.env.example` to `.env` and set `DATA_DRIVER=mongo` when you want real persistence.

---

## Configuration

All variables are optional in memory mode.

| Variable | Default | Notes |
| -------- | ------- | ----- |
| `DATA_DRIVER` | `memory` | `memory` or `mongo` |
| `PORT` | `3000` | API listen port |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/glandfind` | Used when `DATA_DRIVER=mongo` |
| `JWT_SECRET` | dev-only fallback | **Set this in production** |
| `JWT_EXPIRES_IN` | `7d` | Token lifetime |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated allow-list |
| `VITE_API_URL` | *(empty)* | Set at client build time to target a separate API host |

In development the client calls same-origin `/api/*`, which Vite proxies to the API — so there is
no CORS preflight.

---

## Using MongoDB

```bash
cp .env.example .env          # then set DATA_DRIVER=mongo
npm run db:seed --workspace server
npm start --workspace server
```

`db:seed` refuses to run against the memory driver, and `db:drop` requires `--force` (or
`FORCE=1`) because it deletes every collection. Indexes are created on boot via
`Model.syncIndexes()`.

---

## Scripts

| Command | Does |
| ------- | ---- |
| `npm run dev` | API + client together |
| `npm test` | Server test suite (76 tests, `node:test`) |
| `npm run build` | Production client build |
| `npm run db:seed` | Seed MongoDB with the demo dataset |
| `npm run db:drop` | Drop all collections (requires `--force`) |

---

## API

Base URL `http://localhost:3000`. Every response is JSON.

```jsonc
{ "success": true,  "...": "payload" }
{ "success": false, "error": "message", "details": [] }
```

| Method | Path | Auth | Purpose |
| ------ | ---- | ---- | ------- |
| `GET` | `/api/health` | — | Liveness + active driver |
| `POST` | `/api/auth/register` | — | Create a patient or hospital_admin account |
| `POST` | `/api/auth/login` | — | Returns `{ token, user }` |
| `GET` | `/api/auth/me` | bearer | Current user |
| `GET` | `/api/categories` | — | Service categories |
| `GET` | `/api/insurance` | — | Insurance provider catalogue |
| `GET` | `/api/hospitals` | — | Search: `q`, `county`, `town`, `insurance`, `min_fee`, `max_fee`, `facility_type`, `open_only`, `sort`, `limit`, `offset` |
| `GET` | `/api/hospitals/:id` | — | Facility with services and fees |
| `POST` | `/api/hospitals` | admin | Register a facility |
| `PUT` | `/api/hospitals/:id` | owner/admin | Update a facility |
| `POST` | `/api/hospitals/:id/services` | owner/admin | Add a service + fee |
| `GET` | `/api/hospitals/:id/appointments` | owner/admin | Bookings received |
| `POST` | `/api/appointments` | optional | Request a booking (guests allowed) |
| `GET` | `/api/appointments/mine` | bearer | Own bookings |
| `GET` | `/api/appointments/:id` | bearer | Own booking, or any for admins |
| `PATCH` | `/api/appointments/:id/status` | owner/admin | `requested` -> `confirmed` -> `completed` / `cancelled` |
| `POST` | `/api/patient-profiles` | optional | Submit intake, returns a `GF-…` reference |
| `GET` | `/api/patient-profiles/mine` | bearer | Full intake record |
| `GET` | `/api/patient-profiles/:code` | — | **Redacted** summary for hospital staff |

### Search semantics

- Only `approved` facilities appear in public search.
- `insurance` matches the facility's embedded provider list, case-insensitively.
- `min_fee` / `max_fee` filter on the facility's lowest active consultation fee **before**
  sorting and pagination, so `total` always agrees with the page.
- `sort` accepts `relevance` (default), `fee_asc` and `rating`. Facilities with no published
  fee always sort last under `fee_asc`.

### Security model

- Passwords are hashed with PBKDF2-SHA512 (310,000 iterations, per-user salt) and compared in
  constant time. `password_hash` is never serialised.
- JWTs are HS256. `platform_admin` **cannot** be self-registered — `/api/auth/register` accepts
  only `patient` and `hospital_admin`.
- Ownership is always checked against the loaded document, never against a route parameter.
- An invalid or absent token is treated as a guest on `optionalAuth` routes; `authenticate`
  routes return `401`.
- Intake references (`GF-XXXXXXXX`) come from `crypto.randomBytes`, not `Math.random`, and the
  lookup endpoint returns only name and county — medical history, health data and insurance are
  reachable only by the signed-in owner.

---

## Project layout

```
server/
  src/
    config/       env, mongoose connection, memory store, seed plan
    models/       8 Mongoose schemas + shared schema helpers
    repositories/ one interface, two drivers (memory | mongo)
    controllers/  auth, hospital, appointment, patient profile
    middleware/   JWT auth, CORS
    router/       router + route table
    utils/        crypto, jwt, http helpers
  scripts/        seed.js, drop.js
  tests/          node:test suites
client/
  src/
    pages/        Home, Hospitals, HospitalDetail, About, Intake,
                  BookAppointment, Login, Register, Profile, NotFound
    components/   Layout (header/footer), shared UI primitives
    context/      AuthContext, ToastContext
    lib/          fetch wrapper + endpoint helpers
```

### Why two drivers

`server/src/repositories/index.js` picks an implementation once at boot. Both drivers return
identical shapes — same keys, same status strings, same ID-as-string normalisation — so the
client cannot tell which one is running. Tests run entirely against the memory driver, which is
why the suite needs no database.

---

## Testing

```bash
npm test
```

76 tests covering the API surface (auth, search, filtering, booking, ownership, intake) and the
seed plan (ID uniqueness, referential integrity, schema agreement with the Mongoose models).

Live MongoDB paths (aggregation pipelines, index creation, `db:seed`) need a running MongoDB and
are not covered by the default suite.

---

## Design

Colours, typography and spacing carry over from the original site:

- Navy `#0b1f3a` for text and dark surfaces
- Teal `#00b8a9` as the primary action colour, with `#0f6e56` for accessible teal text
- Amber `#ef9f27` for ratings and warnings
- Plus Jakarta Sans for UI, Playfair Display for editorial headings

Tokens live in `client/tailwind.config.js`; component classes (`.btn-primary`, `.card`,
`.field-input`) are defined once in `client/src/index.css`.

---

© GlandFind Kenya Ltd. · Limuru, Kiambu County · Kenya Data Protection Act, 2019 compliant