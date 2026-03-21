#!/bin/bash
# restore-config.sh — Восстановление OpenClaw config из template
# Usage: ./restore-config.sh [template-file]
# Default: ./openclaw.template.json

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

WORKSPACE="$(cd "$(dirname "$0")" && pwd)"
TEMPLATE="${1:-$WORKSPACE/openclaw.template.json}"
CONFIG_FILE="$HOME/.openclaw/openclaw.json"

echo "============================================"
echo "  🐌 Restore OpenClaw Config"
echo "============================================"
echo ""

# Проверка template
if [ ! -f "$TEMPLATE" ]; then
  echo -e "${RED}✗${NC} Template не найден: $TEMPLATE"
  exit 1
fi

echo -e "Template: $TEMPLATE"
echo -e "Output:  $CONFIG_FILE"
echo ""

# Проверка placeholders
PLACEHOLDERS=$(grep -o "PLACEHOLDER_[A-Z_]*" "$TEMPLATE" | sort -u)
if [ -z "$PLACEHOLDERS" ]; then
  echo -e "${YELLOW}⚠${NC} Нет placeholders в template — возможно уже заполнен"
fi

echo -e "${GREEN}✓${NC} Найдены placeholders:"
echo "$PLACEHOLDERS" | sed 's/^/   - /'
echo ""

# Список того что нужно заменить
echo -e "${YELLOW}Вам нужно ввести значения для:${NC}"
echo "   - OPENROUTER_API_KEY (с сайта openrouter.ai)"
echo "   - GATEWAY_TOKEN (любой случайный токен)"
echo ""

read -p "Продолжить? (создаст $CONFIG_FILE) [y/N] " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Отменено"
  exit 0
fi

# Создать backup текущего
if [ -f "$CONFIG_FILE" ]; then
  BACKUP="$CONFIG_FILE.backup.$(date +%Y%m%d%H%M%S)"
  cp "$CONFIG_FILE" "$BACKUP"
  echo -e "${GREEN}✓${NC} Backup создан: $BACKUP"
fi

# Копировать template
cp "$TEMPLATE" "$CONFIG_FILE"
echo -e "${GREEN}✓${NC} Скопировано в: $CONFIG_FILE"

echo ""
echo -e "${YELLOW}ВРУЧНУЮ отредактируйте файл:${NC}"
echo "   nano $CONFIG_FILE"
echo ""
echo "Замените:"
echo "   PLACEHOLDER_OPENROUTER_API_KEY → ваш реальный ключ"
echo "   PLACEHOLDER_GATEWAY_TOKEN       → ваш реальный токен"
echo ""
echo -e "${RED}ВНИМАНИЕ:${NC} Не коммитьте реальный config в git!"
