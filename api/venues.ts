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
    const { data, error } = await supabase.rpc('venues_within_radius', {
      lat,
      lng,
      radius_meters: radiusMeters,
    });

    if (error) throw error;

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({
      results: data ?? [],
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