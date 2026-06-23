# uStack Device Catalog (MVP)

Centralized catalog of printers, copiers, MFPs and related devices. Paste a raw
spec sheet (BLI / manufacturer / PDF export), review the structured fields, and
save to a Supabase-backed catalog that will later power pricing, CPI, UBRs,
replacement recommendations, and fleet assessments.

## Stack
- **client** — React + Vite + TypeScript + Tailwind
- **server** — Fastify + TypeScript, with a pure, reusable parser module
- **Supabase** — Postgres (hybrid schema: columns + JSONB) + Storage for images
- npm workspaces; deployable on Render

## Architecture
- **Parser** (`server/src/parser/`) — dependency-free `parseDevice(rawText)`.
  Field-agnostic: strips UI chrome, tracks sections, maps known labels to
  first-class columns, and routes the long tail into section-namespaced JSONB.
  Extend `dictionary.ts` (not the logic) for new manufacturers / field promotions.
- **API** — this app is a catalog + read API/data source for other apps (e.g.
  uStack, which does pricing/CPI). Read endpoints:
  - `GET /api/devices` — list. Filters: `?manufacturer=`, `?device_class=`,
    `?paper_size_class=` (A3|A4), `?q=` (model / full name / part #).
  - `GET /api/devices/:id` — full device + supplies + attributes + image URL.
  - `GET /api/devices/export` — list incl. JSONB attributes (full CSV source).
  - `GET /api/supplies/export` — one row per SKU, joined to its device.
  - `GET /api/devices/check?manufacturer=&model=` — duplicate lookup.
  - `GET /api/health`.

  Write / parse endpoints:
  - `POST /api/parse-device` — pure & stateless; shared parser contract for the
    web UI, future browser extension, and bulk import.
  - `POST /api/devices` — saves a reviewed payload, upserts the manufacturer,
    detects duplicates (manufacturer+model → 409 with `overwrite` to update),
    uploads the optional image, and replaces supplies.
- **Schema** — `supabase/migrations/*.sql` (mirrors the parser output).

## Setup
1. `npm install`
2. Configure Supabase — see [`supabase/README.md`](supabase/README.md), then copy
   `.env.example` to `.env` and fill in the keys. (Parsing works without keys;
   saving needs them.)
3. `npm run dev` — runs the API (`:4000`) and the client (`:5180`) together.

## Test
`npm test` — parser unit suite, validated against a real BLI M479fdn export.

## Decisions captured in this MVP
- Deterministic, field-agnostic parser (no LLM) — inputs are uniform BLI-style pages.
- Tier-1 columns elevated per product owner: fax, network interface + Wi-Fi/Ethernet,
  scan speed, first-copy-out. Duty cycle / duplex / weight / rec-volume /
  predecessor-replacement kept in JSONB.
- Sellable supplies only (priced SKUs); starters, options, and PM lines dropped.
- Discontinued devices are catalogued (status is a filterable value).
- Single internal tool, no auth yet.
