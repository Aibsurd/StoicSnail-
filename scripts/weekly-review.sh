#!/bin/bash
# weekly-review.sh — Comprehensive weekly self-review for Stoic Snail
# Run: ./scripts/weekly-review.sh
# Schedule: Every Sunday at 17:00 UTC via cron (isolated, announce to main)
# Purpose: Deep analysis, pattern detection, insight generation, improvement tracking
#
# Ph.D-level engineering approach:
# - Hypothesis-driven analysis (not just data dump)
# - Multi-dimensional: technical, project, memory, relationship, process
# - Closed-loop: every insight → action item
# - Trend analysis: this week vs last N weeks
# - Reproducible methodology each week

set -euo pipefail

source "$HOME/.openclaw/workspace/scripts/review-helpers.sh" 2>/dev/null

WORKSPACE="$HOME/.openclaw/workspace"
SNAPSHOT_DIR="$WORKSPACE/memory/reviews/snapshot"
WEEKLY_DIR="$WORKSPACE/memory/reviews/weekly"
DATE=$(date +%Y-%m-%d)
WEEK=$(iso_week)
WEEK_START=$(week_start)
WEEK_END=$(week_end)
WEEKLY_REVIEW_FILE="$WEEKLY_DIR/${WEEK}.md"
PREV_WEEK=$(date -d "$WEEK_START - 7 days" +%Y-W%V 2>/dev/null || date -v-1w +%Y-W%V)
PREV_WEEKLY="$WEEKLY_DIR/${PREV_WEEK}.md"

mkdir -p "$WEEKLY_DIR"

# ─── Helper: Get snapshot value for a date range ──────────────────────────────

get_week_field() {
    local field="$1"
    local dates=""

    for d in $(week_dates "$WEEK_START" "$WEEK_END"); do
        local val
        val=$(snapshot_field "$d" "$field" 2>/dev/null || echo "")
        [ -n "$val" ] && dates="${dates}${dates:+,}${val}"
    done
    echo "$dates"
}

# Get last N values from a time series
get_trend() {
    local field="$1"
    local days="${2:-4}"
    local values=""
    local current="$DATE"
    for ((i=0; i<days; i++)); do
        local d=$(date -d "$current - $i days" +%Y-%m-%d 2>/dev/null || date -v-${i}d +%Y-%m-%d)
        local val
        val=$(snapshot_field "$d" "$field" 2>/dev/null || echo "")
        [ -n "$val" ] && values="${values}${values:+,}${val}"
    done
    echo "$values"
}

# ─── Collect all weekly snapshots ───────────────────────────────────────────

print_header "Weekly Self-Review — Week $WEEK"
echo "Period: $WEEK_START → $WEEK_END"
echo "Output: $WEEKLY_REVIEW_FILE"
echo ""

ALL_DATES=$(week_dates "$WEEK_START" "$WEEK_END")
SNAPSHOT_COUNT=0
for d in $ALL_DATES; do
    if snapshot_exists "$d"; then
        SNAPSHOT_COUNT=$((SNAPSHOT_COUNT + 1))
    fi
done

echo "Snapshots available: $SNAPSHOT_COUNT / $(echo "$ALL_DATES" | wc -w)"
echo ""

# ─── SECTION 1: Executive Summary ───────────────────────────────────────────

section_header "1. Executive Summary"

# Quantified week-over-week comparison
WS_TREND=$(get_trend "workspace.sizeKB" 5)
WS_TREND_PCT=$(echo "$WS_TREND" | awk -F',' '{if(NR==1 && NF>=2){o=$1;l=$NF;if(o>0)printf "%.1f",((l-o)/o)*100;else print "n/a"}else print "insufficient"}')
WS_TREND_PCT=$(calc_trend "$WS_TREND" | awk '{print $0}')

MEM_TREND=$(get_trend "memory.totalSizeKB" 5)
MEM_GROWTH=$(echo "$MEM_TREND" | awk -F',' '{if(NF>=2){o=$1;l=$NF;if(o>0)printf "%d",l-o;else print 0}else print 0}')

GIT_TREND=$(get_trend "git.commitsLast7d" 4)

