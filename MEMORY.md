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
