import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Bounding box matching discoverVenues.ts
const BOUNDS = {
  south: 34.05,
  west: -118.30,
  north: 34.16,
  east: -118.18, // excludes Pasadena / South Pasadena; keeps NE LA + Echo Park + Silver Lake
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Fetch all venues within the target bounding box that have a website
  const { data: venues, error } = await supabase
    .from('venues')
    .select('id')
    .not('website', 'is', null)
    .gte('latitude', BOUNDS.south)
    .lte('latitude', BOUNDS.north)
    .gte('longitude', BOUNDS.west)
    .lte('longitude', BOUNDS.east);

  if (error) {
    console.error('seedCrawlQueue fetch error:', error);
    return res.status(500).json({ error: error.message });
  }

  if (!venues || venues.length === 0) {
    return res.status(200).json({ seeded: 0, message: 'No venues with websites found in bounds' });
  }

  // Upsert into crawl_queue — skip venues already queued
  const rows = venues.map((v) => ({ venue_id: v.id, status: 'pending' }));

  const { error: upsertError, count } = await supabase
    .from('crawl_queue')
    .upsert(rows, { onConflict: 'venue_id', ignoreDuplicates: true })
    .select('id', { count: 'exact', head: true });

  if (upsertError) {
    console.error('seedCrawlQueue upsert error:', upsertError);
    return res.status(500).json({ error: upsertError.message });
  }

  console.log(`seedCrawlQueue: ${venues.length} venues found, ${count ?? 'unknown'} new rows inserted`);

  return res.status(200).json({
    found: venues.length,
    seeded: count ?? venues.length,
  });
}
