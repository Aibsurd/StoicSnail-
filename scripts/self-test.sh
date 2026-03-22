#!/bin/bash
# self-test.sh — Self-validation для Stoic Snail
# Проверяет что всё что я создал — работает
# Запускать после создания новых компонентов или раз в день

set -e

WORKSPACE="/home/node/.openclaw/workspace"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASS=0
FAIL=0
WARN=0

pass() { echo -e "  ${GREEN}✓${NC} $1"; ((PASS++)) || true; }
fail() { echo -e "  ${RED}✗${NC} $1"; ((FAIL++)) || true; }
warn() { echo -e "  ${YELLOW}⚠${NC} $1"; ((WARN++)) || true; }
info() { echo -e "  ${BLUE}•${NC} $1"; }

echo "=========================================="
echo "  🐌 Stoic Snail — Self-Test"
echo "  $(date +%Y-%m-%d\ %H:%M\ UTC)"
echo "=========================================="
echo ""

# TEST 1: Critical Files Exist
echo "📁 Critical Files:"
[ -f "$WORKSPACE/MEMORY.md" ] && pass "MEMORY.md exists" || fail "MEMORY.md missing"
[ -f "$WORKSPACE/SOUL.md" ] && pass "SOUL.md exists" || fail "SOUL.md missing"
[ -f "$WORKSPACE/RESILIENCE.md" ] && pass "RESILIENCE.md exists" || fail "RESILIENCE.md missing"
[ -f "$WORKSPACE/SCORECARD.md" ] && pass "SCORECARD.md exists" || fail "SCORECARD.md missing"
TODAY=$(date +%Y-%m-%d)
[ -f "$WORKSPACE/memory/${TODAY}.md" ] && pass "Today's log exists (${TODAY})" || fail "Today's log missing: memory/${TODAY}.md"
echo ""

# TEST 2: Scripts are executable
echo "⚙️  Scripts:"
[ -x "$WORKSPACE/scripts/checkpoint.sh" ] && pass "checkpoint.sh executable" || fail "checkpoint.sh not executable"
[ -x "$WORKSPACE/scripts/healthcheck.sh" ] && pass "healthcheck.sh executable" || fail "healthcheck.sh not executable"
[ -x "$WORKSPACE/scripts/weekly-review.sh" ] && pass "weekly-review.sh executable" || fail "weekly-review.sh not executable"
[ -x "$WORKSPACE/scripts/vitals.sh" ] && pass "vitals.sh executable" || fail "vitals.sh not executable"
echo ""

# TEST 3: Scripts actually work
echo "🔧 Script Functionality:"
if bash "$WORKSPACE/scripts/vitals.sh" > /dev/null 2>&1; then
  pass "vitals.sh runs successfully"
else
  fail "vitals.sh failed to run"
fi
echo ""

# TEST 4: Git status
echo "📦 Git:"
cd "$WORKSPACE"
if git rev-parse --git-dir > /dev/null 2>&1; then
  pass "Git repository valid"
  if [ -z "$(git status --porcelain)" ]; then
    pass "Working tree clean"
  else
    warn "Uncommitted changes present"
  fi
  # Check if remote works
  if git ls-remote --exit-code origin master > /dev/null 2>&1; then
    pass "Remote repository accessible"
  else
    warn "Remote repository not accessible"
  fi
else
  fail "Not a git repository"
fi
echo ""

# TEST 5: OpenClaw health
echo "🐚 OpenClaw:"
if command -v openclaw &> /dev/null; then
  pass "openclaw CLI available"
  VERSION=$(openclaw --version 2>/dev/null | head -1 || echo "unknown")
  info "Version: $VERSION"
else
  fail "openclaw CLI not found"
fi

# Check gateway via HTTP
if curl -s --max-time 2 http://localhost:18789/health > /dev/null 2>&1; then
  pass "Gateway HTTP health check"
else
  warn "Gateway HTTP not responding (may be normal if local only)"
fi
echo ""

# TEST 6: Cron jobs (via openclaw CLI)
echo "⏰ Cron Jobs:"
CRON_OUT=$(openclaw cron list 2>/dev/null | tail -n +3 | grep -c "cron\|at\|every" 2>/dev/null || echo "0")
if [ "$CRON_OUT" -gt 0 ] 2>/dev/null; then
  pass "$CRON_OUT cron job(s) via openclaw"
else
  # fallback: check directory
  CRON_JOBS=$(find "$HOME/.openclaw/cron" -name "*.json" 2>/dev/null | wc -l)
  if [ "$CRON_JOBS" -gt 0 ]; then
    pass "$CRON_JOBS cron job(s) configured"
  else
    warn "Cron jobs count unknown (try: openclaw cron list)"
  fi
fi
echo ""

# TEST 7: Disk space
echo "💾 Resources:"
DISK_PCT=$(df "$WORKSPACE" 2>/dev/null | tail -1 | awk '{print $5}' | tr -d '%')
DISK_AVAIL=$(df -h "$WORKSPACE" 2>/dev/null | tail -1 | awk '{print $4}')
if [ "$DISK_PCT" -lt 80 ]; then
  pass "Disk space: ${DISK_PCT}% used (${DISK_AVAIL} free)"
elif [ "$DISK_PCT" -lt 90 ]; then
  warn "Disk space: ${DISK_PCT}% used, ${DISK_AVAIL} free (on overlay/WSL2 this may be inflated)"
else
  fail "Disk space CRITICAL: ${DISK_PCT}% used, only ${DISK_AVAIL} free"
fi
echo ""

# TEST 8: Qdrant (if configured)
echo "🧠 Memory-Qdrant:"
if curl -s --max-time 2 http://localhost:6333/health > /dev/null 2>&1; then
  pass "Qdrant responding"
else
  warn "Qdrant server not available (plugin disabled)"
fi
echo ""

# TEST 9: SearXNG (if configured)
echo "🔍 SearXNG:"
if curl -s --max-time 2 http://searxng:8080/health > /dev/null 2>&1; then
  pass "SearXNG responding"
else
  warn "SearXNG not responding (may be normal if disabled)"
fi
echo ""

# SUMMARY
echo "=========================================="
echo "  📊 Results: $PASS passed, $FAIL failed, $WARN warnings"
echo "=========================================="

if [ "$FAIL" -gt 0 ]; then
  echo -e "${RED}  Status: CRITICAL — $FAIL issue(s) need attention${NC}"
  exit 1
elif [ "$WARN" -gt 0 ]; then
  echo -e "${YELLOW}  Status: WARNING — $WARN warning(s)${NC}"
  exit 0
else
  echo -e "${GREEN}  Status: ALL SYSTEMS NOMINAL${NC}"
  exit 0
fi
