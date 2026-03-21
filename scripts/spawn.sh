#!/bin/bash
# spawn.sh — Утилита для спавна sub-agents
# Usage: ./spawn.sh <task> [timeout] [model]

set -e

TASK="${1:-}"
TIMEOUT="${2:-60}"
MODEL="${3:-openrouter/auto}"

if [ -z "$TASK" ]; then
  echo "Usage: $0 <task> [timeout] [model]"
  echo "Example: $0 'Calculate 2^10' 30"
  exit 1
fi

echo "Spawning sub-agent..."
echo "Task: $TASK"
echo "Timeout: ${TIMEOUT}s"
echo "Model: $MODEL"
echo ""

# Note: This is a helper script, but actual spawning
# should be done via the sessions_spawn tool in the agent.
# This script just documents the pattern.

cat << 'NOTE'
Для спавна sub-agent используйтеsessions_spawn tool в агенте:

await sessions_spawn({
  task: "Ваша задача",
  model: "openrouter/auto",
  runTimeoutSeconds: 60
})

Или через slash command:
/subagents spawn <agentId> <task>
NOTE

echo ""
echo "Sub-agent configuration:"
cat << 'CONFIG'
maxConcurrent: 5
maxSpawnDepth: 2
maxChildrenPerAgent: 5
runTimeoutSeconds: 300 (default)
CONFIG
