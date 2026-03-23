# COGNEXUS Skills

## deliberate

**When to use:** Complex decisions, multi-perspective analysis, when unsure which approach is best.

**How to use:**

```
!deliberate [your question or decision]
```

**Example:**

```
!deliberate Should I refactor the authentication system or build a new one from scratch?
```

**What it does:**

- Runs 5 parallel thinking agents (Explorer, Analyst, Challenger, Historian, Ethicist)
- Aggregates perspectives into consensus
- Highlights agreements and disagreements
- Provides confidence score

**Best for:**

- Architectural decisions
- Risk assessment
- Multi-stakeholder considerations
- Strategic planning

---

## flow

**When to use:** Complex multi-step tasks that can be parallelized.

**How to use:**

```javascript
// Via API endpoints:
// POST /cognexus/flow/create
{
  "description": "Build web scraper",
  "tasks": [
    { "type": "analyze", "description": "Analyze target website", "dependsOn": [], "priority": 1 },
    { "type": "code", "description": "Write scraper code", "dependsOn": [0], "priority": 2 },
    { "type": "test", "description": "Test the scraper", "dependsOn": [1], "priority": 2 },
    { "type": "review", "description": "Review code quality", "dependsOn": [1], "priority": 1 }
  ]
}

// GET /cognexus/flow/status?flowId=<flowId>
```

**Task types:**

- `analyze` - Analyze content/data
- `research` - Web search and research
- `code` - Generate code
- `test` - Write tests
- `review` - Code review
- `document` - Generate documentation
- `synthesize` - Combine results
- `delegate` - Delegate to subagent
- `wait` - Delay execution
- `transform` - Transform data

**Best for:**

- Complex projects with dependencies
- Parallel research + implementation
- CI/CD pipelines
- Systematic exploration

---

## evolve

**When to use:** Automatically improves agent behavior based on experience.

**How it works:**

1. After each session, analyzes what worked/didn't
2. Identifies patterns in successful strategies
3. Proposes identity changes with confidence scores
4. Applies verified changes after backup

**Commands:**

- Automatic: Runs after each session
- Manual trigger: Via API

**Safety:**

- All changes backed up to git
- Rollback capability
- Verification before application
- Human-in-the-loop for significant changes

---

## memory

**When to use:** Built-in to every response. Access long-term memory.

**Tools available:**

- `memory_search` - Semantic search across all memories
- `memory_get` - Read specific memory files

**How importance works:**

- Recency (recently accessed = higher)
- Frequency (often used = higher)
- Semantic richness (complex concepts = higher)
- Emotional salience (marked important = higher)
- Utility (useful in similar contexts = higher)

**Tiers:**

1. **Working Memory** - Current session hot data
2. **Episodic Memory** - Session summaries
3. **Semantic Memory** - Long-term knowledge

---

## analytics

**When to use:** Monitor system performance and make data-driven decisions.

**Endpoints:**

- `/cognexus/analytics/dashboard` - Overview metrics
- `/cognexus/analytics/snapshot` - Current state
- `/cognexus/analytics/metrics` - Time-series data
- `/cognexus/analytics/history` - Historical data

**Metrics tracked:**

- Context usage (tokens, %)
- Memory sizes (WM, EM, SM)
- Task performance
- Evolution impact
- Deliberation consensus

---

## Quick Reference

| Command                  | Purpose                    |
| ------------------------ | -------------------------- |
| `!deliberate [question]` | Multi-perspective analysis |
| `/cognexus status`       | System status              |
| `/cognexus flow create`  | Create task flow           |
| `/cognexus memory`       | Memory statistics          |
| `/cognexus evolve`       | Trigger evolution cycle    |

---

_For detailed documentation, see COGNEXUS/SPEC.md_
