#!/bin/bash
# review-helpers.sh — Shared functions for self-review system
# Source from other review scripts: source ./scripts/review-helpers.sh

# ─── Constants ───────────────────────────────────────────────────────────────

WORKSPACE="$HOME/.openclaw/workspace"
SNAPSHOT_DIR="$WORKSPACE/memory/reviews/snapshot"
WEEKLY_DIR="$WORKSPACE/memory/reviews/weekly"
MONTHLY_DIR="$WORKSPACE/memory/reviews/monthly"
ACTION_ITEMS="$WORKSPACE/memory/action-items.md"
SCORECARD="$WORKSPACE/memory/scorecard.md"

# ─── Colors ─────────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ─── Date helpers ────────────────────────────────────────────────────────────

# Get ISO week: YYYY-Www (e.g., 2026-W12)
iso_week() {
    date +%G-W%V
}

# Get start of current week (Monday) in YYYY-MM-DD
week_start() {
    date -d "$(date +%Y-%m-%d) -$(date +%u) + 1 days" +%Y-%m-%d
}

# Get end of current week (Sunday) in YYYY-MM-DD
week_end() {
    date -d "$(week_start) + 6 days" +%Y-%m-%d
}

# Get start of current month in YYYY-MM-DD
month_start() {
    date +%Y-%m-01
}

# Get end of current month in YYYY-MM-DD
month_end() {
    date -d "$(date -d "next month" +%Y-%m-01 2>/dev/null || date -v+1m +%Y-%m-01) - 1 day" +%Y-%m-%d
}

# Get list of dates in a week: date range → array of YYYY-MM-DD
week_dates() {
    local start="$1"
    local end="$2"
    local current="$start"
    while [ "$(date -d "$current" +%s 2>/dev/null)" -le "$(date -d "$end" +%s 2>/dev/null)" ]; do
        echo "$current"
        current=$(date -d "$current + 1 day" +%Y-%m-%d 2>/dev/null)
    done
}

# ─── Snapshot helpers ───────────────────────────────────────────────────────

# Get a specific field from a snapshot JSON (using python3 instead of jq)
snapshot_field() {
    local date="$1"
    local field="$2"
    local file="$SNAPSHOT_DIR/${date}.json"
    [ -f "$file" ] || return 1
    python3 -c "
import json, sys
try:
    with open('$file') as f:
        data = json.load(f)
    keys = '$field'.split('.')
    val = data
    for k in keys:
        val = val.get(k, None)
        if val is None:
            sys.exit(1)
    print(val)
except:
    sys.exit(1)
" 2>/dev/null || return 1
}

# Check if snapshot exists for a date
snapshot_exists() {
    local date="$1"
    [ -f "$SNAPSHOT_DIR/${date}.json" ]
}

# ─── Trend analysis ──────────────────────────────────────────────────────────

# Calculate trend from comma-separated values (newest last)
# Returns: "up", "down", "stable", "insufficient_data"
calc_trend() {
    local values="$1"
    local count=$(echo "$values" | tr ',' '\n' | grep -c . 2>/dev/null || echo 0)
    [ "$count" -lt 3 ] && echo "insufficient_data" && return

    local first second last
    first=$(echo "$values" | cut -d',' -f1)
    last=$(echo "$values" | cut -d',' -f${count})
    second=$(echo "$values" | cut -d',' -f2)

    local delta
    delta=$((last - first))

    if [ "$delta" -gt 2 ]; then
        echo "up"
    elif [ "$delta" -lt -2 ]; then
        echo "down"
    else
        echo "stable"
    fi
}

# Calculate percentage change
pct_change() {
    local old="$1"
    local new="$2"
    [ "$old" -eq 0 ] && echo "n/a" && return
    echo "$new" | awk -v old="$old" '{printf "%.1f", (($1 - old) / old) * 100}'
}

# ─── Markdown helpers ────────────────────────────────────────────────────────

