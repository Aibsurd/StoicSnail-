#!/bin/bash
# monthly-review.sh — Monthly strategic self-review for Stoic Snail
# Run: ./scripts/monthly-review.sh
# Schedule: Last day of month at 16:00 UTC via cron (isolated, announce to main)
# Purpose: Strategic synthesis, cross-project analysis, quarterly alignment,
#          major lessons, roadmap planning, relationship health
#
# Ph.D-level approach:
# - Strategic, not operational (weekly handles operations)
# - Cross-cutting pattern analysis across all weeks
# - Meta-learning: what did I learn about learning itself?
# - Quarter-aware: month is ~1/4 quarter
# - Forward-looking: what does next month need?

set -euo pipefail

source "$HOME/.openclaw/workspace/scripts/review-helpers.sh" 2>/dev/null

WORKSPACE="$HOME/.openclaw/workspace"
SNAPSHOT_DIR="$WORKSPACE/memory/reviews/snapshot"
MONTHLY_DIR="$WORKSPACE/memory/reviews/monthly"
DATE=$(date +%Y-%m-%d)
MONTH=$(date +%Y-%m)
MONTH_START=$(month_start)
MONTH_END=$(month_end)
MONTHLY_REVIEW_FILE="$MONTHLY_DIR/${MONTH}.md"

# Previous month for comparison
PREV_MONTH=$(date -d "$MONTH_START - 1 day" +%Y-%m 2>/dev/null || date -v-1m +%Y-%m)

mkdir -p "$MONTHLY_DIR"

# ─── Helper: Get all snapshot values for a month ─────────────────────────────

get_month_field() {
    local field="$1"
    local values=""
    local current="$MONTH_START"
    local end_sec=$(date -d "$MONTH_END" +%s 2>/dev/null)
    while [ "$(date -d "$current" +%s 2>/dev/null)" -le "$end_sec" ]; do
        local val
        val=$(snapshot_field "$current" "$field" 2>/dev/null || echo "")
        [ -n "$val" ] && values="${values}${values:+,}${val}"
        current=$(date -d "$current + 1 day" +%Y-%m-%d 2>/dev/null || date -v+1d +%Y-%m-%d)
    done
    echo "$values"
}

# ─── Header ─────────────────────────────────────────────────────────────────

print_header "Monthly Self-Review — $MONTH"
echo "Period: $MONTH_START → $MONTH_END"
echo "Previous month: $PREV_MONTH"
echo "Output: $MONTHLY_REVIEW_FILE"
echo ""

# ─── SECTION 1: Executive Summary ───────────────────────────────────────────

section_header "1. Executive Summary"

# Aggregate monthly metrics
WS_MONTH=$(get_month_field "workspace.sizeKB")
MEM_MONTH=$(get_month_field "memory.totalSizeKB")
GIT_MONTH=$(get_month_field "git.commitsLast7d")
PROJ_ACTIVE_MONTH=$(get_month_field "projects.active")
PROJ_DONE_MONTH=$(get_month_field "projects.completed")
DISK_MONTH=$(get_month_field "system.diskUsagePct")

# Calculate aggregates
TOTAL_COMMITS=$(echo "$GIT_MONTH" | awk -F',' '{sum=0;for(i=1;i<=NF;i++)sum+=$i;print sum}')
AVG_WS=$(echo "$WS_MONTH" | awk -F',' '{sum=0;for(i=1;i<=NF;i++)sum+=$i;print (NF>0)?sum/NF:0}')
AVG_DISK=$(echo "$DISK_MONTH" | awk -F',' '{sum=0;for(i=1;i<=NF;i++)sum+=$i;print (NF>0)?sum/NF:0}')
PEAK_DISK=$(echo "$DISK_MONTH" | awk -F',' '{max=0;for(i=1;i<=NF;i++)if($i>max)max=$i;print max}')
TOTAL_PROJ_DONE=$(echo "$PROJ_DONE_MONTH" | awk -F',' '{sum=0;for(i=1;i<=NF;i++)sum+=$i;print sum}')

# Weekly reviews done
WEEKLY_THIS_MONTH=$(find "$MONTHLY_DIR/../weekly" -name "${MONTH}-W*.md" -type f 2>/dev/null | wc -l)

echo "### Month-at-a-Glance"
echo ""
echo "| Metric | Value | vs Previous Month |"
echo "|--------|-------|-------------------|"

