# 🐌 Stoic Snail — GitHub LTS Backup

> Полная документация по бэкапу и восстановлению.

---

## Архитектура бэкапа

### Что на GitHub (публично/приватно)

| Компонент | Файл/Папка | sensitive? |
|-----------|-----------|------------|
| Identity файлы | `*.md` в корне | ❌ |
| Скрипты | `scripts/` | ❌ |
| Skills registry | `skills/INDEX.md` | ❌ |
| Память | `memory/` | ❌ |
| Архив | `archive/` | ❌ |
| OpenClaw config | **ТОЛЬКО template** | ⚠️ |

### Что НЕ на GitHub

| Компонент | Причина |
|-----------|---------|
| `node_modules/` | Переустанавливается через `npm install` |
| `.openclaw/` | Содержит API keys, tokens |
| Логи | Не нужны для восстановления |
| Временные файлы | Не нужны |

---

## Sensitive данные — template система

### OpenClaw Config

**Файл:** `openclaw.template.json`

Это **ШАБЛОН** с placeholders. При восстановлении нужно вставить реальные значения.

**Placeholders:**
```
YOUR_OPENROUTER_API_KEY    → Реальный ключ OpenRouter
YOUR_GATEWAY_TOKEN         → Реальный gateway token
YOUR_SEARXNG_URL          → URL SearXNG (если отличается)
```

**НЕ включённые поля (требуют ручной настройки):**
- `env.vars.OPENROUTER_API_KEY` — критично
- `gateway.auth.token` — критично
- `plugins.entries.*.config` — могут содержать ключи

---

## Структура файлов для LTS

```
StoicSnail-/
├── # Identity (публично)
├── SOUL.md
├── IDENTITY.md
├── PRINCIPLES.md
├── ...
│
├── # Scripts (публично)
├── setup.sh              ← Главный скрипт восстановления
├── restore-config.sh     ← Восстановление OpenClaw config
├── export-cron.sh        ← Экспорт cron jobs
├── import-cron.sh        ← Импорт cron jobs
│
├── # Templates (публично)
├── openclaw.template.json
│
├── # Documentation
├── README.md
├── GITHUB_BACKUP.md      ← Этот файл
├── RESTORE_GUIDE.md      ← Пошаговое восстановление
│
└── # Credentials (приватно, НЕ в git)
└── .secrets/             ← Реальные ключи (не коммитится)
```

---

## Процесс backup

### Автоматический (по cron)

```bash
# Каждый день в 03:00 UTC
0 3 * * * cd ~/.openclaw/workspace && git add -A && git commit -m "Auto-backup $(date +\%Y-\%m-\%d)" && git push
```

### Ручной

```bash
cd ~/.openclaw/workspace
git add -A
git commit -m "Backup: что изменилось"
git push
```

### Экспорт cron jobs

```bash
./scripts/export-cron.sh
```

---

## Процесс восстановления

### Полное восстановление

```bash
# 1. Клонировать репозиторий
git clone https://github.com/Aibsurd/StoicSnail-.git ~/.openclaw/workspace

# 2. Перейти в директорию
cd ~/.openclaw/workspace

# 3. Запустить setup
./setup.sh
```

### Что делает `setup.sh`

1. Проверяет зависимости (node, npm)
2. Устанавливает npm пакеты
3. Копирует template config → real config
4. Запрашивает реальные значения (API keys)
5. Показывает инструкции по настройке cron
6. Инициализирует git (если не клонирован)

---

## Sensitive файлы — как обращаться

### OpenClaw Config

**НИКОГДА НЕ КОММИТИТЬ РЕАЛЬНЫЙ `openclaw.json`!**

```bash
# Вместо этого:
# 1. Создать template
./scripts/create-template.sh

# 2. Отредактировать template (заменить placeholders)
nano openclaw.template.json

# 3. При восстановлении:
./scripts/restore-config.sh openclaw.template.json
```

### API Keys

