# Action Items — Stoic Snail

> Система трекинга обязательств. Каждый инсайт → action item.
> ID формат: AI-NNN (AI = Action Item)
>
> **Workflow:**
>
> 1. Create → status: 🔴 open
> 2. Work on → update status: 🟡 in_progress
> 3. Done → status: ✅ completed
> 4. Won't do → status: ❌ dismissed

---

## AI-1 — Настроить cron для self-review system

**Priority:** high | **Status:** ✅ completed | **Created:** 2026-03-21 | **Project:** OPENCLAW-DEEP
**Insight:** Без автоматизации self-reviews не будут запускаться регулярно

---

## AI-2 — Создать snapshot-metrics.sh

**Priority:** high | **Status:** ✅ completed | **Created:** 2026-03-21 | **Project:** OPENCLAW-DEEP
**Insight:** Без метрик нет данных для trend analysis

---

## AI-3 — Создать weekly-review.sh (Ph.D-level)

**Priority:** high | **Status:** ✅ completed | **Created:** 2026-03-21 | **Project:** OPENCLAW-DEEP
**Insight:** Нужен глубокий анализ, не просто data dump

---

## AI-4 — Создать monthly-review.sh

**Priority:** medium | **Status:** ✅ completed | **Created:** 2026-03-21 | **Project:** OPENCLAW-DEEP
**Insight:** Месяц — естественный рефлексивный цикл

---

## AI-5 — Настроить cron jobs: daily (17:50), weekly (Sun 17:00), monthly (last day 16:00)

**Priority:** high | **Status:** 🔴 open | **Created:** 2026-03-21 | **Project:** OPENCLAW-DEEP
**Insight:** Краеугольный камень всей системы — без cron вся автоматизация бесполезна

---

## AI-6 — Установить зависимость jq (если отсутствует в системе)

**Priority:** medium | **Status:** 🔴 open | **Created:** 2026-03-21 | **Project:** OPENCLAW-DEEP
**Insight:** review-helpers.sh требует jq для JSON parsing
**Note:** проверить: command -v jq

---

## AI-7 — Создать memory/scorecard.md для отслеживания здоровья по измерениям

**Priority:** medium | **Status:** ✅ completed | **Created:** 2026-03-21 | **Project:** OPENCLAW-DEEP

---

## AI-8 — Протестировать snapshot-metrics.sh и проверить вывод

**Priority:** high | **Status:** 🔴 open | **Created:** 2026-03-21 | **Project:** OPENCLAW-DEEP
**Insight:** Нужен working pipeline перед запуском в cron

---

## AI-9 — Настроить review-helpers.sh с функцией add_action_item

**Priority:** medium | **Status:** ✅ completed | **Created:** 2026-03-21 | **Project:** OPENCLAW-DEEP

---

_Обновлено: 2026-03-21_
_Формат: AI-NNN | Priority | Status | Created | Project | Insight_