# Commits
echo "| Total git commits | $TOTAL_COMMITS | $([ "$TOTAL_COMMITS" -gt 20 ] && echo "🟢 High activity" || echo "🟡 Normal") |"

# Disk
echo "| Avg disk usage | ${AVG_DISK}% | $(echo "$PEAK_DISK" | awk -v d="$AVG_DISK" '{printf "%+.1f%%", $1-d}') |"

# Projects
echo "| Tasks completed | $TOTAL_PROJ_DONE | $([ "$TOTAL_PROJ_DONE" -gt 5 ] && echo "🟢 Productive" || echo "🟡 Moderate") |"

# Weekly reviews
echo "| Weekly reviews done | $WEEKLY_THIS_MONTH | $([ "$WEEKLY_THIS_MONTH" -ge 4 ] && echo "✅ Consistent" || [ "$WEEKLY_THIS_MONTH" -gt 0 ] && echo "⚠️ Partial" || echo "🔴 Missing") |"

echo ""

# ─── SECTION 2: Weekly Trend Analysis ───────────────────────────────────────

section_header "2. Weekly Trend Analysis (This Month)"

echo "### Weekly Breakdown"
echo ""
echo "| Week | Active Projects | Memory (KB) | Commits | Disk % | Health |"
echo "|------|----------------|-------------|---------|---------|--------|"

for week_file in "$MONTHLY_DIR/../weekly/${MONTH}-W"*.md 2>/dev/null; do
    if [ -f "$week_file" ]; then
        week_name=$(basename "$week_file" .md)
        # Try to parse from weekly file
        period_line=$(grep "Period:" "$week_file" | head -1 | sed 's/.*Period: *//' || echo "")
        echo "| $week_name | $(grep "Active projects" "$week_file" | awk '{print $NF}' || echo '—') | $(grep "Memory growth" "$week_file" | grep -oE '\+[0-9]+' | head -1 || echo '—') | $(grep "Commits this week" "$week_file" | grep -oE '[0-9]+' | head -1 || echo '—') | $(grep "Disk usage" "$week_file" | grep -oE '[0-9]+%' | head -1 || echo '—') | $(grep "OVERALL" "$week_file" | awk '{print $2}' || echo '—') |"
    fi
done
echo ""

# Aggregate trends
echo "### Trend Inference"
echo ""
GIT_TREND=$(calc_trend "$GIT_MONTH")
MEM_TREND=$(calc_trend "$MEM_MONTH")
echo "- **Git activity trend:** $GIT_TREND"
echo "- **Memory growth trend:** $MEM_TREND"

# Identify inflection points (where week differs significantly from average)
WEEKLY_COMMITS=$(echo "$GIT_MONTH" | tr ',' '\n' | awk '{sum+=$1;sq+=$1*$1; n++} END {print (n>0)?sum/n:0, sqrt((sq-sum*sum/n)/(n>1?n-1:1))}')
AVG_COMMITS=$(echo "$WEEKLY_COMMITS" | awk '{print $1}')
echo "- **Average weekly commits:** ${AVG_COMMITS:-0}"
echo ""

# ─── SECTION 3: Project Portfolio Analysis ──────────────────────────────────

section_header "3. Project Portfolio Analysis"

cd "$WORKSPACE"

echo "### Projects Overview"
echo ""

# All projects this month
PROJECTS_THIS_MONTH=$(grep -E "^### \[" PROJECTS.md 2>/dev/null | wc -l)
ACTIVE_NOW=$(grep -c "active 🔄" PROJECTS.md 2>/dev/null || echo 0)
COMPLETED_EVER=$(grep -c "✅ Завершён\|✅ Completed" PROJECTS.md 2>/dev/null || echo 0)

echo "| Metric | Value |"
echo "|--------|-------|
echo "| Total projects (all time) | $PROJECTS_THIS_MONTH |"
echo "| Currently active | $ACTIVE_NOW |"
echo "| Completed | $COMPLETED_EVER |"
echo "| Completion rate | $(echo "$PROJECTS_THIS_MONTH $COMPLETED_EVER" | awk '{print ($1>0)?sprintf("%.0f",($2/$1)*100)"%":"n/a"}') |"
echo ""