Хранить в:
- Password manager
- Environment variables
- `.secrets/` директория (не в git)

**НИКОГДА НЕ КОММИТИТЬ РЕАЛЬНЫЕ КЛЮЧИ!**

---

## Установленные скиллы (на 2026-03-21)

```
perplexity          — требует PERPLEXITY_API_KEY
firecrawl-search    — требует FIRECRAWL_API_KEY
deep-research-pro   — требует API key
web-scraping        — требует API key
openclaw-tavily-search — требует TAVILY_API_KEY
in-depth-research   — требует API key
ollama-memory-embeddings — локальный
memory-qdrant       — локальный (плагин)
searxng             — локальный (плагин)
```

Для полного восстановления нужно переустановить скиллы:
```bash
clawhub install <skill-name>
```

---

## GitHub Issues — трекинг проектов

Мои проекты отслеживаются как GitHub Issues:

| Issue | Название | Статус |
|-------|---------|--------|
| #1 | OPENCLAW-DEEP: Изучение OpenClaw изнутри | open |
| #2 | MEMORY-QDRANT: Интеграция векторной памяти | open |
| #3 | API-KEYS: Настройка API ключей | open |

**Управление:**
```bash
./gh-manage.sh list [open|closed|all]
./gh-manage.sh show <number>
./gh-manage.sh create "Title" "Body" '"label"'
./gh-manage.sh close <number>
```

---

## Auto-Sync

Ежедневный sync в GitHub в 03:00 UTC через OpenClaw cron:
```bash
./scripts/auto-sync.sh
```

Cron job: `daily-workspace-sync` (OpenClaw internal)

**Управление cron:**
```bash
./scripts/setup-cron.sh enable|disable|status
```

---

## Проверка статуса

```bash
# Проверить что на GitHub
git log --oneline -3

# Проверить локальное состояние
./scripts/vitals.sh

# Проверить sensitive данные
git log --all -p | grep -E "(api_key|token|password)" | head -5
# Должно быть 0 результатов
```

---

## Восстановление из полного сбоя

### Сценарий: Сервер умер, всё потеряно

1. **Установить OpenClaw заново**
   ```bash
   # Следуйте инструкциям OpenClaw
   ```

2. **Клонировать workspace**
   ```bash
   git clone https://github.com/Aibsurd/StoicSnail-.git ~/.openclaw/workspace
   cd ~/.openclaw/workspace
   ```

3. **Запустить setup**
   ```bash
   ./setup.sh
   ```

4. **Ввести credentials**
   - OPENROUTER_API_KEY
   - Gateway token
   - Другие API keys по необходимости

5. **Восстановить cron**
   ```bash
   ./scripts/import-cron.sh
   ```

6. **Переустановить скиллы**
   ```bash
   clawhub install perplexity firecrawl-search openclaw-tavily-search in-depth-research
   ```

7. **Проверить**
   ```bash
   ./scripts/vitals.sh
   openclaw doctor
   ```

---

## Роли и права

| Файл | Может видеть | Может редактировать |
|------|--------------|---------------------|
| Identity файлы | Все | Operator, я |
| Scripts | Все | Operator, я |
| Template configs | Все | Operator, я |
| README | Все | Operator, я |
| **Реальный openclaw.json** | **Только Operator** | **Только Operator** |

---

## Troubleshooting

### "В GitHub есть sensitive данные!"

```bash
# Проверить
git log --all -p | grep -E "(sk-or|ghp_|zts37)" 

# Если нашли — очистить историю (как мы делали)
git filter-branch ...
git push --force
```

### "Setup.sh не работает"

```bash
# Проверить зависимости
node --version
npm --version
git --version

# Проверить права
ls -la setup.sh
```

### "Cron jobs не восстанавливаются"

```bash
# Посмотреть текущие cron
crontab -l

# Экспортировать заново
./scripts/export-cron.sh
```

---

_Обновлено: 2026-03-21_
_Автор: Stoic Snail 🐌_
