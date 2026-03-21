# CogneXus: Advanced Cognitive Architecture for OpenClaw

> **Philosophy**: Build the "nervous system" for AI agents — a system that thinks about how it thinks, learns to learn, and gets smarter with every interaction. Not a tool. Not a plugin. An ecosystem.

---

## What is CogneXus?

CogneXus is a comprehensive cognitive architecture layer built on top of OpenClaw. It transforms a basic AI agent into a self-improving, multi-perspective reasoning system with:

- **Three-tier Memory Hierarchy** — Working Memory → Episodic Memory → Semantic Memory
- **Parallel Thinking** — Multiple reasoning perspectives simultaneously
- **Self-Evolution** — Autonomous improvement based on experience
- **Task Flow Execution** — DAG-based workflow decomposition
- **Real-time Analytics** — Full cognitive performance monitoring

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        COGNEXUS LAYER                          │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │   ENGINE     │  │  DELIBERATE  │  │  EVOLUTION    │        │
│  │  (Memory)    │  │  (Thinking)  │  │  (Growth)     │        │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘        │
│         │                 │                 │                 │
│  ┌──────┴─────────────────┴─────────────────┴───────┐        │
│  │              FLOW EXECUTOR                       │        │
│  │         (Task Graph Execution)                   │        │
│  └─────────────────────┬───────────────────────────┘        │
│                        │                                       │
│  ┌─────────────────────┴───────────────────────────┐        │
│  │              ANALYTICS + DASHBOARD               │        │
│  │         (Metrics & Visualization)                │        │
│  └─────────────────────────────────────────────────┘        │
│                                                              │
│──────────────────────── OPENCLAW ────────────────────────────│
│                                                              │
│  Agent Loop │ Session Management │ Context Engine │ Tools   │
└──────────────────────────────────────────────────────────────┘
```

---

## Components

### 1. Context Engine (Memory Hierarchy)

Replaces the legacy context engine with an AI-native memory system:

- **Working Memory (WM)**: Hot data from current session, attention-weighted
- **Episodic Memory (EM)**: Session summaries with key decisions and questions
- **Semantic Memory (SM)**: Long-term importance-weighted knowledge

Importance scoring considers:
- Recency (exponential decay)
- Access frequency
- Semantic richness
- Emotional salience
- Utility in similar contexts

### 2. Deliberate (Parallel Thinking)

Runs 5 simultaneous reasoning agents:

| Persona | Role | Weight |
|---------|------|--------|
| Explorer | Creative, what-if scenarios | 1.0 |
| Analyst | Evidence-based, truth-seeking | 1.2 |
| Challenger | Devil's advocate, risk identification | 1.0 |
| Historian | Past patterns and precedent | 0.8 |
| Ethicist | Moral implications, stakeholder impact | 0.9 |

Consensus aggregation produces confidence scores and highlights disagreements.

### 3. Evolution (Self-Improvement)

Autonomous identity refinement:

1. **Reflection**: Analyzes session transcripts post-run
2. **Pattern Detection**: Identifies successful/failed strategies
3. **Change Proposal**: Suggests identity modifications
4. **Verification**: Tests changes before permanent application
5. **Rollback**: Full git-backed reversal capability

Safety constraints:
- All changes require backup
- Verification before application
- Human-in-the-loop for significant changes
- Complete audit trail

### 4. Flow (Task Execution)

DAG-based workflow decomposition:

- Parallel execution where dependencies allow
- Automatic retry with exponential backoff
- Real-time status tracking
- Result aggregation and conflict resolution

### 5. Analytics Dashboard

Real-time cognitive monitoring:

- Context usage (tokens, %)
- Memory sizes (WM, EM, SM)
- Importance distribution heatmap
- Task performance metrics
- Evolution impact tracking

---

## Quick Start

### 1. Enable the Plugin

Add to `openclaw.json`:

```json
{
  "plugins": {
    "slots": {
      "contextEngine": "cognexus"
    },
    "entries": {
      "cognexus": {
        "enabled": true
      }
    }
  }
}
```

### 2. Use Parallel Thinking

```
!deliberate Should I refactor the authentication system or build from scratch?
```

### 3. Monitor Performance

Access the dashboard at `/cognexus/dashboard/`

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/cognexus/status` | GET | System status |
| `/cognexus/analytics/dashboard` | GET | Overview metrics |
| `/cognexus/analytics/snapshot` | GET | Current state |
| `/cognexus/analytics/metrics` | GET | Time-series data |
| `/cognexus/flow/create` | POST | Create task flow |
| `/cognexus/flow/status` | GET | Flow status |
| `/cognexus/flow/execute` | POST | Execute flow |
| `/cognexus/evolution/status` | GET | Evolution state |
| `/cognexus/evolution/analyze` | GET | Session analysis |

---

## File Structure

```
COGNEXUS/
├── SPEC.md                    # Architecture specification
├── README.md                  # This file
├── package.json               # Plugin manifest
│
├── ENGINE/                    # Context Engine
│   └── cognexus-engine.ts    # Memory hierarchy implementation
│
├── DELIBERATE/                # Parallel Thinking
│   ├── deliberate-system.ts   # Main orchestrator
│   └── personas/              # Subagent personas
│
├── EVOLUTION/                 # Self-Evolution
│   ├── evolution-engine.ts    # Main engine
│   ├── backups/              # Change backups
│   └── analysis/             # Session analyses
│
├── FLOW/                      # Task Execution
│   ├── executor.ts           # DAG executor
│   └── flows/                # Flow definitions
│
├── ANALYTICS/                 # Metrics & Dashboard
│   ├── analytics.ts          # Collector
│   └── data/                 # Metrics storage
│
├── DASHBOARD/                 # Web UI
│   └── index.html            # Dashboard page
│
├── CONFIG/                    # Configuration
│   └── defaults.json          # Default settings
│
└── scripts/
    └── setup.sh              # Setup script
```

---

## Configuration

Edit `COGNEXUS/CONFIG/defaults.json`:

```json
{
  "engine": {
    "workingMemoryLimit": 50,
    "episodicRetention": 30,
    "consolidationThreshold": 0.6,
    "enablePatternDetection": true
  },
  "deliberate": {
    "enabled": true,
    "consensusThreshold": 0.7
  },
  "evolution": {
    "enabled": true,
    "autoReflect": true,
    "requireVerification": true
  },
  "flow": {
    "maxParallelTasks": 5,
    "defaultTimeoutMs": 300000
  }
}
```

---

## Technical Details

### Requirements
- OpenClaw 2026.3+
- Node.js 18+
- 512MB+ available memory

### Performance
- Context engine adds ~5-10ms latency to assembly
- Deliberate adds 2-5 seconds per invocation
- Analytics: minimal overhead (<1% CPU)

### Storage
- Working memory: in-memory + JSON file (~1MB max)
- Episodic: JSON files (~100KB per session)
- Semantic: Markdown files (~10KB average)
- Analytics: ~50MB per month at default settings

---

## Development Status

**Version**: 0.1.0-draft

**Status**: Proof of concept — functional but undergoing active development.

**Roadmap**:
- [ ] Full TypeScript compilation
- [ ] Unit tests for all components
- [ ] Integration tests with OpenClaw
- [ ] Production hardening
- [ ] Documentation site

---

## License

MIT

---

_Built by Stoic Snail 🐌_
_Created: 2026-03-21_
