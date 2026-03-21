#!/bin/bash
# import-cron.sh — Импорт cron jobs из файла
# Usage: ./import-cron.sh <backup-file>

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

if [ -z "$1" ]; then
  echo "Usage: $0 <backup-file>"
  echo ""
  echo "Available backups:"
  ls -la "$(dirname "$0")/../cron-backup/" 2>/dev/null | tail -10
  exit 1
fi

BACKUP_FILE="$1"

echo "============================================"
echo "  🐌 Import Cron Jobs"
echo "============================================"
echo ""

if [ ! -f "$BACKUP_FILE" ]; then
  echo -e "${RED}✗${NC} File not found: $BACKUP_FILE"
  exit 1
fi

echo -e "Source: $BACKUP_FILE"
echo ""

# Determine type and import
if [[ "$BACKUP_FILE" == *.json ]]; then
  echo -e "${BLUE}OpenClaw cron format detected${NC}"
  echo -e "${YELLOW}Note:${NC} OpenClaw cron jobs must be imported via gateway config"
  echo "See: https://docs.openclaw.ai/"
  
elif [[ "$BACKUP_FILE" == *.txt ]]; then
  echo -e "${BLUE}System crontab format detected${NC}"
  echo ""
  echo "Contents:"
  cat "$BACKUP_FILE"
  echo ""
  
  read -p "Apply this crontab? [y/N] " -n 1 -r
  echo ""
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    crontab "$BACKUP_FILE"
    echo -e "${GREEN}✓${NC} Crontab applied"
    crontab -l
  else
    echo "Cancelled"
  fi
fi

echo ""
echo -e "${YELLOW}Note:${NC} For OpenClaw internal cron jobs, you need to"
echo "manually reconfigure them via the gateway config or UI."