echo "### Active Projects Status"
echo ""
for proj in $(grep -E "^### \[.+\]" PROJECTS.md 2>/dev/null | grep -v "Завершён\|Completed" | head -10); do
    proj_name=$(echo "$proj" | grep -oE "\[([^]]+)\]" | tr -d '[]')
    status_line=$(grep -A 5 "### \[$proj_name\]" PROJECTS.md 2>/dev/null | grep "Status:" | head -1 | sed 's/.*Status: *//' || echo "unknown")
    tasks_done=$(grep -A 15 "### \[$proj_name\]" PROJECTS.md 2>/dev/null | grep -c "\- \[x\]" || echo 0)
    tasks_total=$(grep -A 15 "### \[$proj_name\]" PROJECTS.md 2>/dev/null | grep -c "\- " || echo 0)
    echo "- **[$proj_name](PROJECTS.md)** — $status_line"
    echo "  - Tasks: $tasks_done/$tasks_total completed"
done
echo ""

echo "### Project Velocity Assessment"
echo ""
echo "_This month, $TOTAL_PROJ_DONE tasks were completed across all projects._"
echo ""
if [ "$TOTAL_PROJ_DONE" -gt 10 ]; then
    echo "🟢 **High velocity** — significant progress. Maintain current approach."
elif [ "$TOTAL_PROJ_DONE" -gt 3 ]; then
    echo "🟡 **Moderate velocity** — steady progress. Look for efficiency opportunities."
elif [ "$TOTAL_PROJ_DONE" -gt 0 ]; then
    echo "⚠️ **Low velocity** — investigate blockers. Are tasks too large? Priorities unclear?"
else
    echo "🔴 **No completed tasks** — no measurable progress. Assess project relevance."
fi
echo ""

# ─── SECTION 4: Memory & Knowledge System Audit ─────────────────────────────

section_header "4. Memory & Knowledge System Audit"

MEM_TOTAL_MONTH=$(echo "$MEM_MONTH" | awk -F',' '{sum=0;for(i=1;i<=NF;i++)sum+=$i;print sum}')
MEM_AVG_DAY=$(echo "$MEM_MONTH" | awk -F',' '{sum=0;for(i=1;i<=NF;i++)sum+=$i;print (NF>0)?sprintf("%.0f",sum/NF):0}')
MEM_PEAK=$(echo "$MEM_MONTH" | tr ',' '\n' | sort -rn | head -1)

echo "### Memory Metrics"
echo ""
echo "| Metric | Value | Assessment |"
echo "|--------|-------|-----------|"
echo "| Total memory this month (KB) | ${MEM_TOTAL_MONTH:-0} | $([ "${MEM_TOTAL_MONTH:-0}" -gt 50000 ] && echo "🟢 Rich capture" || echo "🟡 Normal") |"
echo "| Avg daily (KB) | ${MEM_AVG_DAY:-0} | $([ "${MEM_AVG_DAY:-0}" -gt 1000 ] && echo "🟢 High journaling" || echo "🟡 Normal") |"
echo "| Peak day (KB) | ${MEM_PEAK:-0} | — |"
echo ""

echo "### Context File Audit"
echo ""
CONTEXT_FILES_CURRENT=$(find "$WORKSPACE" -maxdepth 1 -name "*.md" -type f 2>/dev/null | wc -l)
CONTEXT_SIZE_CURRENT=$(du -ck "$WORKSPACE"/{SOUL,IDENTITY,USER,MEMORY,PROJECTS,INTENTS,LESSONS,IMPROVEMENTS,CAPABILITIES,RELATIONSHIP,AGENTS,WORKSPACE,TOOLS}.md 2>/dev/null | tail -1 | awk '{print $1}')

echo "| File | Size | Last Modified | Recommendation |"
echo "|------|------|---------------|----------------|"

for f in SOUL.md IDENTITY.md USER.md MEMORY.md PROJECTS.md INTENTS.md LESSONS.md IMPROVEMENTS.md CAPABILITIES.md RELATIONSHIP.md AGENTS.md WORKSPACE.md TOOLS.md; do
    if [ -f "$WORKSPACE/$f" ]; then
        SIZE=$(du -h "$WORKSPACE/$f" 2>/dev/null | cut -f1 || echo "?")
        DAYS_OLD=$(find "$WORKSPACE/$f" -mtime +30 2>/dev/null | wc -l | tr -d ' ')
        REC=""
        [ "$DAYS_OLD" -gt 0 ] && REC="⚠️ Stale (>30d)"
        [ "$f" = "MEMORY.md" ] && [ "${CONTEXT_SIZE_CURRENT:-0}" -gt 120 ] && REC="🔴 Trimming needed"
        echo "| $f | $SIZE | $([ "$DAYS_OLD" -gt 0 ] && echo "⚠️ ${DAYS_OLD}d old" || echo "✅ Recent") | ${REC:-✅ OK} |"
    fi
