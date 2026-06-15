import type {
  HappyHourQuery,
  HappyHourServiceInterface,
  HappyHourServiceOptions,
  Venue,
} from '../types/venue';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';

const PROXY_URL = '/api/venues';

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
}

interface SupabaseVenuesResponse {
  results: SupabaseVenue[];
  searchLat: number;
  searchLng: number;
}

function inferDealTypes(amenity: string | null): ('drinks' | 'food')[] {
  if (!amenity) return ['drinks'];
  if (amenity === 'restaurant') return ['drinks', 'food'];
  return ['drinks'];
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

  return {
    id: venue.id,
    name: venue.name,
    address,
    distanceMiles,
    happyHours: [],
    deals: [],
    dealTypes: inferDealTypes(venue.amenity),
    isActiveNow: false,
    websiteUrl: venue.website ?? undefined,
    phoneNumber: venue.phone ?? undefined,
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      [venue.name, address].filter(Boolean).join(' '),
    )}`,
  };
}

export class EventAIService implements HappyHourServiceInterface {
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
      .sort((a, b) => a.distanceMiles - b.distanceMiles);
  }
}