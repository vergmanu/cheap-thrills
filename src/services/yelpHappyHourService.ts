import type {
  HappyHourQuery,
  HappyHourServiceInterface,
  HappyHourServiceOptions,
  Venue,
} from '../types/venue';
import { fetchJson } from './apiClient';
import { milesToMeters } from '../utils/distanceUtils';

interface YelpBusiness {
  id: string;
  name: string;
  rating?: number;
  phone?: string;
  url?: string;
  location: {
    display_address: string[];
  };
  distance?: number;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

interface YelpSearchResponse {
  businesses: YelpBusiness[];
}

function getConfig() {
  const radiusMiles = Number(import.meta.env.VITE_SEARCH_RADIUS_MILES) || 5;
  const limit = Number(import.meta.env.VITE_MAX_RESULTS) || 25;
  return { radiusMiles, limit };
}

function mapYelpToVenue(business: YelpBusiness): Venue {
  const address = business.location.display_address.join(', ');
  const distanceMiles =
    business.distance !== undefined ? business.distance / 1609.34 : 0;
  const { latitude: lat, longitude: lng } = business.coordinates;

  return {
    id: business.id,
    name: business.name,
    address,
    distanceMiles: Math.round(distanceMiles * 10) / 10,
    happyHours: [],
    deals: [],
    dealTypes: [],
    isActiveNow: false,
    rating: business.rating,
    websiteUrl: business.url,
    phoneNumber: business.phone,
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
  };
}

export function createYelpHappyHourService(): HappyHourServiceInterface {
  const apiKey = import.meta.env.VITE_YELP_API_KEY;

  return {
    async getVenues(
      query: HappyHourQuery,
      options?: HappyHourServiceOptions,
    ): Promise<Venue[]> {
      if (!apiKey) {
        throw new Error('VITE_YELP_API_KEY is not configured');
      }

      const { radiusMiles, limit } = getConfig();
      const radius = milesToMeters(query.radiusMiles ?? radiusMiles);

      const params = new URLSearchParams({
        location: query.zipCode,
        categories: 'bars,restaurants',
        radius: String(radius),
        limit: String(limit),
      });

      const url = `https://api.yelp.com/v3/businesses/search?${params.toString()}`;

      const data = await fetchJson<YelpSearchResponse>(url, {
        signal: options?.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
        },
      });

      return data.businesses.map(mapYelpToVenue);
    },
  };
}
