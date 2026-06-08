export interface VenueRow {
    id: string;
    osm_id: string;
    name: string;
    website: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    latitude: number;
    longitude: number;
    phone: string | null;
    amenity: string | null;
    source: string;
    last_crawled_at: string | null;
    created_at: string;
  }
  