// import type { VercelRequest, VercelResponse } from '@vercel/node';
// import { createClient } from '@supabase/supabase-js';

// const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

// // LA county bounding box — tighten or loosen as needed
// const LA_BOUNDS = {
//   south: 33.70,
//   west: -118.67,
//   north: 34.34,
//   east: -117.65,
// };

// // OSM amenity tags we care about
// const AMENITY_TAGS = ['bar', 'pub', 'restaurant', 'nightclub', 'biergarten'];

// interface OsmTags {
//   name?: string;
//   website?: string;
//   phone?: string;
//   amenity?: string;
//   'addr:street'?: string;
//   'addr:housenumber'?: string;
//   'addr:city'?: string;
//   'addr:state'?: string;
//   'addr:postcode'?: string;
//   opening_hours?: string;
// }

// interface OsmElement {
//   type: 'node' | 'way' | 'relation';
//   id: number;
//   lat?: number;   // nodes have lat/lon directly
//   lon?: number;
//   center?: { lat: number; lon: number };  // ways have center
//   tags?: OsmTags;
// }

// interface OverpassResponse {
//   elements: OsmElement[];
// }

// function buildOverpassQuery(bounds: typeof LA_BOUNDS, amenities: string[]): string {
//   const bbox = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;
//   const amenityFilter = amenities.join('|');

//   return `
//     [out:json][timeout:60];
//     (
//       node["amenity"~"${amenityFilter}"]["name"](${bbox});
//       way["amenity"~"${amenityFilter}"]["name"](${bbox});
//     );
//     out body;
//     >;
//     out skel qt;
//   `.trim();
// }

// function extractVenue(el: OsmElement) {
//   const tags = el.tags ?? {};
//   if (!tags.name) return null;

//   const lat = el.lat ?? el.center?.lat;
//   const lon = el.lon ?? el.center?.lon;
//   if (!lat || !lon) return null;

//   const houseNumber = tags['addr:housenumber'] ?? '';
//   const street = tags['addr:street'] ?? '';
//   const address = [houseNumber, street].filter(Boolean).join(' ') || null;

//   return {
//     osm_id: `${el.type}/${el.id}`,
//     name: tags.name,
//     website: tags.website ?? null,
//     phone: tags.phone ?? null,
//     amenity: tags.amenity ?? null,
//     address,
//     city: tags['addr:city'] ?? null,
//     state: tags['addr:state'] ?? null,
//     zip: tags['addr:postcode'] ?? null,
//     latitude: lat,
//     longitude: lon,
//   };
// }

// export default async function handler(req: VercelRequest, res: VercelResponse) {
//   // Protect with a secret so it's not publicly callable
//   const authHeader = req.headers['authorization'];
//   if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
//     return res.status(401).json({ error: 'Unauthorized' });
//   }

//   const supabase = createClient(
//     process.env.SUPABASE_URL!,
//     process.env.SUPABASE_SERVICE_ROLE_KEY!
//   );

//   try {
//     const query = buildOverpassQuery(LA_BOUNDS, AMENITY_TAGS);

//     const response = await fetch(OVERPASS_URL, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/x-www-form-urlencoded',
//       },
//       body: new URLSearchParams({ data: query }).toString(),
//       signal: AbortSignal.timeout(65_000),
//     });

//     if (!response.ok) {
//       throw new Error(`Overpass returned ${response.status}`);
//     }

//     const data = (await response.json()) as OverpassResponse;
//     const elements = data.elements ?? [];

//     // Extract and filter nulls
//     const venues = elements
//       .map(extractVenue)
//       .filter((v): v is NonNullable<ReturnType<typeof extractVenue>> => v !== null);

//     // Upsert — osm_id is unique so re-runs are safe
//     const { error } = await supabase
//     .from('venues')
//     .upsert(venues, {
//       onConflict: 'osm_id',
//       ignoreDuplicates: false,
//     });
  
//   if (error) throw error;
  
//   return res.status(200).json({
//     discovered: elements.length,
//     upserted: venues.length,
//   });

//   } catch (err) {
//     console.error('discoverVenues error:', err);
//     return res.status(500).json({
//       error: err instanceof Error ? err.message : 'Unknown error',
//     });
//   }
// }

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

