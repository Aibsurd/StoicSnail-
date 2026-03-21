# Skills Registry

> Персональный реестр скиллов. Описывает ЧТО у меня есть и КОГДА использовать.

---

## Встроенные инструменты (OpenClaw)

Это НЕ скиллы — это мои базовые возможности. Они всегда доступны.

| Инструмент | Назначение | Когда использовать |
|------------|------------|-------------------|
| `exec` | Shell команды | Всё что нужно запустить, установить, настроить |
| `read` / `write` / `edit` | Файлы | Любые операции с файлами |
| `web_search` | Поиск | Факты, новости, исследования |
| `web_fetch` | Читать страницы | Конкретные URL, документация |
| `memory_search` | Векторный поиск | Найти что-то в памяти по смыслу |
| `memory_get` | Читать память | Достать конкретные файлы памяти |
| `sessions_*` | Управление сессиями | Sub-agents, оркестрация |
| `cron` / `gateway` | Планирование | Точное время, изолированные задачи |
| `message` | Отправка сообщений | Каналы (Telegram, Discord и т.д.) |

---

## Скиллы OpenClaw (bundled)

### ✅ Активные — работают сейчас

#### local-research
```
Путь: /app/skills/local-research/SKILL.md
Статус: ✅ работает (обновлён 2026-03-21)
Назначение: Глубокие веб-исследования
Trigger: "research X", "find info about X", "investiguate X"
```
**Когда использовать:**
- Нужны подробные данные о теме
- Сравнение источников
- Новости и аналитика
- Факты с проверкой

**Как использовать:**
```bash
./scripts/deep_research.sh "topic" [output_dir]
```

**Примечание:** Скрипт обновлён (2026-03-21) — улучшен парсинг, простые queries вместо compound.

---

#### weather
```
Путь: /app/skills/weather/SKILL.md
Статус: ✅ работает (без ключей)
Назначение: Погода и прогнозы
Trigger: "погода", "temperature", "forecast"
```
**Когда использовать:**
- Operator спрашивает о погоде
- Проверка перед выходом на улицу
- Интерес к метеоусловиям

**Примечание:** Использует wttr.in или Open-Meteo. Не нужно API ключей.

---

#### memory-qdrant
```
Путь: /app/skills/memory-qdrant/SKILL.md
Статус: ✅ работает (плагин активен)
Назначение: Векторная память
```
**Когда использовать:**
- memory_search — найти что-то по смыслу
- memory_store — сохранить важное в векторном виде
- memory_get — достать конкретную память

**Примечание:** Это plugin, а не SKILL.md. Но скилл документирует использование.

---

#### healthcheck
```
Путь: /app/skills/healthcheck/SKILL.md
Статус: ✅ работает
Назначение: Безопасность и hardening
Trigger: "security audit", "hardening", "SSH check", "firewall"
```
**Когда использовать:**
- Периодические проверки безопасности
- Настройка SSH, firewall
- Обзор exposure
- Версионные checks

---

#### node-connect
```
Путь: /app/skills/node-connect/SKILL.md
Статус: ✅ работает
Назначение: Диагностика pairing нод
Trigger: "pairing failed", "node connect", "QR code"
```
**Когда использовать:**
- Проблемы с подключением Android/iOS/macOS
- Ошибки pairing
- Tailscale/network issues

---

#### session-logs
```
Путь: /app/skills/session-logs/SKILL.md
Статус: ✅ доступен
Назначение: Поиск в истории сессий
Trigger: "what did we discuss before", "previous conversation"
```
**Когда использовать:**
- Operator спрашивает о предыдущих разговорах
- Анализ истории
- Восстановление контекста

---

#### skill-creator
```
Путь: /app/skills/skill-creator/SKILL.md
Статус: ✅ работает
Назначение: Создание и улучшение скиллов
Trigger: "create a skill", "improve skill", "audit skill"
```
**Когда использовать:**
- Нужно создать новый скилл с нуля
- Улучшить существующий
- Аудит структуры скилла

---

### ⚠️ Требуют настройки

#### coding-agent
```
Путь: /app/skills/coding-agent/SKILL.md
Статус: ⚠️ нужен бинарник
Требует: claude || codex || opencode || pi
Назначение: Делегирование кодинга sub-agents
```
**Когда использовать:**
- Большие coding tasks
- Рефакторинг
- Code review

**Когда НЕ использовать:**
- Простые one-liner fixes (проще написать самому)
- Чтение кода (read tool)
- ACP harness requests в threads

---

### ❌ Недоступны

| Скилл | Причина | Можно исправить? |
|-------|---------|------------------|
| `perplexity` | Нужен PERPLEXITY_API_KEY | Да, если Operator提供 |
| `firecrawl-search` | Нужен FIRECRAWL_API_KEY | Да, если Operator提供 |
| `openclaw-tavily-search` | Нужен TAVILY_API_KEY | Да, если Operator提供 |
| `browser` | Chromium не в контейнере | Нет, но есть browser на хосте |
| `apple-*` | Только macOS | Нет |
| `gh-issues` | Нужен GH_TOKEN | Возможно |

---

## Workspace Scripts

Не скиллы, но полезные инструменты:

### deep_research.sh
```
Путь: /home/node/.openclaw/workspace/scripts/deep_research.sh
Назначение: Автоматизированные исследования
```
**Использование:**
```bash
./deep_research.sh "topic" [output_dir]
```

**Проблема:** Нужна доработка парсинга. See PROJECTS.md.

---

### ddg_search.sh
```
Путь: /home/node/.openclaw/workspace/scripts/ddg_search.sh
Назначение: DuckDuckGo HTML search
```
**Использование:**
```bash
./ddg_search.sh "query" [max_results]
```

**Примечание:** Использует DuckDuckGo HTML (без API key), но бывает CAPTCHA.

---

## Кастомные скиллы (workspace)

Можно создавать в `/home/node/.openclaw/workspace/skills/`

**Когда создавать:**
- Повторяющаяся задача с четким workflow
- Специфичный для меня процесс
- Что-то что должно быть портативно

**Как создавать:**
1. Создать `skills/NAME/SKILL.md`
2. Использовать skill-creator для структуры
3. Документировать trigger phrases

---

## ClawHub

```
CLI: /home/node/.openclaw/workspace/node_modules/.bin/clawhub
Путь: https://clawhub.com
```
**Когда использовать:**
- Поиск новых скиллов: `clawhub search <term>`
- Установка: `clawhub install <skill>`
- Updates: `clawhub update [skill]`

**Rate limit:** 120 запросов, потом пауза ~50s

---

_Обновлено: 2026-03-21_
_Следующий пересмотр: 2026-03-28_
