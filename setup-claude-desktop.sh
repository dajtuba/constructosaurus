#!/bin/bash

echo "🔧 Setting up ClaudeHopper 2.0 for Claude Desktop"
echo ""

# Build the project
echo "📦 Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

# Get absolute path to project
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "📁 Project directory: $PROJECT_DIR"

# Create Claude Desktop config
CLAUDE_CONFIG_DIR="$HOME/Library/Application Support/Claude"
CLAUDE_CONFIG_FILE="$CLAUDE_CONFIG_DIR/claude_desktop_config.json"

echo ""
echo "📝 Creating Claude Desktop configuration..."

# Create config directory if it doesn't exist
mkdir -p "$CLAUDE_CONFIG_DIR"

# Create or update config
cat > "$CLAUDE_CONFIG_FILE" << EOF
{
  "mcpServers": {
    "claudehopper": {
      "command": "node",
      "args": [
        "$PROJECT_DIR/dist/index.js"
      ],
      "env": {
        "DATABASE_PATH": "$PROJECT_DIR/data/lancedb",
        "OLLAMA_URL": "http://localhost:11434",
        "EMBED_MODEL": "nomic-embed-text"
      }
    }
  }
}
EOF

echo "✅ Configuration created at: $CLAUDE_CONFIG_FILE"
echo ""
echo "📋 Configuration:"
cat "$CLAUDE_CONFIG_FILE"
echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Restart Claude Desktop"
echo "2. Look for 🔌 icon in Claude Desktop (bottom right)"
echo "3. You should see 'claudehopper' server connected"
echo "4. Try asking: 'Search for foundation details'"
echo ""
echo "Available tools:"
echo "  - search_construction_docs"
echo "  - extract_materials"
echo "  - ingest_document"
echo "  - analyze_drawing"
