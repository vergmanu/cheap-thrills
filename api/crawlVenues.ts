import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import FirecrawlApp from '@mendable/firecrawl-js';

// How many venues to crawl per invocation — keeps each run well under Vercel's
// 60-second serverless timeout and Firecrawl's 2 concurrent request limit.
const BATCH_SIZE = 10;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY! });

  // Claim a batch of pending rows — mark processing so parallel runs don't double-crawl
  const { data: batch, error: fetchError } = await supabase
    .from('crawl_queue')
    .select('id, venue_id, retries, venues(name, website)')
    .eq('status', 'pending')
    .lt('retries', 3)
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE);

  if (fetchError) {
    console.error('crawlVenues fetch error:', fetchError);
    return res.status(500).json({ error: fetchError.message });
  }

  if (!batch || batch.length === 0) {
    return res.status(200).json({ crawled: 0, message: 'No pending venues in queue' });
  }

  const ids = batch.map((r) => r.id);

  // Mark as processing to prevent double-crawl on concurrent runs
  await supabase
    .from('crawl_queue')
    .update({ status: 'processing', last_attempt_at: new Date().toISOString() })
    .in('id', ids);

  const results = { done: 0, failed: 0, skipped: 0 };

  for (const row of batch) {
    const venue = (row.venues as unknown) as { name: string; website: string } | null;

    if (!venue?.website) {
      await supabase
        .from('crawl_queue')
        .update({ status: 'failed', error: 'No website on venue record' })
        .eq('id', row.id);
      results.skipped++;
      continue;
    }

    console.log(`Crawling: ${venue.name} — ${venue.website}`);

    try {
      const scrapeResult = await firecrawl.scrape(venue.website, {
        formats: ['markdown'],
        onlyMainContent: true,
        timeout: 30000,
      });

      if (!scrapeResult.markdown) {
        throw new Error('Empty markdown returned');
      }

      await supabase
        .from('crawl_queue')
        .update({
          status: 'done',
          raw_markdown: scrapeResult.markdown,
          last_attempt_at: new Date().toISOString(),
        })
        .eq('id', row.id);

      await supabase
        .from('venues')
        .update({ last_crawled_at: new Date().toISOString() })
        .eq('id', row.venue_id);

      results.done++;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error(`Failed to crawl ${venue.website}:`, message);

      await supabase
        .from('crawl_queue')
        .update({
          status: 'failed',
          error: message,
          retries: (row.retries ?? 0) + 1,
          last_attempt_at: new Date().toISOString(),
        })
        .eq('id', row.id);

      results.failed++;
    }
  }

  console.log('crawlVenues batch complete:', results);
  return res.status(200).json({ batch: batch.length, ...results });
}
