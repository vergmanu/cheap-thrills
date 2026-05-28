// TODO: consider a backend proxy to protect the API key in production

import type {
  HappyHourQuery,
  HappyHourServiceInterface,
  HappyHourServiceOptions,
  HappyHourWindow,
  Venue,
} from '../types/venue';
import { fetchJsonWithTimeout } from '../utils/fetchWithTimeout';
import { isHappyHourActive } from '../utils/timeUtils';
import { milesToMeters } from '../utils/distanceUtils';

const GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';
const NEARBY_URL = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
const DETAILS_URL = 'https://maps.googleapis.com/maps/api/place/details/json';

const DAY_NAME_TO_SHORT: Record<string, string> = {
  Monday: 'Mon',
  Tuesday: 'Tue',
  Wednesday: 'Wed',
  Thursday: 'Thu',
  Friday: 'Fri',
  Saturday: 'Sat',
  Sunday: 'Sun',
};

interface LatLng {
  lat: number;
  lng: number;
}

interface GoogleStatusResponse {
  status: string;
  error_message?: string;
}

interface GeocodeResponse extends GoogleStatusResponse {
  results: Array<{
    geometry: { location: LatLng };
  }>;
}

interface NearbyPlace {
  place_id: string;
  name: string;
  vicinity?: string;
  rating?: number;
  geometry: { location: LatLng };
}

interface NearbySearchResponse extends GoogleStatusResponse {
  results: NearbyPlace[];
}

interface PlaceDetailsResult {
  name?: string;
  formatted_address?: string;
  formatted_phone_number?: string;
  website?: string;
  rating?: number;
  opening_hours?: { weekday_text?: string[] };
  geometry?: { location: LatLng };
}

interface PlaceDetailsResponse extends GoogleStatusResponse {
  result: PlaceDetailsResult;
}

function getApiKey(): string {
  const key = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
  if (!key) {
    throw new Error('Google Places API is not configured');
  }
  return key;
}

function getConfig() {
  const radiusMiles = Number(import.meta.env.VITE_SEARCH_RADIUS_MILES) || 5;
  const maxResults = Number(import.meta.env.VITE_MAX_RESULTS) || 20;
  return { radiusMiles, maxResults };
}

function buildUrl(
  base: string,
  params: Record<string, string>,
): string {
  const search = new URLSearchParams({ ...params, key: getApiKey() });
  return `${base}?${search.toString()}`;
}

function assertGoogleOk(
  data: GoogleStatusResponse,
  fallbackMessage: string,
): void {
  if (data.status === 'OK' || data.status === 'ZERO_RESULTS') return;
  throw new Error(fallbackMessage);
}

function haversineMiles(from: LatLng, to: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadiusMiles = 3958.8;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) *
      Math.cos(toRad(to.lat)) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(earthRadiusMiles * c * 10) / 10;
}

function parse12HourTo24(time12: string): string | null {
  const match = time12
    .trim()
    .match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2] ?? '0');
  const period = match[3]!.toUpperCase();

  if (hours === 12) hours = 0;
  if (period === 'PM') hours += 12;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

export function parseWeekdayText(weekdayText: string[]): HappyHourWindow[] {
  const windows: HappyHourWindow[] = [];

  for (const line of weekdayText) {
    const lineMatch = line.match(/^([^:]+):\s*(.+)$/);
    if (!lineMatch) continue;

    const dayLabel = DAY_NAME_TO_SHORT[lineMatch[1]!.trim()];
    if (!dayLabel) continue;

    const hoursPart = lineMatch[2]!.trim();
    if (/closed/i.test(hoursPart)) continue;

    const segments = hoursPart.split(',').map((s) => s.trim());

    for (const segment of segments) {
      const rangeMatch = segment.match(/^(.+?)\s*[–-]\s*(.+)$/);
      if (!rangeMatch) continue;

      const startTime = parse12HourTo24(rangeMatch[1]!);
      const endTime = parse12HourTo24(rangeMatch[2]!);
      if (!startTime || !endTime) continue;

      windows.push({
        days: [dayLabel],
        startTime,
        endTime,
      });
    }
  }

  return windows;
}