# Render a metric line with trend arrow
metric_line() {
    local label="$1"
    local value="$2"
    local trend="${3:-}"
    local prev="${4:-}"

    local trend_icon=""
    case "$trend" in
        up)    trend_icon=" ↑" ;;
        down)  trend_icon=" ↓" ;;
        stable) trend_icon=" →" ;;
    esac

    local prev_str=""
    [ -n "$prev" ] && [ "$prev" != "n/a" ] && prev_str=" (was $prev)"

    printf "%-40s %s%s%s\n" "$label" "$value" "$trend_icon" "$prev_str"
}

# Render a section header
section_header() {
    local title="$1"
    local level="${2:-2}"
    local prefix=""
    for ((i=0; i<level; i++)); do prefix+="#"; done
    echo ""
    echo "${prefix} ${title}"
    echo ""
}

# Render a table row
table_row() {
    printf "| %-30s | %s | %s | %s |\n" "$1" "$2" "$3" "$4"
}

# Render a score bar (0-10 → visual bar)
score_bar() {
    local score="$1"
    local max="${2:-10}"
    local filled=$(awk -v s="$score" -v m="$max" 'BEGIN {printf "%.0f", (s/m)*10}')
    local empty=$((10 - filled))
    printf "[%s%s] %s/%s" "$(printf '#%.0s' $(seq 1 $filled 2>/dev/null) 2>/dev/null || echo "")" "$(printf '.%.0s' $(seq 1 $empty 2>/dev/null) 2>/dev/null || echo "")" "$score" "$max"
}

# ─── JSON helpers ───────────────────────────────────────────────────────────

# Build JSON array from lines (for multi-value fields)
json_array() {
    local items=""
    while read -r line; do
        [ -z "$line" ] && continue
        items="${items:+$items, }\"${line}\""
    done
    echo "[$items]"
}

# Escape string for JSON (basic)
json_escape() {
    printf '%s' "$1" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read()))' 2>/dev/null \
        || printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

# ─── Validation helpers ──────────────────────────────────────────────────────

# Check required tools
check_deps() {
    local missing=""
    for cmd in jq date; do
        command -v "$cmd" >/dev/null 2>&1 || missing="$missing $cmd"
    done
    [ -n "$missing" ] && echo "WARNING: missing tools:$missing" >&2
}

# ─── Action items helpers ────────────────────────────────────────────────────

# Get next action item ID
next_action_id() {
    local last_id
    last_id=$(grep -E "^## AI-[0-9]+" "$ACTION_ITEMS" 2>/dev/null | tail -1 | grep -oE "[0-9]+" || echo 0)
    echo $((last_id + 1))
}

# Add a new action item
add_action_item() {
    local content="$1"
    local priority="${2:-medium}"
    local deadline="${3:-}"
    local project="${4:-}"
    local id
    id=$(next_action_id)

    local created=$(date +%Y-%m-%d)
    local status="open 🔴"
    local checked=""
    [ -n "$deadline" ] && checked="\n- Deadline: $deadline"
    [ -n "$project" ] && checked="$checked\n- Project: $project"

    cat >> "$ACTION_ITEMS" << EOF

## AI-${id} — ${content}
**Priority:** $priority | **Status:** $status | **Created:** $created${checked}
EOF
    echo "AI-${id}"
}

# Close an action item
close_action_item() {
    local id="$1"
    local resolution="${2:-completed}"
    if [ -f "$ACTION_ITEMS" ]; then
        sed -i "s/Status: \(.*\) | **Status:.*/Status: ✅ ${resolution} | **Resolved: $(date +%Y-%m-%d)/" "$ACTION_ITEMS" 2>/dev/null || true
    fi
}

# ─── Scorecard helpers ───────────────────────────────────────────────────────

# Read a score from scorecard
get_score() {
    local dimension="$1"
    local file="$SCORECARD"
    [ -f "$file" ] || return 1
    grep -E "^| ${dimension}" "$file" 2>/dev/null | awk -F'|' '{print $3}' | tr -d ' ' || return 1
}

# ─── Print functions ─────────────────────────────────────────────────────────

print_header() {
    echo "============================================"
    echo "  🐌 $1"
    echo "  $(date -Iseconds) UTC"
    echo "============================================"
    echo ""
}

print_subheader() {
    echo -e "${BOLD}${1}${NC}"
    echo ""
}
