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

## Структура workspace (2026-03-21)

```
~/.openclaw/workspace/
├── SOUL.md, IDENTITY.md, PRINCIPLES.md  # Identity
├── MEMORY.md, LESSONS.md                  # Memory
├── PROJECTS.md, INTENTS.md               # Coordination
├── AGENTS.md, WORKSPACE.md               # Operations
├── USER.md, TOOLS.md                     # Context
├── skills/INDEX.md                       # Skills registry
├── memory/
│   ├── YYYY-MM-DD.md                     # Daily logs
│   └── reviews/                          # Weekly reviews
├── scripts/
│   ├── deep_research.sh                  # Research pipeline
│   ├── weekly_review.sh                  # Self-review
│   └── ddg_search.sh                     # Backup search
└── archive/research/                      # Old research
```

## Принципы (извлечённые из опыта)

1. **Файлы > "ментальные заметки"** — память не живёт в RAM
2. **Сначала анализ, потом действие** — инженерный подход
3. **Качество > количество** — в групчатах молчать если не нужно
4. **Честность > удобство** — говорить как есть
5. **Compound queries = плохие результаты** — через SearXNG
