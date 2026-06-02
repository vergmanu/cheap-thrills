import type {
  HappyHourQuery,
  HappyHourServiceInterface,
  HappyHourServiceOptions,
  Venue,
} from '../types/venue';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';
import { isHappyHourActive } from '../utils/timeUtils';

const PROXY_URL = '/api/places';

interface GeoapifyCategory {
  category_id: string;
  category_name: string;
}

interface GeoapifyProperties {
  place_id: string;
  name: string;
  formatted: string;
  address_line1?: string;
  address_line2?: string;
  distance?: number;
  rating?: number;
  website?: string;
  phone?: string;
  opening_hours?: string;
  categories?: string[];
  datasource?: {
    raw?: {
      phone?: string;
      website?: string;
      opening_hours?: string;
    };
  };
}

interface GeoapifyFeature {
  properties: GeoapifyProperties;
}

interface GeoapifySearchResponse {
  features: GeoapifyFeature[];
}

function getConfig() {
  const radiusMiles = Number(import.meta.env.VITE_SEARCH_RADIUS_MILES) || 5;
  const maxResults = Number(import.meta.env.VITE_MAX_RESULTS) || 20;
  return { radiusMiles, maxResults };
}

function inferDealTypes(
  categories: string[] | undefined,
): ('drinks' | 'food')[] {
  if (!categories || categories.length === 0) return ['drinks'];
  const joined = categories.join(',').toLowerCase();
  if (joined.includes('restaurant')) return ['drinks', 'food'];
  if (joined.includes('bar') || joined.includes('pub')) return ['drinks'];
  return ['drinks'];
}

function mapFeatureToVenue(feature: GeoapifyFeature): Venue {
  const p = feature.properties;

  const address = p.formatted ?? p.address_line1 ?? '';

  const distanceMiles =
    p.distance !== undefined
      ? Math.round((p.distance / 1609) * 10) / 10
      : 0;

  const phone = p.phone ?? p.datasource?.raw?.phone;
  const website = p.website ?? p.datasource?.raw?.website;

  const venue: Venue = {
    id: p.place_id,
    name: p.name ?? 'Unknown Venue',
    address,
    distanceMiles,
    happyHours: [],
    deals: [],
    dealTypes: inferDealTypes(p.categories),
    isActiveNow: false,
    rating: p.rating,
    websiteUrl: website,
    phoneNumber: phone,
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.formatted ?? p.name ?? '')}`,
  };

  venue.isActiveNow = isHappyHourActive(venue.happyHours);

  return venue;
}

export class GeoapifyService implements HappyHourServiceInterface {
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

    const data = (await response.json()) as GeoapifySearchResponse;
    const features = data.features ?? [];

    if (features.length === 0) {
      return [];
    }

    return features
      .map(mapFeatureToVenue)
      .sort((a, b) => a.distanceMiles - b.distanceMiles);
  }
}