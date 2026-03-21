#!/bin/bash
# DuckDuckGo HTML search - no API key required
QUERY="${1:-}"
MAX="${2:-10}"
if [ -z "$QUERY" ]; then echo "Usage: ddg_search.sh 'query' [max]"; exit 1; fi
ENCODED=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$QUERY'))")
curl -s "https://html.duckduckgo.com/html/?q=${ENCODED}&kl=wt-wt" | \
  python3 -c "
import sys, re
html = sys.stdin.read()
results = re.findall(r'<a class=\"result__a\" href=\"([^\"]+)\">([^<]+)</a>.*?<a class=\"result__snippet\"[^>]*>([^<]+)</a>', html, re.DOTALL)
for i, (url, title, snippet) in enumerate(results[:int('$MAX')]):
    clean_title = re.sub('<[^>]+>', '', title).strip()
    clean_snippet = re.sub('<[^>]+>', '', snippet).strip()
    print(f'{i+1}. {clean_title}')
    print(f'   URL: {url}')
    print(f'   {clean_snippet}')
    print()
" 2>/dev/null || echo "Parsing failed"
