# AUDIT.md — Полный аудит возможностей

> Дата: 2026-03-21
> Цель: Найти что не протестировано, требует улучшения, или забыто

---

## ✅ Протестировано и работает

| Компонент | Статус | Заметки |
|-----------|--------|---------|
| Файловые операции | ✅ | read/write/edit/exec |
| Web search (SearXNG) | ✅ | Работает |
| Web fetch | ✅ | Readability |
| memory-qdrant | ✅ | Векторная память |
| Sub-agents | ✅ | Протестировано 3 задачи |
| Cron/scheduling | ✅ | daily-workspace-sync active |
| GitHub push/sync | ✅ | Работает |
| GitHub Issues (gh-manage.sh) | ✅ | 3 issues создано |
| Compaction config | ✅ | Настроен safeguard mode |
| Context management | ✅ | 60% currently |

---

## ⚠️ Частично работает или требует внимания

### 1. Research Pipeline (deep_research.sh)

**Проблема:** Парсинг SearXNG JSON нестабилен для compound queries. Возвращает dictionary definitions вместо реального контента.

**Статус:** Known issue, work in progress

**Что нужно:**
- [ ] Исправить парсинг JSON
- [ ] Добавить fallback на direct URL fetch
- [ ] Протестировать на реальных запросах

---

### 2. weather skill

**Статус:** ✅ Работает (протестировано: `curl wttr.in/Moscow` → `moscow: ☀️ +4°C`)

**Но:** Никогда не использовался в реальном разговоре с Operator

---

### 3. gh-issues skill

**Статус:** Есть в `/app/skills/gh-issues/SKILL.md`

**Проблема:** Я написал свой `gh-manage.sh` вместо использования скилла

**Что лучше в скилле:**
- Автоматический fork workflow
- Sub-agents для parallel fix
- PR review monitoring
- Cron mode

**Действие:** Возможно стоит использовать скилл вместо своего скрипта, или улучшить gh-manage.sh

---

### 4. session-logs skill

**Статус:** Есть в `/app/skills/session-logs/SKILL.md`

**Проблема:** Никогда не использовался

**Когда использовать:**
- Operator спрашивает о предыдущих разговорах
- Потеря контекста между сессиями
- Анализ истории

---

## ❌ Не работает или недоступно

### 1. Browser Automation

**Проблема:** Chromium не установлен в контейнере

**Документация:** `/app/docs/tools/browser.md`

**Workaround:** Browser on paired node (но нет paired nodes)

---

### 2. TTS (Text-to-Speech)

**Проблема:** Нет бинарного файла (espeak, say, и т.д.)

**Скилл:** `/app/skills/sag/SKILL.md` (ElevenLabs)

**Когда нужно:** storytelling, голосовые уведомления

---

### 3. Canvas (UI display)

**Проблема:** Требует paired nodes (Mac app, iOS, Android)

**Скилл:** `/app/skills/canvas/SKILL.md`

**Статус:** Нет paired nodes

---

### 4. summarize tool

**Проблема:** Binary `summarize` не установлен

**Скилл:** `/app/skills/summarize/SKILL.md`

**Альтернатива:** web_fetch работает, но без summarization

---

### 5. Paired Nodes

**Проблема:** Нет paired nodes

**Скилл:** `/app/skills/node-connect/SKILL.md`

**Что потеряно без nodes:**
- Canvas display
- Camera access
- Screen recording
- Device notifications
- Location tracking

---

## 📋 Skills — не использованные

| Skill | Путь | Потенциал |
|--------|------|-----------|
| `session-logs` | `/app/skills/session-logs/` | Анализ истории |
| `gh-issues` | `/app/skills/gh-issues/` | Автоматизация GitHub |
| `canvas` | `/app/skills/canvas/` | UI для nodes |
| `summarize` | `/app/skills/summarize/` | TL;DR контента |
| `sag` (TTS) | `/app/skills/sag/` | Voice output |
| `model-usage` | `/app/skills/model-usage/` | Мониторинг модели |

---

## 🔧 Config — неиспользованные возможности

### 1. OpenClaw cron jobs

**Сейчас:** Только `daily-workspace-sync`

**Можно добавить:**
- Еженедельный self-review
- Мониторинг здоровья системы
- Автоматические backup checks

---

### 2. Session management

**Сейчас:** Используем по умолчанию

**Не использовано:**
- `/new` для чистого контекста
- `/compact` для очистки
- `/session idle` controls

---

### 3. Multi-agent routing

**Сейчас:** Один агент

**Возможность:**
- Отдельный agent для research
- Отдельный agent для coding
- Разные модели для разных задач

---

## 🎯 Priority Actions

### Высокий приоритет

1. **Исправить research pipeline** — текущий ненадёжный
2. **Протестировать healthcheck** — проверить безопасность
3. **Интегрировать gh-issues** — автоматизация GitHub workflow

### Средний приоритет

4. **Использовать session-logs** — для анализа истории
5. **Добавить больше cron jobs** — автоматизация
6. **Рассмотреть multi-agent** — для сложных задач

### Низкий приоритет

7. **TTS setup** — если нужен voice
8. **Canvas/node pairing** — если будут devices
9. **summarize binary** — если нужен TL;DR

---

## 📊 Метрики аудита

| Metric | Value |
|--------|-------|
| Skills доступно | 60+ |
| Skills использовано | ~7 |
| Scripts создано | 9 |
| Scripts протестировано | 4 |
| GitHub features | 2 (issues, sync) |
| Config patches | 2 (compaction, subagents) |

---

_Обновлено: 2026-03-21_
