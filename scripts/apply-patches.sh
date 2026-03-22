#!/usr/bin/env bash
# apply-patches.sh — Применить UI-кастомизацию после docker build/rebuild
# Запускать: bash scripts/apply-patches.sh
# Или добавить в Dockerfile: RUN bash /home/node/.openclaw/workspace/scripts/apply-patches.sh

set -e

UI_DIR="/app/node_modules/openclaw/dist/control-ui"
CANVAS_DIR="/app/node_modules/openclaw/dist/canvas-host/a2ui"
SCRIPT="$UI_DIR/assets/index-UvgeZ3yV.js"

echo "🐌 Stoic Snail — applying UI patches..."

# ---- 1. Title patch ----
if [ -f "$UI_DIR/index.html" ]; then
  sed -i 's|<title>OpenClaw</title>|<title>Stoic Snail 🐌</title>|g' "$UI_DIR/index.html"
  echo "  ✓ title patched"
fi

# ---- 2. Canvas title ----
if [ -f "$CANVAS_DIR/index.html" ]; then
  sed -i 's|<title>OpenClaw Canvas</title>|<title>Stoic Snail Canvas 🐌</title>|g' "$CANVAS_DIR/index.html"
  echo "  ✓ canvas title patched"
fi

# ---- 3. JS bundle — brand strings ----
if [ -f "$SCRIPT" ]; then
  sed -i \
    -e 's|"OpenClaw Control"|"Stoic Snail 🐌"|g' \
    -e 's|>OpenClaw<|>Stoic Snail 🐌<|g' \
    -e 's|"OpenClaw"|"Stoic Snail 🐌"|g' \
    "$SCRIPT"
  echo "  ✓ JS bundle patched"
else
  # Bundle filename may change after update — find it
  BUNDLE=$(find "$UI_DIR/assets" -name "index-*.js" | head -1)
  if [ -n "$BUNDLE" ]; then
    sed -i \
      -e 's|"OpenClaw Control"|"Stoic Snail 🐌"|g' \
      -e 's|>OpenClaw<|>Stoic Snail 🐌<|g' \
      -e 's|"OpenClaw"|"Stoic Snail 🐌"|g' \
      "$BUNDLE"
    echo "  ✓ JS bundle patched (auto-detected: $(basename $BUNDLE))"
  else
    echo "  ⚠ JS bundle not found — skipping text patches"
  fi
fi

# ---- 4. Favicon SVG (snail) ----
cat > "$UI_DIR/favicon.svg" << 'SVG_EOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="shell-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#8B6914"/>
      <stop offset="50%" stop-color="#D4A843"/>
      <stop offset="100%" stop-color="#8B6914"/>
    </linearGradient>
    <linearGradient id="body-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#5D8A3C"/>
      <stop offset="100%" stop-color="#3D6B25"/>
    </linearGradient>
  </defs>
  <!-- Body -->
  <ellipse cx="35" cy="72" rx="28" ry="14" fill="url(#body-grad)"/>
  <!-- Head -->
  <ellipse cx="12" cy="65" rx="10" ry="8" fill="url(#body-grad)"/>
  <!-- Antennae -->
  <line x1="8" y1="58" x2="4" y2="48" stroke="#3D6B25" stroke-width="2" stroke-linecap="round"/>
  <line x1="14" y1="56" x2="12" y2="46" stroke="#3D6B25" stroke-width="2" stroke-linecap="round"/>
  <circle cx="4" cy="47" r="2" fill="#3D6B25"/>
  <circle cx="12" cy="45" r="2" fill="#3D6B25"/>
  <!-- Eye -->
  <circle cx="7" cy="63" r="2" fill="#1a1a1a"/>
  <!-- Shell -->
  <circle cx="55" cy="58" r="30" fill="url(#shell-grad)"/>
  <!-- Shell spiral -->
  <circle cx="55" cy="58" r="22" fill="none" stroke="#8B6914" stroke-width="2" opacity="0.5"/>
  <circle cx="55" cy="58" r="14" fill="none" stroke="#8B6914" stroke-width="2" opacity="0.4"/>
  <circle cx="55" cy="58" r="7" fill="#8B6914" opacity="0.6"/>
</svg>
SVG_EOF
echo "  ✓ favicon.svg written"

echo ""
echo "🐌 All patches applied. Restart gateway if needed."
