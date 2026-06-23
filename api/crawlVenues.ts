import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import FirecrawlApp from '@mendable/firecrawl-js';

// How many venues to crawl per invocation — keeps each run well under Vercel's
// 60-second serverless timeout and Firecrawl's 2 concurrent request limit.
const BATCH_SIZE = 10;

// Nav links whose URL path looks like a dedicated happy-hour / specials page.
const HH_URL_PATTERN = /happy.?hour|drink-?special|specials|fooddrinkmenu|deals/i;

// Pick the best happy-hour subpage from a homepage's links.
// Same-domain only; prefers explicit "happy hour" URLs over generic specials/menu.
function findHappyHourSubpage(links: string[], homepage: string): string | null {
  let host: string;
  try {
    host = new URL(homepage).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }

  const candidates = links.filter((href) => {
    try {
      const u = new URL(href, homepage);
      if (u.hostname.replace(/^www\./, '') !== host) return false;
      return HH_URL_PATTERN.test(u.pathname);
    } catch {
      return false;
    }
  });

  // Rank explicit happy-hour URLs ahead of generic specials/menu URLs.
  candidates.sort((a, b) => {
    const aScore = /happy.?hour/i.test(a) ? 0 : 1;
    const bScore = /happy.?hour/i.test(b) ? 0 : 1;
    return aScore - bScore;
  });

  return candidates[0] ?? null;
}

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
      // Step 1 — scrape the homepage, also asking for links (no extra credit).
      // onlyMainContent:false so the nav menu (and its happy-hour link) is captured
      // in `home.links`; onlyMainContent:true strips the nav before link extraction.
      const home = await firecrawl.scrape(venue.website, {
        formats: ['markdown', 'links'],
        onlyMainContent: false,
        timeout: 30000,
      });

      if (!home.markdown) {
        throw new Error('Empty markdown returned');
      }

      let combinedMarkdown = home.markdown;

      // Step 2 — if the nav links to a dedicated happy-hour page, scrape it too
      // and merge it ahead of the homepage (authoritative source first).
      const subUrl = findHappyHourSubpage(home.links ?? [], venue.website);
      if (subUrl && subUrl !== venue.website) {
        try {
          console.log(`  Found happy-hour subpage: ${subUrl}`);
          const sub = await firecrawl.scrape(subUrl, {
            formats: ['markdown'],
            onlyMainContent: true,
            timeout: 30000,
          });
          if (sub.markdown) {
            combinedMarkdown =
              `## HAPPY HOUR PAGE (${subUrl})\n\n${sub.markdown}\n\n---\n\n` +
              `## HOMEPAGE (${venue.website})\n\n${home.markdown}`;
          }
        } catch (subErr) {
          const msg = subErr instanceof Error ? subErr.message : 'Unknown error';
          console.warn(`  Subpage scrape failed (${subUrl}): ${msg} — using homepage only`);
        }
      }

      await supabase
        .from('crawl_queue')
        .update({
          status: 'done',
          raw_markdown: combinedMarkdown,
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
