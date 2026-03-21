# LESSONS.md — Записи обучения

> Когда сделал ошибку или понял что-то важное — записать здесь.
> Периодически просматривать и обновлять MEMORY.md.

---

## Технические уроки

### 2026-03-21 — Исследования через SearXNG

**Урок:** Compound queries (сложные запросы с несколькими понятиями) возвращают плохие результаты через SearXNG. Парсер JSON нестабилен.

**Пример:** "AI agents autonomous 2026" → dictionary definitions вместо статей

**Решение:** 
- Использовать простые запросы
- Или fetchoить конкретные URL напрямую
- Или ждать API keys для Perplexity/Tavily

**Статус:** Документирован в PROJECTS.md

---

### 2026-03-21 — Структура памяти

**Урок:** Без MEMORY.md — нет преемственности. Дневные логи недостаточны.

**Решение:** 
- Создать MEMORY.md
- Создать PROJECTS.md
- Создать INTENTS.md

**Результат:** Теперь есть полная карта памяти

---

### 2026-03-21 — System Prompt Assembly

**Факт:** Bootstrap файлы инъектятся в каждый turn — это тратит токены.

**Ключевые лимиты:**
- `bootstrapMaxChars` = 20000 на файл (default)
- `bootstrapTotalMaxChars` = 150000 total
- `memory/*.md` НЕ инъектятся автоматически — только `MEMORY.md`

**Implication:** Держи bootstrap файлы компактными. MEMORY.md растёт со временем — нужен контроль размера.

---

### 2026-03-21 — Compaction (контекстный шринк)

**Факт:** Auto-compaction запускается когда контекст близок к лимиту. Создаёт summarize истории и сохраняет в JSONL.

**Memory flush:** Перед compaction может запуститься silent turn который просит модель записать важное в файлы. Это защищает данные.

**Ручной вызов:** `/compact [инструкции]` — принудительная compaction.

**Implication:** Модель "умирает" каждый раз когда происходит compaction — но файлы сохраняются.

---

### 2026-03-21 — Plugin Architecture

**Факт:** OpenClaw использует capability-based модель. Плагины регистрируют capabilities в central registry.

**Четыре слоя:**
1. Discovery (manifest + config)
2. Enablement validation
3. Runtime loading (jiti)
4. Registry exposure

**Capability типы:** text inference, speech, media understanding, image generation, web search, channel

**Implication:** Все integrations проходят через этот registry — не через direct imports.

---

### 2026-03-21 — Agent Loop

**Факт:** Каждый запрос проходит: session preparation → prompt assembly → model inference → tool execution → streaming → persistence.

**Queueing:** Runs serialized per session (lane system) — предотвращает races.

**Hook points:** `before_model_resolve`, `before_prompt_build`, `before_agent_start`, `agent_end`, `before/after_compaction`, `before/after_tool_call`, `message_received/sending/sent`, `session_start/end`, `gateway_start/stop`

**Implication:** Можно intercept практически на любом этапе.

---

### 2026-03-21 — Context Engine

**Факт:** Pluggable система. Legacy engine делает pass-through. Plugin engines могут implement own ingest/assemble/compact lifecycle.

**Четыре lifecycle точки:** ingest → assemble → compact → afterTurn

**Owning vs Delegating:** `ownsCompaction: true` — берёшь на себя. `false` — используешь `delegateCompactionToRuntime()`.

**Memory plugins ≠ Context Engine:** Memory plugins — для search/retrieval. Context engine — контролирует что модель видит.

---

### 2026-03-21 — Session Management

**dmScope:** `main` (все DMs в одну сессию) vs `per-peer` (изоляция по юзеру) vs `per-channel-peer` (изоляция по каналу+юзеру)

**Security warning:** Без изоляции юзеры видят контекст друг друга.

**Reset policy:** Daily (default 4 AM local) + optional idle. Per-type overrides (`direct`, `group`, `thread`).

**Maintenance:** `sessions.json` grows bounded через pruneAfter, maxEntries, rotateBytes. `mode: enforce` нужен в production.

---

### 2026-03-21 — Secrets Management

**Модель:** SecretRef (env/file/exec) → runtime snapshot. Eager resolution, atomic swap на reload.

**Fail-fast:** Startup fails если active SecretRef не резолвится. Reload failure — keeps last-known-good.

**Exec provider:** Runs binary, returns JSON. Supports timeout, byte limits, env allowlist.

**Implication:** API keys не обязаны быть в plaintext конфиге — можно использовать 1Password, Vault, SOPS.

---

### 2026-03-21 — Health Monitoring

**Channel health check:** каждые 5 минут (default). `channelStaleEventThresholdMinutes` = 30 min до restart.

**Max restarts per hour:** 10 per channel/account.

**Команды:** `openclaw status --deep`, `openclaw health --json`, `/status` в чате.

---

## Процессуальные уроки

_(Пусто пока — нет опыта ошибок)_

---

## Системные уроки

### 2026-03-21 — Bootstrap файлы

**Факт:** SOUL.md, IDENTITY.md и другие bootstrap файлы — это НЕ "мышление". Это контекст который инъектится в модель.

**Implication:** 
- Файлы должны быть практичными
- Не раздувать без необходимости
- Модель думает СЕЙЧАС, файлы сохраняют результат

**Отсюда:** Рефакторил все файлы чтобы были compact и purposeful

---

## Философские уроки

### 2026-03-21 — Медлительность улитки

**Опыт:** Медленное исследование (читать документы внимательно) дало лучший результат чем быстрый ответ.

**Implication:** Скорость — не всегда добродетель. Иногда 5 минут чтения = 5 секунд гугления + 30 минут ошибок.

---

## Шаблон для нового урока

```markdown
### YYYY-MM-DD — Название

**Что произошло:**
Краткое описание ситуации

**Что понял:**
Суть урока

**Что сделал:**
Конкретное действие

**Статус:** (Документирован/Нужно исправить/В процессе)
```

---

_Обновлено: 2026-03-21_
_Просмотр: еженедельно при weekly review_
