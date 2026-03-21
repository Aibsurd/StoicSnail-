#!/bin/bash
#===============================================================================
# CogneXus Setup Script
# 
# Installs and configures the CogneXus cognitive architecture.
# Run this once after creating the COGNEXUS directory.
#
# Usage:
#   bash COGNEXUS/scripts/setup.sh
#
#===============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COGNEXUS_DIR="$(dirname "$SCRIPT_DIR")"
WORKSPACE_DIR="$(dirname "$COGNEXUS_DIR")"

echo "🔧 CogneXus Setup"
echo "=================="
echo ""
echo "Workspace: $WORKSPACE_DIR"
echo "CogneXus:  $COGNEXUS_DIR"
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js first."
    exit 1
fi
echo "✓ Node.js: $(node --version)"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found."
    exit 1
fi
echo "✓ npm: $(npm --version)"

# Check OpenClaw
if ! command -v openclaw &> /dev/null; then
    echo "⚠️  OpenClaw CLI not found in PATH"
    echo "   Some features may not work."
else
    echo "✓ OpenClaw CLI found"
fi

echo ""
echo "📁 Creating directory structure..."

# Create directories
mkdir -p "$COGNEXUS_DIR"/{ENGINE,DELIBERATE,FLOW,ANALYTICS,DASHBOARD,CONFIG}
mkdir -p "$COGNEXUS_DIR"/EVOLUTION/{backups,analysis,pending}
mkdir -p "$WORKSPACE_DIR"/skills

echo "✓ Directories created"

echo ""
echo "📝 Checking component files..."

# Check essential files
ESSENTIAL_FILES=(
    "SPEC.md"
    "ENGINE/cognexus-engine.ts"
    "DELIBERATE/deliberate-system.ts"
    "EVOLUTION/evolution-engine.ts"
    "FLOW/executor.ts"
    "ANALYTICS/analytics.ts"
    "DASHBOARD/index.html"
    "src/index.ts"
)

for file in "${ESSENTIAL_FILES[@]}"; do
    if [ -f "$COGNEXUS_DIR/$file" ]; then
        echo "✓ $file"
    else
        echo "⚠️  $file not found (will be created)"
    fi
done

echo ""
echo "⚙️  Creating default configuration..."

# Create default config
cat > "$COGNEXUS_DIR/CONFIG/defaults.json" << 'EOF'
{
  "cognexus": {
    "enabled": true,
    "version": "0.1.0",
    "workspace": "COGNEXUS"
  },
  "engine": {
    "workingMemoryLimit": 50,
    "episodicRetention": 30,
    "importanceDecay": 0.95,
    "consolidationThreshold": 0.6,
    "enablePatternDetection": true
  },
  "deliberate": {
    "enabled": true,
    "personas": ["explorer", "analyst", "challenger", "historian", "ethicist"],
    "consensusThreshold": 0.7,
    "dissentThreshold": 0.3
  },
  "evolution": {
    "enabled": true,
    "autoReflect": true,
    "requireVerification": true,
    "backupBeforeChange": true
  },
  "flow": {
    "maxParallelTasks": 5,
    "defaultTimeoutMs": 300000,
    "defaultRetries": 2
  },
  "analytics": {
    "enabled": true,
    "retentionDays": 30,
    "snapshotIntervalMs": 5000
  }
}
EOF

echo "✓ Default config created"

echo ""
echo "🔗 Creating skill symlink..."

# Create skill file if not exists
if [ ! -f "$WORKSPACE_DIR/skills/cognexus.md" ]; then
    cat > "$WORKSPACE_DIR/skills/cognexus.md" << 'EOF'
# CogneXus

Advanced cognitive architecture for OpenClaw.

## Commands

- `!deliberate [question]` - Multi-perspective analysis
- `/cognexus status` - System status
- `/cognexus flow` - Task flow management

See COGNEXUS/SPEC.md for full documentation.
EOF
    echo "✓ Skill file created"
else
    echo "✓ Skill file already exists"
fi

echo ""
echo "🧪 Verifying TypeScript..."

# Check if TypeScript is available
if command -v npx &> /dev/null; then
    # Try to check TypeScript syntax
    if npx -y typescript --version &> /dev/null; then
        echo "✓ TypeScript available"
    else
        echo "⚠️  TypeScript not installed (optional for development)"
    fi
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Review COGNEXUS/SPEC.md for architecture overview"
echo "  2. Configure COGNEXUS/CONFIG/defaults.json"
echo "  3. Access dashboard at /cognexus/dashboard/"
echo "  4. Enable components in openclaw.json plugins section"
echo ""
echo "To enable in OpenClaw, add to your openclaw.json:"
echo ""
cat << 'EOF'
{
  "plugins": {
    "entries": {
      "cognexus": {
        "enabled": true,
        "config": {
          "workspace": "~/.openclaw/workspace/COGNEXUS"
        }
      }
    }
  }
}
EOF

echo ""
echo "📊 Current system status:"
echo "  Memory: $(df -h "$WORKSPACE_DIR" | tail -1 | awk '{print $5 " used"}')"
echo "  Disk space: $(df -h "$WORKSPACE_DIR" | tail -1 | awk '{print $4 " available"}')"
echo ""
