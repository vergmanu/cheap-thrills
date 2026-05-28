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
| `VITE_GOOGLE_PLACES_API_KEY` | Google Places API key (production) |
| `VITE_SEARCH_RADIUS_MILES` | Search radius in miles (default: `5`) |
| `VITE_MAX_RESULTS` | Max venues to return (default: `20`) |

## Google Places API

By default, `createHappyHourService()` returns the **mock service** when `import.meta.env.DEV` is `true`.

To use Google Places in production:

1. Open [Google Cloud Console](https://console.cloud.google.com) and create a project (or select an existing one).
2. Enable these APIs for the project:
   - **Places API**
   - **Geocoding API**
3. Go to **APIs & Services → Credentials**, create an **API key**, and restrict it:
   - **Application restrictions:** HTTP referrers (add your production domain, e.g. `https://yourdomain.com/*`)
   - **API restrictions:** limit to Places API and Geocoding API only
4. Copy `.env.example` to `.env` and set `VITE_GOOGLE_PLACES_API_KEY`.
5. Build and preview production mode:

```bash
pnpm build
pnpm preview
```

Google requires a credit card on file but includes **$200/month in free credit**, which is typically enough for light personal use.

For local testing against Google without a production build, temporarily change `happyHourService.ts` to always return `new GooglePlacesService()`.

> **Note:** Google returns general opening hours, not dedicated happy hour schedules. Hours are parsed into `happyHours` when possible; deal descriptions remain empty until a dedicated deals source is added.

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
├── services/       # Mock + Google Places happy hour services
├── types/          # Venue and related types
└── utils/          # Zip validation, time, distance, filtering
```

## License

MIT
