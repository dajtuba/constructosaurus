#!/bin/bash

# Constructosaurus Setup Script for Roger
# This script prepares a clean installation of Constructosaurus

set -e

echo "🦕 Constructosaurus Setup"
echo "========================="
echo ""

# Detect OS
OS="$(uname -s)"
case "${OS}" in
    Linux*)     MACHINE=Linux;;
    Darwin*)    MACHINE=Mac;;
    *)          MACHINE="UNKNOWN:${OS}"
esac

echo "Detected OS: $MACHINE"
echo ""

# Check prerequisites
echo "Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found."
    echo ""
    echo "Please install Node.js 18+ first:"
    if [ "$MACHINE" = "Mac" ]; then
        echo "  brew install node"
        echo "  OR download from: https://nodejs.org/"
    else
        echo "  Download from: https://nodejs.org/"
    fi
    exit 1
fi
NODE_VERSION=$(node --version)
echo "✅ Node.js $NODE_VERSION"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found. Please install npm first."
    exit 1
fi
NPM_VERSION=$(npm --version)
echo "✅ npm $NPM_VERSION"

# Install/Check Ollama
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Installing Ollama (Local AI - Required)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if ! command -v ollama &> /dev/null; then
    echo "Ollama not found. Installing..."
    
    if [ "$MACHINE" = "Mac" ]; then
        # Download and install Ollama for Mac
        echo "Downloading Ollama for macOS..."
        curl -fsSL https://ollama.com/install.sh | sh
    elif [ "$MACHINE" = "Linux" ]; then
        # Install Ollama for Linux
        echo "Installing Ollama for Linux..."
        curl -fsSL https://ollama.com/install.sh | sh
    else
        echo "⚠️  Unsupported OS. Please install Ollama manually:"
        echo "   https://ollama.com/download"
        exit 1
    fi
    
    echo "✅ Ollama installed"
else
    echo "✅ Ollama already installed"
fi

# Start Ollama service
echo ""
echo "Starting Ollama service..."

if [ "$MACHINE" = "Mac" ]; then
    # On Mac, Ollama runs as an app
    if ! pgrep -x "ollama" > /dev/null; then
        echo "Starting Ollama..."
        ollama serve > /dev/null 2>&1 &
        sleep 3
    fi
elif [ "$MACHINE" = "Linux" ]; then
    # On Linux, check if systemd service exists
    if systemctl is-active --quiet ollama; then
        echo "✅ Ollama service already running"
    else
        echo "Starting Ollama service..."
        sudo systemctl start ollama || (ollama serve > /dev/null 2>&1 &)
        sleep 3
    fi
fi

# Verify Ollama is running
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "✅ Ollama service running"
else
    echo "⚠️  Ollama service not responding. Trying to start..."
    ollama serve > /dev/null 2>&1 &
    sleep 5
    
    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo "✅ Ollama service started"
    else
        echo "❌ Could not start Ollama. Please start it manually:"
        echo "   ollama serve"
        exit 1
    fi
fi

# Pull required models
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Downloading AI Models (this may take 10-15 minutes)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check and pull llava:13b
echo "Checking llava:13b (vision model, ~8GB)..."
if ollama list | grep -q "llava:13b"; then
    echo "✅ llava:13b already downloaded"
else
    echo "Downloading llava:13b (this will take a while)..."
    ollama pull llava:13b
    echo "✅ llava:13b ready"
fi

# Check and pull nomic-embed-text
echo ""
echo "Checking nomic-embed-text (embedding model, ~274MB)..."
if ollama list | grep -q "nomic-embed-text"; then
    echo "✅ nomic-embed-text already downloaded"
else
    echo "Downloading nomic-embed-text..."
    ollama pull nomic-embed-text
    echo "✅ nomic-embed-text ready"
fi

# Install Node.js dependencies
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Installing Node.js Dependencies"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
npm install

# Build project
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Building Project"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
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
else
    echo "✅ .env already exists"
fi

# Configure Claude Desktop
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Configuring Claude Desktop MCP"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ "$MACHINE" = "Mac" ]; then
    CLAUDE_CONFIG_DIR="$HOME/Library/Application Support/Claude"
elif [ "$MACHINE" = "Linux" ]; then
    CLAUDE_CONFIG_DIR="$HOME/.config/Claude"
else
    echo "⚠️  Unknown OS, skipping Claude Desktop config"
    CLAUDE_CONFIG_DIR=""
fi

if [ -n "$CLAUDE_CONFIG_DIR" ]; then
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

    echo "✅ Claude Desktop configured at:"
    echo "   $CLAUDE_CONFIG"
else
    echo "⚠️  Could not configure Claude Desktop automatically"
fi

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

# Test MCP server
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Testing MCP Server"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -f "src/tools/test-mcp-server.js" ]; then
    echo "Running MCP server test..."
    node src/tools/test-mcp-server.js 2>&1 | grep -E "✅|❌|Available tools" || echo "Test completed"
else
    echo "⚠️  Test script not found, skipping"
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "What was installed:"
echo "  ✅ Ollama (local AI)"
echo "  ✅ llava:13b (vision model)"
echo "  ✅ nomic-embed-text (embedding model)"
echo "  ✅ Node.js dependencies"
echo "  ✅ Claude Desktop MCP configured"
echo ""
echo "Next steps:"
echo ""
echo "1. Place PDF documents in the 'source/' directory:"
echo "   cp ~/your-pdfs/*.pdf source/"
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
echo "💰 Cost: \$0 (everything runs locally!)"
echo ""
