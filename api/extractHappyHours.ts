import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const BATCH_SIZE = 10;
const CONFIDENCE_THRESHOLD = 0.7;

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

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // Fetch batch of 'done' rows that haven't been extracted yet
  const { data: batch, error: fetchError } = await supabase
    .from('crawl_queue')
    .select('id, venue_id, raw_markdown, venues(id, name, website)')
    .eq('status', 'done')
    .not('raw_markdown', 'is', null) // has markdown
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE);

  if (fetchError) {
    console.error('extractHappyHours fetch error:', fetchError);
    return res.status(500).json({ error: fetchError.message });
  }

  // Filter to only rows with raw_markdown
  const rowsWithMarkdown = (batch ?? []).filter((r) => r.raw_markdown);

  if (rowsWithMarkdown.length === 0) {
    return res.status(200).json({ extracted: 0, message: 'No done rows with markdown to extract' });
  }

  const results = { extracted: 0, failed: 0, skipped: 0, lowConfidence: 0 };

  for (const row of rowsWithMarkdown) {
    const venue = row.venues as { id: string; name: string; website: string } | null;

    if (!venue) {
      console.warn(`Row ${row.id}: venue not found`);
      results.skipped++;
      continue;
    }

    console.log(`Extracting: ${venue.name}`);

    try {
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        tools: [
          {
            name: 'extract_happy_hours',
            description:
              'Extract happy hour schedules and drink deals from website text. Return all happy hours found with day, times, and deal descriptions.',
            input_schema: {
              type: 'object' as const,
              properties: {
                happyHours: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      dayOfWeek: {
                        type: 'string',
                        description:
                          'Day(s) of week (e.g., "Monday", "Monday-Friday", "Daily", "Weekdays")',
                      },
                      startTime: {
                        type: 'string',
                        description: '24-hour format start time, e.g. "17:00" or "5:00pm". Empty string if not specified.',
                      },
                      endTime: {
                        type: 'string',
                        description: '24-hour format end time, e.g. "19:00" or "7:00pm". Empty string if not specified.',
                      },
                      dealDescription: {
                        type: 'string',
                        description:
                          'Specific deals offered (e.g., "$5 draft beers, half-price appetizers"). Empty string if no deals mentioned.',
                      },
                      confidence: {
                        type: 'number',
                        description:
                          'Confidence score 0-1. Use 0.95+ if times and days are explicit. Use 0.7-0.9 if inferred or partially stated. Use <0.7 if speculative.',
                      },
                    },
                    required: ['dayOfWeek', 'startTime', 'endTime', 'dealDescription', 'confidence'],
                  },
                  description: 'Array of happy hour windows found',
                },
              },
              required: ['happyHours'],
            },
          },
        ],
        messages: [
          {
            role: 'user',
            content: `Extract all happy hour promotions from this website text. Return day, time, and deal descriptions. Be conservative with confidence scores. If times are missing but days are mentioned, still return the day with empty times and lower confidence.\n\nWebsite: ${venue.website}\nVenue: ${venue.name}\n\n${row.raw_markdown}`,
          },
        ],
      });

      // Parse tool use response
      const toolUse = response.content.find((block) => block.type === 'tool_use');
      if (!toolUse || toolUse.type !== 'tool_use') {
        throw new Error('No tool use in response');
      }

      const extraction = toolUse.input as ExtractionResult;

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