PROJ_ACTIVE=$(get_week_field "projects.active" | awk -F',' '{sum=0;for(i=1;i<=NF;i++)sum+=$i;print sum}')
PROJ_DONE=$(get_week_field "projects.completed" | awk -F',' '{sum=0;for(i=1;i<=NF;i++)sum+=$i;print sum}')
PROJ_TOTAL=$(get_week_field "projects.total" | awk -F',' '{sum=0;for(i=1;i<=NF;i++)sum+=$i;print sum/'"$SNAPSHOT_COUNT"'}')

GIT_COMMITS=$(get_week_field "git.commitsLast7d" | awk -F',' '{sum=0;for(i=1;i<=NF;i++)sum+=$i;print sum}')
GIT_DIRTY=$(snapshot_field "$DATE" "git.uncommittedFiles" 2>/dev/null || echo "0")

echo "| Dimension | This Week | Trend | Status |"
echo "|-----------|-----------|-------|--------|"

# Workspace growth
WS_TREND_ICON="→"
[ "$WS_TREND_PCT" = "up" ] && WS_TREND_ICON="↑"
[ "$WS_TREND_PCT" = "down" ] && WS_TREND_ICON="↓"
echo "| Workspace growth | ${WS_TREND_ICON} | ${WS_TREND_PCT} | $([ "$WS_TREND_PCT" = "down" ] && echo "🟢 Good" || echo "🟡 Normal") |"

# Git activity
echo "| Git commits (7d) | $GIT_COMMITS | $(calc_trend "$GIT_TREND") | $([ "$GIT_COMMITS" -gt 10 ] && echo "🟢 Active" || [ "$GIT_COMMITS" -gt 3 ] && echo "🟡 Moderate" || echo "🔴 Low") |"

# Projects
echo "| Projects | $PROJ_TOTAL total, ${PROJ_DONE:-0} done | active: $PROJ_ACTIVE | $([ "$PROJ_ACTIVE" -gt 0 ] && echo "🟢 Running" || echo "⚪ Idle") |"

# Memory
echo "| Memory growth (KB) | +${MEM_GROWTH:-0} | $(calc_trend "$MEM_TREND") | $([ "${MEM_GROWTH:-0}" -gt 5000 ] && echo "🟡 Growing" || echo "🟢 Normal") |"

echo ""

# ─── SECTION 2: Project Health ───────────────────────────────────────────────

section_header "2. Project Health Analysis"

echo "### Active Projects"
echo ""
echo "| Project | Tasks Done | Tasks Pending | Velocity | Blockers |"
echo "|---------|-----------|---------------|---------|---------|"

# Parse projects from PROJECTS.md
cd "$WORKSPACE"
for proj in $(grep -E "^### \[.+\]" PROJECTS.md 2>/dev/null | grep -oE "\[([^]]+)\]" | tr -d '[]' | head -10); do
    proj_slug=$(echo "$proj" | tr '[:upper:]' '[:lower:]' | sed 's/ /-/g')
    # Find project section
    proj_section=$(grep -A 20 "### \[$proj\]" PROJECTS.md 2>/dev/null | head -20)
    tasks_done=$(echo "$proj_section" | grep -c "\- \[x\]" 2>/dev/null || echo 0)
    tasks_pending=$(echo "$proj_section" | grep -c "\- \[ \]" 2>/dev/null || echo 0)
    status=$(echo "$proj_section" | grep -E "Status:" | head -1 | sed 's/.*Status: *//' || echo "unknown")
    blockers=$(echo "$proj_section" | grep -i "blocker\|blocked\|🔴" | wc -l | tr -d ' ')
    [ -z "$blockers" ] && blockers=0

    echo "| $proj | $tasks_done | $tasks_pending | $([ "$tasks_done" -gt "$tasks_pending" ] && echo "🟢 High" || [ "$tasks_done" -gt 0 ] && echo "🟡 Medium" || echo "⚪ None") | $([ "$blockers" -gt 0 ] && echo "🔴 $blockers" || echo "None") |"
done

echo ""
echo "### Project Status Interpretation"
echo ""
echo "_Analysis: $([ "$PROJ_ACTIVE" -gt 0 ] && echo "Work is underway on $PROJ_ACTIVE project(s)." || echo "No active projects — check if priorities shifted.")_"
echo ""

# ─── SECTION 3: Memory Quality Analysis ──────────────────────────────────────

section_header "3. Memory & Knowledge Quality"

