#!/bin/bash
# Deep Research Pipeline v2 - использует web_search через OpenClaw gateway API
# Usage: ./deep_research.sh "topic" [iterations]

TOPIC="${1:-}"
ITERATIONS="${2:-2}"
GATEWAY_URL="${OPENCLAW_GATEWAY_URL:-http://127.0.0.1:18789}"
TOKEN="${OPENCLAW_TOKEN:-}"
OUTPUT_DIR="/home/node/.openclaw/workspace/research/$(date +%Y%m%d_%H%M%S)"

if [ -z "$TOPIC" ]; then echo "Usage: $0 'topic' [iterations]"; exit 1; fi
if [ -z "$TOKEN" ]; then echo "ERROR: OPENCLAW_TOKEN not set"; exit 1; fi

mkdir -p "$OUTPUT_DIR"
REPORT="$OUTPUT_DIR/report.md"

echo "# Deep Research: $TOPIC" > "$REPORT"
echo "*Started: $(date -Iseconds)*" >> "$REPORT"
echo "" >> "$REPORT"

search_web() {
  local query="$1"
  curl -s -X POST "$GATEWAY_URL/api/web/search" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"query\":\"$query\",\"count\":5}" | \
    python3 -c "
import sys, json
data = json.load(sys.stdin)
for r in data.get('results', []):
    title = r.get('title', 'N/A')
    url = r.get('url', '')
    engine = r.get('engine', '')
    print(f'- [{title}]({url}) [{engine}]')
" 2>/dev/null
}

# Итерации исследования
for i in $(seq 1 $ITERATIONS); do
  echo "=== Iteration $i/$ITERATIONS: $(date -Iseconds) ==="
  
  # Основные аспекты
  echo "## Key Aspects of: $TOPIC" >> "$REPORT"
  echo "" >> "$REPORT"
  search_web "$TOPIC overview fundamentals 2026" >> "$REPORT"
  echo "" >> "$REPORT"
  
  # Последние новости
  echo "## Latest News & Developments: $TOPIC" >> "$REPORT"
  echo "" >> "$REPORT"
  search_web "$TOPIC latest news March 2026" >> "$REPORT"
  echo "" >> "$REPORT"
  
  # Экспертный анализ
  echo "## Expert Analysis: $TOPIC" >> "$REPORT"
  echo "" >> "$REPORT"
  search_web "$TOPIC expert analysis research 2026" >> "$REPORT"
  echo "" >> "$REPORT"
  
  echo "*Iteration $i done: $(date -Iseconds)*" >> "$REPORT"
  echo "" >> "$REPORT"
done

echo "## Sources" >> "$REPORT"
echo "" >> "$REPORT"
echo "*Report generated: $(date -Iseconds)*" >> "$REPORT"
echo "*Iterations: $ITERATIONS*" >> "$REPORT"

echo ""
echo "=== REPORT ==="
cat "$REPORT"
echo ""
echo "Saved to: $REPORT"
