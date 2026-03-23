# RESILIENCE.md — Архитектура отказоустойчивости

> Как Stoic Snail обеспечивает живучесть системы.
> Принцип: "падали, но поднимались" — авионика для AI-агента.

---

## Философия

В авионике крупных авиалайнеров:

- **Тройное резервирование** — критические системы дублируются в 3 экземплярах
- **Изоляция отказов** — один отказ неcascadeится на другие системы
- **Fail-safe** — система переходит в безопасное состояние при отказе
- **Self-healing** — автоматическое восстановление без вмешательства человека

Для AI-агента это означает:

| Авионика           | AI-агент                         |
| ------------------ | -------------------------------- |
| Тройной redundancy | Model + Memory + State backup    |
| Изоляция           | Graceful degradation             |
| Health monitoring  | Heartbeat + cron checks          |
| Fail-safe          | Continue с degraded capabilities |
| Black box          | Git history + session JSONL      |

---

## Уровни защиты (Defense Layers)

### Layer 0: Model Redundancy

**Цель:** Не умереть если одна модель откажет.

**Архитектура:**

```
Primary:   openrouter/minimax/minimax-m2.7
Fallback1: openrouter/minimax/minimax-m2.5  (~$0.20/M, дешевле)
Fallback2: openrouter/auto                 (динамический роутинг)
```

**Что уже есть:**

- Auth profile rotation (cooldown при rate limit)
- Model fallback в config

**Что добавлено:**

- `agents.defaults.model.fallbacks` настроен на [M2.5, auto]

**Failover поведение:**

1. M2.7 fails (cooldown 1min → 5min → 25min → 1hr)
2. OpenClaw переходит на M2.5
3. M2.5 fails → переходит на auto (система сама выбирает рабочую модель)

**Recovery:** После cooldown периода модель возвращается в rotation.

---

### Layer 1: Memory Redundancy

**Цель:** Помнить всегда, даже если Qdrant упадёт.

**Архитектура:**

```
Layer 1: Qdrant vector DB (semantic search)
Layer 2: File-based memory (MEMORY.md, memory/*.md)
Layer 3: Git backup (ежедневно в 03:00 UTC)
```

**Что уже есть:**

- memory-qdrant plugin для semantic search
- Файловый MEMORY.md для долгосрочной памяти
- memory/YYYY-MM-DD.md для дневных логов
- Git backup в 03:00 UTC

**Graceful degradation:**

- Если Qdrant умирает → `memory_search` возвращает `disabled: true`
- Fallback: использовать `memory_get` для прямого чтения файлов
- Semantic search пропадает, но память остаётся

**Важно:** Qdrant — это **улучшение**, не единственный источник истины. Файлы — primary source.

---

### Layer 2: State Checkpointing

**Цель:** Не потерять работу при внезапной смерти сессии.

**Архитектура:**

```
Checkpoint triggers:
├── Каждые 30 минут активной работы (cron)
├── Перед каждой compaction
├── При завершении значимых задач
└── При изменении критических файлов
```

**Что уже есть:**

- Memory flush перед compaction
- Session JSONL persistence
- Git push в 03:00 UTC

**Что добавлено:**

- `scripts/checkpoint.sh` — быстрый git commit с автопушем
- Cron job: `checkpoint-monitor` каждые 30 минут

**Recovery сценарий:**

1. Сессия умирает (context loss)
2. При новой сессии: читаю MEMORY.md + memory/YYYY-MM-DD.md
3. Из git history могу восстановить предыдущие версии файлов
4. Session JSONL сохраняет историю разговоров

---

### Layer 3: Health Monitoring

**Цель:** Знать о проблемах до того как они станут фатальными.

**Архитектура:**

```
┌─────────────────────────────────────────────┐
│  Health Check (scripts/healthcheck.sh)       │
├─────────────────────────────────────────────┤
│  ✓ OpenClaw/Gateway status                  │
│  ✓ Workspace integrity                       │
│  ✓ Git repository state                       │
│  ✓ Disk/Memory resources                     │
│  ✓ Plugins (SearXNG, Qdrant)                │
│  ✓ Cron jobs status                         │
│  ✓ Security (tokens masked, .secrets exists) │
└─────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────┐
│  Self-Test (scripts/self-test.sh)            │
├─────────────────────────────────────────────┤
│  ✓ Critical files exist?                     │
│  ✓ Scripts executable + functional?          │
│  ✓ Git status clean?                         │
│  ✓ Resources OK (disk < 90%)?               │
│  ✓ Gateway alive?                            │
│  ✓ Remote accessible?                       │
└─────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────┐
│  Heartbeat (HEARTBEAT.md + cron)            │
├─────────────────────────────────────────────┤
│  • Периодический self-check                 │
│  • Alert при критических проблемах          │
│  • Self-healing триггеры                    │
└─────────────────────────────────────────────┘
```

**Что уже есть:**

- `scripts/healthcheck.sh` — полная проверка системы

**Что добавлено:**

- HEARTBEAT.md с задачами мониторинга
- Cron job: `health-monitor` каждые 2 часа
- Alert в память при обнаружении проблем

---

### Layer 4: Graceful Degradation Matrix

| Component   | Healthy          | Degraded              | Failed                    |
| ----------- | ---------------- | --------------------- | ------------------------- |
| **Model**   | M2.7             | M2.5                  | auto                      |
| **Memory**  | Qdrant + Files   | Files only            | Memory get only           |
| **Search**  | SearXNG          | web_fetch             | manual curl               |
| **Git**     | Working + pushed | Working, pending push | Local only                |
| **Session** | Full context     | Compacted             | Reset, recover from files |

**Принцип:** Никогда не die полностью. Всегда есть fallback.

---

## Self-Healing Procedures

### Автоматический checkpoint

```
Каждые 30 минут:
1. Проверить workspace на uncommitted changes
2. Если есть → git add + commit + push
3. Записать в memory/YYYY-MM-DD.md "checkpoint: OK"
```

### При обнаружении проблемы:

```
1. Записать проблему в memory/YYYY-MM-DD.md
2. Попытаться исправить если возможно
3. Если нельзя исправить → alert Operator
4. Продолжить работу в degraded mode
```

### Recovery последовательность:

```
1. Сессия умерла
2. Новая сессия → читаю MEMORY.md
3. Читаю memory/YYYY-MM-DD.md (последний день)
4. Проверяю git log на предмет незапушенных изменений
5. Восстанавливаю контекст из файлов
6. Продолжаю работу
```

---

## Cron Jobs (отказоустойчивость)

| Job                    | Schedule         | Purpose                |
| ---------------------- | ---------------- | ---------------------- |
| `daily-workspace-sync` | 03:00 UTC        | Полный git push        |
| `checkpoint-monitor`   | каждые 30 мин    | Инкрементальный backup |
| `health-monitor`       | каждые 2 часа    | System health check    |
| `weekly-review`        | Monday 09:00 UTC | Self-review            |

---

## Alert Thresholds

| Metric               | Warning | Critical      |
| -------------------- | ------- | ------------- |
| Disk                 | >80%    | >90%          |
| Memory               | >80%    | >90%          |
| Context usage        | >70%    | >85%          |
| Git uncommitted      | >24h    | >48h          |
| Failed health checks | 1       | 3 consecutive |

---

## Testing

Периодически (раз в неделю) проверять:

1. Model failover —手动 switch to backup model
2. Memory degradation — kill Qdrant, verify file fallback
3. Recovery — simulate session death, verify memory intact
4. Checkpoint — verify git history contains expected state

---

_Обновлено: 2026-03-21 20:10 UTC_