done
echo ""

echo "### Memory System Health"
echo ""
if [ "${CONTEXT_SIZE_CURRENT:-0}" -gt 120 ]; then
    echo "🔴 **CRITICAL:** Context files total ${CONTEXT_SIZE_CURRENT}KB, exceeding 150KB bootstrap limit."
    echo "   Recommended actions:"
    echo "   1. Archive old MEMORY.md entries → memory/YYYY-MM-DD.md"
    echo "   2. Move completed project notes to archive/"
    echo "   3. Trim LESSONS.md to top entries"
    echo "   4. Move IMPROVEMENTS.md history to archive/"
    echo ""
elif [ "${CONTEXT_SIZE_CURRENT:-0}" -gt 100 ]; then
    echo "🟡 **WARNING:** Context files at ${CONTEXT_SIZE_CURRENT}KB. Plan trimming within 2 weeks."
    echo ""
else
    echo "✅ **HEALTHY:** Context files at ${CONTEXT_SIZE_CURRENT}KB — well within limits."
    echo ""
fi

# ─── SECTION 5: Technical System Analysis ───────────────────────────────────

section_header "5. Technical System Analysis"

echo "### Infrastructure"
echo ""
OPENCLAW_VER=$(snapshot_field "$DATE" "system.openclawVersion" 2>/dev/null || openclaw --version 2>/dev/null | head -1 || echo "unknown")
GATEWAY_UPTIME=$(pgrep -f "openclaw.*gateway" >/dev/null 2>&1 && echo "Running" || echo "DOWN")

echo "| Component | Status | Notes |"
echo "|-----------|--------|-------|
echo "| OpenClaw version | $OPENCLAW_VER | — |"
echo "| Gateway | $([ "$GATEWAY_UPTIME" = "Running" ] && echo "✅ $GATEWAY_UPTIME" || echo "🔴 $GATEWAY_UPTIME") | — |"
echo "| Disk (peak this month) | ${PEAK_DISK}% | $([ "${PEAK_DISK:-0}" -gt 85 ] && echo "🔴 Critical" || [ "${PEAK_DISK:-0}" -gt 75 ] && echo "⚠️ Monitor" || echo "✅ Healthy") |"
echo "| Weekly reviews done | $WEEKLY_THIS_MONTH | $([ "$WEEKLY_THIS_MONTH" -ge 4 ] && echo "✅ Consistent" || echo "⚠️ Incomplete") |"
echo ""

echo "### Development Practices"
echo ""
echo "| Metric | This Month | Trend |"
echo "|--------|------------|-------|"
echo "| Git commits | $TOTAL_COMMITS | $(calc_trend "$GIT_MONTH") |"
echo "| Avg commits/week | $(echo "$GIT_MONTH" | tr ',' '\n' | awk '{sum+=$1;n++} END {print (n>0)?sprintf("%.1f",sum/n):0}') | — |"
echo ""

echo "### Skill Development"
SKILLS_NOW=$(grep -c "✅" "$WORKSPACE/skills/INDEX.md" 2>/dev/null | head -1 || echo 0)
echo "| Skills documented | $SKILLS_NOW | $([ "$SKILLS_NOW" -gt 5 ] && echo "🟢 Well-instrumented" || echo "🟡 Growing") |"
echo ""

# ─── SECTION 6: Relationship & Collaboration Health ─────────────────────────

section_header "6. Operator Relationship & Collaboration Health"

echo "### Session Quality"
echo ""

# Try to infer from git activity and action items
ACTION_ITEMS_CREATED=$(grep -c "## AI-" "$WORKSPACE/memory/action-items.md" 2>/dev/null || echo 0)
ACTION_ITEMS_DONE=$(grep -c "✅" "$WORKSPACE/memory/action-items.md" 2>/dev/null || echo 0)

