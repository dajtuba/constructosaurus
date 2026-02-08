# Constructosaurus

AI-powered construction document processing system. Extract materials, quantities, and schedules from PDF construction documents using local AI (Ollama) and semantic search.

## Features

- 🦕 **Local AI Processing** - Uses Ollama (FREE) for vision analysis
- 📄 **PDF Ingestion** - Process drawings, specs, and schedules
- 🔍 **Semantic Search** - Find information across all documents
- 📊 **Schedule Extraction** - Auto-extract door, window, beam schedules
- 🏗️ **Material Takeoff** - Extract materials with quantities
- 🔗 **Cross-Document Correlation** - Detect conflicts between documents
- 💬 **Claude Desktop Integration** - Query via natural language

## Quick Start

### The Easiest Way (One Prompt)

Ask Claude:

```
Clone https://github.com/dajtuba/constructosaurus.git to my Desktop, 
run ./setup.sh, and handle any errors. Only show me errors or the 
final success message. When done, tell me to restart Claude Desktop.
```

Claude will clone, install everything (Ollama, AI models, dependencies), and configure itself. 

**Time:** 10-15 minutes | **Tokens:** ~500-1000 | **Your effort:** One copy/paste

See [QUICK_SETUP.md](QUICK_SETUP.md) for the exact prompt.

### Manual Setup

```bash
git clone https://github.com/dajtuba/constructosaurus.git
cd constructosaurus
./setup.sh
```

### After Setup

```bash
# Add your PDFs
cp ~/your-project/*.pdf ~/Desktop/constructosaurus/source/

# Process them
cd ~/Desktop/constructosaurus
npm run process source data/lancedb

# Restart Claude Desktop, then query!
```

## System Requirements

- **Node.js** 18+
- **Ollama** (auto-installed by setup script)
- **Disk Space** ~10GB for AI models
- **RAM** 8GB+ recommended

## Cost

- **Processing**: $0 (uses local Ollama)
- **Storage**: Local LanceDB (free)
- **Querying**: Minimal (just embeddings)

Compare to Claude Vision API: $0.80/image = $80 for 100 pages

## Documentation

- [Quick Start Guide](QUICKSTART.md) - Detailed setup instructions
- [Testing Guide](TESTING.md) - How to test the system
- [Architecture](docs/architecture/overview.md) - System design
- [API Documentation](docs/api/README.md) - MCP tools reference

## Project Structure

```
constructosaurus/
├── src/              # Source code
│   ├── extraction/   # PDF extraction
│   ├── services/     # Business logic
│   ├── vision/       # Ollama vision analysis
│   └── mcp/          # MCP server tools
├── docs/             # Documentation
├── source/           # Your PDF documents (add here)
├── data/             # Processed data (LanceDB)
└── setup.sh          # One-command setup
```

## Development

```bash
npm run build        # Build TypeScript
npm run dev          # Development mode
npm run test         # Run tests
```

## Support

- GitHub Issues: https://github.com/dajtuba/constructosaurus/issues
- Documentation: `docs/`

## License

MIT
