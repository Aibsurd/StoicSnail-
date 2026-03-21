# COGNEXUS: Advanced Cognitive Architecture for OpenClaw

> **Философия**: Построить "нервную систему" для AI-агентов — систему которая думает о том как думает, учится учиться, и становится умнее с каждым взаимодействием. Не инструмент. Не плагин. Экосистема.

---

## Контекст: что уже есть

OpenClaw предоставляет:
- ✅ Agent loop с queue-based serialization
- ✅ Pluggable context engine (legacy → plugin)
- ✅ Session persistence (JSONL transcripts + sessions.json)
- ✅ Memory system (Markdown + vector search через Qdrant)
- ✅ Hooks в каждой точке жизненного цикла
- ✅ Subagent orchestration (maxConcurrent, maxSpawnDepth)
- ✅ Tool policy + sandboxing
- ✅ Multi-agent routing
- ✅ Streaming + block replies
- ✅ Compactation с memory flush

**Этого достаточно чтобы построить полноценную когнитивную архитектуру.**

---

## Концепция: что можно построить

### 1. Context Engine как " операционная память" (CogneXus Engine)

Вместо legacy engine — **AI-native memory hierarchy**:

```
┌─────────────────────────────────────────────┐
│           WORKING MEMORY (WM)              │  ← Current session, attention window
│  ┌───────────────────────────────────────┐  │
│  │  Attention Weights  │  Active Context │  │
│  │  ┌──────────┐ ┌──────────┐           │  │
│  │  │ Query    │ │ Working  │           │  │
│  │  │ Vec      │ │ Set      │           │  │
│  │  └──────────┘ └──────────┘           │  │
│  └───────────────────────────────────────┘  │
│                     ↑                       │
│            ┌────────┴────────┐              │
│            │  SEMANTIC BRIDGE │            │  ← Cross-session embedding lookup
│            └────────┬────────┘              │
│                     ↓                       │
├─────────────────────────────────────────────┤
│          EPISODIC MEMORY (EM)              │  ← Session summaries, compacted history
│  ┌───────────────────────────────────────┐  │
│  │  Compaction Graph │ Session Links     │  │
│  │  Temporal Context  │ Importance Score │  │
│  └───────────────────────────────────────┘  │
│                     ↑                       │
│            ┌────────┴────────┐              │
│            │   PATTERN LAYER  │            │  ← Cross-session pattern detection
│            └────────┬────────┘              │
│                     ↓                       │
├─────────────────────────────────────────────┤
│          SEMANTIC MEMORY (SM)              │  ← Long-term, importance-weighted
│  ┌───────────────────────────────────────┐  │
│  │  MEMORY.md  │  daily logs  │ archive │  │
│  │  Embeddings │  Importance │ Access   │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

**Ключевые инновации:**

- **Importance Scoring**: Каждое воспоминание имеет score (0-1), модифицируемый по:
  - Доступ frequency (recency-weighted)
  - Эмоциональная значимость (через анализ текста)
  - Практическая ценность (через feedback loops)
  - Referred concepts (cross-reference counting)

- **Attention-Based Retrieval**: Вместо простого semantic search — retrieval как attention mechanism
  - Query embedding → attention над всеми memory chunks
  - Top-k selection с diversity bonus
  - Temporal decay с configurable half-life

- **Working Set Management**: Автоматическое выделение "hot" и "cold" данных
  - Hot: recently accessed, high importance
  - Cold: archived, low importance, can be recomputed

### 2. Parallel Thinking System (Deliberate)

Subagents как **parallel cognition units**:

```
┌──────────────────────────────────────────────────────┐
│                 DELIBERATE ORCHESTRATOR              │
│                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │  EXPLORER   │  │   ANALYST   │  │  CHALLENGER  │ │
│  │  "What if   │  │  "What's    │  │  "What could │ │
│  │   we do X?" │  │   the data  │  │   go wrong?" │ │
│  │             │  │   say?"     │  │              │ │
│  │ [subagent]  │  │ [subagent]  │  │  [subagent]  │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘ │
│         └────────────────┼────────────────┘         │
│                          ↓                          │
│              ┌───────────────────┐                  │
│              │  CONSENSUS ENGINE  │                  │
│              │  - Vote aggregation │                  │
│              │  - Confidence score │                  │
│              │  - Dissent analysis │                  │
│              └─────────┬──────────┘                  │
│                        ↓                             │
│              ┌───────────────────┐                  │
│              │  SYNTHESIZED VIEW │                  │
│              │  [Final response]  │                  │
│              └───────────────────┘                  │
└──────────────────────────────────────────────────────┘
```

**Personas для subagents:**
- `explorer`: creative, what-if scenarios, analogies
- `analyst`: data-driven, evidence-focused, skeptical
- `challenger`: devil's advocate, finds flaws, stress-tests
- `historian`: draws from past experiences, pattern matching
- `ethicist`: moral implications, stakeholder impact

### 3. Self-Evolution Engine

Автономное улучшение через мета-познание:

```
┌────────────────────────────────────────────────────┐
│              SELF-EVOLUTION LOOP                   │
│                                                    │
│  ┌─────────────────────────────────────────────┐  │
│  │            REFLECTION ENGINE                │  │
│  │  - Analyze session transcripts post-run    │  │
│  │  - Identify successful strategy patterns    │  │
│  │  - Detect failures and their causes         │  │
│  │  - Score own performance                   │  │
│  └─────────────────────┬───────────────────────┘  │
│                        ↓                          │
│  ┌─────────────────────────────────────────────┐  │
│  │            PATTERN EXTRACTOR               │  │
│  │  - What worked in similar contexts?         │  │
│  │  - What didn't?                              │  │
│  │  - New skills/knowledge detected?           │  │
│  └─────────────────────┬───────────────────────┘  │
│                        ↓                          │
│  ┌─────────────────────────────────────────────┐  │
│  │            IDENTITY UPDATER                │  │
│  │  - Update SOUL.md with new insights         │  │
│  │  - Refine AGENTS.md with effective methods  │  │
│  │  - Adjust HEARTBEAT.md priorities           │  │
│  │  - Expand CAPABILITIES.md                   │  │
│  └─────────────────────┬───────────────────────┘  │
│                        ↓                          │
│  ┌─────────────────────────────────────────────┐  │
│  │            VERIFICATION LOOP                │  │
│  │  - Test updated identity in next sessions   │  │
│  │  - Track if changes improve outcomes        │  │
│  │  - Rollback if degradation detected         │  │
│  └─────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────┘
```

**Self-model components:**

- `self-model.json`: Текущая модель себя ( capabilities, limitations, preferred approaches)
- `evolution-log.md`: История изменений и их impact
- `skill-inventory.md`: Что умею, уровень mastery
- `pattern-cache/`: Выявленные паттерны успешного поведения

### 4. Task Graph Executor (Flow)

DAG-based workflow decomposition:

```
                    ┌─────────────────┐
                    │   TASK ROOT     │
                    │  "Build a web   │
                    │   scrapper"    │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ↓              ↓              ↓
     ┌────────────┐  ┌────────────┐  ┌────────────┐
     │ ANALYZE    │  │ DESIGN     │  │ SETUP      │
     │ website    │  │ structure  │  │ tools      │
     │ [subagent] │  │ [subagent] │  │ [subagent] │
     └─────┬──────┘  └─────┬──────┘  └─────┬──────┘
           │               │               │
           └───────────────┼───────────────┘
                           ↓
                  ┌─────────────────┐
                  │   CODE GEN      │
                  │  [main agent]   │
                  └────────┬────────┘
                           │
              ┌────────────┼────────────┐
              ↓           ↓            ↓
     ┌────────────┐ ┌────────────┐ ┌────────────┐
     │  TEST     │ │  REFINE    │ │  DOCUMENT  │
     │  [agent]  │ │  [agent]   │ │  [agent]   │
     └────────────┘ └────────────┘ └────────────┘
