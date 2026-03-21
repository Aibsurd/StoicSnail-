#!/bin/bash
# snapshot-metrics.sh — Collect daily metrics snapshot for self-review system
# Run: ./scripts/snapshot-metrics.sh
# Schedule: Daily via cron at 17:50 UTC (before daily-standup)
# Output: memory/reviews/snapshot/YYYY-MM-DD.json

set -e

WORKSPACE="$HOME/.openclaw/workspace"
SNAPSHOT_DIR="$WORKSPACE/memory/reviews/snapshot"
DATE=$(date +%Y-%m-%d)
SNAPSHOT_FILE="$SNAPSHOT_DIR/${DATE}.json"

mkdir -p "$SNAPSHOT_DIR"

# Helper: get file size in bytes, 0 if missing
file_size() {
    local f="$1"
    [ -f "$f" ] && stat -c%s "$f" 2>/dev/null || echo 0
}

# Helper: count lines, 0 if missing
file_lines() {
    local f="$1"
    [ -f "$f" ] && wc -l < "$f" 2>/dev/null || echo 0
}

# Helper: git changes since yesterday
git_changes() {
    local since="$1"
    cd "$WORKSPACE" 2>/dev/null || return 0
    if git rev-parse --git-dir >/dev/null 2>&1; then
        git log --since="$since" --oneline 2>/dev/null | wc -l | tr -d ' '
    else
        echo 0
    fi
}

# Helper: disk usage percent for workspace
workspace_usage_pct() {
    df -k "$WORKSPACE" 2>/dev/null | awk 'NR==2 {print $5}' | tr -d '%' || echo 0
}

# Collect metrics
TIMESTAMP=$(date -Iseconds)
DATE_ISO=$(date +%Y-%m-%d)

# Workspace stats
WS_SIZE_KB=$(du -sk "$WORKSPACE" 2>/dev/null | awk '{print $1}')
WS_FILES=$(find "$WORKSPACE" -type f 2>/dev/null | wc -l)
WS_MD_FILES=$(find "$WORKSPACE" -maxdepth 1 -name "*.md" -type f 2>/dev/null | wc -l)
WS_SCRIPTS=$(find "$WORKSPACE/scripts" -name "*.sh" -type f 2>/dev/null | wc -l)