// Northeast LA: Highland Park (90042), Eagle Rock (90041), Glassell Park (90065),
// Atwater Village (90039), Cypress Park (90031), El Sereno (90032), Silver Lake fringe
const LA_BOUNDS = {
  south: 34.05,
  west: -118.30,
  north: 34.16,
  east: -118.10,
};

// OSM amenity tags for happy-hour-eligible venues
const AMENITY_TAGS = ['bar', 'pub', 'restaurant', 'nightclub', 'biergarten'];

interface OsmTags {
  name?: string;

  website?: string;
  phone?: string;
  email?: string;

  amenity?: string;
  cuisine?: string;

  opening_hours?: string;

  facebook?: string;
  instagram?: string;

  brand?: string;
  operator?: string;

  "contact:website"?: string;
  "contact:phone"?: string;

  "addr:street"?: string;
  "addr:housenumber"?: string;
  "addr:city"?: string;
  "addr:state"?: string;
  "addr:postcode"?: string;
}

interface OsmElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: OsmTags;
}

interface OverpassResponse {
  elements: OsmElement[];
}

function buildOverpassQuery(bounds: typeof LA_BOUNDS, amenities: string[]): string {
  const bbox = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;
  const amenityFilter = amenities.join('|');

  return `[out:json][timeout:60];(node["amenity"~"${amenityFilter}"]["name"](${bbox});way["amenity"~"${amenityFilter}"]["name"](${bbox}););out center;`;
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
    website: tags.website ?? tags["contact:website"] ?? null,
    phone: tags.phone ?? tags["contact:phone"] ?? null,
    amenity: tags.amenity ?? null,
    address,
    city: tags['addr:city'] ?? null,
    state: tags['addr:state'] ?? null,
    zip: tags['addr:postcode'] ?? null,
    latitude: lat,
    longitude: lon,
    opening_hours: tags.opening_hours ?? null,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Protect with a secret so it's not publicly callable
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('ENV CHECK — SUPABASE_URL:', supabaseUrl ? 'set' : 'MISSING');
  console.log('ENV CHECK — SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'set' : 'MISSING');

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Supabase env variables are not configured' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const query = buildOverpassQuery(LA_BOUNDS, AMENITY_TAGS);
    console.log('1. Query built:', query.substring(0, 150));

    const response = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'data=' + encodeURIComponent(query),
      signal: AbortSignal.timeout(65_000),
    });

    console.log('2. Overpass response status:', response.status);

    if (!response.ok) {
      const text = await response.text();
      console.log('3. Overpass error body:', text.substring(0, 300));
      throw new Error(`Overpass returned ${response.status}`);
    }

    const data = (await response.json()) as OverpassResponse;
    console.log('4. Elements returned from Overpass:', data.elements?.length ?? 0);

    const elements = data.elements ?? [];

    const venues = elements
  .map(extractVenue)
  .filter((v): v is NonNullable<ReturnType<typeof extractVenue>> => v !== null);

console.log('5. Venues extracted (non-null):', venues.length);

// Data quality metrics
const withWebsite =
  venues.filter(v => v.website).length;

const withAddress =
  venues.filter(v => v.address).length;

const withHours =
  venues.filter(v => v.opening_hours).length;

console.log('Venue quality metrics:', {
  total: venues.length,
  withWebsite,
  withAddress,
  withHours,
  websitePct: ((withWebsite / venues.length) * 100).toFixed(1) + '%',
  addressPct: ((withAddress / venues.length) * 100).toFixed(1) + '%',
  hoursPct: ((withHours / venues.length) * 100).toFixed(1) + '%',
});

//Firecrawl readiness check
const crawlCandidates =
  venues.filter(v => v.website);

console.log(
  `Ready for crawling: ${crawlCandidates.length}`
);

console.log(
  `Crawl coverage: ${(
    (crawlCandidates.length / venues.length) * 100
  ).toFixed(1)}%`
);

if (venues.length === 0) {
      return res.status(200).json({ discovered: 0, upserted: 0, message: 'No venues extracted' });
    }

    console.log('6. Sample venue:', JSON.stringify(venues[0]));

    const { error } = await supabase
      .from('venues')
      .upsert(venues, {
        onConflict: 'osm_id',
        ignoreDuplicates: false,
      });

    if (error) {
      console.log('7. Supabase upsert error:', JSON.stringify(error));
      throw error;
    }

    console.log('7. Supabase upsert successful');

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