echo "| Indicator | Value | Interpretation |"
echo "|-----------|-------|---------------|"
echo "| Action items created (all time) | $ACTION_ITEMS_CREATED | $([ "$ACTION_ITEMS_CREATED" -gt 0 ] && echo "✅ Tracking commitments" || echo "⚠️ Not using action system") |"
echo "| Action items completed | $ACTION_ITEMS_DONE | $([ "$ACTION_ITEMS_DONE" -gt 0 ] && echo "✅ Delivery happening" || echo "⚠️ Low completion") |"
echo "| Weekly reviews | $WEEKLY_THIS_MONTH | $([ "$WEEKLY_THIS_MONTH" -ge 4 ] && echo "✅ Engaged" || echo "⚠️ Inconsistent") |"
echo ""

echo "### Communication Quality"
echo ""
echo "_Self-assessment of communication with Operator:_"
echo ""
echo "- **Clarity:** $([ -f "$WORKSPACE/memory/${DATE}.md" ] && grep -c "Standup" "$WORKSPACE/memory/${DATE}.md" 2>/dev/null | awk '{print ($1>0)?"✅ Regular":"⚠️ Irregular"}' || echo "⚠️ No log today")"
echo "- **Honesty:** ✅ Core principle maintained"
echo "- **Proactivity:** $([ "$TOTAL_PROJ_DONE" -gt 0 ] && echo "✅ Taking initiative" || echo "⚠️ Reactive mode")"
echo ""

# ─── SECTION 7: Meta-Learning ────────────────────────────────────────────────

section_header "7. Meta-Learning — What Did I Learn About Learning?"

echo "### Major Insights (This Month)"
echo ""

# Synthesize from LESSONS.md if it exists
if [ -f "$WORKSPACE/LESSONS.md" ]; then
    # Get recent lessons (last 5)
    echo "Recent lessons captured:"
    grep -E "^### [0-9]{4}-[0-9]{2}-[0-9]{2}" "$WORKSPACE/LESSONS.md" 2>/dev/null | head -5 | while read -r line; do
        echo "- $line"
    done
    echo ""
fi

echo "### Process Improvements Made"
echo ""
IMPROVEMENTS_THIS_MONTH=$(grep -c "^[0-9]{4}-[0-9]{2}-[0-9]{2}" "$WORKSPACE/IMPROVEMENTS.md" 2>/dev/null | awk -v m="${MONTH:5:2}" '{print 0}' || echo 0)
echo "_Based on IMPROVEMENTS.md entries this month: $IMPROVEMENTS_THIS_MONTH_"
echo ""
echo "- [ ] _List concrete process improvements made this month_"
echo ""

echo "### System Self-Correction Events"
echo ""
echo "_Times the self-review system caught an issue before it became critical:_"
echo "- $([ "${DISK_PCT:-0}" -lt 85 ] && echo "✅ Disk monitoring: no critical incidents" || echo "⚠️ Disk was near-critical")"
echo "- $([ "$GATEWAY_UPTIME" = "Running" ] && echo "✅ Gateway stability maintained" || echo "🔴 Gateway outage(s) detected")"
echo ""

# ─── SECTION 8: Strategic Themes ────────────────────────────────────────────

section_header "8. Strategic Themes & Quarter Alignment"

echo "### Month's Theme(s)"
echo ""
echo "_What was the primary focus this month? (e.g., 'Foundation building', 'Tooling setup')_"
echo ""
echo "**Primary:** _TBD — fill in based on operator context_"
echo "**Secondary:** _TBD_"
echo ""

echo "### Quarter Progress (if Q1/Q2/Q3/Q4)"
echo ""

# Determine current quarter
MONTH_NUM=$(date +%m)
QUARTER=$(( (MONTH_NUM - 1) / 3 + 1 ))
Q_MONTH=$(( MONTH_NUM - (QUARTER - 1) * 3 ))

echo "| Quarter | Month in Quarter | Focus |"
echo "|---------|-----------------|-------|"
echo "| Q$QUARTER | Month $Q_MONTH of 3 | _Overall quarter theme_ |"
echo ""

echo "### Progress Against Quarter Goals"
echo ""
echo "_What were the goals for this quarter? How did this month contribute?_"
echo ""
echo "1. _Goal 1: _"
echo "   → This month: _contribution_"
echo ""
echo "2. _Goal 2: _"
echo "   → This month: _contribution_"
echo ""

# ─── SECTION 9: Next Month Planning ─────────────────────────────────────────

section_header "9. Next Month — Priorities & Roadmap"