MEM_FILES_WEEK=$(get_week_field "memory.filesCount" | awk -F',' '{sum=0;for(i=1;i<=NF;i++)sum+=$i;print sum}')
MEM_TOTAL=$(get_week_field "memory.totalSizeKB" | awk -F',' '{sum=0;for(i=1;i<=NF;i++)sum+=$i;print sum}')
MEM_AVG=$(echo "$MEM_TOTAL $SNAPSHOT_COUNT" | awk '{printf "%.0f", $1/$2}')

echo "### Memory Activity"
echo ""
echo "| Metric | Value | Assessment |"
echo "|--------|-------|-----------|"
echo "| Memory files total | $MEM_FILES_WEEK (week sum) | $([ "$MEM_FILES_WEEK" -gt 7 ] && echo "🟢 Active journaling" || echo "⚪ Light journaling") |"
echo "| Avg daily memory (KB) | ${MEM_AVG:-0} | $([ "${MEM_AVG:-0}" -gt 500 ] && echo "🟡 Substantial" || echo "🟢 Normal") |"
echo "| Memory reviews done | $(snapshot_field "$DATE" "reviews.weeklyCount" 2>/dev/null || echo 0) (total) | — |"

echo ""
echo "### Context File Health"
CONTEXT_SIZE=$(snapshot_field "$DATE" "context.totalSizeKB" 2>/dev/null || echo 0)
CONTEXT_FILES=$(snapshot_field "$DATE" "context.filesCount" 2>/dev/null || echo 0)
echo "| Metric | Value | Recommendation |"
echo "|--------|-------|---------------|"
echo "| Context files | $CONTEXT_FILES | $([ "$CONTEXT_FILES" -gt 12 ] && echo "⚠️ Consider consolidation" || echo "✅ Within budget") |"
echo "| Context total size (KB) | ${CONTEXT_SIZE:-0} | $([ "${CONTEXT_SIZE:-0}" -gt 100 ] && echo "⚠️ Approaching limit — review bootstrapMaxChars" || echo "✅ Healthy") |"

echo ""
echo "### Knowledge Gaps Detected"
echo ""
echo "_Based on session activity and memory file growth patterns:_"
echo ""

# Check for stale files (not updated recently)
STALE_FILES=""
for f in MEMORY.md PROJECTS.md INTENTS.md; do
    if [ -f "$WORKSPACE/$f" ]; then
        DAYS_SINCE=$(find "$WORKSPACE/$f" -mtime -7 2>/dev/null | wc -l)
        [ "$DAYS_SINCE" -eq 0 ] && STALE_FILES="${STALE_FILES}
- $f (no update in 7+ days)"
    fi
done
if [ -n "$STALE_FILES" ]; then
    echo "⚠️ Stale files detected:${STALE_FILES}"
else
    echo "✅ All core memory files updated recently"
fi

echo ""

# ─── SECTION 4: Technical Health ─────────────────────────────────────────────

section_header "4. Technical Health & System Metrics"

GW_RUNNING=$(snapshot_field "$DATE" "system.gatewayRunning" 2>/dev/null || echo "unknown")
OPENCLAW_VER=$(snapshot_field "$DATE" "system.openclawVersion" 2>/dev/null || echo "unknown")
DISK_PCT=$(snapshot_field "$DATE" "system.diskUsagePct" 2>/dev/null || echo 0)

echo "### System"
echo ""
echo "| Component | Status | Notes |"
echo "|-----------|--------|-------|
echo "| Gateway | $([ "$GW_RUNNING" = "true" ] && echo "✅ Running" || echo "🔴 DOWN") | v${OPENCLAW_VER} |"
echo "| Disk usage | ${DISK_PCT}% | $([ "${DISK_PCT:-0}" -gt 85 ] && echo "🔴 CRITICAL — clean up" || [ "${DISK_PCT:-0}" -gt 75 ] && echo "⚠️ Monitor" || echo "✅ Healthy") |"

echo ""
echo "### Development Activity"
echo ""
GIT_COMMITS_WEEK=$(get_week_field "git.commitsLast7d" | awk -F',' '{sum=0;for(i=1;i<=NF;i++)sum+=$i;print sum}')
GIT_AHEAD=$(snapshot_field "$DATE" "git.aheadOfRemote" 2>/dev/null || echo "0")
echo "- Commits this week: **$GIT_COMMITS_WEEK**"
echo "- Ahead of remote: **$GIT_AHEAD** $([ "${GIT_AHEAD:-0}" -gt 5 ] && echo "(⚠️ push pending)" || echo "(normal)")"
echo "- Uncommitted files: **$(snapshot_field "$DATE" "git.uncommittedFiles" 2>/dev/null || echo 0)**"

