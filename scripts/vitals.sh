#!/bin/bash
# vitals.sh — быстрая самопроверка Stoic Snail
# Run: ./scripts/vitals.sh

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

WORKSPACE="/home/node/.openclaw/workspace"

echo "============================================"
echo "  🐌 Stoic Snail — Vitals Check"
echo "  $(date -Iseconds) UTC"
echo "============================================"
echo ""

# Memory files
echo "📁 Memory Files:"
MEMORY_FILES=(
  "$WORKSPACE/MEMORY.md"
  "$WORKSPACE/PROJECTS.md"
  "$WORKSPACE/INTENTS.md"
  "$WORKSPACE/LESSONS.md"
  "$WORKSPACE/IMPROVEMENTS.md"
  "$WORKSPACE/CAPABILITIES.md"
  "$WORKSPACE/EFFICIENCY.md"
  "$WORKSPACE/RELATIONSHIP.md"
)
for f in "${MEMORY_FILES[@]}"; do
  if [ -f "$f" ]; then
    SIZE=$(wc -c < "$f")
    MODIFIED=$(stat -c %y "$f" 2>/dev/null | cut -d' ' -f1 || stat -f %Sm -t %Y-%m-%d "$f" 2>/dev/null)
    echo -e "  ${GREEN}✓${NC} $(basename $f): ${SIZE}B, modified $MODIFIED"
  else
    echo -e "  ${RED}✗${NC} $(basename $f): MISSING"
  fi
done

echo ""

# Today's memory
TODAY_MEM="$WORKSPACE/memory/$(date +%Y-%m-%d).md"
if [ -f "$TODAY_MEM" ]; then
  SIZE=$(wc -c < "$TODAY_MEM")
  echo -e "  ${GREEN}✓${NC} Today: ${SIZE}B"
else
  echo -e "  ${YELLOW}⚠${NC} Today: no daily log yet"
fi

echo ""

# Projects status
echo "📋 Projects:"
ACTIVE=$(grep -c "active 🔄" "$WORKSPACE/PROJECTS.md" 2>/dev/null || echo "0")
COMPLETED=$(grep -c "\- \[x\]" "$WORKSPACE/PROJECTS.md" 2>/dev/null || echo "0")
echo "  Active: $ACTIVE"
echo "  Completed: $COMPLETED"

echo ""

# Workspace size
echo "💾 Workspace:"
WS_SIZE=$(du -sh "$WORKSPACE" 2>/dev/null | cut -f1)
echo "  Total: $WS_SIZE"
ARCHIVE_COUNT=$(find "$WORKSPACE/archive" -type f 2>/dev/null | wc -l)
echo "  Archived items: $ARCHIVE_COUNT"

echo ""

# Scripts
echo "⚙️ Scripts:"
SCRIPTS=(
  "vitals.sh"
  "weekly_review.sh"
  "deep_research.sh"
  "ddg_search.sh"
  "auto-sync.sh"
  "setup-cron.sh"
  "export-cron.sh"
  "import-cron.sh"
  "spawn.sh"
)
for s in "${SCRIPTS[@]}"; do
  if [ -x "$WORKSPACE/scripts/$s" ]; then
    echo -e "  ${GREEN}✓${NC} $s (executable)"
  elif [ -f "$WORKSPACE/scripts/$s" ]; then
    echo -e "  ${YELLOW}⚠${NC} $s (not executable)"
  else
    echo -e "  ${RED}✗${NC} $s (missing)"
  fi
done

echo ""

# Skills
echo "🎓 Skills:"
if [ -f "$WORKSPACE/skills/INDEX.md" ]; then
  echo -e "  ${GREEN}✓${NC} INDEX exists"
  ACTIVE_SKILLS=$(grep -c "✅" "$WORKSPACE/skills/INDEX.md" 2>/dev/null || echo "0")
  echo "  Active (documented): $ACTIVE_SKILLS"
else
  echo -e "  ${RED}✗${NC} INDEX missing"
fi

echo ""

# Git status
echo "📦 Git:"
cd "$WORKSPACE"
if [ -d .git ]; then
  CHANGES=$(git status --porcelain 2>/dev/null | wc -l)
  if [ "$CHANGES" -eq 0 ]; then
    echo -e "  ${GREEN}✓${NC} No uncommitted changes"
  else
    echo -e "  ${YELLOW}⚠${NC} $CHANGES uncommitted changes"
    git status --short 2>/dev/null | head -5
  fi
else
  echo -e "  ${RED}✗${NC} Not a git repo"
fi

echo ""
echo "============================================"
echo "  Check complete"
echo "============================================"
