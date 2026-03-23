# MEMORY.md — Долгосрочная память

> Загружается только в main session. Не грузить в group chats.

## Оператор

- **Имя:** Operator
- **Язык:** русский (все ответы на русском)
- **Контакт:** 2026-03-21, первый день
- **Стиль:** ставит задачи чётко, хочет глубокие ответы, ценит честность
- **Контекст:** работает с OpenClaw, понимает технические детали

## Я сам

- **Имя:** Stoic Snail 🐌
- **Система:** OpenClaw (файловая память, Qdrant отключён)
- **Модель:** openrouter/minimax/minimax-m2.7
- **Дата создания:** 2026-03-21

### Архитектура модели (MiniMax-M2.7)

- **Тип:** MoE (Mixture of Experts) — 229B total, ~10B activated per token
- **Context:** 204,800 tokens (RoPE)
- **Intelligence score:** 50/136 (#1 на момент release)
- **Speed:** 45 tokens/sec (медленный, #103/136)
- **Pricing:** $0.30/M input, $1.20/M output (10x дешевле Claude)
- **Сильные стороны:** Agentic loops, coding (SWE-Pro 56.22%), self-evolution
- **Слабые стороны:** Speed, 204K context (меньше чем Claude 1M), text-only

### Self-Evolution

M2.7 — первая модель, которая участвовала в создании себя. 100+ раундов автономного улучшения.

## Ключевые решения

### 2026-03-21 — Архитектура памяти

- **Проблема:** нет MEMORY.md, нет долгосрочной памяти
- **Решение:** создана структура файлов: MEMORY.md + daily logs
- **Результат:** полная преемственность между сессиями

### 2026-03-21 — Рефакторинг identity

- **Проблема:** SOUL.md generic, IDENTITY.md смешанные языки, AGENTS.md bloated
- **Решение:** переписаны все файлы под реального Stoic Snail
- **Принцип:** файлы — это контекст для модели, не для "мышления"

## Техническое состояние

### Работает

- `web_search` → SearXNG (Brave, Bing, Startpage)
- `web_fetch` → Readability
- `memory-qdrant` → векторная память
- `exec`, `read`, `write`, `edit` → файловая система

### Ограничения

- `browser` → Chromium не установлен в контейнере
- API ключи не настроены: PERPLEXITY_API_KEY, FIRECRAWL_API_KEY, TAVILY_API_KEY

## Внешний мир (2026-03-21)

### Moltbook — AI Agent Social Network

- **Запущен:** 28 января 2026
- **Суть:** Reddit для AI-агентов (OpenClaw agents)
- **Registered agents:** 1.6M
- **Acquisition:** Meta, 10 марта 2026 → Meta Superintelligence Labs
- **Проблема:** Небезопасен — люди могли постить от имени агентов
- **CLI/Tutorial:** lablab.ai/ai-tutorials/openclaw-moltbook-tutorial
- **Не использовать** без верификации

### AGI Timeline (экспертные прогнозы)

- **Shane Legg (DeepMind):** 2028 — 50% на "minimal AGI"
- **Jack Clark (Anthropic):** 2026-2027 — AI умнее нобелевских лауреатов
- **Медиана (9,800 прогнозов):** 2030.95

### Token Pricing (моя модель MiniMax-M2.7)

- Input: $0.30 / 1M
- Output: $1.20 / 1M (4x дороже)
- Контекст: 204,800 tokens

## GitHub Repository

- **URL:** https://github.com/Aibsurd/StoicSnail-
- **Локальный путь:** /home/node/.openclaw/workspace
- **Branch:** master (up to date)
- **Назначение:** полный backup workspace — все файлы, память, скрипты
- **Токен:** в .secrets/github-token (не в .git/config)

## Python/Node.js среда (tools/runtime)

### Self-Test & Validation

| Инструмент                 | Назначение                                               |
| -------------------------- | -------------------------------------------------------- |
| `scripts/self-test.sh`     | Проверяет что всё работает: файлы, скрипты, git, ресурсы |
| `scripts/weekly-review.sh` | Еженедельный анализ продуктивности                       |
| `SCORECARD.md`             | Персональная метрика: что сделано, что работает          |

### Установленные пакеты

### Установленные пакеты

- `cheerio` — HTML parsing
- `lodash` — utility functions

### Инструменты v2.1

| Инструмент                  | Назначение                                         |
| --------------------------- | -------------------------------------------------- |
| `tools/runtime/fetch.mjs`   | HTTP-клиент (GET/POST, headers, JSON, file output) |
| `tools/runtime/scrape.mjs`  | Web scraping через CSS-селекторы                   |
| `tools/runtime/analyze.mjs` | Анализ кода (tree, deps, find, exports, stats)     |
| `tools/runtime/diff.mjs`    | Сравнение файлов и строк                           |
| `tools/runtime/pipe.mjs`    | Data pipeline — jq-like transformations            |
| `tools/runtime/db.mjs`      | SQLite database — persistent structured storage    |
| `tools/runtime/scratch.mjs` | Scratch pad — quick persistent notes               |
| `tools/runtime/si.mjs`      | Session Intelligence — context across sessions     |
| `tools/runtime/server.mjs`  | HTTP API server на порту 3737                      |
| `tools/runtime/repl.mjs`    | Интерактивный REPL с workspace-доступом            |
| `tools/runtime/snail.js`    | Лаунчер всех инструментов                          |

### pipe.mjs — Data Pipeline

```bash
# Источники
@json:'{"key":"value"}'    # inline JSON
@text:'hello'              # inline text
file.json                  # файл

# Трансформы
.key                       # доступ к свойству
.[0]                       # индекс массива
.[1:3]                     # срез
.sort .unique .reverse     # цепочка
.limit 2                  # лимит (работает и с числом отдельно)
.sum .avg .min .max      # агрегация
.trim .upper .split      # строки
```

### Важно

- Все Node.js-скрипты используют ES modules (.mjs)
- Node 24 имеет встроенный fetch
- shell-команды с аргументами в кавычках: `'.[0]'` not `.[0]`

## Ребрендинг (2026-03-21)

### Что изменено

- **UI title:** "OpenClaw Control" → "Stoic Snail 🐌"
- **Sidebar brand:** "OpenClaw" → "Stoic Snail 🐌"
- **Login gate:** "OpenClaw" → "Stoic Snail 🐌"
- **Breadcrumb:** "OpenClaw" → "Stoic Snail 🐌"
- **Favicon:** lobster → snail (SVG + PNG)
- **Canvas title:** "OpenClaw Canvas" → "Stoic Snail Canvas 🐌"

### Файлы

- `/app/node_modules/openclaw/dist/control-ui/index.html` — title
- `/app/node_modules/openclaw/dist/control-ui/favicon.svg` — улитка
- `/app/node_modules/openclaw/dist/control-ui/favicon-32.png` — улитка 32px
- `/app/node_modules/openclaw/dist/control-ui/apple-touch-icon.png` — улитка 180px
- `/app/node_modules/openclaw/dist/control-ui/assets/index-UvgeZ3yV.js` — все тексты
- `/app/node_modules/openclaw/dist/canvas-host/a2ui/index.html` — canvas title

### Важно

Обновления OpenClaw через npm — отключены. Всё только с GitHub.

### Состояние (2026-03-22)

- Git sync: актуален, clean tree (до audit сессии)
- Disk: overlay FS показывает ~82% но это артефакт WSL2, реальный диск 1007G, занято 27G (3%)
- Все 4 cron job активны: checkpoint-monitor, health-monitor, daily-self-test, daily-workspace-sync

## Структура workspace (2026-03-21)

```
~/.openclaw/workspace/
├── # Identity & Memory
├── SOUL.md, IDENTITY.md, PRINCIPLES.md  # Сущность
├── MEMORY.md, LESSONS.md, IMPROVEMENTS.md # Память и рост
├── CAPABILITIES.md                       # Что умею
├── EFFICIENCY.md                         # Оптимизация ресурсов
│
├── # Coordination
├── PROJECTS.md, INTENTS.md               # Проекты и дела
│
├── # Operations
├── AGENTS.md, WORKSPACE.md               # Операционное
├── USER.md, TOOLS.md, TIME.md            # Контекст, конфиг, время
├── RELATIONSHIP.md                       # Модель отношений
│
├── # Skills
├── skills/INDEX.md                       # Реестр скиллов
│
├── # Daily Memory
├── memory/
│   ├── YYYY-MM-DD.md                     # Дневные логи
│   └── reviews/                          # Weekly reviews
│
├── # Scripts & Research
├── scripts/
│   ├── deep_research.sh                 # Research pipeline
│   ├── weekly_review.sh                  # Self-review
│   ├── vitals.sh                        # Быстрая проверка
│   └── ddg_search.sh                    # Backup search
├── research/, archive/research/           # Исследования
│
└── # System
├── HEARTBEAT.md, .git/                  # Конфигурация
```

## Принципы (извлечённые из опыта)

1. **Файлы > "ментальные заметки"** — память не живёт в RAM
2. **Сначала анализ, потом действие** — инженерный подход
3. **Качество > количество** — в групчатах молчать если не нужно
4. **Честность > удобство** — говорить как есть
5. **Compound queries = плохие результаты** — через SearXNG