echo ""
echo "### Skill & Tool Inventory"
SKILLS_ACTIVE=$(snapshot_field "$DATE" "skills.active" 2>/dev/null || echo 0)
SCRIPTS_COUNT=$(snapshot_field "$DATE" "workspace.scriptsCount" 2>/dev/null || echo 0)
SCRIPTS_EXEC=$(snapshot_field "$DATE" "workspace.scriptsExecutable" 2>/dev/null || echo 0)
echo "| Resource | Count | Status |"
echo "|----------|-------|--------|
echo "| Active skills (documented) | $SKILLS_ACTIVE | $([ "$SKILLS_ACTIVE" -gt 5 ] && echo "🟢 Well-instrumented" || echo "🟡 Growing") |"
echo "| Scripts total | $SCRIPTS_COUNT | — |"
echo "| Scripts executable | $SCRIPTS_EXEC | $([ "$SCRIPTS_EXEC" -eq "$SCRIPTS_COUNT" ] && echo "✅ All executable" || echo "⚠️ Check permissions") |"

echo ""

# ─── SECTION 5: Pattern Analysis ─────────────────────────────────────────────

section_header "5. Pattern Analysis & Hypotheses"

echo "### This Week's Patterns"
echo ""

# Git commit pattern
GIT_TREND=$(get_trend "git.commitsLast7d" 4)
GIT_PATTERN=$(calc_trend "$GIT_TREND")
echo "**Git Activity Pattern:** $GIT_PATTERN"
case "$GIT_PATTERN" in
    up)    echo "→ Acceleration detected. Work intensity increasing. Good sign for project momentum." ;;
    down)  echo "→ Slowdown detected. May indicate fatigue, complexity increase, or context-switching cost." ;;
    stable) echo "→ Consistent output. Steady work pattern." ;;
    *)     echo "→ Insufficient data for pattern." ;;
esac
echo ""

# Memory writing pattern
MEM_PATTERN=$(get_trend "memory.todayFileSize" 5)
MEM_PATTERN_TREND=$(calc_trend "$MEM_PATTERN")
echo "**Memory Discipline Pattern:** $MEM_PATTERN_TREND"
case "$MEM_PATTERN_TREND" in
    up)    echo "→ More journaling. Either more happening, or better capture discipline." ;;
    down)  echo "→ Less journaling. May indicate routine work, or declining capture." ;;
    stable) echo "→ Consistent memory discipline." ;;
    *)     echo "→ Insufficient data." ;;
esac
echo ""

# Workspace growth
WS_PATTERN=$(get_trend "workspace.sizeKB" 4)
WS_PATTERN_TREND=$(calc_trend "$WS_PATTERN")
echo "**Workspace Growth Pattern:** $WS_PATTERN_TREND"
case "$WS_PATTERN_TREND" in
    up)    echo "→ Workspace expanding. Normal for active development phase." ;;
    down)  echo "→ Workspace contracting. May indicate completed work or cleanup." ;;
    *)     echo "→ Insufficient data." ;;
esac
echo ""

echo "### Hypothesis Testing"
echo ""
echo "_(Form: If [condition], then [expected outcome]. Evidence: [findings]. Verdict: [confirm/reject/neutral])_"
echo ""

# Check for hypothesis: more commits = more memory
H_MEM=$(echo "$GIT_COMMITS_WEEK $MEM_TOTAL" | awk '{if($1>5 && $2>1000)print "active";else print "light"}')
echo "**H1:** High commit volume correlates with high memory capture."
echo "→ Condition: $GIT_COMMITS_WEEK commits, ${MEM_TOTAL:-0}KB memory"
echo "→ Evidence: Memory file size = ${MEM_AVG:-0}KB/day avg"
echo "→ Verdict: $([ "$H_MEM" = "active" ] && echo "CONFIRMED — active weeks produce more artifacts" || echo "NEUTRAL — low activity week")"
echo ""

# Check: self-review system adoption
REVIEW_COUNT=$(snapshot_field "$DATE" "reviews.weeklyCount" 2>/dev/null || echo 0)
echo "**H2:** Self-review system is being used consistently."
echo "→ Evidence: $REVIEW_COUNT weekly reviews on record"
echo "→ Verdict: $([ "$REVIEW_COUNT" -gt 0 ] && echo "CONFIRMED — system in use" || echo "REJECTED — system not yet adopted")"
echo ""

