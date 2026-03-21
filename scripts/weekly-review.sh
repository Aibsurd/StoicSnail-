#!/bin/bash
# weekly-review.sh — Еженедельный self-review для Stoic Snail
# Анализирует прошедшую неделю и ставит цели на следующую

set -e

WORKSPACE="/home/node/.openclaw/workspace"
DATE=$(date +%Y-%m-%d)
WEEK=$(date +%Y-W%V)
MEMORY_FILE="$WORKSPACE/memory/$DATE.md"

echo "=========================================="
echo "  🐌 Stoic Snail — Weekly Review"
echo "  $WEEK | $DATE"
echo "=========================================="
echo ""

# 1. Git activity analysis
echo "📊 Git Activity (last 7 days):"
cd "$WORKSPACE"
git log --since="7 days ago" --oneline --format="  %h %s" 2>/dev/null || echo "  No recent commits"
echo ""

# 2. Files created/modified
echo "📁 Files changed (last 7 days):"
git diff --stat HEAD~10..HEAD --name-only 2>/dev/null | grep -v "^$" | head -20 || echo "  No changes recorded"
echo ""

# 3. Session metrics
echo "💭 Session summary:"
if [ -f "$WORKSPACE/memory/$DATE.md" ]; then
  SECTIONS=$(grep -c "^## " "$WORKSPACE/memory/$DATE.md" 2>/dev/null || echo "0")
  echo "  Sections in today's log: $SECTIONS"
else
  echo "  No daily log yet"
fi
echo ""

# 4. Health check summary
echo "🏥 System Health:"
if command -v openclaw &> /dev/null; then
  VERSION=$(openclaw --version 2>/dev/null | head -1 || echo "unknown")
  echo "  OpenClaw: $VERSION"
else
  echo "  OpenClaw: not in PATH"
fi

# Check cron jobs
CRON_COUNT=$(find "$HOME/.openclaw/cron" -name "*.json" 2>/dev/null | wc -l)
echo "  Cron jobs: $CRON_COUNT active"

# Check disk
DISK=$(df -h "$WORKSPACE" 2>/dev/null | tail -1 | awk '{print $5}')
echo "  Disk usage: $DISK"
echo ""

# 5. OpenClaw status
echo "🔍 OpenClaw Status:"
if curl -s --max-time 2 http://localhost:18789/health 2>/dev/null | grep -q "ok"; then
  echo "  Gateway: ✅ alive"
else
  echo "  Gateway: ⚠️ check manually"
fi
echo ""

# 6. Questions for next week
echo "❓ Questions for next week:"
echo "  1. Что сработало хорошо?"
echo "  2. Что бы я сделал иначе?"
echo "  3. Что мне нужно улучшить?"
echo ""

# 7. Prompt to update SCORECARD
echo "=========================================="
echo "  📝 NEXT: Update SCORECARD.md"
echo "  Run: nano $WORKSPACE/SCORECARD.md"
echo "=========================================="
