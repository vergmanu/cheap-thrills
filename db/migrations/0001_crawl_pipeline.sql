-- Migration 0001: crawl pipeline schema
-- Adds the tables/columns needed for Step 2 (Firecrawl) and Step 3 (AI extraction).
-- Run this in the Supabase SQL editor (or via the Supabase CLI) against the project.

-- ---------------------------------------------------------------------------
-- venues: track provenance and crawl recency
-- ---------------------------------------------------------------------------
alter table venues
  add column if not exists source text,
  add column if not exists last_crawled_at timestamptz;

-- ---------------------------------------------------------------------------
-- crawl_queue: orchestrates which venue websites get scraped
-- One row per venue. status drives the Step 6 recrawl strategy.
-- ---------------------------------------------------------------------------
create table if not exists crawl_queue (
  id            uuid primary key default gen_random_uuid(),
  venue_id      uuid not null references venues(id) on delete cascade,

  -- pending | processing | done | failed
  status        text not null default 'pending',
  retries       integer not null default 0,
  error         text,

  -- raw Firecrawl markdown, persisted between Step 2 (crawl) and Step 3 (extract)
  raw_markdown  text,

  last_attempt_at timestamptz,
  created_at      timestamptz not null default now(),

  -- one queue entry per venue; lets us upsert on re-enqueue
  unique (venue_id)
);

create index if not exists crawl_queue_status_idx on crawl_queue (status);

-- ---------------------------------------------------------------------------
-- happy_hours: normalized extraction output (Step 3 / Step 4)
-- ---------------------------------------------------------------------------
create table if not exists happy_hours (
  id               uuid primary key default gen_random_uuid(),
  venue_id         uuid not null references venues(id) on delete cascade,

  day_of_week      text,
  start_time       text,
  end_time         text,

  deal_description text,

  confidence_score numeric,
  source_url       text,

  created_at       timestamptz not null default now()
);

create index if not exists happy_hours_venue_id_idx on happy_hours (venue_id);