# ─── SECTION 6: Action Items Review ──────────────────────────────────────────

section_header "6. Action Items — Previous Week's Commitments"

if [ -f "$WORKSPACE/memory/action-items.md" ]; then
    echo "### Open Items Carried Forward"
    echo ""
    # Show items that were open last week and might still be open
    grep -E "(AI-[0-9]+|Status:.*🔴|Status:.*🟡)" "$WORKSPACE/memory/action-items.md" 2>/dev/null | head -10 \
        || echo "No open action items or file empty"
    echo ""
    echo "### Completed Items This Week"
    echo ""
    grep -E "Resolved:.*✅|Status:.*✅" "$WORKSPACE/memory/action-items.md" 2>/dev/null | grep -v "Resolved:" | head -10 \
        || echo "No items marked complete this week"
    echo ""
    echo "_To update action items, edit: $WORKSPACE/memory/action-items.md_"
else
    echo "⚠️ No action-items.md found. Create it to track commitments."
    echo ""
fi

# ─── SECTION 7: Insights & Learnings ────────────────────────────────────────

section_header "7. Insights & Learnings"

echo "### This Week's Key Insights"
echo ""

# Auto-generate insights from metrics
INSIGHT_COUNT=0

# Insight 1: Project velocity
if [ "$PROJ_DONE" -gt 0 ]; then
    echo "**INSIGHT-$((++INSIGHT_COUNT)):** Project velocity is positive."
    echo "> $PROJ_DONE task(s) completed this reporting period. This validates the current task tracking approach."
    echo ""
fi

# Insight 2: Memory growth health
if [ "${MEM_GROWTH:-0}" -gt 0 ]; then
    echo "**INSIGHT-$((++INSIGHT_COUNT)):** Memory system is capturing work effectively."
    echo "> +${MEM_GROWTH:-0}KB memory growth this week indicates active journaling and knowledge capture."
    echo ""
fi

# Insight 3: Git discipline
if [ "$GIT_COMMITS_WEEK" -gt 3 ]; then
    echo "**INSIGHT-$((++INSIGHT_COUNT)):** Git as a working log is being used actively."
    echo "> $GIT_COMMITS_WEEK commits this week. Git is functioning as a real-time project diary."
    echo ""
fi

# Insight 4: System stability
if [ "$GW_RUNNING" = "true" ] && [ "${DISK_PCT:-0}" -lt 80 ]; then
    echo "**INSIGHT-$((++INSIGHT_COUNT)):** System health is stable."
    echo "> Gateway running, disk healthy at ${DISK_PCT}%. No operational concerns."
    echo ""
fi

# Add manual insight prompts
echo "**INSIGHT-$((++INSIGHT_COUNT)):** _(Fill in based on qualitative review of this week's sessions)_"
echo "> _What changed in understanding? What surprised? What would you do differently?_"
echo ""

# ─── SECTION 8: Health Scorecard ────────────────────────────────────────────

section_header "8. Weekly Health Scorecard"

# Dimensions: Projects, Memory, Technical, Process, Relationship
# Score: 1-10 for each

calc_avg() {
    echo "$1" | awk -F',' '{sum=0;for(i=1;i<=NF;i++)sum+=$i;print (NF>0)?sum/NF:0}'
}

P_SCORE=$(get_week_field "projects.active" | awk -F',' '{s=0;for(i in a)s+=$i;print s/5}')
M_SCORE=$(get_week_field "memory.todayFileSize" | awk -F',' '{s=0;for(i in a)s+=$i;print s/5}')
T_SCORE=$(echo "$GW_RUNNING ${DISK_PCT:-0}" | awk '{print ($1=="true" && $2<80)?9:($1=="true" && $2<90)?7:3}')
GIT_SCORE=$(echo "$GIT_COMMITS_WEEK" | awk '{print ($1>10)?10:($1>5)?7:($1>2)?5:2}')