export class GooglePlacesService implements HappyHourServiceInterface {
  private async geocodeZip(
    zipCode: string,
    signal?: AbortSignal,
  ): Promise<LatLng> {
    const url = buildUrl(GEOCODE_URL, {
      address: zipCode,
    });

    const data = await fetchJsonWithTimeout<GeocodeResponse>(url, { signal });

    if (data.status === 'ZERO_RESULTS' || data.results.length === 0) {
      throw new Error('Could not locate zip code. Please try again.');
    }

    assertGoogleOk(data, 'Could not locate zip code. Please try again.');

    return data.results[0]!.geometry.location;
  }

  private async nearbySearch(
    location: LatLng,
    radiusMeters: number,
    type: 'bar' | 'restaurant',
    signal?: AbortSignal,
  ): Promise<NearbyPlace[]> {
    const url = buildUrl(NEARBY_URL, {
      location: `${location.lat},${location.lng}`,
      radius: String(radiusMeters),
      type,
      keyword: 'happy hour',
    });

    const data = await fetchJsonWithTimeout<NearbySearchResponse>(url, {
      signal,
    });

    assertGoogleOk(data, 'Unable to search nearby venues. Please try again.');

    return data.results ?? [];
  }

  private async fetchPlaceDetails(
    placeId: string,
    signal?: AbortSignal,
  ): Promise<PlaceDetailsResult> {
    const url = buildUrl(DETAILS_URL, {
      place_id: placeId,
      fields:
        'name,formatted_address,formatted_phone_number,website,opening_hours,rating,geometry',
    });

    const data = await fetchJsonWithTimeout<PlaceDetailsResponse>(url, {
      signal,
    });

    assertGoogleOk(data, 'Unable to load venue details. Please try again.');

    return data.result;
  }

  private mapToVenue(
    place: NearbyPlace,
    details: PlaceDetailsResult,
    origin: LatLng,
  ): Venue {
    const location = details.geometry?.location ?? place.geometry.location;
    const happyHours = details.opening_hours?.weekday_text
      ? parseWeekdayText(details.opening_hours.weekday_text)
      : [];

    const venue: Venue = {
      id: place.place_id,
      name: details.name ?? place.name,
      address: details.formatted_address ?? place.vicinity ?? '',
      distanceMiles: haversineMiles(origin, location),
      happyHours,
      deals: [],
      dealTypes: ['drinks'],
      isActiveNow: false,
      rating: details.rating ?? place.rating,
      websiteUrl: details.website,
      phoneNumber: details.formatted_phone_number,
      mapsUrl: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
    };

    venue.isActiveNow = isHappyHourActive(venue.happyHours);

    return venue;
  }

  async getVenues(
    query: HappyHourQuery,
    options?: HappyHourServiceOptions,
  ): Promise<Venue[]> {
    const signal = options?.signal;
    const { radiusMiles, maxResults } = getConfig();
    const radiusMeters = milesToMeters(query.radiusMiles ?? radiusMiles);

    const origin = await this.geocodeZip(query.zipCode, signal);

    const [bars, restaurants] = await Promise.all([
      this.nearbySearch(origin, radiusMeters, 'bar', signal),
      this.nearbySearch(origin, radiusMeters, 'restaurant', signal),
    ]);

    const seen = new Set<string>();
    const places: NearbyPlace[] = [];

    for (const place of [...bars, ...restaurants]) {
      if (seen.has(place.place_id)) continue;
      seen.add(place.place_id);
      places.push(place);
      if (places.length >= maxResults) break;
    }

    if (places.length === 0) {
      return [];
    }

    const venues = await Promise.all(
      places.map(async (place) => {
        const details = await this.fetchPlaceDetails(place.place_id, signal);
        return this.mapToVenue(place, details, origin);
      }),
    );

    return venues.sort((a, b) => a.distanceMiles - b.distanceMiles);
  }
}
