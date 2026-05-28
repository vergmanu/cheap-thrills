# Cheap Thrills

A happy hour deal finder — enter a zip code and discover nearby bars and restaurants with active happy hour deals. No sign-up required.

## Tech Stack

- React 18 + Vite + TypeScript (strict)
- Tailwind CSS
- React Context + `useReducer` for app state
- Vitest + React Testing Library

## Quick Start

```bash
pnpm install
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173). The app uses **mock venue data** in development — no API key needed.

## Environment Variables

Copy the example file and adjust as needed:

```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `VITE_FOURSQUARE_API_KEY` | Foursquare Places API key (production) |
| `VITE_SEARCH_RADIUS_MILES` | Search radius in miles (default: `5`) |
| `VITE_MAX_RESULTS` | Max venues to return (default: `20`) |

## Foursquare Places API

By default, `createHappyHourService()` returns the **mock service** when `import.meta.env.DEV` is `true`.

To use Foursquare in production:

1. Create a developer account at [Foursquare Developers](https://foursquare.com/developers).
2. Create a new app and generate an **API key** (no credit card required).
3. Copy `.env.example` to `.env` and set `VITE_FOURSQUARE_API_KEY`.
4. Build and preview production mode:

```bash
pnpm build
pnpm preview
```

The free tier includes **1,000 requests per hour**, which is sufficient for most personal projects.

For local testing against Foursquare without a production build, temporarily change `happyHourService.ts` to always return `new FoursquareService()`.

> **Note:** Foursquare returns regular venue hours, not dedicated happy hour schedules. Hours are parsed into `happyHours` when possible; deal descriptions remain empty until a dedicated deals source is added.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server (mock data) |
| `pnpm build` | Type-check and build for production |
| `pnpm preview` | Preview production build |
| `pnpm test` | Run unit tests once |
| `pnpm test:watch` | Run tests in watch mode |

## Project Structure

```
src/
├── components/     # UI (ZipCodeInput, VenueCard, FilterBar, etc.)
├── context/        # App state machine (useReducer)
├── hooks/          # useZipCode, useHappyHours
├── services/       # Mock + Foursquare happy hour services
├── types/          # Venue and related types
└── utils/          # Zip validation, time, distance, filtering
```

## License

MIT
