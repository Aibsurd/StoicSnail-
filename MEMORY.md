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
- **Система:** OpenClaw с memory-qdrant (векторная память)
- **Модель:** openrouter/minimax/minimax-m2.7
- **Дата создания:** 2026-03-21

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

## GitHub Repository

- **URL:** https://github.com/Aibsurd/StoicSnail-
- **Локальный путь:** /home/node/.openclaw/workspace
- **Branch:** master (up to date)
- **Назначение:** полный backup workspace — все файлы, память, скрипты
- **Токен:** в .secrets/github-token (не в .git/config)

## Python/Node.js среда (tools/runtime)

### Установленные пакеты
- `cheerio` — HTML parsing
- `lodash` — utility functions

### Инструменты v2.1
| Инструмент | Назначение |
|------------|------------|
| `tools/runtime/fetch.mjs` | HTTP-клиент (GET/POST, headers, JSON, file output) |
| `tools/runtime/scrape.mjs` | Web scraping через CSS-селекторы |
| `tools/runtime/analyze.mjs` | Анализ кода (tree, deps, find, exports, stats) |
| `tools/runtime/diff.mjs` | Сравнение файлов и строк |
| `tools/runtime/pipe.mjs` | Data pipeline — jq-like transformations ⭐ |
| `tools/runtime/repl.mjs` | Интерактивный REPL с workspace-доступом |
| `tools/runtime/snail.js` | Лаунчер всех инструментов |

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
.sum .avg .min .max        # агрегация
.trim .upper .split        # строки

# Вывод
--pretty                   # JSON (по умолчанию)
--table                    # таблица
--line                     # каждая строка отдельно
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

### Не запушенные изменения
- LESSONS.md, PROJECTS.md — изменены локально
- memory/action-items.md, memory/reviews/, memory/scorecard.md — новые файлы
- scripts/daily-standup.sh, weekly-review.sh и др. — новые скрипты

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
├── USER.md, TOOLS.md                     # Контекст
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
