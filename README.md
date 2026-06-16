# Cheap Thrills

A happy hour deal finder — enter a zip code and discover nearby bars and restaurants with active happy hour deals. No sign-up required.

## Tech Stack

**Frontend**

- React 18 + Vite + TypeScript (strict)
- Tailwind CSS
- React Context + `useReducer` for app state
- Vitest + React Testing Library

**Backend / data**

- Vercel serverless functions (`/api/*`, via `@vercel/node`)
- Supabase (Postgres + PostGIS) as the venue store
- OpenStreetMap [Overpass API](https://overpass-api.de/) for venue discovery
- [Zippopotam](https://api.zippopotam.us/) for zip → lat/lng geocoding

## Architecture

The app is moving from a per-request third-party API model to a **pre-populated
Supabase database** that is refreshed on a schedule. Two paths currently coexist:

### 1. Supabase venue pipeline (current direction)

```
                    ┌─────────────────────────────┐
   Vercel Cron ───▶ │ api/discoverVenues.ts        │
   (daily 03:00)    │  • query OSM Overpass for     │
                    │    bars in a bounding box     │
                    │  • upsert rows into Supabase  │
                    └──────────────┬───────────────┘
                                   ▼
                          ┌─────────────────┐
                          │ Supabase `venues`│  (PostGIS)
                          └────────┬─────────┘
                                   ▲
   Browser ──▶ venueService ──▶ api/venues.ts
                          │  • geocode zip (Zippopotam)
                          │  • call `venues_within_radius` RPC
                          └──────────────────────────────────
```

- [`api/discoverVenues.ts`](api/discoverVenues.ts) — protected cron endpoint. Queries
  the OSM Overpass API for venues (currently `amenity=bar`) inside a bounding box,
  extracts name/address/contact/coordinates/opening hours, logs data-quality and
  "Firecrawl-readiness" metrics, then upserts into the Supabase `venues` table
  (`onConflict: osm_id`, so re-runs are idempotent). Guarded by a `CRON_SECRET`
  bearer token.
- [`api/venues.ts`](api/venues.ts) — public read endpoint. Geocodes the zip code via
  Zippopotam, then calls the Supabase `venues_within_radius(lat, lng, radius_meters)`
  PostGIS RPC and returns nearby venues with `distance_meters`.
- [`src/services/venueService.ts`](src/services/venueService.ts) — frontend client for
  `/api/venues`.

> **Note:** Firecrawl is not yet integrated. `discoverVenues` only logs which venues
> have a website (crawl candidates) as a readiness check for a future enrichment step.

### 2. Legacy happy-hour service (still wired into the UI)

The UI currently renders through the older path, which has not yet been switched over
to `venueService`:

```
App ──▶ useHappyHours ──▶ happyHourService ──▶ EventAIService (prod) | mock (dev)
```

- [`src/hooks/useHappyHours.ts`](src/hooks/useHappyHours.ts) and
  [`src/services/happyHourService.ts`](src/services/happyHourService.ts) return the
  mock service in dev and `EventAIService` in production.
- This path uses the richer `Venue` type (with `happyHours`, `deals`, ratings) that
  the components expect.

**In progress:** wiring the UI to `venueService` / `/api/venues` and reconciling the
two `Venue` shapes ([`src/types/venue.ts`](src/types/venue.ts) vs.
[`src/types/supabase.ts`](src/types/supabase.ts)). Until then, dev runs on mock data.

## Quick Start

```bash
pnpm install
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173). The app uses **mock venue data** in
development — no API keys needed.

To run the serverless `/api` functions locally (Supabase path), use the Vercel CLI:

```bash
vercel dev
```

## Environment Variables

`.env` is gitignored. Copy the example and fill in real values:

```bash
cp .env.example .env
```

| Variable | Used by | Description |
|----------|---------|-------------|
| `SUPABASE_URL` | `api/*` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | `api/*` | Supabase service-role key (server-side only) |
| `CRON_SECRET` | `api/discoverVenues` | Bearer token guarding the discovery cron |
| `SEARCH_RADIUS_MILES` | `api/venues` | Server-side search radius in miles (default: `5`) |
| `MAX_RESULTS` | `api/venues` | Max venues to return (default: `20`) |
| `EVENTAI_API_KEY` | `EventAIService` (legacy) | Key for the legacy EventAI data source |
| `VITE_SEARCH_RADIUS_MILES` | frontend | Search radius used by the legacy hook (default: `5`) |
| `VITE_MAX_RESULTS` | frontend | Max venues for the legacy path (default: `20`) |

> Server-side variables (no `VITE_` prefix) are only available inside the `/api`
> functions. Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client.

## Supabase Setup

The venue pipeline expects:

- A `venues` table keyed on a unique `osm_id`, with columns for name, address, city,
  state, zip, latitude, longitude, website, phone, amenity, opening hours, and a PostGIS
  geometry/geography column for location.
- A `venues_within_radius(lat, lng, radius_meters)` RPC that returns rows ordered by
  distance, including `distance_meters`.

See [`src/types/supabase.ts`](src/types/supabase.ts) for the row shape consumed by the
frontend.

## Deployment (Vercel)

- Serverless functions live in [`api/`](api/) and are deployed automatically.
- [`vercel.json`](vercel.json) defines a daily cron (`0 3 * * *`) that hits
  `/api/discoverVenues` to refresh the venue table.
- Set all server-side environment variables (above) in the Vercel project settings.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start the Vite dev server (mock data) |
| `pnpm build` | Type-check (`tsc --noEmit`) and build for production |
| `pnpm preview` | Preview the production build |
| `pnpm test` | Run unit tests once |
| `pnpm test:watch` | Run tests in watch mode |
| `vercel dev` | Run the frontend + `/api` serverless functions locally |

## Project Structure

```
api/
├── discoverVenues.ts   # Cron: OSM Overpass → Supabase venues (upsert)
├── venues.ts           # Read: zip → geocode → PostGIS RPC → nearby venues
└── places.ts           # Earlier API handler (superseded by venues.ts)

src/
├── components/         # UI (ZipCodeInput, VenueCard, FilterBar, VenueDetail, etc.)
├── context/            # App state machine (useReducer)
├── hooks/              # useZipCode, useHappyHours
├── services/           # venueService (Supabase) + legacy mock/EventAI services
├── types/              # venue (UI) and supabase (DB row) types
└── utils/              # Zip validation, time, distance, filtering
```

## License

MIT
