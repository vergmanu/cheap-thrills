export interface HappyHourWindow {
  days: string[];
  startTime: string;
  endTime: string;
}

export interface Deal {
  description: string;
  type: 'drinks' | 'food';
}

export interface Venue {
  id: string;
  name: string;
  address: string;
  distanceMiles: number;
  happyHours: HappyHourWindow[];
  deals: Deal[];
  dealTypes: ('drinks' | 'food')[];
  isActiveNow: boolean;
  rating?: number;
  websiteUrl?: string;
  phoneNumber?: string;
  mapsUrl: string;
}

export interface HappyHourQuery {
  zipCode: string;
  radiusMiles?: number;
}

export interface HappyHourServiceOptions {
  signal?: AbortSignal;
}

export interface HappyHourServiceInterface {
  getVenues(
    query: HappyHourQuery,
    options?: HappyHourServiceOptions,
  ): Promise<Venue[]>;
}

export type DealTypeFilter = 'all' | 'drinks' | 'food' | 'both';
export type SortOption = 'distance' | 'rating' | 'alphabetical';
