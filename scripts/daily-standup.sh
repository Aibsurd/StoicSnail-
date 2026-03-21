#!/bin/bash
# daily-standup.sh — Daily lightweight self-review for Stoic Snail
# Run: ./scripts/daily-standup.sh
# Schedule: Daily at 17:50 UTC via cron (isolated session, announce to main)
# Purpose: Quick health check, standup log, early anomaly detection
#
# This runs as a cron job (isolated). It does NOT take up agent context slots.
# The standup entry is written to today's memory file for later analysis.

source "$HOME/.openclaw/workspace/scripts/review-helpers.sh" 2>/dev/null || true

WORKSPACE="$HOME/.openclaw/workspace"
DATE=$(date +%Y-%m-%d)
DAY_FILE="$WORKSPACE/memory/${DATE}.md"
TODAY_ISO=$(date +%Y-%m-%d)
TODAY_DISPLAY=$(date +"%A, %B %d, %Y")
STAMP=$(date -Iseconds)

# ─── 1. Collect lightweight metrics ──────────────────────────────────────────

# Workspace health
WS_SIZE=$(du -sh "$WORKSPACE" 2>/dev/null | cut -f1)
MD_COUNT=$(find "$WORKSPACE" -maxdepth 1 -name "*.md" -type f 2>/dev/null | wc -l)

# Git status
cd "$WORKSPACE" 2>/dev/null && {
    GIT_COMMITS=$(git log --since="24 hours ago" --oneline 2>/dev/null | wc -l | tr -d ' ')
    GIT_DIRTY=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
} || { GIT_COMMITS=0; GIT_DIRTY=0; }

# Projects
cd "$WORKSPACE"
PROJ_ACTIVE=$(grep -c "active 🔄" PROJECTS.md 2>/dev/null || echo 0)
PROJ_PENDING=$(grep -c "\- \[ \]" PROJECTS.md 2>/dev/null || echo 0)
PROJ_DONE=$(grep -c "\- \[x\]" PROJECTS.md 2>/dev/null | head -1 || echo 0)

# OpenClaw health
GATEWAY_UP=$(pgrep -f "openclaw.*gateway" >/dev/null 2>&1 && echo "✅" || echo "❌")
OPENCLAW_VER=$(openclaw --version 2>/dev/null | head -1 || echo "unknown")

# Disk
DISK_PCT=$(df -h "$WORKSPACE" 2>/dev/null | awk 'NR==2 {print $5}' | tr -d '%')

# Memory file growth (if exists)
TODAY_MEM_SIZE=$(stat -c%s "$DAY_FILE" 2>/dev/null || echo 0)

# Session info (from sessions list if available)
SESSION_COUNT=0
if command -v openclaw >/dev/null 2>&1; then
    SESSION_COUNT=$(openclaw sessions 2>/dev/null | grep -c "agent:" || echo 0)
fi

# ─── 2. Check for anomalies ──────────────────────────────────────────────────

ANOMALIES=""

# Disk too high
[ "${DISK_PCT:-0}" -gt 85 ] && ANOMALIES="${ANOMALIES}
- ⚠️ Disk usage HIGH: ${DISK_PCT}%"

# Gateway down
[ "$GATEWAY_UP" = "❌" ] && ANOMALIES="${ANOMALIES}
- 🔴 Gateway DOWN — needs attention"

# Too many uncommitted changes
[ "${GIT_DIRTY:-0}" -gt 10 ] && ANOMALIES="${ANOMALIES}
- ⚠️ Many uncommitted files: ${GIT_DIRTY}"

# No commits in 48h
[ "${GIT_COMMITS:-0}" -eq 0 ] && ANOMALIES="${ANOMALIES}
- ⚠️ No git commits in 24h"

# ─── 3. Git log (last 3 commits for context) ───────────────────────────────

GIT_LOG=$(git log --since="24 hours ago" --oneline 2>/dev/null | head -5)
[ -z "$GIT_LOG" ] && GIT_LOG="_No commits_"

# ─── 4. Check if this is the first run today ─────────────────────────────────

# Check if we already wrote a standup today (idempotency)
ALREADY_RUN=$(grep -c "## Daily Standup — $DATE" "$DAY_FILE" 2>/dev/null || echo 0)

# ─── 5. Build standup entry ──────────────────────────────────────────────────

STANDUP_ENTRY="## Daily Standup — $DATE

**Date:** $TODAY_DISPLAY  
**Gateway:** $GATEWAY_UP (v${OPENCLAW_VER}) | **Disk:** ${DISK_PCT}% | **WS:** $WS_SIZE

### Metrics
| Metric | Value |
|--------|-------|
| Active projects | $PROJ_ACTIVE |
| Tasks pending | $PROJ_PENDING |
| Tasks done (total) | $PROJ_DONE |
| Git commits (24h) | $GIT_COMMITS |
| Uncommitted files | $GIT_DIRTY |
| Memory file today | ${TODAY_MEM_SIZE}B |
| Sessions | $SESSION_COUNT |

### Git log (24h)
$(echo "$GIT_LOG" | sed 's/^/  /')

### Intents for today
- [ ] _Fill in priorities for today_

### Anomalies${ANOMALIES:-}
_None detected_

---
*Standup generated: ${STAMP} UTC*
"

# ─── 6. Append to daily memory file ─────────────────────────────────────────

mkdir -p "$(dirname "$DAY_FILE")"

if [ "$ALREADY_RUN" -eq 0 ]; then
    {
        echo ""
        echo "$STANDUP_ENTRY"
    } >> "$DAY_FILE"
    echo "✅ Standup written to $DAY_FILE"
else
    echo "ℹ️ Standup already exists for today (idempotent skip)"
fi

# ─── 7. Anomaly alert (if any) ──────────────────────────────────────────────

if [ -n "$ANOMALIES" ]; then
    echo ""
    echo "⚠️ ANOMALIES DETECTED:"
    echo "$ANOMALIES"
    echo ""
    echo "ACTION REQUIRED: Review anomalies above"
fi

echo ""
echo "Daily standup complete — $STAMP UTC"
