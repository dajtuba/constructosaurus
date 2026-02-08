#!/bin/bash

# Constructosaurus Setup Script for Roger
# This script prepares a clean installation of Constructosaurus

set -e

echo "🦕 Constructosaurus Setup"
echo "========================="
echo ""

# Check prerequisites
echo "Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+ first."
    exit 1
fi
echo "✅ Node.js $(node --version)"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found. Please install npm first."
    exit 1
fi
echo "✅ npm $(npm --version)"

# Check Ollama
if ! command -v ollama &> /dev/null; then
    echo "⚠️  Ollama not found. Installing Ollama..."
    curl -fsSL https://ollama.com/install.sh | sh
fi
echo "✅ Ollama installed"

# Check if Ollama is running
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "⚠️  Ollama not running. Starting Ollama..."
    ollama serve > /dev/null 2>&1 &
    sleep 3
fi
echo "✅ Ollama running"

# Pull required models
echo ""
echo "Downloading AI models (this may take a while)..."
echo "  - llava:13b (vision model, ~8GB)"
echo "  - nomic-embed-text (embedding model, ~274MB)"

if ! ollama list | grep -q "llava:13b"; then
    echo "Pulling llava:13b..."
    ollama pull llava:13b
fi
echo "✅ llava:13b ready"

if ! ollama list | grep -q "nomic-embed-text"; then
    echo "Pulling nomic-embed-text..."
    ollama pull nomic-embed-text
fi
echo "✅ nomic-embed-text ready"

# Install dependencies
echo ""
echo "Installing Node.js dependencies..."
npm install

# Build project
echo ""
echo "Building project..."
npm run build

# Create data directories
echo ""
echo "Creating data directories..."
mkdir -p data/lancedb
mkdir -p data/schedules
mkdir -p source
echo "✅ Directories created"

# Setup environment
echo ""
echo "Setting up environment..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created .env file"
    echo "⚠️  Please edit .env and add your ANTHROPIC_API_KEY if needed"
else
    echo "✅ .env already exists"
fi

# Configure Claude Desktop
echo ""
echo "Configuring Claude Desktop MCP..."

CLAUDE_CONFIG_DIR="$HOME/Library/Application Support/Claude"
CLAUDE_CONFIG="$CLAUDE_CONFIG_DIR/claude_desktop_config.json"
PROJECT_DIR="$(pwd)"

mkdir -p "$CLAUDE_CONFIG_DIR"

cat > "$CLAUDE_CONFIG" << EOF
{
    "mcpServers": {
        "constructosaurus": {
            "command": "node",
            "args": ["$PROJECT_DIR/dist/index.js"],
            "env": {
                "DATABASE_PATH": "$PROJECT_DIR/data/lancedb",
                "OLLAMA_URL": "http://localhost:11434",
                "EMBED_MODEL": "nomic-embed-text"
            }
        }
    }
}
EOF

echo "✅ Claude Desktop configured"

# Create source directory with instructions
cat > source/README.md << 'EOF'
# Source Documents

Place your construction PDF documents in this directory.

## Processing Documents

To process all PDFs in this directory:

```bash
npm run process source data/lancedb
```

This will:
1. Extract text, tables, and schedules from PDFs
2. Analyze drawings with Ollama vision (FREE)
3. Generate embeddings and store in LanceDB
4. Make documents searchable via Claude Desktop

## Supported Document Types

- Construction drawings (PDF)
- Specifications (PDF)
- Schedules (PDF)
- Structural calculations (PDF)

## Example

```bash
# Copy your PDFs here
cp ~/Documents/project-drawings/*.pdf source/

# Process them
npm run process source data/lancedb

# Query in Claude Desktop
# "Search for concrete specifications"
```
EOF

echo "✅ Created source directory with instructions"

# Summary
echo ""
echo "========================="
echo "✅ Setup Complete!"
echo "========================="
echo ""
echo "Next steps:"
echo ""
echo "1. Place PDF documents in the 'source/' directory"
echo ""
echo "2. Process documents:"
echo "   npm run process source data/lancedb"
echo ""
echo "3. Restart Claude Desktop to load MCP server"
echo ""
echo "4. In Claude Desktop, ask questions like:"
echo "   - 'Search for foundation details'"
echo "   - 'Extract all rebar materials'"
echo "   - 'Query the door schedule'"
echo ""
echo "📚 Documentation: docs/"
echo "🧪 Test MCP: node src/tools/test-mcp-server.js"
echo ""
