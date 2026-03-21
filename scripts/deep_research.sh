#!/bin/bash
# Deep Research Pipeline - локальный, без API ключей
# Usage: ./deep_research.sh "topic" [output_dir]

TOPIC="${1:-}"
OUTPUT_DIR="${2:-/home/node/.openclaw/workspace/archive/research/$(date +%Y%m%d_%H%M%S)/}"

if [ -z "$TOPIC" ]; then 
  echo "Usage: $0 'topic' [output_dir]"
  echo "Example: $0 'AI agents 2026' ~/research/"
  exit 1
fi

# Clean topic for filename
TOPIC_CLEAN=$(echo "$TOPIC" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd 'a-z0-9-')
mkdir -p "$OUTPUT_DIR"
REPORT="$OUTPUT_DIR/research_${TOPIC_CLEAN}_$(date +%Y%m%d_%H%M%S).md"
TMPDIR="$OUTPUT_DIR/tmp_$$"
mkdir -p "$TMPDIR"

SEARCH_URL="http://searxng:8080"

# Single search query - returns results
search() {
  local query="$1"
  local limit="${2:-8}"
  local encoded=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$query'))")
  
  curl -s "${SEARCH_URL}/search?q=${encoded}&format=json&limit=${limit}" 2>/dev/null
}

# Extract results from JSON - simplified parsing
parse_results() {
  local json="$1"
  local min_content="${2:-50}"
  
  echo "$json" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    results = data.get('results', []) if isinstance(data, dict) else data
    if not isinstance(results, list):
        results = []
    count = 0
    for r in results:
        if count >= 8:
            break
        title = r.get('title', '')
        url = r.get('url', '')
        content = r.get('content', '')
        if not url or not title:
            continue
        if len(content) < $min_content:
            continue
        print(f'### [{title}]({url})')
        print(f'URL: {url}')
        if content:
            print(f'{content[:400]}')
        print()
        count += 1
except Exception as e:
    print(f'Parse error: {e}', file=sys.stderr)
" 2>/dev/null
}

# Fetch and extract content from URL
fetch_content() {
  local url="$1"
  local max_chars="${2:-2000}"
  
  # Use web_fetch tool in actual usage
  # This is for preview only
  echo "Fetching: $url"
}

echo "Research starting for: $TOPIC"
echo "Output: $REPORT"
echo ""

# Stage 1: Simple direct search
echo "## Stage 1: Direct search" >> "$REPORT"
echo "" >> "$REPORT"

RESULT1=$(search "$TOPIC" 10)
if [ -n "$RESULT1" ]; then
  echo "Found $(echo "$RESULT1" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(len(d.get("results",[])))' 2>/dev/null) results" 
  parse_results "$RESULT1" >> "$REPORT"
else
  echo "Search failed" >> "$REPORT"
fi

# Stage 2: Separate searches for different aspects
echo "" >> "$REPORT"
echo "## Stage 2: Key Information" >> "$REPORT"
echo "" >> "$REPORT"

# Search for different aspects
for aspect in "what is" "benefits" "use cases"; do
  echo "### $aspect: $TOPIC" >> "$REPORT"
  RESULT=$(search "$TOPIC $aspect" 5)
  if [ -n "$RESULT" ]; then
    parse_results "$RESULT" >> "$REPORT"
  fi
  echo "" >> "$REPORT"
done

# Stage 3: Latest news
echo "" >> "$REPORT"
echo "## Stage 3: Recent Developments" >> "$REPORT"
echo "" >> "$REPORT"

RESULT3=$(search "$TOPIC news 2026" 8)
if [ -n "$RESULT3" ]; then
  parse_results "$RESULT3" >> "$REPORT"
fi

# Create header
{
  echo "---"
  echo "title: \"Research: $TOPIC\""
  echo "date: $(date -Iseconds)"
  echo "source: SearXNG"
  echo "topic: $TOPIC"
  echo "---"
} | cat - "$REPORT" > "$TMPDIR/header" && mv "$TMPDIR/header" "$REPORT"

echo ""
echo "========================================="
echo "Research completed: $TOPIC"
echo "Report: $REPORT"
echo "Size: $(wc -c < "$REPORT") bytes"
echo "========================================="

# Show preview
echo ""
echo "Preview (first 1000 chars):"
head -c 1000 "$REPORT"
echo "..."

# Cleanup
rm -rf "$TMPDIR"
