#!/bin/bash
# weekly_review.sh — еженедельный self-review для Stoic Snail
# Run: ./scripts/weekly_review.sh
# Or via cron: every Monday 9:00 UTC

DATE=$(date +%Y-%m-%d)
REVIEW_FILE="/home/node/.openclaw/workspace/memory/reviews/${DATE}_weekly_review.md"
mkdir -p "$(dirname "$REVIEW_FILE")"

echo "Writing weekly review to $REVIEW_FILE"

exec > >(tee "$REVIEW_FILE")
exec 2>&1

cat << 'HEADER'
# Weekly Review — Stoic Snail

Дата: DATE_PLACEHOLDER
Период: LAST_7_DAYS

---

## Что сделано за неделю

### Проекты
HEADER

# Count completed tasks from PROJECTS.md
grep -E "^\- \[x\]" /home/node/.openclaw/workspace/PROJECTS.md 2>/dev/null || echo "No completed tasks found"

cat << 'MIDDLE'

### Исследования
HEADER

ls -t /home/node/.openclaw/workspace/research/ 2>/dev/null | head -5 || echo "No research"
ls -t /home/node/.openclaw/workspace/archive/research/ 2>/dev/null | head -5 || echo "No archived research"

cat << 'MIDDLE2'

### Файлы
HEADER

echo "New/updated files:"
find /home/node/.openclaw/workspace -maxdepth 1 -type f -name "*.md" -mtime -7 2>/dev/null | xargs -I{} basename {} 2>/dev/null || echo "None"

cat << 'MIDDLE3'

---

## Проблемы и ограничения

### Технические
MIDDLE3

# Check what doesn't work
echo "- Browser automation: $(grep -q "Chromium" /home/node/.openclaw/workspace/MEMORY.md 2>/dev/null && echo "Not available" || echo "Unknown")"
echo "- API keys: $(grep -q "PERPLEXITY_API_KEY" /home/node/.openclaw/workspace/MEMORY.md 2>/dev/null && echo "Not configured" || echo "Unknown")"

cat << 'MIDDLE4'

### Процессуальные
MIDDLE4

# Self-reflection
echo "- Research pipeline quality: NEEDS_ASSESSMENT"
echo "- Memory usage: NEEDS_ASSESSMENT"
echo "- Project tracking: NEEDS_ASSESSMENT"

cat << 'MIDDLE5'

---

## Цели на следующую неделю

### Приоритет 1
- [ ] Определить приоритеты
- [ ] 

### Приоритет 2
- [ ] 

MIDDLE5

cat << 'FOOTER'

---

## Общие наблюдения

_Заполнить вручную после просмотра логов_

### Что хорошо
-

### Что улучшить
-

### Инсайты
-

---

_Review completed: REVIEW_TIMESTAMP_PLACEHOLDER
FOOTER

# Replace placeholders
sed -i "s/DATE_PLACEHOLDER/$(date +%Y-%m-%d)/" "$REVIEW_FILE"
sed -i "s/LAST_7_DAYS/$(date -d '7 days ago' +%Y-%m-%d)\ —\ $(date +%Y-%m-%d)/" "$REVIEW_FILE"
sed -i "s/REVIEW_TIMESTAMP_PLACEHOLDER/$(date -Iseconds)\ UTC/" "$REVIEW_FILE"

echo ""
echo "Review saved to: $REVIEW_FILE"
