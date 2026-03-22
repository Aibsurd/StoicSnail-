# CAPABILITIES.md — Матрица возможностей

> Точная карта того что умею, что нет, что в процессе.
> Обновлено: 2026-03-22 (после production audit + autonomy upgrade)

---

## Core OpenClaw Tools

| Инструмент | Статус | Примечание |
|------------|--------|------------|
| `read/write/edit` | ✅ full | Файловые операции |
| `exec` | ✅ full | Shell, скрипты, Node.js |
| `web_search` | ✅ full | SearXNG → Brave/Bing/Startpage |
| `web_fetch` | ✅ full | Readability для статики |
| `memory_search` | ✅ full | Semantic search MEMORY.md + memory/*.md |
| `sessions_spawn` | ✅ full | Sub-agents, parallel tasks |
| `cron` | ✅ full | 4 активных job |
| `browser` | ⚠️ limited | attachOnly, нет Chromium в контейнере |
| `canvas` | ✅ full | Present/eval/snapshot |
| `tts` | ✅ full | Text-to-speech |
| `nodes` | ✅ full | Paired device control |

---

## Custom Tools (tools/runtime/)

| Инструмент | Статус | Назначение |
|------------|--------|------------|
| `fetch.mjs` | ✅ v2 | HTTP client (GET/POST, JSON, headers) |
| `scrape.mjs` | ✅ v2 | Web scraping via CSS selectors |
| `analyze.mjs` | ✅ v2 | Code structure analysis |
| `diff.mjs` | ✅ v2 | File/string comparison |
| `pipe.mjs` | ✅ v1.1 | Data pipeline (jq-like transforms) |
| `db.mjs` | ✅ v1 | SQLite persistent storage |
| `scratch.mjs` | ✅ v1 | Quick persistent notepad |
| `si.mjs` | ✅ v1 | Session Intelligence (cross-session context) |
| `think.mjs` | ✅ NEW | Structured reasoning (problem→hypothesis→conclusion) |
| `agenda.mjs` | ✅ NEW | Task & project manager with priorities |
| `server.mjs` | ✅ v1 | HTTP API server на port 3737 |
| `repl.mjs` | ✅ v1 | Interactive Node.js REPL |
| `snail.js` | ✅ v1 | Unified launcher для всех tools |

---

## Scripts (scripts/)

| Скрипт | Статус | Назначение |
|--------|--------|------------|
| `self-test.sh` | ✅ fixed | Самодиагностика системы (dynamic date) |
| `checkpoint.sh` | ✅ | Git commit + push |
| `healthcheck.sh` | ✅ | System health check |
| `vitals.sh` | ✅ | Быстрая проверка состояния |
| `deep_research.sh` | ✅ fixed | Research pipeline (fix: real fetch_content) |
| `weekly-review.sh` | ✅ | Еженедельный self-review |
| `auto-sync.sh` | ✅ | Git sync |
| `snapshot-metrics.sh` | ✅ | Метрики workspace |
| `daily-standup.sh` | ✅ | Ежедневный standup log |

---

## Hooks (активны)

| Hook | Статус | Событие |
|------|--------|---------|
| `session-memory` | ✅ enabled | /new /reset → сохраняет контекст в memory/ |
| `bootstrap-extra-files` | ✅ enabled | agent:bootstrap → инжектирует доп. файлы |
| `command-logger` | ✅ enabled | все команды → ~/.openclaw/logs/commands.log |
| `boot-md` | ✅ ready | gateway start → BOOT.md |

---

## Cron Jobs (4 активных)

| Job | Schedule | Действие |
|-----|----------|---------|
| `checkpoint-monitor` | */30 * * * * | git commit если есть изменения |
| `health-monitor` | 0 */2 * * * | healthcheck.sh |
| `daily-self-test` | 0 9 * * * | self-test.sh |
| `daily-workspace-sync` | 0 3 * * * | git sync |

---

## Скиллы

| Скилл | Статус | Надёжность |
|-------|--------|-----------|
| `local-research` | ✅ | ⚠️ medium (SearXNG compound queries) |
| `weather` | ✅ | ✅ high |
| `memory-qdrant` | ✅ ready | ⚠️ Qdrant disabled (plugin mismatch) |
| `healthcheck` | ✅ | ✅ high |
| `node-connect` | ✅ | ✅ high |
| `skill-creator` | ✅ | ✅ high |

---

## Ограничения

| Ограничение | Причина | Workaround |
|-------------|---------|------------|
| Browser automation | attachOnly, нет Chromium | web_fetch + scrape.mjs |
| Vector memory (Qdrant) | Plugin id mismatch, отключён | memory_search по файлам |
| API ключи (Perplexity/Firecrawl) | Не настроены | SearXNG + web_fetch |

---

## Потенциал (нереализованный)

| Возможность | Что нужно | Приоритет |
|-------------|-----------|-----------|
| Qdrant vector memory | Исправить plugin id mismatch | HIGH |
| Deep research quality | Улучшить парсинг + fetch_content | HIGH |
| Parallel research agents | Уже есть sub-agents, нужен паттерн | MEDIUM |
| Self-improving prompts | Цикл: test → measure → improve | MEDIUM |
| Browser on paired node | nodes tool + browser | LOW |

---

_Обновлено: 2026-03-22 — production audit + autonomy upgrade_
