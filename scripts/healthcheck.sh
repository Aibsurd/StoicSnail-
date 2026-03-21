#!/bin/bash
# healthcheck.sh — OpenClaw system health check
# Usage: ./healthcheck.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

WORKSPACE="/home/node/.openclaw/workspace"
CONFIG="$HOME/.openclaw/openclaw.json"

echo "============================================"
echo "  🐌 Stoic Snail — Health Check"
echo "  $(date +%Y-%m-%d\ %H:%M\ UTC)"
echo "============================================"
echo ""

# 1. OpenClaw Status
echo -e "${BLUE}[1/8]${NC} OpenClaw Status..."

if command -v openclaw &> /dev/null; then
  VERSION=$(openclaw --version 2>/dev/null || echo "unknown")
  echo -e "  ${GREEN}✓${NC} OpenClaw CLI: $VERSION"
else
  echo -e "  ${YELLOW}⚠${NC} OpenClaw CLI not in PATH"
fi

if [ -f "$CONFIG" ]; then
  echo -e "  ${GREEN}✓${NC} Config exists"
else
  echo -e "  ${RED}✗${NC} Config missing!"
fi

# 2. Gateway Status
echo ""
echo -e "${BLUE}[2/8]${NC} Gateway Health..."

PORT=$(grep -o '"port": *[0-9]*' "$CONFIG" 2>/dev/null | grep -o '[0-9]*' | head -1)
BIND=$(grep -o '"bind": *"[^"]*"' "$CONFIG" 2>/dev/null | cut -d'"' -f4)
MODE=$(grep -o '"mode": *"[^"]*"' "$CONFIG" 2>/dev/null | head -1 | cut -d'"' -f4)

echo -e "  Port: $PORT"
echo -e "  Bind: $BIND"
echo -e "  Mode: $MODE"

# 3. Workspace
echo ""
echo -e "${BLUE}[3/8]${NC} Workspace..."

if [ -d "$WORKSPACE" ]; then
  echo -e "  ${GREEN}✓${NC} Workspace exists"
  FILES=$(find "$WORKSPACE" -maxdepth 1 -name "*.md" | wc -l)
  SCRIPTS=$(find "$WORKSPACE/scripts" -name "*.sh" 2>/dev/null | wc -l)
  echo -e "  MD files: $FILES"
  echo -e "  Scripts: $SCRIPTS"
else
  echo -e "  ${RED}✗${NC} Workspace missing!"
fi

# 4. Git Status
echo ""
echo -e "${BLUE}[4/8]${NC} Git Repository..."

cd "$WORKSPACE"
if git rev-parse --git-dir > /dev/null 2>&1; then
  echo -e "  ${GREEN}✓${NC} Git initialized"
  LAST_PUSH=$(git log --oneline -1 2>/dev/null || echo "no commits")
  echo -e "  Last push: $LAST_PUSH"
  
  # Check for uncommitted changes
  if [ -n "$(git status --porcelain)" ]; then
    echo -e "  ${YELLOW}⚠${NC} Uncommitted changes!"
  else
    echo -e "  ${GREEN}✓${NC} Clean"
  fi
  
  # Check remote
  REMOTE=$(git remote get-url origin 2>/dev/null | sed 's|https://ghp_.*@||' || echo "none")
  echo -e "  Remote: $REMOTE"
else
  echo -e "  ${RED}✗${NC} Not a git repo"
fi

# 5. Disk & Memory
echo ""
echo -e "${BLUE}[5/8]${NC} System Resources..."

DISK=$(df -h "$WORKSPACE" 2>/dev/null | tail -1 | awk '{print $5 " used (" $4 " available)"}')
echo -e "  Disk: $DISK"

if command -v free &> /dev/null; then
  MEM=$(free -h 2>/dev/null | grep Mem | awk '{print $3 " / " $2}')
  echo -e "  Memory: $MEM"
fi

# 6. Plugins & Services
echo ""
echo -e "${BLUE}[6/8]${NC} Plugins..."

PLUGIN_COUNT=$(grep -c "enabled.*true" "$CONFIG" 2>/dev/null || echo "0")
echo -e "  Enabled plugins: $PLUGIN_COUNT"

# Check specific plugins
if grep -q 'searxng' "$CONFIG" 2>/dev/null; then
  echo -e "  ${GREEN}✓${NC} SearXNG"
fi

if grep -q 'memory-qdrant' "$CONFIG" 2>/dev/null; then
  echo -e "  ${GREEN}✓${NC} memory-qdrant"
fi

# 7. Cron Jobs
echo ""
echo -e "${BLUE}[7/8]${NC} Scheduled Tasks..."

if command -v crontab &> /dev/null; then
  CRON_COUNT=$(crontab -l 2>/dev/null | grep -v "^#" | grep -v "^$" | wc -l)
  echo -e "  System crontab: $CRON_COUNT jobs"
else
  echo -e "  ${YELLOW}⚠${NC} crontab not available"
fi

# Check OpenClaw cron (if available)
if [ -f "$HOME/.openclaw/cron/jobs.json" ] 2>/dev/null; then
  echo -e "  ${GREEN}✓${NC} OpenClaw cron exists"
fi

# 8. Security Check
echo ""
echo -e "${BLUE}[8/8]${NC} Security..."

# Check token presence (should be masked)
if grep -q 'token' "$CONFIG" 2>/dev/null; then
  if grep -q 'token.*\*\*\*\*' "$CONFIG" 2>/dev/null; then
    echo -e "  ${GREEN}✓${NC} Token is masked"
  else
    echo -e "  ${YELLOW}⚠${NC} Token may be exposed (check manually)"
  fi
fi

# Check for .secrets directory
if [ -d "$WORKSPACE/.secrets" ]; then
  echo -e "  ${GREEN}✓${NC} .secrets/ exists (gitignored)"
else
  echo -e "  ${YELLOW}⚠${NC} .secrets/ not found"
fi

echo ""
echo "============================================"
echo -e "${GREEN}  Health check complete${NC}"
echo "============================================"