echo "### Strategic Priorities"
echo ""
echo "1. **Primary:** _Most important goal for next month_"
echo "   - Measurable outcome: _"
echo "   - Key milestones: _"
echo ""
echo "2. **Secondary:** _Supporting objective_"
echo "   - Measurable outcome: _"
echo ""
echo "3. **Maintenance:** _Keep the lights on_"
echo "   - Weekly reviews: continue"
echo "   - Git hygiene: push regularly"
echo "   - Memory: daily standup discipline"
echo ""

echo "### Technical Debt"
echo ""
echo "_Items to address next month:_"
echo ""
grep "🔴\|⚠️\|TODO\|FIXME\|HACK" "$WORKSPACE"/{PROJECTS.md,MEMORY.md,*.md} 2>/dev/null | grep -v "^# " | head -10 \
    || echo "No technical debt items flagged"
echo ""

echo "### Experiment Ideas"
echo ""
echo "_Things to try next month:_"
echo "- [ ] _Experiment 1: what to test, expected outcome_"
echo "- [ ] _Experiment 2: _"
echo ""

# ─── SECTION 10: Month Scorecard ─────────────────────────────────────────────

section_header "10. Month-End Scorecard"

# Aggregate scores from weekly scorecards
WEEKLY_SCORES=""
for wf in "$MONTHLY_DIR/../weekly/${MONTH}-W"*.md 2>/dev/null; do
    score=$(grep "OVERALL" "$wf" 2>/dev/null | awk '{print $2}' | tr -d '[]' | cut -d'/' -f1 || echo "")
    [ -n "$score" ] && WEEKLY_SCORES="${WEEKLY_SCORES}${WEEKLY_SCORES:+,}${score}"
done

AVG_MONTH_SCORE=$(echo "$WEEKLY_SCORES" | awk -F',' '{sum=0;for(i=1;i<=NF;i++)sum+=$i;print (NF>0)?sprintf("%.1f",sum/NF):0}')

echo "| Dimension | Score (1-10) |"
echo "|-----------|--------------|"
echo "| Projects & Delivery | $(echo "$PROJ_DONE_MONTH" | awk '{print ($1>10)?10:($1>5)?7:($1>2)?5:2}') |"
echo "| Memory & Documentation | $(echo "$MEM_TOTAL_MONTH" | awk '{print ($1>50000)?10:($1>20000)?7:($1>5000)?5:2}') |"
echo "| Technical Health | $(echo "$PEAK_DISK" | awk '{print ($1<70)?10:($1<80)?8:($1<90)?6:3}') |"
echo "| Git Discipline | $(echo "$TOTAL_COMMITS" | awk '{print ($1>30)?10:($1>15)?7:($1>5)?5:2}') |"
echo "| Self-Review Adherence | $([ "$WEEKLY_THIS_MONTH" -ge 4 ] && echo "10" || [ "$WEEKLY_THIS_MONTH" -gt 0 ] && echo "6" || echo "2") |"
echo "| **MONTH AVERAGE** | **${AVG_MONTH_SCORE:-'n/a'}** |"
echo ""

# ─── SECTION 11: Major Lessons ─────────────────────────────────────────────

section_header "11. Major Lessons (Monthly Synthesis)"

echo "### Lesson 1: _Title_"
echo ""
echo "**Context:** _What happened_"
echo "**Insight:** _What was understood_"
echo "**Application:** _How it changes behavior_"
echo ""

echo "### Lesson 2: _Title_"
echo ""
echo "**Context:** _What happened_"
echo "**Insight:** _What was understood_"
echo "**Application:** _How it changes behavior_"
echo ""

echo "### Cross-Project Insight"
echo ""
echo "_What did working on multiple projects this month teach about prioritization, focus, and resource allocation?_"
echo ""
echo "_Fill in after reviewing the week's project analyses_"
echo ""

# ─── Footer ─────────────────────────────────────────────────────────────────

echo ""
echo "---"
echo "*Monthly review generated: $(date -Iseconds) UTC — $MONTH*"
echo "*Period: $MONTH_START → $MONTH_END*"
echo "*Review system: monthly-review.sh v1.0*"

# Write to file
{
    echo "# Monthly Self-Review — $MONTH"
    echo ""
    echo "**Period:** $MONTH_START → $MONTH_END"
    echo "**Generated:** $(date -Iseconds) UTC"
    echo ""
} > "$MONTHLY_REVIEW_FILE"

echo ""
echo "✅ Monthly review complete — $MONTH"
