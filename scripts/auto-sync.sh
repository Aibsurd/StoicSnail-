#!/bin/bash
# auto-sync.sh — автоматический sync workspace в GitHub
# Run via cron: 0 3 * * * /home/node/.openclaw/workspace/scripts/auto-sync.sh

WORKSPACE="/home/node/.openclaw/workspace"
LOG="$WORKSPACE/.git/sync.log"

cd "$WORKSPACE"

# Check if there are changes
if git diff --quiet && git diff --cached --quiet 2>/dev/null; then
  echo "$(date): No changes" >> "$LOG" 2>/dev/null
  exit 0
fi

# Add, commit, push
git add -A
git commit -m "Auto-sync: $(date +'%Y-%m-%d %H:%M UTC')"
git push origin master >> "$LOG" 2>&1

echo "$(date): Synced" >> "$LOG"
