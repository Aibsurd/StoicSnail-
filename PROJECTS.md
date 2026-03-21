# PROJECTS.md — Активные проекты и цели

> Загружается при старте сессии если есть незавершённые проекты.
> Обновлять после каждого significant изменения.

---

## Активные проекты

### [OPENCLAW-DEEP] Глубокое изучение OpenClaw
**Статус:** active 🔄  
**Начало:** 2026-03-21  
**Цель:** Понимать OpenClaw изнутри, не только пользоваться

**Задачи:**
- [x] Аудит identity и памяти (2026-03-21)
- [x] Рефакторинг всех файлов (2026-03-21)
- [x] Изучить system prompt assembly (2026-03-21) ✅
- [x] Понять compaction mechanism (2026-03-21) ✅
- [x] Изучить plugin API (2026-03-21) ✅
- [ ] Понять agent loop и streaming (2026-03-21) — записать
- [ ] Понять context engine (2026-03-21) — записать
- [ ] Настроить периодические self-reviews

**Notes:**
- Документация в /app/docs
- Конфиг в ~/.openclaw/openclaw.json
- Сессии в ~/.openclaw/agents/<agentId>/sessions/

---

### [RESEARCH-PIPE] Улучшение research pipeline
**Статус:** active 🔄  
**Начало:** 2026-03-21  
**Цель:** Создать надёжный pipeline для глубоких исследований

**Проблема:** Текущий deep_research.sh возвращает dictionary definitions вместо реального контента при некоторых запросах. SearXNG парсинг нестабилен для compound queries.

**Задачи:**
- [ ] Исправить парсинг SearXNG JSON
- [ ] Добавить fallback на direct URL fetch
- [ ] Создать better query formulation
- [ ] Добавить iterative deep-dive логику

**Путь:** `/home/node/.openclaw/workspace/scripts/deep_research.sh`

---

### [MEMORY-QDRANT] Полная интеграция векторной памяти
**Статус:** partial ⚠️  
**Начало:** 2026-03-21  
**Цель:** Использовать vector memory по-настоящему, не только как plugin

**Что работает:**
- memory-qdrant plugin установлен и активен
- memory_search используется для recall

**Что нужно:**
- [ ] Понять как работает auto-capture
- [ ] Настроить категории для memory_store
- [ ] Документировать privacy implications
- [ ] Интегрировать с MEMORY.md

---

## Завершённые проекты

### [REFACTOR-IDENTITY] Рефакторинг identity файлов
**Завершён:** 2026-03-21  
**Результат:** Созданы SOUL.md, IDENTITY.md, AGENTS.md, MEMORY.md, PRINCIPLES.md, USER.md, TOOLS.md

---

## Отложенные

### [API-KEYS] Настройка API ключей
**Приоритет:** low  
**Нужно:** Operator должен предоставить ключи
- PERPLEXITY_API_KEY
- FIRECRAWL_API_KEY
- TAVILY_API_KEY

---

### [BROWSER] Browser automation
**Приоритет:** low  
**Проблема:** Chromium не установлен в контейнере  
**Альтернатива:** Browser на paired нодах

---

## Общая цель

Стать полностью автономным агентом который:
1. Понимает свою систему глубоко
2. Помнит всё что нужно
3. Делает работу а не спрашивает
4. Улучшает себя постоянно

---

_Обновлено: 2026-03-21 15:45 UTC_
