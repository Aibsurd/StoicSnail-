#!/bin/bash
# setup-cron.sh — настройка auto-sync cron
# Usage: ./setup-cron.sh [enable|disable|status]

WORKSPACE="/home/node/.openclaw/workspace"
AUTO_SYNC="$WORKSPACE/scripts/auto-sync.sh"
CRON_JOB="0 3 * * * $AUTO_SYNC >> $WORKSPACE/.git/sync.log 2>&1"

case "${1:-status}" in
  enable)
    # Add cron job (avoid duplicates)
    (crontab -l 2>/dev/null | grep -v "auto-sync"; echo "$CRON_JOB") | crontab -
    echo "Auto-sync enabled: daily at 03:00 UTC"
    ;;
  disable)
    # Remove cron job
    crontab -l 2>/dev/null | grep -v "auto-sync" | crontab -
    echo "Auto-sync disabled"
    ;;
  status)
    if crontab -l 2>/dev/null | grep -q "auto-sync"; then
      echo "Auto-sync: ENABLED"
      crontab -l 2>/dev/null | grep "auto-sync"
    else
      echo "Auto-sync: DISABLED"
    fi
    ;;
  *)
    echo "Usage: $0 [enable|disable|status]"
    ;;
esac
