#!/bin/bash
# checkpoint.sh — Быстрый state checkpoint в git
# Создаёт коммит с автопушем если есть изменения
# Использование: ./checkpoint.sh ["optional message"]

set -e

WORKSPACE="/home/node/.openclaw/workspace"
MSG="${1:-auto-checkpoint $(date +%Y-%m-%d\ %H:%M)}"

cd "$WORKSPACE"

# Проверяем git
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "⚠ Not a git repo"
  exit 0
fi

# Проверяем uncommitted changes
if [ -z "$(git status --porcelain)" ]; then
  echo "✓ No changes to commit"
  exit 0
fi

# Добавляем всё
git add -A

# Commit с message
git commit -m "$MSG"

# Push
git push origin master 2>/dev/null || git push -u origin master

echo "✓ Checkpoint committed and pushed"
