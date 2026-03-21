#!/bin/bash
# setup.sh — Восстановление Stoic Snail из GitHub
# Run: ./setup.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

WORKSPACE="$(cd "$(dirname "$0")" && pwd)"
CONFIG_FILE="$HOME/.openclaw/openclaw.json"

echo "============================================"
echo "  🐌 Stoic Snail — Setup Script"
echo "  $(date +%Y-%m-%d)"
echo "============================================"
echo ""

# 1. Проверка зависимостей
echo -e "${BLUE}[1/6]${NC} Проверка зависимостей..."

check_cmd() {
  if ! command -v "$1" &> /dev/null; then
    echo -e "  ${RED}✗${NC} $1 не найден"
    return 1
  fi
  echo -e "  ${GREEN}✓${NC} $1: $($1 --version 2>/dev/null | head -1)"
}

check_cmd node || { echo "Установите Node.js: https://nodejs.org"; exit 1; }
check_cmd npm  || { echo "Установите npm"; exit 1; }
check_cmd git  || { echo "Установите git"; exit 1; }

echo ""

# 2. Установка npm пакетов
echo -e "${BLUE}[2/6]${NC} Установка npm пакетов..."
if [ -f "$WORKSPACE/package.json" ]; then
  cd "$WORKSPACE"
  npm install --silent 2>/dev/null || npm install
  echo -e "  ${GREEN}✓${NC} npm packages установлены"
else
  echo -e "  ${YELLOW}⚠${NC} package.json не найден, пропуск"
fi
echo ""

# 3. Проверка OpenClaw config
echo -e "${BLUE}[3/6]${NC} Проверка OpenClaw конфигурации..."

if [ -f "$CONFIG_FILE" ]; then
  echo -e "  ${GREEN}✓${NC} $CONFIG_FILE существует"
  
  # Проверить на placeholders
  if grep -q "PLACEHOLDER" "$CONFIG_FILE" 2>/dev/null; then
    echo -e "  ${YELLOW}⚠${NC} Конфиг содержит PLACEHOLDERs"
    echo -e "    Запустите: ./restore-config.sh"
  else
    echo -e "  ${GREEN}✓${NC} Конфиг заполнен"
  fi
else
  echo -e "  ${YELLOW}⚠${NC} $CONFIG_FILE не найден"
  echo -e "    Скопируйте template и заполните:"
  echo -e "    cp openclaw.template.json $CONFIG_FILE"
  echo -e "    nano $CONFIG_FILE"
fi
echo ""

# 4. Проверка workspace
echo -e "${BLUE}[4/6]${NC} Проверка workspace..."
if git -C "$WORKSPACE" remote -v | grep -q "github.com/Aibsurd/StoicSnail-"; then
  echo -e "  ${GREEN}✓${NC} GitHub remote настроен"
  echo -e "       $(git -C "$WORKSPACE" remote get-url origin 2>/dev/null | sed 's|https://ghp_.*@||')"
else
  echo -e "  ${YELLOW}⚠${NC} GitHub remote не настроен"
  echo -e "    Для настройки:"
  echo -e "    git remote add origin https://github.com/Aibsurd/StoicSnail-.git"
fi
echo ""

# 5. Скрипты
echo -e "${BLUE}[5/6]${NC} Проверка скриптов..."
SCRIPTS=("vitals.sh" "weekly_review.sh" "deep_research.sh" "export-cron.sh")
for s in "${SCRIPTS[@]}"; do
  if [ -x "$WORKSPACE/scripts/$s" ]; then
    echo -e "  ${GREEN}✓${NC} $s"
  elif [ -f "$WORKSPACE/scripts/$s" ]; then
    echo -e "  ${YELLOW}⚠${NC} $s (не executable, делаю executable...)"
    chmod +x "$WORKSPACE/scripts/$s"
  else
    echo -e "  ${RED}✗${NC} $s (не найден)"
  fi
done
echo ""

# 6. Инструкции
echo -e "${BLUE}[6/6]${NC} Следующие шаги..."
echo ""
echo -e "${YELLOW}ВРУЧНУЮ:${NC}"
echo ""
echo "1. Заполните OpenClaw config:"
echo "   nano $CONFIG_FILE"
echo ""
echo "   Замените PLACEHOLDERs:"
echo "   - OPENROUTER_API_KEY"
echo "   - GATEWAY_TOKEN"
echo ""
echo "2. Переустановите скиллы (если нужно):"
echo "   clawhub install perplexity firecrawl-search openclaw-tavily-search"
echo ""
echo "3. Восстановите cron jobs (если были):"
echo "   ./scripts/import-cron.sh"
echo ""
echo "4. Проверьте:"
echo "   ./scripts/vitals.sh"
echo "   openclaw doctor"
echo ""

# Проверка vitals
if [ -x "$WORKSPACE/scripts/vitals.sh" ]; then
  echo -e "${BLUE}Запуск vitals.sh...${NC}"
  "$WORKSPACE/scripts/vitals.sh" 2>/dev/null | grep -E "^(📁|📋|💾|⚙️|🎓|📦)"
fi

echo ""
echo "============================================"
echo -e "${GREEN}  Setup завершён!${NC}"
echo "============================================"
