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
  opening_hours: string | null;
  source: string | null;
  last_crawled_at: string | null;
  created_at: string;
}

export type CrawlStatus = 'pending' | 'processing' | 'done' | 'failed';

export interface CrawlQueueRow {
  id: string;
  venue_id: string;
  status: CrawlStatus;
  retries: number;
  error: string | null;
  raw_markdown: string | null;
  last_attempt_at: string | null;
  created_at: string;
}

export interface HappyHourRow {
  id: string;
  venue_id: string;
  day_of_week: string | null;
  start_time: string | null;
  end_time: string | null;
  deal_description: string | null;
  confidence_score: number | null;
  source_url: string | null;
  created_at: string;
}
