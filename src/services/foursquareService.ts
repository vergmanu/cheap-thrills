import type {
  HappyHourQuery,
  HappyHourServiceInterface,
  HappyHourServiceOptions,
  HappyHourWindow,
  Venue,
} from '../types/venue';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';
import { isHappyHourActive } from '../utils/timeUtils';
const PROXY_URL = '/api/foursquare';
const BAR_CATEGORY_ID = 13003;
const RESTAURANT_CATEGORY_ID = 13065;

const DAY_NUM_TO_SHORT: Record<number, string> = {
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
  7: 'Sun',
};

interface FoursquareRegularHour {
  day: number;
  open: string;
  close: string;
}

interface FoursquareCategory {
  id: number;
}

interface FoursquarePlace {
  fsq_id: string;
  name: string;
  location?: {
    formatted_address?: string;
    address?: string;
  };
  distance?: number;
  rating?: number;
  tel?: string;
  website?: string;
  hours?: {
    regular?: FoursquareRegularHour[];
  };
  categories?: FoursquareCategory[];
}

interface FoursquareSearchResponse {
  results: FoursquarePlace[];
}

interface ParsedHourEntry {
  day: number;
  dayShort: string;
  startTime: string;
  endTime: string;
}

function getConfig() {
  const radiusMiles = Number(import.meta.env.VITE_SEARCH_RADIUS_MILES) || 5;
  const maxResults = Number(import.meta.env.VITE_MAX_RESULTS) || 20;
  return { radiusMiles, maxResults };
}

function hhmmTo24(hhmm: string): string | null {
  if (!/^\d{4}$/.test(hhmm)) return null;
  return `${hhmm.slice(0, 2)}:${hhmm.slice(2, 4)}`;
}

export function parseFoursquareRegularHours(
  regular: FoursquareRegularHour[],
): HappyHourWindow[] {
  const entries: ParsedHourEntry[] = [];

  for (const entry of regular) {
    const startTime = hhmmTo24(entry.open);
    const endTime = hhmmTo24(entry.close);
    const dayShort = DAY_NUM_TO_SHORT[entry.day];
    if (!startTime || !endTime || !dayShort) continue;

    entries.push({
      day: entry.day,
      dayShort,
      startTime,
      endTime,
    });
  }

  entries.sort((a, b) => a.day - b.day);

  const windows: HappyHourWindow[] = [];
  let index = 0;

  while (index < entries.length) {
    const start = entries[index]!;
    const days = [start.dayShort];
    let next = index + 1;

    while (next < entries.length) {
      const current = entries[next]!;
      const previous = entries[next - 1]!;
      if (
        current.startTime === start.startTime &&
        current.endTime === start.endTime &&
        current.day === previous.day + 1
      ) {
        days.push(current.dayShort);
        next++;
      } else {
        break;
      }
    }

    windows.push({
      days,
      startTime: start.startTime,
      endTime: start.endTime,
    });
    index = next;
  }

  return windows;
}

function inferDealTypes(
  categories: FoursquareCategory[] | undefined,
): ('drinks' | 'food')[] {
  const ids = new Set(categories?.map((c) => c.id) ?? []);

  if (ids.has(RESTAURANT_CATEGORY_ID)) {
    return ['drinks', 'food'];
  }
  if (ids.has(BAR_CATEGORY_ID)) {
    return ['drinks'];
  }
  return ['drinks'];
}

function mapPlaceToVenue(place: FoursquarePlace): Venue {
  const address =
    place.location?.formatted_address ??
    place.location?.address ??
    '';

  const distanceMiles =
    place.distance !== undefined
      ? Math.round((place.distance / 1609) * 10) / 10
      : 0;

  const regular = place.hours?.regular;
  const happyHours =
    regular && Array.isArray(regular)
      ? parseFoursquareRegularHours(regular)
      : [];

  const venue: Venue = {
    id: place.fsq_id,
    name: place.name,
    address,
    distanceMiles,
    happyHours,
    deals: [],
    dealTypes: inferDealTypes(place.categories),
    isActiveNow: false,
    rating:
      place.rating !== undefined
        ? Math.round((place.rating / 2) * 10) / 10
        : undefined,
    websiteUrl: place.website,
    phoneNumber: place.tel,
    mapsUrl: `https://foursquare.com/v/${place.fsq_id}`,
  };

  venue.isActiveNow = isHappyHourActive(venue.happyHours);

  return venue;
}

export class FoursquareService implements HappyHourServiceInterface {
  async getVenues(
    query: HappyHourQuery,
    options?: HappyHourServiceOptions,
  ): Promise<Venue[]> {
    const { radiusMiles } = getConfig();
    const radius = query.radiusMiles ?? radiusMiles;

    const params = new URLSearchParams({
      zipCode: query.zipCode,
      radius: String(radius),
    });

    const response = await fetchWithTimeout(
      `${PROXY_URL}?${params.toString()}`,
      {
        signal: options?.signal,
        headers: {
          Accept: 'application/json',
        },
      },
    );

    if (response.status === 429) {
      throw new Error(
        'Too many requests. Please wait a moment and try again.',
      );
    }

    if (!response.ok) {
      throw new Error('Request failed. Please try again.');
    }

    const data = (await response.json()) as FoursquareSearchResponse;
    const results = data.results ?? [];

    if (results.length === 0) {
      return [];
    }

    return results
      .map(mapPlaceToVenue)
      .sort((a, b) => a.distanceMiles - b.distanceMiles);
  }
}
