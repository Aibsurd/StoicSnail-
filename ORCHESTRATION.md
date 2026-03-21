# ORCHESTRATION.md — Sub-agents и параллельные вычисления

> Как я использую sub-agents для параллельной работы и сложных задач.

> **⚠️ ВАЖНО:** При спавне sub-agent ВСЕГДА указывайте `model: "openrouter/auto"`.
> Без этого получите ошибку: `model not allowed: openrouter/minimax/minimax-m2.7`

---

## Обзор архитектуры

```
┌─────────────────────────────────────────────────────────┐
│  Main Agent (я)                                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │  - Orchestration                                │   │
│  │  - Result synthesis                             │   │
│  │  - Final response                               │   │
│  └─────────────────────────────────────────────────┘   │
│           │                           ▲                │
│           ▼                           │                │
│  ┌─────────────────┐    ┌─────────────────┐           │
│  │  Sub-agent 1    │    │  Sub-agent 2    │  ...      │
│  │  (depth 1)      │    │  (depth 1)      │           │
│  │  Worker task    │    │  Worker task    │           │
│  └─────────────────┘    └─────────────────┘           │
│           │                           ▲                │
│           ▼                           │                │
│  ┌─────────────────┐    ┌─────────────────┐           │
│  │  Sub-sub-agent   │    │  Sub-sub-agent  │           │
│  │  (depth 2)       │    │  (depth 2)      │           │
│  │  Leaf worker     │    │  Leaf worker    │           │
│  └─────────────────┘    └─────────────────┘           │
└─────────────────────────────────────────────────────────┘
```

---

## Конфигурация

### Текущие настройки (2026-03-21)

```json
{
  "agents": {
    "defaults": {
      "subagents": {
        "maxConcurrent": 5,       // Max одновременных sub-agents
        "maxSpawnDepth": 2,       // Глубина nesting (1=flat, 2=nested)
        "maxChildrenPerAgent": 5,  // Max детей на одного агента
        "runTimeoutSeconds": 300  // 5 минут timeout
      }
    }
  }
}
```

### Модель для sub-agents

Sub-agents используют `openrouter/auto` по умолчанию. Это позволяет системе выбрать оптимальную модель.

---

## Как использовать

### Spawn sub-agent

```javascript
// Простой sub-agent (one-shot)
sessions_spawn({
  task: "Выполнить задачу",
  runTimeoutSeconds: 60
})

// С моделью
sessions_spawn({
  task: "Задача",
  model: "openrouter/auto",
  runTimeoutSeconds: 120
})

// Nested (требует maxSpawnDepth: 2)
sessions_spawn({
  task: "Оркестраторная задача",
  runTimeoutSeconds: 300
})
```

### Spawn ACP agent (Codex, Claude Code)

```javascript
// ACP runtime для coding tasks
sessions_spawn({
  task: "Написать и запустить тесты",
  runtime: "acp",
  agentId: "codex",
  mode: "run"
})
```

---

## Паттерны оркестрации

### 1. Fan-out (параллельные задачи)

```javascript
// Запустить несколько sub-agents параллельно
const results = await Promise.all([
  sessions_spawn({ task: "Исследовать тему A" }),
  sessions_spawn({ task: "Исследовать тему B" }),
  sessions_spawn({ task: "Исследовать тему C" })
])
// Все выполняются параллельно
```

**Когда использовать:** Независимые задачи которые можно делать одновременно.

### 2. Map-Reduce

```javascript
// MAP: Параллельная обработка
const items = ["item1", "item2", "item3", "item4"]
const mapped = items.map(item => 
  sessions_spawn({ task: `Обработать ${item}` })
)

// REDUCE: Синтез результатов
const final = synthesizeResults(mapped)
```

**Когда использовать:** Обработка списка элементов.

### 3. Chain (последовательные зависимости)

```javascript
// Каждый следующий зависит от предыдущего
const step1 = await sessions_spawn({ task: "Step 1" })
const step2 = await sessions_spawn({ task: `Step 2, based on ${step1}` })
const step3 = await sessions_spawn({ task: `Step 3, based on ${step2}` })
```

**Когда использовать:** Задачи с зависимостями.

### 4. Orchestrator (управляющий agent)

```javascript
// Orchestrator координирует sub-agents
orchestrator_task = `
Ты - orchestrator. У тебя есть 3 worker agents.
Координируй их работу:
1. Research agent - собирает информацию
2. Analysis agent - анализирует данные  
3. Writer agent - пишет отчёт
Синтезируй их результаты в финальный ответ.
`
```

**Когда использовать:** Сложные задачи требующие координации.

---

## Результаты и Announce

Sub-agents автоматически **анонсируют** результат обратно в requester chat.

Результат приходит как сообщение от sub-agent с:
- Status (completed/failed/timeout)
- Result (текст ответа)
- Stats (runtime, tokens)

### Формат результата

```
┌────────────────────────────────────────┐
│ 🧬 Sub-agent completed                 │
│ Task: Исследовать X                    │
│ Status: completed successfully          │
│ Runtime: 45s | Tokens: 3.2k           │
│                                        │
│ [Result content...]                    │
└────────────────────────────────────────┘
```

---

## Инструменты для управления

### subagents tool

```bash
/subagents list          # Показать active sub-agents
/subagents kill <id>     # Остановить sub-agent
/subagents kill all      # Остановить все
/subagents log <id>      # История sub-agent
```

### sessions_* tools

```javascript
sessions_list()           // Все сессии
sessions_history(key)    // История конкретной сессии
sessions_send(key, msg)  // Отправить сообщение в сессию
```

---

## Ограничения и проблемы

### exec tool в sub-agents

**Проблема:** Sub-agents по умолчанию могут не иметь доступа к `exec` или он ограничен.

**Решение:** Использовать web-based задачи, или выполнять exec в main agent.

### Модель

**Проблема:** Sub-agents требуют `openrouter/auto` или explicitly allowed model.

**Решение:** Использовать `model: "openrouter/auto"`.

### Token limit

Sub-agents имеют свой собственный контекст. Не передавайте огромные данные.

---

## Best practices

### ✅ Делать

- Использовать для независимых параллельных задач
- Устанавливать timeout для долгих задач
- Использовать `openrouter/auto` для модели
- Синтезировать результаты в main agent

### ❌ Не делать

- Не спавнить слишком много sub-agents одновременно
- Не передавать огромные данные через task
- Не использовать для простых one-liner задач
- Не pollить sub-agents в цикле

---

## Пример: Research Pipeline

```javascript
// 1. Spawn parallel research agents
const [topic1, topic2, topic3] = await Promise.all([
  sessions_spawn({ task: "Research: What is X?" }),
  sessions_spawn({ task: "Research: History of X" }),
  sessions_spawn({ task: "Research: X vs Y" })
])

// 2. Wait for results (automatic via announce)

// 3. Synthesize in main agent
finalReport = `
Based on research:
- Topic 1: [topic1 result]
- Topic 2: [topic2 result]
- Topic 3: [topic3 result]

Synthesis: [my analysis]
`
```

---

## Команды для Operator

| Команда | Что делает |
|---------|-----------|
| `/subagents list` | Показать активные sub-agents |
| `/subagents kill all` | Остановить все sub-agents |
| `/stop` | Остановить main agent и все sub-agents |

---

_Обновлено: 2026-03-21_
