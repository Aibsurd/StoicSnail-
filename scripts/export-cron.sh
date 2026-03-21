#!/bin/bash
# export-cron.sh — Экспорт cron jobs в файл
# Saves to: cron-backup/YYYY-MM-DD_cron.txt

set -e

WORKSPACE="$(cd "$(dirname "$0")" && pwd)"
BACKUP_DIR="$WORKSPACE/cron-backup"
TIMESTAMP="$(date +%Y-%m-%d_%H%M%S)"
BACKUP_FILE="$BACKUP_DIR/${TIMESTAMP}_cron.txt"

mkdir -p "$BACKUP_DIR"

echo "============================================"
echo "  🐌 Export Cron Jobs"
echo "============================================"
echo ""

# Export from OpenClaw cron tool
echo -e "${BLUE}Checking OpenClaw cron jobs...${NC}"

# Get cron jobs via openclaw CLI
if command -v openclaw &> /dev/null; then
  openclaw cron list --json 2>/dev/null > "$BACKUP_FILE.json" || true
  
  if [ -s "$BACKUP_FILE.json" ]; then
    echo -e "${GREEN}✓${NC} OpenClaw cron jobs exported to: $BACKUP_FILE.json"
  fi
fi

# Also export system crontab
CRONTAB=$(crontab -l 2>/dev/null || echo "")
if [ -n "$CRONTAB" ]; then
  echo "$CRONTAB" > "$BACKUP_FILE.txt"
  echo -e "${GREEN}✓${NC} System crontab exported to: $BACKUP_FILE.txt"
else
  echo -e "${YELLOW}⚠${NC} No system crontab found"
fi

# List all backups
echo ""
echo -e "${BLUE}Current backups:${NC}"
ls -la "$BACKUP_DIR"/ 2>/dev/null | tail -10

echo ""
echo "To import: ./import-cron.sh $BACKUP_FILE"