# Memory files
TODAY_MEM="$WORKSPACE/memory/${DATE_ISO}.md"
MEMORY_FILE_SIZE=$(file_size "$TODAY_MEM")
MEMORY_FILE_LINES=$(file_lines "$TODAY_MEM")
MEMORY_TOTAL_SIZE=$(du -ck "$WORKSPACE/memory"/*.md 2>/dev/null | tail -1 | awk '{print $1}')
MEMORY_FILES_COUNT=$(find "$WORKSPACE/memory" -maxdepth 1 -name "*.md" -type f 2>/dev/null | wc -l)

# Git activity (last 48h)
GIT_COMMITS_24H=$(git_changes "24 hours ago")
GIT_COMMITS_7D=$(git_changes "7 days ago")
cd "$WORKSPACE" 2>/dev/null && GIT_AHEAD=$(git rev-list --count @{u}..HEAD 2>/dev/null || echo 0) || GIT_AHEAD=0
cd "$WORKSPACE" 2>/dev/null && GIT_STATUS=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ') || GIT_STATUS=0

# Projects (parse from PROJECTS.md)
PROJECTS_ACTIVE=$(grep -c "active 🔄" "$WORKSPACE/PROJECTS.md" 2>/dev/null || echo 0)
PROJECTS_COMPLETED=$(grep -cE "✅ Завершён|✅ Completed" "$WORKSPACE/PROJECTS.md" 2>/dev/null || echo "0")
PROJECTS_COMPLETED=$(echo "$PROJECTS_COMPLETED" | grep -c . 2>/dev/null || echo "0")
PROJECTS_TOTAL=$(grep -c "^### \[" "$WORKSPACE/PROJECTS.md" 2>/dev/null || echo 0)
PROJECTS_PENDING=$(grep -c "\- \[ \]" "$WORKSPACE/PROJECTS.md" 2>/dev/null || echo 0)

# Skills
SKILLS_ACTIVE=$(grep -c "✅" "$WORKSPACE/skills/INDEX.md" 2>/dev/null | head -1 || echo 0)

# Context files
CONTEXT_FILES_COUNT=$(find "$WORKSPACE" -maxdepth 1 -name "*.md" -type f 2>/dev/null | wc -l)
CONTEXT_TOTAL_SIZE=$(du -ck "$WORKSPACE"/{SOUL,IDENTITY,USER,MEMORY,PROJECTS,INTENTS,LESSONS,IMPROVEMENTS,CAPABILITIES,RELATIONSHIP,AGENTS,WORKSPACE,TOOLS}.md 2>/dev/null | tail -1 | awk '{print $1}')

# System health
OPENCLAW_VERSION=$(openclaw --version 2>/dev/null || echo "unknown")
GATEWAY_RUNNING=$(pgrep -f "openclaw.*gateway" >/dev/null 2>&1 && echo "true" || echo "false")
DISK_USAGE_PCT=$(workspace_usage_pct)
MEMORY_AVAILABLE_KB=$(free -k 2>/dev/null | awk 'NR==2 {print $7}' | tr -d ' ' || echo "unknown")

# Scripts
SCRIPTS_COUNT=$(find "$WORKSPACE/scripts" -name "*.sh" -type f 2>/dev/null | wc -l)
SCRIPTS_EXECUTABLE=$(find "$WORKSPACE/scripts" -name "*.sh" -type f -executable 2>/dev/null | wc -l)

# Reviews
WEEKLY_REVIEWS_COUNT=$(find "$WORKSPACE/memory/reviews/weekly" -name "*.md" -type f 2>/dev/null | wc -l)
MONTHLY_REVIEWS_COUNT=$(find "$WORKSPACE/memory/reviews/monthly" -name "*.md" -type f 2>/dev/null | wc -l)

# OpenClaw config
CONFIG_FILE="$HOME/.openclaw/openclaw.json"
CONFIG_SIZE=$(file_size "$CONFIG_FILE")

# Day of week (ISO: 1=Mon, 7=Sun)
DAY_OF_WEEK=$(date +%u)
IS_WEEKLY_REVIEW_DAY=$( [ "$DAY_OF_WEEK" = "7" ] && echo "true" || echo "false")

# Month info
MONTH_START=$(date +%Y-%m-01)
IS_MONTHLY_REVIEW_DAY=$([ "$(date +%d)" = "$(date -d "next month" +%Y-%m-01 | date -d "-1 day" +%d)" ] && echo "true" || echo "false")

# Write JSON snapshot
cat > "$SNAPSHOT_FILE" << EOF
{
  "snapshotVersion": 1,
  "collectedAt": "$TIMESTAMP",
  "date": "$DATE_ISO",
  "dayOfWeek": $DAY_OF_WEEK,
  "isWeeklyReviewDay": $IS_WEEKLY_REVIEW_DAY,
  "isMonthlyReviewDay": $IS_MONTHLY_REVIEW_DAY,
  "workspace": {
    "sizeKB": $WS_SIZE_KB,
    "totalFiles": $WS_FILES,
    "mdFilesRoot": $WS_MD_FILES,
    "scriptsCount": $SCRIPTS_COUNT,
    "scriptsExecutable": $SCRIPTS_EXECUTABLE
  },
  "memory": {
    "todayFileSize": $MEMORY_FILE_SIZE,
    "todayFileLines": $MEMORY_FILE_LINES,
    "totalSizeKB": ${MEMORY_TOTAL_SIZE:-0},
    "filesCount": $MEMORY_FILES_COUNT
  },
  "context": {
    "filesCount": $CONTEXT_FILES_COUNT,
    "totalSizeKB": ${CONTEXT_TOTAL_SIZE:-0}
  },
  "projects": {
    "active": $PROJECTS_ACTIVE,
    "completed": $PROJECTS_COMPLETED,
    "total": $PROJECTS_TOTAL,
    "pending": $PROJECTS_PENDING
  },
  "skills": {
    "active": ${SKILLS_ACTIVE:-0}
  },
  "git": {
    "commitsLast24h": $GIT_COMMITS_24H,
    "commitsLast7d": $GIT_COMMITS_7D,
    "aheadOfRemote": $GIT_AHEAD,
    "uncommittedFiles": $GIT_STATUS
  },
  "system": {
    "openclawVersion": "$OPENCLAW_VERSION",
    "gatewayRunning": $GATEWAY_RUNNING,
    "diskUsagePct": ${DISK_USAGE_PCT:-0},
    "memoryAvailableKB": "${MEMORY_AVAILABLE_KB:-unknown}",
    "configSize": $CONFIG_SIZE
  },
  "reviews": {
    "weeklyCount": $WEEKLY_REVIEWS_COUNT,
    "monthlyCount": $MONTHLY_REVIEWS_COUNT
  }
}
EOF

echo "Snapshot saved: $SNAPSHOT_FILE"
cat "$SNAPSHOT_FILE"
