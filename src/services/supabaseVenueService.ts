import type {
  HappyHourQuery,
  HappyHourServiceInterface,
  HappyHourServiceOptions,
  Venue,
} from '../types/venue';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';
import { isHappyHourActive } from '../utils/timeUtils';

const PROXY_URL = '/api/venues';

interface HappyHourRow {
  id: string;
  venue_id: string;
  day_of_week: string | null;
  start_time: string | null;
  end_time: string | null;
  deal_description: string | null;
  confidence_score: number | null;
  source_url: string | null;
}

interface SupabaseVenue {
  id: string;
  osm_id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  latitude: number;
  longitude: number;
  website: string | null;
  phone: string | null;
  amenity: string | null;
  distance_meters: number;
  happy_hours: HappyHourRow[];
}

interface SupabaseVenuesResponse {
  results: SupabaseVenue[];
  searchLat: number;
  searchLng: number;
}


const FULL_TO_ABBR: Record<string, string> = {
  sunday: 'Sun', monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed',
  thursday: 'Thu', friday: 'Fri', saturday: 'Sat',
};
const DAY_ORDER = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function parseDayOfWeek(raw: string): string[] {
  // Handle "&" and "," separated lists: "Friday & Saturday", "Mon, Tue"
  const parts = raw.split(/[,&]/).map((s) => s.trim());

  const days: string[] = [];
  for (const part of parts) {
    // Handle ranges: "Monday-Friday", "Sun-Thu"
    const rangeParts = part.split('-').map((s) => s.trim());
    if (rangeParts.length === 2) {
      const start = FULL_TO_ABBR[rangeParts[0]!.toLowerCase()] ?? rangeParts[0]!;
      const end = FULL_TO_ABBR[rangeParts[1]!.toLowerCase()] ?? rangeParts[1]!;
      const startIdx = DAY_ORDER.indexOf(start);
      const endIdx = DAY_ORDER.indexOf(end);
      if (startIdx >= 0 && endIdx >= 0) {
        // Wrap-around support (e.g. Fri-Mon)
        if (endIdx >= startIdx) {
          for (let i = startIdx; i <= endIdx; i++) days.push(DAY_ORDER[i]!);
        } else {
          for (let i = startIdx; i < 7; i++) days.push(DAY_ORDER[i]!);
          for (let i = 0; i <= endIdx; i++) days.push(DAY_ORDER[i]!);
        }
        continue;
      }
    }
    // Single day
    const abbr = FULL_TO_ABBR[part.toLowerCase()] ?? part;
    if (abbr) days.push(abbr);
  }
  return days;
}

function mapSupabaseVenueToVenue(venue: SupabaseVenue): Venue {
  const address = [
    venue.address,
    venue.city,
    venue.state,
    venue.zip,
  ]
    .filter(Boolean)
    .join(', ');

  const distanceMiles =
    Math.round((venue.distance_meters / 1609.34) * 10) / 10;

  const validTime = (t: string | null): string | null => {
    if (!t || !/^\d{1,2}:\d{2}$/.test(t)) return null;
    return t;
  };

  // Convert happy_hours rows to HappyHourWindow[], deduped by day+start+end
  const seenWindows = new Set<string>();
  const happyHours = (venue.happy_hours ?? [])
    .filter((hh) => hh.confidence_score !== null && hh.confidence_score >= 0.7)
    .filter((hh) => {
      const key = `${hh.day_of_week}|${hh.start_time}|${hh.end_time}`;
      if (seenWindows.has(key)) return false;
      seenWindows.add(key);
      return true;
    })
    .map((hh) => ({
      days: hh.day_of_week ? parseDayOfWeek(hh.day_of_week) : [],
      startTime: validTime(hh.start_time) ?? '00:00',
      endTime: validTime(hh.end_time) ?? '23:59',
    }));

  // Convert deal_description to Deal[], deduped by description
  const seenDescriptions = new Set<string>();
  const deals = (venue.happy_hours ?? [])
    .filter((hh) => hh.deal_description && hh.confidence_score !== null && hh.confidence_score >= 0.7)
    .filter((hh) => {
      if (seenDescriptions.has(hh.deal_description!)) return false;
      seenDescriptions.add(hh.deal_description!);
      return true;
    })
    .map((hh) => ({
      description: hh.deal_description ?? '',
      type: 'drinks' as const,
    }));

  // Derive deal types from deals
  const dealTypes: ('drinks' | 'food')[] = Array.from(new Set(deals.map((d) => d.type)));
  if (dealTypes.length === 0 && venue.amenity === 'restaurant') {
    dealTypes.push('food');
  }
  if (dealTypes.length === 0) {
    dealTypes.push('drinks');
  }

  return {
    id: venue.id,
    name: venue.name,
    address,
    distanceMiles,
    happyHours,
    deals,
    dealTypes: dealTypes as ('drinks' | 'food')[],
    isActiveNow: isHappyHourActive(happyHours),
    websiteUrl: venue.website ?? undefined,
    phoneNumber: venue.phone ?? undefined,
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      [venue.name, address].filter(Boolean).join(' '),
    )}`,
  };
}

export class SupabaseVenueService implements HappyHourServiceInterface {
  async getVenues(
    query: HappyHourQuery,
    options?: HappyHourServiceOptions,
  ): Promise<Venue[]> {
    const radius = query.radiusMiles ?? 5;

    const params = new URLSearchParams({
      zipCode: query.zipCode,
      radius: String(radius),
    });

    const response = await fetchWithTimeout(
      `${PROXY_URL}?${params.toString()}`,
      {
        signal: options?.signal,
        headers: { Accept: 'application/json' },
      },
    );

    if (response.status === 429) {
      throw new Error('Too many requests. Please wait a moment and try again.');
    }

    if (!response.ok) {
      throw new Error('Request failed. Please try again.');
    }

    const data = (await response.json()) as SupabaseVenuesResponse;
    const results = data.results ?? [];

    return results
      .map(mapSupabaseVenueToVenue)
      .filter((v) => v.happyHours.length > 0 || v.deals.length > 0)
      .sort((a, b) => a.distanceMiles - b.distanceMiles);
  }
}