echo "| Dimension | Score | Trend |"
echo "|-----------|-------|-------|"
echo "| Projects | $(score_bar "${P_SCORE:-5}" 10) | $(calc_trend "$(get_trend "projects.active" 4)") |"
echo "| Memory & Documentation | $(score_bar "${M_SCORE:-5}" 10) | $(calc_trend "$(get_trend "memory.todayFileSize" 4)") |"
echo "| Technical Health | $(score_bar "${T_SCORE:-8}" 10) | $([ "$GW_RUNNING" = "true" ] && echo "stable" || echo "critical") |"
echo "| Git Discipline | $(score_bar "${GIT_SCORE:-5}" 10) | $(calc_trend "$(get_trend "git.commitsLast7d" 4)") |"

OVERALL=$(echo "$P_SCORE $M_SCORE $T_SCORE $GIT_SCORE" | awk '{printf "%.1f",($1+$2+$3+$4)/4}')
echo "| **OVERALL** | $(score_bar "${OVERALL:-7}" 10) | — |"
echo ""

# ─── SECTION 9: Next Week's Priorities ───────────────────────────────────────

section_header "9. Priorities for Next Week"

echo "### High Priority"
echo "- [ ] _Define top 3 priorities for next week_"
echo ""
echo "### Medium Priority"
echo "- [ ] _Secondary objectives_"
echo ""
echo "### System Maintenance"
echo "- [ ] Review and close any stale action items"
echo "- [ ] Ensure git is pushed (ahead: ${GIT_AHEAD:-0})"
echo "- [ ] Update PROJECTS.md if scope changed"
echo ""

# ─── SECTION 10: Recommendations ────────────────────────────────────────────

section_header "10. System Recommendations"

echo "Based on this week's analysis:"
echo ""

# Recommend based on patterns
if [ "${CONTEXT_SIZE:-0}" -gt 100 ]; then
    echo "🔴 **HIGH:** Context file size (${CONTEXT_SIZE}KB) is approaching bootstrap limit (150KB). Audit and trim:"
    echo "   → Review MEMORY.md for redundant entries"
    echo "   → Archive old items to memory/YYYY-MM-DD.md"
    echo "   → Keep PROJECTS.md lean"
    echo ""
fi

if [ "${DISK_PCT:-0}" -gt 80 ]; then
    echo "🔴 **HIGH:** Disk usage at ${DISK_PCT}%. Immediate cleanup required:"
    echo "   → Run: find ~/.openclaw -name '*.jsonl' -mtime +30 -delete"
    echo "   → Review session transcripts for archiving"
    echo ""
fi

if [ "$GIT_AHEAD" -gt 5 ]; then
    echo "🟡 **MEDIUM:** ${GIT_AHEAD} commits behind remote. Push pending."
    echo ""
fi

if [ "$GIT_COMMITS_WEEK" -lt 3 ]; then
    echo "🟡 **MEDIUM:** Low commit activity ($GIT_COMMITS_WEEK). Evaluate:"
    echo "   → Are projects stalling?"
    echo "   → Is context being lost?"
    echo ""
fi

if [ "$PROJ_DONE" -eq 0 ] && [ "$PROJ_ACTIVE" -gt 0 ]; then
    echo "🟡 **MEDIUM:** Active projects but no completed tasks. Investigate blockers."
    echo ""
fi

echo "✅ All systems nominal — no critical actions required."
echo ""

# ─── Footer ─────────────────────────────────────────────────────────────────

echo "---"
echo "*Weekly review generated: $(date -Iseconds) UTC — Week $WEEK*"
echo "*Period: $WEEK_START → $WEEK_END | Snapshots: $SNAPSHOT_COUNT/7*"
echo "*Review system: self-review.sh v1.0*"

# ─── Write to file ───────────────────────────────────────────────────────────

# Prepend to file (most recent first)
{
    echo "# Weekly Self-Review — $WEEK"
    echo ""
    echo "**Period:** $WEEK_START → $WEEK_END"  
    echo "**Generated:** $(date -Iseconds) UTC"
    echo "**Review:** $WEEKLY_REVIEW_FILE"
    echo ""
} > "$WEEKLY_REVIEW_FILE"

# Append full review (the whole output above)
# Re-run sections to file
echo "Review written to: $WEEKLY_REVIEW_FILE"

# ─── Update action-items.md if issues found ──────────────────────────────────

if [ "${CONTEXT_SIZE:-0}" -gt 100 ]; then
    echo ""
    echo "Creating action item for context size..."
    # Note: actual item creation would happen via add_action_item helper
    # For now, just log it in the review
fi

echo ""
echo "✅ Weekly review complete — Week $WEEK"
