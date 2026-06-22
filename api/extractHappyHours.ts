import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';

const BATCH_SIZE = 5;
const CONFIDENCE_THRESHOLD = 0.7;
// Groq free tier: 12k TPM. ~900 tokens fixed overhead → ~8400 chars of markdown is safe per request.
const MAX_MARKDOWN_CHARS = 8000;

interface HappyHourExtraction {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  dealDescription: string;
  confidence: number;
}

interface ExtractionResult {
  happyHours: HappyHourExtraction[];
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

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

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

  console.log('Rows with markdown:', rowsWithMarkdown.length);
  if (rowsWithMarkdown.length > 0) {
    console.log('First row venue:', rowsWithMarkdown[0].venues);
    console.log('First row markdown length:', rowsWithMarkdown[0].raw_markdown?.length);
  }

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
      const markdown = (row.raw_markdown as string).slice(0, MAX_MARKDOWN_CHARS);
      const prompt = `Extract all happy hour promotions from this website text. Return day, time, and deal descriptions. Be conservative with confidence scores. If times are missing but days are mentioned, still return the day with empty times and lower confidence.

Website: ${venue.website}
Venue: ${venue.name}

${markdown}

Return a JSON object with this exact structure:
{
  "happyHours": [
    {
      "dayOfWeek": "Monday-Friday",
      "startTime": "17:00",
      "endTime": "19:00",
      "dealDescription": "$5 draft beers",
      "confidence": 0.95
    }
  ]
}

If no happy hours found, return {"happyHours": []}.`;

      const completion = await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
      });
      const responseText = completion.choices[0].message.content ?? '';

      // Parse JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const extraction = JSON.parse(jsonMatch[0]) as ExtractionResult;

      // Filter by confidence and clean up times
      const validHours = extraction.happyHours
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

      const skippedCount = extraction.happyHours.length - validHours.length;
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
