#!/usr/bin/env bash
# Local pipeline test — requires `pnpm dev:api` running in another terminal.
#
# Usage:
#   bash scripts/test-pipeline.sh 1       — discover venues (OSM → Supabase)
#   bash scripts/test-pipeline.sh 2       — seed crawl_queue from venues with websites
#   bash scripts/test-pipeline.sh 3       — crawl one batch of 10 venues
#   bash scripts/test-pipeline.sh drain   — crawl ALL pending venues (loops until empty)
#   bash scripts/test-pipeline.sh all     — run steps 1, 2, then one batch of step 3

set -euo pipefail

BASE="http://localhost:3000"
SECRET="K8mP2xQvN9wL5jR3yT6uA1cF4hD7eG0b"
AUTH="Authorization: Bearer $SECRET"

run_step() {
  local name="$1"
  local path="$2"
  echo ""
  echo "▶ $name"
  curl -s -X POST "$BASE$path" \
    -H "$AUTH" \
    -H "Content-Type: application/json" \
    | node -e "let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{try{console.log(JSON.stringify(JSON.parse(d),null,2))}catch{console.log(d)}})"
  echo ""
}

drain_queue() {
  echo ""
  echo "▶ Draining crawl queue (10 venues per batch, 5s between batches)..."
  local batch=1
  while true; do
    echo "  — Batch $batch"
    local response
    response=$(curl -s -X POST "$BASE/api/crawlVenues" \
      -H "$AUTH" \
      -H "Content-Type: application/json")
    echo "$response" | node -e "let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{try{console.log(JSON.stringify(JSON.parse(d),null,2))}catch{console.log(d)}})"

    # Stop when crawled = 0 (queue empty)
    local crawled
    crawled=$(echo "$response" | node -e "let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{try{const j=JSON.parse(d); console.log(j.crawled ?? j.batch ?? 0)}catch{console.log(0)}})")
    if [ "$crawled" = "0" ]; then
      echo "  Queue is empty. Done."
      break
    fi

    batch=$((batch + 1))
    sleep 5
  done
}

STEP="${1:-all}"

case "$STEP" in
  1)     run_step "Step 1: Discover venues (OSM → Supabase)" "/api/discoverVenues" ;;
  2)     run_step "Step 2: Seed crawl queue" "/api/seedCrawlQueue" ;;
  3)     run_step "Step 3: Crawl one batch (10 venues)" "/api/crawlVenues" ;;
  drain) drain_queue ;;
  all)
    run_step "Step 1: Discover venues (OSM → Supabase)" "/api/discoverVenues"
    echo "Waiting 3s..."
    sleep 3
    run_step "Step 2: Seed crawl queue" "/api/seedCrawlQueue"
    echo "Waiting 3s..."
    sleep 3
    run_step "Step 3: Crawl one batch (10 venues)" "/api/crawlVenues"
    ;;
  *)
    echo "Usage: bash scripts/test-pipeline.sh [1|2|3|drain|all]"
    exit 1
    ;;
esac
