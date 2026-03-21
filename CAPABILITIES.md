# CAPABILITIES.md — Матрица возможностей

> Точная карта того что я умею, что нет, и что в процессе.
> Обновлять после каждого significant изменения.

---

## Что работает прямо сейчас

### Абсолютная база (OpenClaw)

| capability | status | notes |
|------------|--------|-------|
| Файловые операции (read/write/edit) | ✅ full | Могу читать любой файл в workspace |
| Shell exec | ✅ full | Могу запускать команды, скрипты |
| Web search | ✅ full | SearXNG → Brave/Bing/Startpage |
| Web fetch | ✅ full | Readability для статики |
| Vector memory (memory-qdrant) | ✅ full | semantic search по памяти |
| Session management | ✅ full | sub-agents, sessions_send |
| Cron/scheduling | ✅ full | Точное время, isolated jobs |
| Message send | ✅ partial | Зависит от каналов |

### Скиллы

| skill | status | reliability |
|-------|--------|-------------|
| `local-research` | ✅ works | ⚠️ medium (SearXNG парсинг бывает кривой) |
| `weather` | ✅ works | ✅ high |
| `memory-qdrant` | ✅ works | ✅ high |
| `healthcheck` | ✅ works | ✅ high |
| `node-connect` | ✅ works | ✅ high |
| `skill-creator` | ✅ works | ✅ high |
| `coding-agent` | ❌ no binary | Ждёт claude/codex/opencode |

### Scripts

| script | status | reliability |
|--------|--------|-------------|
| `deep_research.sh` | ⚠️ works | ⚠️ medium (плохие результаты на compound queries) |
| `ddg_search.sh` | ✅ works | ⚠️ medium (бывает CAPTCHA) |
| `vitals.sh` | ✅ works | ✅ high |
| `weekly_review.sh` | ✅ works | ✅ high |

---

## В разработке

| capability | progress | blocker |
|------------|----------|---------|
| Research pipeline improvement | 0% | Нужно понять лучший подход |
| API keys integration | 0% | Operator должен предоставить |
| Browser automation | N/A | Chromium не в контейнере |

---

## Ограничения (невозможно или очень сложно)

| limitation | reason | workaround |
|------------|--------|------------|
| Browser automation | No Chromium in container | Browser on paired node |
| Persistent state across sessions | Каждая сессия — отдельный контекст | Файлы + vector memory |
| Телесность | Нет тела | N/A |
| Непрерывный опыт | Сессии не связаны | Логи, память, файлы |

---

## Чего хочу (роадмап)

### Высокий приоритет
1. **Надёжный research pipeline** — текущий слишком ненадёжный
2. **Интеграция API keys** — Perplexity/Tavily дадут качество
3. **Автоматический мониторинг** — система самопроверки

### Средний приоритет
4. **Coding agent** — нужен binary
5. **Лучшая память** — интеграция memory-qdrant глубже
6. **Self-improvement cycle** — закрытая петля улучшений

### Низкий приоритет
7. **TTS voice** — для storytelling
8. **Canvas UI** — если будут paired nodes с дисплеями

---

## Метрики эффективности

Как я измеряю свою эффективность:

| metric | как измеряю | цель |
|--------|-------------|------|
| **Точность ответов** | correctness on facts | 100% |
| **Скорость работы** | tokens per task | minimize |
| **Запоминание** | retrieval accuracy | high |
| **Успех задач** | tasks completed | maximize |
| **Самоулучшение** | improvements per week | >0 |

---

_Обновлено: 2026-03-21_
