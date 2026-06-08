import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

// LA county bounding box — tighten or loosen as needed
const LA_BOUNDS = {
  south: 33.70,
  west: -118.67,
  north: 34.34,
  east: -117.65,
};

// OSM amenity tags we care about
const AMENITY_TAGS = ['bar', 'pub', 'restaurant', 'nightclub', 'biergarten'];

interface OsmTags {
  name?: string;
  website?: string;
  phone?: string;
  amenity?: string;
  'addr:street'?: string;
  'addr:housenumber'?: string;
  'addr:city'?: string;
  'addr:state'?: string;
  'addr:postcode'?: string;
  opening_hours?: string;
}

interface OsmElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;   // nodes have lat/lon directly
  lon?: number;
  center?: { lat: number; lon: number };  // ways have center
  tags?: OsmTags;
}

interface OverpassResponse {
  elements: OsmElement[];
}

function buildOverpassQuery(bounds: typeof LA_BOUNDS, amenities: string[]): string {
  const bbox = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;
  const amenityFilter = amenities.join('|');

  return `
    [out:json][timeout:60];
    (
      node["amenity"~"${amenityFilter}"]["name"](${bbox});
      way["amenity"~"${amenityFilter}"]["name"](${bbox});
    );
    out body;
    >;
    out skel qt;
  `.trim();
}

function extractVenue(el: OsmElement) {
  const tags = el.tags ?? {};
  if (!tags.name) return null;

  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (!lat || !lon) return null;

  const houseNumber = tags['addr:housenumber'] ?? '';
  const street = tags['addr:street'] ?? '';
  const address = [houseNumber, street].filter(Boolean).join(' ') || null;

  return {
    osm_id: `${el.type}/${el.id}`,
    name: tags.name,
    website: tags.website ?? null,
    phone: tags.phone ?? null,
    amenity: tags.amenity ?? null,
    address,
    city: tags['addr:city'] ?? null,
    state: tags['addr:state'] ?? null,
    zip: tags['addr:postcode'] ?? null,
    latitude: lat,
    longitude: lon,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Protect with a secret so it's not publicly callable
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const query = buildOverpassQuery(LA_BOUNDS, AMENITY_TAGS);

    const response = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(65_000),
    });

    if (!response.ok) {
      throw new Error(`Overpass returned ${response.status}`);
    }

    const data = (await response.json()) as OverpassResponse;
    const elements = data.elements ?? [];

    // Extract and filter nulls
    const venues = elements
      .map(extractVenue)
      .filter((v): v is NonNullable<ReturnType<typeof extractVenue>> => v !== null);

    // Upsert — osm_id is unique so re-runs are safe
    const { error } = await supabase
    .from('venues')
    .upsert(venues, {
      onConflict: 'osm_id',
      ignoreDuplicates: false,
    });
  
  if (error) throw error;
  
  return res.status(200).json({
    discovered: elements.length,
    upserted: venues.length,
  });

  } catch (err) {
    console.error('discoverVenues error:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}