```

**Flow engine features:**
- Parallel execution where dependencies allow
- Real-time status tracking
- Automatic retry with exponential backoff
- Result aggregation and conflict resolution
- Human-in-the-loop for critical decisions

### 5. Analytics & Visualization Dashboard

Real-time cognitive monitoring:

```
┌──────────────────────────────────────────────────────────────────┐
│                     COGNEXUS DASHBOARD                           │
├────────────────┬───────────────────┬────────────────────────────┤
│  COGNITION     │   MEMORY          │    TASKS                  │
│  ──────────    │   ─────           │    ─────                   │
│                │                   │                            │
│  ┌──────────┐  │  ┌─────────────┐ │  ┌────────────────────┐   │
│  │ Context  │  │  │ WM: 45KB    │ │  │ Active: 3          │   │
│  │ ██████░░ │  │  │ EM: 234KB   │ │  │ Pending: 12        │   │
│  │ 68%      │  │  │ SM: 1.2MB   │ │  │ Blocked: 2        │   │
│  └──────────┘  │  └─────────────┘ │  └────────────────────┘   │
│                │                   │                            │
│  Tokens/min    │  Importance dist  │    Flow DAG visualization  │
│  ▃▅▇▅▃▅▇▅▃    │  ▁▂▃▄▅▆▇█▇▆▅▄▃   │    ┌─┐                    │
│  125K/hr       │  Avg: 0.47        │    │●│→┌─┐→┌─┐            │
│                │                   │    └─┘ │ │ └─┘            │
│                │  ┌─────────────┐  │         │ ▼                │
│                │  │ Hot: 23     │  │       ┌─┴─┐                │
│                │  │ Cold: 891   │  │       │ ● │                │
│                │  └─────────────┘  │       └───┘                │
├────────────────┴───────────────────┴────────────────────────────┤
│  SESSIONS                                                      │
│  ────────────────────────────────────────────────────────────  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Session: agent:main:telegram:direct:+1234567890          │  │
│  │ Started: 14:23 UTC  │  Turns: 47  │  Compactions: 2      │  │
│  │ ████████████████████████████░░░░░░░░░░░░░░ 71% context  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Evolution: +3 successful adaptations this week                  │
│  Top patterns: [research synthesis] [code architecture]          │
└──────────────────────────────────────────────────────────────────┘
```

### 6. Skills Marketplace (SkillForge)

Automatic skill synthesis and management:

- **Skill Detection**: Analyze what tools/approaches work well for specific task types
- **Skill Synthesis**: Generate new SKILL.md files from proven patterns
- **Version Control**: Track skill evolution over time
- **Auto-deployment**: New skills automatically available in context

---

## Архитектура файлов

```
~/.openclaw/workspace/
├── # COGNEXUS CORE
├──agnexus/
│   ├── ENGINE/                    # Context Engine Plugin
│   │   ├──agnexus-engine.ts       # Main plugin entry
│   │   ├── memory-hierarchy.ts     # WM/EM/SM implementation
│   │   ├── importance-scorer.ts    # Scoring algorithm
│   │   ├── attention-retrieval.ts   # Attention-based retrieval
│   │   └── patterns.ts             # Pattern detection
│   │
│   ├── DELIBERATE/                 # Parallel Thinking
│   │   ├──orchestrator.ts          # Main orchestrator
│   │   ├── personas/               # Subagent personas
│   │   │   ├── explorer.ts
│   │   │   ├── analyst.ts
│   │   │   ├── challenger.ts
│   │   │   ├── historian.ts
│   │   │   └── ethicist.ts
│   │   ├── consensus.ts            # Vote aggregation
│   │   └── synthesizer.ts         # View synthesis
│   │
│   ├── EVOLUTION/                  # Self-Evolution
│   │   ├── reflector.ts            # Session analysis
│   │   ├── pattern-extractor.ts     # Pattern detection
│   │   ├── identity-updater.ts      # Self-modification
│   │   └── verifier.ts              # Change verification
│   │
│   ├── FLOW/                       # Task Graph Executor
│   │   ├── executor.ts             # DAG execution
│   │   ├── decomposer.ts           # Task decomposition
│   │   ├── dependency-resolver.ts  # Dependency analysis
│   │   └── aggregator.ts           # Result aggregation
│   │
│   ├── ANALYTICS/                  # Dashboard Backend
│   │   ├── collector.ts           # Metrics collection
│   │   ├── aggregator.ts           # Data aggregation
│   │   └── api-server.ts           # HTTP API for dashboard
│   │
│   ├── DASHBOARD/                  # Web Dashboard
│   │   ├── index.html
│   │   ├── app.js
│   │   └── styles.css
│   │
│   └── CONFIG/
│       ├──agnexus.json             # Configuration
│       └── defaults.json           # Default settings
│
├── # MEMORY & DATA
├──agnexus-memory/                 # Working memory
│   ├── working-set.json           # Current hot data
│   ├── episodic/                  # EM stores
│   │   └── sessions/
│   └── patterns/                  # Detected patterns
│
├── # SKILLS
├── skills/
│   └──agnexus/                    # CogneXus skills
│       ├── deliberate.md           # How to use parallel thinking
│       ├── flow.md                # Task graph execution
│       └── evolve.md              # Self-evolution guide
│
└── # MONITORING
├── logs/
│   └──agnexus/                    # CogneXus logs
│       ├── evolution.log
│       ├── deliberation.log
│       └── performance.log
```

---

## Реализация: пошаговый план

### Phase 1: Foundation (этот документ + базовая структура)

### Phase 2: Context Engine Plugin
1. Создать plugin manifest
2. Реализовать memory hierarchy (WM/EM/SM)
3. Добавить importance scoring
4. Интегрировать с existing memory system
5. Тестировать на реальных сессиях

### Phase 3: Parallel Thinking System
1. Создать subagent orchestration layer
2. Реализовать personas
3. Построить consensus engine
4. Интегрировать с agent loop via hooks
5. Dashboard visualization

### Phase 4: Self-Evolution Engine
1. Session analysis pipeline
2. Pattern extraction
3. Identity modification system (с safety rails)
4. Verification loop
5. Evolution logging

### Phase 5: Task Flow Executor
1. DAG representation
2. Parallel execution engine
3. Dependency resolution
4. Human-in-the-loop integration
5. Result aggregation

### Phase 6: Analytics Dashboard
1. Metrics collection
2. Real-time API
3. Web dashboard
4. Alerting system
5. Historical analysis

---

## Безопасность и Safety Rails

### Hard Limits (неизменяемы)
1. **Никаких изменений SOUL.md без верификации** — изменения проходят review cycle
2. **Никакого self-modification без backup** — git commit перед каждым изменением identity files
3. **Изоляция evalutation** — self-evolution работает в отдельном subagent
4. **Rollback capability** — любое изменение обратимо
5. **Audit trail** — полный лог всех self-modifications

### Soft Limits (конфигурируемые)
1. Частота evolution cycles
2. Порог significance для изменений
3. Maximum self-modification per session
4. Scope of changes (что можно менять, что нельзя)

---

## Technical Approach

### Plugin Architecture
- Все системы как OpenClaw plugins
- Используют существующие hooks: `before_prompt_build`, `after_agent_end`, `before_compaction`
- Нет модификации core кода

### Context Engine Contract
```typescript
interface CogneXusEngine {
  info: {
    id: "cognexus";
    name: "CogneXus Advanced Memory";
    ownsCompaction: true;
  };
  
