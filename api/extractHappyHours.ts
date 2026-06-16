import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const BATCH_SIZE = 10;
const CONFIDENCE_THRESHOLD = 0.7;

interface HappyHourExtraction {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  dealDescription: string;
  confidence: number;
}

// Rule-based extraction patterns
const TIME_PATTERN = /(\d{1,2}):?(\d{2})?\s*(?:am|pm|AM|PM)?/g;
const TIME_RANGE_PATTERN = /(\d{1,2}):?(\d{2})?\s*(?:am|pm)?\s*[-–]\s*(\d{1,2}):?(\d{2})?\s*(?:am|pm)?/gi;
const AMPM_PATTERN = /(\d{1,2})\s*(am|pm|AM|PM)/gi;
const DAYS_PATTERN = /(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun|weekday|weekend|daily|all day)/gi;
const DEAL_KEYWORDS = ['draft', 'beer', 'cocktail', 'margarita', 'wine', 'appetizer', 'happy hour', 'special', 'discount', 'off', 'deal', 'promotion'];

function extractHappyHours(markdown: string): HappyHourExtraction[] {
  const hours: HappyHourExtraction[] = [];
  const lines = markdown.split('\n').filter((l) => l.trim().length > 0);

  for (const line of lines) {
    // Skip lines that are clearly not happy hour related
    if (line.length > 300 || !line.match(/\d/)) continue;

    const lowerLine = line.toLowerCase();
    const hasDayKeyword = DAYS_PATTERN.test(lowerLine);
    const hasDealKeyword = DEAL_KEYWORDS.some((kw) => lowerLine.includes(kw));

    // Only process lines that mention both days/times and deals
    if (!hasDealKeyword) continue;

    // Extract times
    let startTime = '';
    let endTime = '';
    let timeConfidence = 0;

    const timeRangeMatch = TIME_RANGE_PATTERN.exec(line);
    if (timeRangeMatch) {
      startTime = `${String(timeRangeMatch[1]).padStart(2, '0')}:${timeRangeMatch[2] || '00'}`;
      endTime = `${String(timeRangeMatch[3]).padStart(2, '0')}:${timeRangeMatch[4] || '00'}`;
      timeConfidence = 0.95;
    } else {
      // Try to find individual times
      const times = [];
      let match;
      TIME_PATTERN.lastIndex = 0;
      while ((match = TIME_PATTERN.exec(line)) !== null) {
        times.push(`${String(match[1]).padStart(2, '0')}:${match[2] || '00'}`);
      }
      if (times.length >= 2) {
        [startTime, endTime] = times.slice(0, 2);
        timeConfidence = 0.85;
      } else if (times.length === 1) {
        startTime = times[0];
        endTime = '23:59';
        timeConfidence = 0.6;
      }
    }

    // Extract days
    const dayMatches = lowerLine.match(DAYS_PATTERN) || [];
    const dayOfWeek = dayMatches.length > 0 ? dayMatches[0] : 'Unknown';
    const dayConfidence = dayMatches.length > 0 ? 0.9 : 0.5;

    // Extract deals
    const dealDescription = line.substring(0, 100).trim();

    // Combined confidence
    const confidence = (timeConfidence + dayConfidence) / 2;

    if (confidence >= CONFIDENCE_THRESHOLD && (startTime || dayOfWeek !== 'Unknown')) {
      hours.push({
        dayOfWeek,
        startTime,
        endTime,
        dealDescription,
        confidence: Math.min(confidence, 0.95),
      });
    }
  }

  return hours.slice(0, 5); // Return max 5 per venue (avoid noise)
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

  // Fetch batch of 'done' rows that haven't been extracted yet
  const { data: batch, error: fetchError } = await supabase
    .from('crawl_queue')
    .select('id, venue_id, raw_markdown, venues(id, name, website)')
    .eq('status', 'done')
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE);

  if (fetchError) {
    console.error('extractHappyHours fetch error:', fetchError);
    return res.status(500).json({ error: fetchError.message });
  }

  // Filter to only rows with raw_markdown (exclude null/empty)
  const rowsWithMarkdown = (batch ?? []).filter((r: any) => r.raw_markdown && r.raw_markdown.trim().length > 0);

  if (rowsWithMarkdown.length === 0) {
    return res.status(200).json({ extracted: 0, message: 'No done rows with markdown to extract' });
  }

  const results = { extracted: 0, failed: 0, skipped: 0, lowConfidence: 0 };

  for (const row of rowsWithMarkdown) {
    const venue = (row.venues as unknown) as { id: string; name: string; website: string } | null;

    if (!venue) {
      console.warn(`Row ${row.id}: venue not found`);
      results.skipped++;
      continue;
    }

    console.log(`Extracting: ${venue.name}`);

    try {
      // Rule-based extraction (no API calls needed)
      const happyHoursRaw = extractHappyHours(row.raw_markdown);

      if (happyHoursRaw.length === 0) {
        console.log(`  No happy hours found in markdown`);
        results.skipped++;
        continue;
      }

      // Filter by confidence and clean up times
      const validHours = happyHoursRaw
        .filter((h) => h.confidence >= CONFIDENCE_THRESHOLD)
        .map((h) => ({
          venue_id: venue.id,
          day_of_week: h.dayOfWeek,
          start_time: h.startTime || null,
          end_time: h.endTime || null,
          deal_description: h.dealDescription || null,
          confidence_score: h.confidence,
          source_url: venue.website,
        }));

      const skippedCount = happyHoursRaw.length - validHours.length;
      if (skippedCount > 0) {
        console.log(`  Skipped ${skippedCount} low-confidence entries (< ${CONFIDENCE_THRESHOLD})`);
        results.lowConfidence += skippedCount;
      }

      if (validHours.length > 0) {
        // Delete existing happy_hours for this venue and insert new ones
        await supabase.from('happy_hours').delete().eq('venue_id', venue.id);

        const { error: insertError } = await supabase.from('happy_hours').insert(validHours);

        if (insertError) {
          throw insertError;
        }

        console.log(`  Inserted ${validHours.length} happy hour records`);
        results.extracted++;
      } else {
        console.log(`  No valid happy hours found after confidence filtering`);
        results.skipped++;
      }

      // Mark crawl_queue row as extracted
      await supabase
        .from('crawl_queue')
        .update({ status: 'extracted', last_attempt_at: new Date().toISOString() })
        .eq('id', row.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error(`Failed to extract ${venue.name}:`, message);

      // Mark as failed (don't retry — extraction is deterministic)
      await supabase
        .from('crawl_queue')
        .update({
          status: 'failed',
          error: `Extraction error: ${message}`,
          last_attempt_at: new Date().toISOString(),
        })
        .eq('id', row.id);

      results.failed++;
    }
  }

  console.log('extractHappyHours batch complete:', results);
  return res.status(200).json({ batch: rowsWithMarkdown.length, ...results });
}
