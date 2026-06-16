import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { zipCode } = req.query;

  if (!zipCode || typeof zipCode !== 'string') {
    return res.status(400).json({ error: 'Zip code is required' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  try {
    // Step 1: Convert zip to lat/lng
    const geoRes = await fetch(`https://api.zippopotam.us/us/${zipCode}`);
    if (!geoRes.ok) {
      return res.status(400).json({ error: 'Could not locate zip code.' });
    }
    const geoData = await geoRes.json();
    if (!geoData.places || geoData.places.length === 0) {
      return res.status(400).json({ error: 'Zip code not found.' });
    }

    const lat = parseFloat(geoData.places[0].latitude);
    const lng = parseFloat(geoData.places[0].longitude);
    const radiusMiles = parseFloat(process.env.SEARCH_RADIUS_MILES ?? '5');
    const radiusMeters = radiusMiles * 1609.34;

    // Step 2: Query Supabase for nearby venues using PostGIS
    const { data: venues, error } = await supabase.rpc('venues_within_radius', {
      lat,
      lng,
      radius_meters: radiusMeters,
    });

    if (error) throw error;

    // Step 3: Fetch happy_hours for each venue
    const venueIds = (venues ?? []).map((v: any) => v.id);
    let happyHoursByVenue: Record<string, any[]> = {};

    if (venueIds.length > 0) {
      const { data: happyHours, error: hhError } = await supabase
        .from('happy_hours')
        .select('*')
        .in('venue_id', venueIds);

      if (hhError) {
        console.warn('Failed to fetch happy_hours:', hhError.message);
      } else if (happyHours) {
        happyHoursByVenue = happyHours.reduce(
          (acc, hh) => {
            if (!acc[hh.venue_id]) acc[hh.venue_id] = [];
            acc[hh.venue_id].push(hh);
            return acc;
          },
          {} as Record<string, any[]>
        );
      }
    }

    // Step 4: Enrich venue data with happy_hours
    const enrichedVenues = (venues ?? []).map((v: any) => ({
      ...v,
      happy_hours: happyHoursByVenue[v.id] ?? [],
    }));

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({
      results: enrichedVenues,
      searchLat: lat,
      searchLng: lng,
    });

  } catch (err) {
    console.error('venues error:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}