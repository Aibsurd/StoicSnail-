# 🐌 Stoic Snail — Restore Guide

> Пошаговое руководство по восстановлению из GitHub.

---

## Быстрый старт (5 минут)

### Если у вас уже есть OpenClaw и нужно только восстановить workspace:

```bash
cd ~/.openclaw/workspace
git pull origin master
./setup.sh
```

---

## Полное восстановление (сервер с нуля)

### Шаг 1: Установите OpenClaw

Следуйте официальной документации: https://docs.openclaw.ai/

```bash
# Пример для Linux:
curl -fsSL https://get.openclaw.ai | sh
```

### Шаг 2: Клонируйте репозиторий

```bash
# Если OpenClaw уже установлен и настроен:
git clone https://github.com/Aibsurd/StoicSnail-.git ~/.openclaw/workspace

# Если нет — сначала инициализируйте:
mkdir -p ~/.openclaw/workspace
cd ~/.openclaw/workspace
git init
git remote add origin https://github.com/Aibsurd/StoicSnail-.git
git pull origin master
```

### Шаг 3: Настройте конфигурацию

```bash
cd ~/.openclaw/workspace

# Скопируйте template
cp openclaw.template.json ~/.openclaw/openclaw.json

# Отредактируйте
nano ~/.openclaw/openclaw.json
```

**Замените placeholders:**

- `PLACEHOLDER_OPENROUTER_API_KEY` → ваш ключ с https://openrouter.ai
- `PLACEHOLDER_GATEWAY_TOKEN` → случайный токен (любой набор символов)

### Шаг 4: Установите зависимости

```bash
cd ~/.openclaw/workspace
npm install
```

### Шаг 5: Переустановите скиллы

```bash
# Основные скиллы (без API keys):
clawhub install memory-qdrant searxng

# Скиллы требующие API keys (нужны ваши ключи):
clawhub install perplexity firecrawl-search openclaw-tavily-search in-depth-research
```

### Шаг 6: Восстановите cron jobs (если были)

```bash
# Посмотреть доступные backups:
ls cron-backup/

# Импортировать:
./scripts/import-cron.sh cron-backup/YYYY-MM-DD_cron.txt
```

### Шаг 7: Проверьте

```bash
# Запустите диагностику
./scripts/vitals.sh

# Проверьте OpenClaw
openclaw doctor

# Проверьте git
git log --oneline -3
```

---

## Что хранится в GitHub

### ✅ Включено (публично)

- Все identity файлы (SOUL.md, IDENTITY.md, etc.)
- Скрипты (vitals.sh, weekly_review.sh, etc.)
- Template конфигураций
- Документация

### ❌ Исключено

- `node_modules/` — переустанавливается через `npm install`
- `.openclaw/` — содержит sensitive данные
- Логи, temporary файлы

---

## Sensitive данные — как безопасно хранить

### OpenClaw Config

**НИКОГДА НЕ КОММИТЬТЕ РЕАЛЬНЫЙ config!**

```bash
# Правильный workflow:
cp openclaw.json openclaw.json.backup        # backup
# ... работаем с config ...
git checkout openclaw.json                   # если случайно закоммитили
```

### API Keys

Храните локально, НЕ в git:

```bash
# В ~/.bashrc или ~/.zshrc:
export OPENROUTER_API_KEY="your-key-here"
export PERPLEXITY_API_KEY="your-key-here"

# Или используйте password manager
```

---

## Если что-то пошло не так

### "Git history содержит sensitive данные"

```bash
# Очистить историю (как мы делали):
git filter-branch --force --index-filter \
  'git rm -rf --cached --ignore-unmatch .openclaw/' \
  --prune-empty --tag-name-filter cat -- --all
git push --force
```

### "Setup.sh не работает"

```bash
# Проверьте:
node --version    # должен быть v18+
npm --version     # должен быть 8+
git --version     # должен быть 2+

# Сделайте скрипты executable:
chmod +x setup.sh restore-config.sh scripts/*.sh
```

### "OpenClaw не запускается"

```bash
# Проверьте config:
cat ~/.openclaw/openclaw.json | python3 -m json.tool > /dev/null
echo "Config valid: $?"

# Проверьте логи:
tail -50 ~/.openclaw/logs/*.log 2>/dev/null

# Restart:
openclaw gateway restart
```

---

## Структура директорий после восстановления

```
~/.openclaw/
├── workspace/              ← GitHub repo
│   ├── SOUL.md
│   ├── IDENTITY.md
│   ├── scripts/
│   ├── skills/
│   ├── memory/
│   ├── openclaw.template.json
│   └── setup.sh
│
├── openclaw.json          ← РЕАЛЬНЫЙ (НЕ в git)
├── agents/                ← OpenClaw internal
├── cron/                  ← OpenClaw cron internal
└── logs/                  ← Логи
```

---

## Контакты для помощи

- **Документация OpenClaw:** https://docs.openclaw.ai/
- **Stoic Snail GitHub:** https://github.com/Aibsurd/StoicSnail-
- **ClawHub (скиллы):** https://clawhub.com

---

_Обновлено: 2026-03-21_
