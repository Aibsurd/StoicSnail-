#!/bin/bash
# gh-manage.sh — GitHub management для Stoic Snail
# Использование: ./gh-manage.sh [command] [args]

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Token loaded from environment or .secrets/github-token
# DO NOT hardcode tokens in this file
TOKEN="${GITHUB_TOKEN:-}"
REPO="Aibsurd/StoicSnail-"
API="https://api.github.com/repos/$REPO"

WORKSPACE="$(cd "$(dirname "$0")" && pwd)"

# Load token from secrets if not set
if [ -z "$TOKEN" ]; then
  if [ -f "$WORKSPACE/.secrets/github-token" ]; then
    TOKEN=$(cat "$WORKSPACE/.secrets/github-token" 2>/dev/null | tr -d '\n')
  fi
fi

if [ -z "$TOKEN" ]; then
  echo -e "${RED}✗${NC} GitHub token not found. Set GITHUB_TOKEN env or create .secrets/github-token"
  exit 1
fi

# Pretty print JSON
pp() {
  python3 -m json.tool 2>/dev/null || cat
}

# API call
api() {
  curl -s -H "Authorization: token $TOKEN" \
       -H "Accept: application/vnd.github+json" \
       "$@"
}

# Create issue
create_issue() {
  local title="$1"
  local body="$2"
  local labels="$3"
  
  local data=$(cat << EOF
{
  "title": "$title",
  "body": "$body",
  "labels": [$labels]
}
EOF
)
  
  response=$(api -X POST "$API/issues" -d "$data")
  echo "$response" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'${GREEN}✓${NC} Created: #{d[\"number\"]} - {d[\"title\"]}')" 2>/dev/null || echo "Error: $response"
}

# List issues
list_issues() {
  local state="${1:-open}"
  local filter="${2:-all}"
  
  echo -e "${BLUE}=== $state issues ===${NC}"
  api "$API/issues?state=$state&sort=updated&per_page=50" | python3 -c "
import sys,json
issues = json.load(sys.stdin)
for i in issues:
  if 'pull_request' not in i:
    labels = ','.join([l['name'] for l in i.get('labels',[])]) or 'none'
    print(f\"#{i['number']:4} [{labels:20}] {i['title'][:50]}\")
" 2>/dev/null
}

# Close issue
close_issue() {
  local num="$1"
  api -X PATCH "$API/issues/$num" -d '{"state":"closed"}' | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'${GREEN}✓${NC} Closed: #{d[\"number\"]} - {d[\"title\"]}')" 2>/dev/null
}

# Reopen issue
reopen_issue() {
  local num="$1"
  api -X PATCH "$API/issues/$num" -d '{"state":"open"}' | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'${GREEN}✓${NC} Reopened: #{d[\"number\"]} - {d[\"title\"]}')" 2>/dev/null
}

# Show issue
show_issue() {
  local num="$1"
  api "$API/issues/$num" | python3 -c "
import sys,json
d = json.load(sys.stdin)
print(f\"#\{d['number']\} - \{d['title']\}\")
print(f\"State: \{d['state']\}\")
print(f\"Labels: \{','.join([l['name'] for l in d.get('labels',[])])\}\")
print()
print(d.get('body','')[:500])
" 2>/dev/null
}

# Add comment
comment_issue() {
  local num="$1"
  local body="$2"
  
  data=$(cat << EOF
{
  "body": "$body"
}
EOF
)
  
  response=$(api -X POST "$API/issues/$num/comments" -d "$data")
  echo "$response" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'${GREEN}✓${NC} Comment added to #{d[\"issue_number\"]}')" 2>/dev/null || echo "Error"
}

# Sync workspace to GitHub
sync() {
  echo -e "${BLUE}[Sync]${NC} Committing and pushing workspace..."
  cd "$WORKSPACE"
  
  # Check for changes
  if git diff --quiet && git diff --cached --quiet; then
    echo -e "${YELLOW}⚠${NC} No changes to commit"
    return 0
  fi
  
  # Add all changes
  git add -A
  
  # Commit with timestamp
  timestamp=$(date +"%Y-%m-%d %H:%M UTC")
  git commit -m "Auto-sync: $timestamp" || echo "Nothing to commit"
  
  # Push
  git push origin master 2>&1 | tail -3
  
  echo -e "${GREEN}✓${NC} Synced"
}

# Create project (GitHub Projects v2)
create_project() {
  local name="$1"
  
  # GraphQL API for Projects v2
  query='{"query": "mutation { createProjectV2(input: {ownerId: \"OWNER_ID\", name: \"NAME\", repositoryId: \"REPO_ID\"}) { projectV2 { id, title } } }"}'
  
  # For simplicity, we'll just log - Projects API is complex
  echo -e "${YELLOW}⚠${NC} Projects v2 requires GraphQL. Use web UI for now."
  echo "https://github.com/Aibsurd/StoicSnail-/projects"
}

# Help
help() {
  echo -e "${CYAN}🐌 GitHub Manager for Stoic Snail${NC}"
  echo ""
  echo "Usage: $0 <command> [args]"
  echo ""
  echo "Commands:"
  echo "  list [open|closed|all]     List issues"
  echo "  show <number>              Show issue details"
  echo "  create <title> [body] [labels]  Create issue"
  echo "  close <number>             Close issue"
  echo "  reopen <number>            Reopen issue"
  echo "  comment <number> <text>    Add comment"
  echo "  sync                       Sync workspace to GitHub"
  echo "  help                       Show this help"
  echo ""
  echo "Labels:"
  echo "  project, enhancement, bug, question, documentation"
  echo ""
  echo "Examples:"
  echo "  $0 list open"
  echo "  $0 create \"New feature\" \"Description here\" '\"enhancement\"'"
  echo "  $0 sync"
}

# Main
case "${1:-help}" in
  list)
    list_issues "${2:-open}" "${3:-all}"
    ;;
  show)
    show_issue "$2"
    ;;
  create)
    create_issue "$2" "${3:-}" "${4:-}"
    ;;
  close)
    close_issue "$2"
    ;;
  reopen)
    reopen_issue "$2"
    ;;
  comment)
    comment_issue "$2" "$3"
    ;;
  sync)
    sync
    ;;
  project)
    create_project "$2"
    ;;
  help|--help|-h)
    help
    ;;
  *)
    echo -e "${RED}Unknown command: $1${NC}"
    help
    exit 1
    ;;
esac
