# HEARTBEAT.md — Периодические задачи самопроверки

> Эти задачи выполняются автоматически через cron или heartbeat.
> Действия записываются в memory/YYYY-MM-DD.md.

## Мониторинг (active)

### checkpoint-monitor (каждые 30 минут)

**Триггер:** Каждые 30 минут
**Действие:**

1. Проверить `git status` на uncommitted changes
2. Если есть → `./scripts/checkpoint.sh`
3. Записать "checkpoint: OK" в лог если был commit

### health-monitor (каждые 2 часа)

**Триггер:** Каждые 2 часа
**Действие:**

1. Запустить `scripts/healthcheck.sh`
2. Проверить результаты:
   - Gateway alive?
   - Disk > 90%?
   - Git clean?
   - Plugins enabled?
3. Если проблема → записать в memory/YYYY-MM-DD.md + alert

### self-test (ежедневно в 09:00 UTC)

**Триггер:** Ежедневно в 09:00 UTC
**Действие:**

1. Запустить `scripts/self-test.sh`
2. Проверить результаты:
   - Все critical files exist?
   - Scripts executable?
   - Git clean?
   - Resources OK (disk < 90%)?
3. Если FAIL → записать в memory/YYYY-MM-DD.md + alert

### daily-workspace-sync (03:00 UTC)

**Триггер:** Ежедневно в 03:00 UTC
**Действие:**

1. git add + commit + push
2. Проверить remote sync

## Сценарии восстановления

### Сценарий 1: Модель отказала

**Симптомы:** Cooldown на primary model
**Действие:** OpenClaw автоматически переключается на fallback
**Recovery:** Модель возвращается после cooldown

### Сценарий 2: Qdrant упал

**Симптомы:** memory_search возвращает disabled: true
**Действие:** Переключиться на memory_get напрямую
**Recovery:** Qdrant рестартует автоматически (если в Docker)

### Сценарий 3: Git не синхронизирован

**Симптомы:** Uncommitted changes > 24h
**Действие:** checkpoint-monitor создаёт коммит
**Recovery:** manual intervention если cron не работает

### Сценарий 4: Сессия умерла

**Симптомы:** Context loss при новой сессии
**Действие:**

1. Читать MEMORY.md + memory/YYYY-MM-DD.md
2. Восстановить контекст из git history если нужно
3. Продолжить работу

## Alert thresholds

| Metric          | Warning | Critical |
| --------------- | ------- | -------- |
| Disk usage      | >80%    | >90%     |
| Memory          | >80%    | >90%     |
| Context         | >70%    | >85%     |
| Git gap         | >24h    | >48h     |
| Health failures | 1       | 3        |

## Cron Jobs

```
checkpoint-monitor   */30 * * * *  → scripts/checkpoint.sh
health-monitor       0 */2 * * *    → scripts/healthcheck.sh
daily-self-test      0 9 * * *     → scripts/self-test.sh
daily-workspace-sync 0 3 * * *     → scripts/auto-sync.sh
```
