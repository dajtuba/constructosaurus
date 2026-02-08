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

### 1. Run Setup

```bash
./setup.sh
```

This installs dependencies, downloads AI models, and configures Claude Desktop.

### 2. Add Your Documents

```bash
cp ~/your-project/*.pdf source/
```

### 3. Process Documents

```bash
npm run process source data/lancedb
```

This extracts all data using Ollama (runs locally, no API costs).

### 4. Query in Claude Desktop

Restart Claude Desktop, then ask:
- "Search for concrete specifications"
- "Extract all rebar materials"
- "Query the door schedule"

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
