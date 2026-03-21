#!/bin/bash
# Deep Research Pipeline - локальный, без API ключей
TOPIC="${1:-}"
OUTPUT_DIR="${2:-/home/node/.openclaw/workspace/research/$(date +%Y%m%d_%H%M%S)/}"

if [ -z "$TOPIC" ]; then 
  echo "Usage: $0 'topic' [output_dir]"
  exit 1
fi

mkdir -p "$OUTPUT_DIR"
REPORT="$OUTPUT_DIR/research_$(date +%Y%m%d_%H%M%S).md"

search() {
  local query="$1"
  local limit="${2:-6}"
  local encoded=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$query'))")
  curl -s "http://searxng:8080/search?q=${encoded}&format=json&limit=${limit}" | \
    python3 -c "
import sys, json
data = json.load(sys.stdin)
for r in data.get('results', [])[:$limit]:
    t = r.get('title','N/A')[:100]
    u = r.get('url','')
    e = r.get('engine','')
    c = r.get('content','')[:150]
    print(f'### [{t}]({u})')
    print(f'*source: {e}*')
    if c: print(f'{c}...')
    print()
" 2>/dev/null
}

{
  echo "# Deep Research: $TOPIC"
  echo "*Generated: $(date -Iseconds) UTC*"
  echo ""
  echo "## Overview"
  search "$TOPIC overview fundamentals" 5
  echo "## Latest Developments"
  search "$TOPIC news 2026" 5
  echo "## Expert Analysis"
  search "$TOPIC expert opinion research" 5
  echo "## Practical Applications"
  search "$TOPIC real world use cases" 5
  echo ""
  echo "*Research completed: $(date -Iseconds) UTC*"
} > "$REPORT"

echo "Done. Report: $REPORT"
wc -w < "$REPORT"