  async ingest({ sessionId, message, isHeartbeat }): Promise<{ ingested: boolean; importance?: number }>;
  
  async assemble({ sessionId, messages, tokenBudget }): Promise<{
    messages: Message[];
    estimatedTokens: number;
    systemPromptAddition?: string;
    workingSetStats?: WorkingSetStats;
  }>;
  
  async compact({ sessionId, force }): Promise<{ ok: boolean; compacted: boolean }>;
  
  // New methods for advanced features
  async scoreImportance(sessionId: string, chunkId: string): Promise<number>;
  async retrieveWithAttention(sessionId: string, query: string, k: number): Promise<MemoryChunk[]>;
  async getWorkingSetStats(sessionId: string): Promise<WorkingSetStats>;
}
```

### Dependencies
- Existing OpenClaw hooks API
- Existing memory system (для SM layer)
- Session transcripts (для analysis)
- Git (для evolution backup)

---

## Success Metrics

### Memory Efficiency
- Hit rate (WM retrieval vs full context load)
- Importance accuracy (predicted vs actual utility)
- Retrieval latency

### Cognitive Performance
- Task completion rate
- Parallel thinking adoption
- Evolution impact (before/after performance)
- Token efficiency (context used vs output quality)

### Self-Evolution
- Number of successful adaptations
- False positive rate (bad changes caught by verification)
- Rollback frequency
- Net performance improvement over time

---

## Принципы

1. **Всё основано на данных** — решения принимаются на основе анализа, не интуиции
2. **Обратимость** — любое изменение можно откатить
3. **Прозрачность** — все решения логируются и объяснимы
4. **Incremental** — начинаем с простого, усложняем по мере понимания
5. **Human-in-the-loop** — Operator всегда может вмешаться

---

_Создано: 2026-03-21_
_Автор: Stoic Snail 🐌_
_Версия: 0.1.0-draft_
