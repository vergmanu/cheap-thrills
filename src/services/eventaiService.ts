// import type {
//   HappyHourQuery,
//   HappyHourServiceInterface,
//   HappyHourServiceOptions,
//   Venue,
// } from '../types/venue';
// import { fetchWithTimeout } from '../utils/fetchWithTimeout';
// import { isHappyHourActive } from '../utils/timeUtils';

// const PROXY_URL = '/api/places';

// interface GeoapifyCategory {
//   category_id: string;
//   category_name: string;
// }

// interface GeoapifyProperties {
//   place_id: string;
//   name: string;
//   formatted: string;
//   address_line1?: string;
//   address_line2?: string;
//   distance?: number;
//   rating?: number;
//   website?: string;
//   phone?: string;
//   opening_hours?: string;
//   categories?: GeoapifyCategory[];
//   datasource?: {
//     raw?: {
//       phone?: string;
//       website?: string;
//       opening_hours?: string;
//     };
//   };
// }

// interface GeoapifyFeature {
//   properties: GeoapifyProperties;
// }

// interface GeoapifySearchResponse {
//   features: GeoapifyFeature[];
// }

// function getConfig() {
//   const radiusMiles = Number(import.meta.env.VITE_SEARCH_RADIUS_MILES) || 5;
//   const maxResults = Number(import.meta.env.VITE_MAX_RESULTS) || 20;
//   return { radiusMiles, maxResults };
// }

// function inferDealTypes(
//   categories: GeoapifyCategory[] | undefined,
// ): ('drinks' | 'food')[] {
//   if (!categories || categories.length === 0) return ['drinks'];
//   const joined = categories.join(',').toLowerCase();
//   if (joined.includes('restaurant')) return ['drinks', 'food'];
//   if (joined.includes('bar') || joined.includes('pub')) return ['drinks'];
//   return ['drinks'];
// }

// function mapFeatureToVenue(feature: GeoapifyFeature): Venue {
//   const p = feature.properties;

//   const address = p.formatted ?? p.address_line1 ?? '';

//   const distanceMiles =
//     p.distance !== undefined
//       ? Math.round((p.distance / 1609) * 10) / 10
//       : 0;

//   const phone = p.phone ?? p.datasource?.raw?.phone;
//   const website = p.website ?? p.datasource?.raw?.website;

//   const venue: Venue = {
//     id: p.place_id,
//     name: p.name ?? 'Unknown Venue',
//     address,
//     distanceMiles,
//     happyHours: [],
//     deals: [],
//     dealTypes: inferDealTypes(p.categories),
//     isActiveNow: false,
//     rating: p.rating,
//     websiteUrl: website,
//     phoneNumber: phone,
//     mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.formatted ?? p.name ?? '')}`,
//   };

//   venue.isActiveNow = isHappyHourActive(venue.happyHours);

//   return venue;
// }

// export class GeoapifyService implements HappyHourServiceInterface {
//   async getVenues(
//     query: HappyHourQuery,
//     options?: HappyHourServiceOptions,
//   ): Promise<Venue[]> {
//     const { radiusMiles } = getConfig();
//     const radius = query.radiusMiles ?? radiusMiles;

//     const params = new URLSearchParams({
//       zipCode: query.zipCode,
//       radius: String(radius),
//     });

//     const response = await fetchWithTimeout(
//       `${PROXY_URL}?${params.toString()}`,
//       {
//         signal: options?.signal,
//         headers: {
//           Accept: 'application/json',
//         },
//       },
//     );

//     if (response.status === 429) {
//       throw new Error(
//         'Too many requests. Please wait a moment and try again.',
//       );
//     }

//     if (!response.ok) {
//       throw new Error('Request failed. Please try again.');
//     }

//     const data = (await response.json()) as GeoapifySearchResponse;
//     const features = data.features ?? [];

//     if (features.length === 0) {
//       return [];
//     }

//     return features
//       .map(mapFeatureToVenue)
//       .sort((a, b) => a.distanceMiles - b.distanceMiles);
//   }
// }

import type {
  HappyHourQuery,
  HappyHourServiceInterface,
  HappyHourServiceOptions,
  HappyHourWindow,
  Venue,
} from '../types/venue';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';

const PROXY_URL = '/api/places';

const DAY_NUM_TO_SHORT: Record<number, string> = {
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
  7: 'Sun',
};

interface EventAIVenue {
  name: string;
  address?: string;
  city: string;
  state: string;
  website?: string;
  phone?: string;
}

interface EventAIHappyHour {
  id: string;
  venue: EventAIVenue;
  days_of_week: number[];
  start_time: string;
  end_time: string;
  specials: string[];
  confidence: number;
  distance_miles?: number;
}

interface EventAISearchResponse {
  count: number;
  results: EventAIHappyHour[];
}

function mapToHappyHourWindow(
  days: number[],
  startTime: string,
  endTime: string,
): HappyHourWindow {
  return {
    days: days.map((d) => DAY_NUM_TO_SHORT[d] ?? ''),
    startTime,
    endTime,
  };
}

function isActiveNow(
  days: number[],
  startTime: string,
  endTime: string,
): boolean {
  const now = new Date();
  const currentDay = now.getDay() === 0 ? 7 : now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const start = (startH ?? 0) * 60 + (startM ?? 0);
  const end = (endH ?? 0) * 60 + (endM ?? 0);
  return days.includes(currentDay) &&
    currentMinutes >= start &&
    currentMinutes <= end;
}

function mapResultToVenue(result: EventAIHappyHour): Venue {
  const address = [
    result.venue.address,
    result.venue.city,
    result.venue.state,
  ]
    .filter(Boolean)
    .join(', ');

  const happyHours: HappyHourWindow[] = [
    mapToHappyHourWindow(
      result.days_of_week,
      result.start_time,
      result.end_time,
    ),
  ];

  const deals = result.specials.map((s) => ({
    description: s,
    type: 'drinks' as const,
  }));

  return {
    id: result.id,
    name: result.venue.name,
    address,
    distanceMiles: result.distance_miles ?? 0,
    happyHours,
    deals,
    dealTypes: ['drinks', 'food'],
    isActiveNow: isActiveNow(
      result.days_of_week,
      result.start_time,
      result.end_time,
    ),
    websiteUrl: result.venue.website,
    phoneNumber: result.venue.phone,
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
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

    const data = (await response.json()) as EventAISearchResponse;
    return (data.results ?? []).map(mapResultToVenue);
  }
}