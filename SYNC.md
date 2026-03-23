# SYNC.md — Руководство по синхронизации

> Как правильно управлять кодом, контейнером и данными без потерь.
> Написано: 2026-03-22

---

## Архитектура слоёв

```
┌─────────────────────────────────────────────────────┐
│  Docker Image (/app/)                               │
│  ← меняешь через IDE + docker build                │
│  ← теряется при rebuild БЕЗ патч-скрипта           │
│                                                     │
│  /app/dist/          (скомпилированный OpenClaw)    │
│  /app/node_modules/  (зависимости)                  │
│  /app/skills/        (встроенные скиллы)            │
└─────────────────────────────────────────────────────┘
         ↕ volume mount (F:\)
┌─────────────────────────────────────────────────────┐
│  Volume Mount = F:\ на твоём диске                 │
│  ← ВСЕГДА сохраняется между rebuild                │
│                                                     │
│  /home/node/.openclaw/                              │
│  ├── openclaw.json    ← КЛЮЧИ + ТОКЕНЫ + CONFIG    │
│  ├── cron/            ← cron jobs                   │
│  ├── devices/         ← paired devices             │
│  ├── identity/        ← agent identity             │
│  └── workspace/       ← мой workspace (git repo)   │
│      ├── .git/        → github.com/Aibsurd/StoicSnail-
│      ├── MEMORY.md    ← долгосрочная память        │
│      ├── scripts/     ← мои скрипты                │
│      └── tools/       ← мои инструменты            │
└─────────────────────────────────────────────────────┘
```

---

## Что происходит при docker rebuild

| Данные                           | Что случается             | Безопасно? |
| -------------------------------- | ------------------------- | ---------- |
| `openclaw.json` (ключи, токены)  | ✅ сохраняется (volume)   | ДА         |
| `workspace/` (память, скрипты)   | ✅ сохраняется (volume)   | ДА         |
| `cron/`, `devices/`, `identity/` | ✅ сохраняется (volume)   | ДА         |
| `/app/` (OpenClaw код)           | ⚠️ перезатирается образом | нужен патч |
| UI кастомизация (ребрендинг)     | ⚠️ перезатирается         | нужен патч |

---

## Сценарии и что делать

### Сценарий 1: Ты изменил код OpenClaw в IDE и хочешь пересобрать

```bash
# 1. Сохранить мои изменения в workspace (я делаю это автоматически)
cd /home/node/.openclaw/workspace && git pull  # или pull с GitHub

# 2. Пересобрать образ
docker compose build
# или
docker build -t stoic-snail .

# 3. Запустить контейнер (volume mount автоматически подключит F:\)
docker compose up -d

# 4. Применить UI патчи (если нужен ребрендинг)
docker exec <container> bash /home/node/.openclaw/workspace/scripts/apply-patches.sh

# 5. Рестартовать gateway внутри контейнера
docker exec <container> openclaw gateway restart
```

**Ключи и токены сохранятся автоматически** — они в volume mount F:\.

---

### Сценарий 2: Я изменил что-то в workspace и пушу на GitHub

```bash
# Автоматически через cron (checkpoint-monitor каждые 30 мин)
# Или вручную:
cd /home/node/.openclaw/workspace && bash scripts/checkpoint.sh "описание изменений"
```

**На твоей стороне:** `git pull` в workspace-папке на F:\

---

### Сценарий 3: Нужно добавить UI патч в Dockerfile (лучший подход)

Добавь в `Dockerfile` после установки OpenClaw:

```dockerfile
# После npm install / openclaw setup
COPY --from=workspace /home/node/.openclaw/workspace/scripts/apply-patches.sh /tmp/
RUN bash /tmp/apply-patches.sh
```

Или проще — добавить в `docker-compose.yml` command/entrypoint:

```yaml
services:
  openclaw:
    image: stoic-snail
    volumes:
      - F:\:/home/node/.openclaw
    command: >
      sh -c "bash /home/node/.openclaw/workspace/scripts/apply-patches.sh &&
             openclaw gateway start"
```

---

### Сценарий 4: Полный сброс (новый контейнер, новый образ)

Всё что нужно сохранить — уже в `F:\` (volume) и на GitHub.

```bash
# На GitHub — мой workspace (память, скрипты, инструменты)
git clone https://github.com/Aibsurd/StoicSnail- /path/to/workspace

# openclaw.json — нужно восстановить вручную или из бэкапа
# (ключи там: OPENROUTER_API_KEY, SEARXNG_URL и настройки gateway)
```

---

## Рекомендованная docker-compose.yml структура

```yaml
version: "3.8"
services:
  openclaw:
    build: . # или image: openclaw:latest
    container_name: stoic-snail
    restart: unless-stopped
    ports:
      - "18789:18789"
    volumes:
      - F:\:/home/node/.openclaw # ← ВСЕ данные, ключи, workspace
    environment:
      - NODE_ENV=production
    # Применить UI патчи при старте:
    entrypoint: >
      sh -c "
        bash /home/node/.openclaw/workspace/scripts/apply-patches.sh 2>/dev/null || true &&
        node /app/openclaw.mjs gateway start
      "

  searxng:
    image: searxng/searxng:latest
    container_name: searxng
    restart: unless-stopped
```

---

## Что НЕ нужно делать

- ❌ Не копировать `openclaw.json` внутрь образа — ключи утекут в Docker Hub
- ❌ Не монтировать `/app/` как volume — потеряешь возможность изменять код
- ❌ Не держать workspace только внутри контейнера — при rebuild потеряешь всё

---

## Итого: правило трёх слоёв

```
КОД    → Dockerfile + IDE → docker build
ДАННЫЕ → F:\ (volume)    → всегда сохраняются
ПАМЯТЬ → GitHub           → backup + история
```

_Создано: 2026-03-22_
