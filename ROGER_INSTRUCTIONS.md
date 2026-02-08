# Constructosaurus - Setup for Roger

## What This Is

Constructosaurus processes your construction PDFs (drawings, specs, schedules) and lets you query them in Claude Desktop using natural language.

**Cost**: $0 (uses local Ollama AI instead of expensive APIs)

## Installation

### 1. Clone Repository

```bash
git clone https://github.com/dajtuba/constructosaurus.git
cd constructosaurus
```

### 2. Run Setup

```bash
./setup.sh
```

This will:
- Install Node.js dependencies
- Download AI models (llava:13b, nomic-embed-text)
- Configure Claude Desktop
- Create directories

**Time**: ~10 minutes (downloading models)

### 3. Add Your Documents

```bash
# Copy your PDFs to source directory
cp ~/your-project-pdfs/*.pdf source/
```

### 4. Process Documents

```bash
npm run process source data/lancedb
```

This extracts everything from your PDFs using local AI.

**Time**: ~1-2 minutes per PDF page

### 5. Restart Claude Desktop

Quit and restart Claude Desktop to load the MCP server.

### 6. Query Your Documents

In Claude Desktop, ask questions like:

- "Search for concrete specifications"
- "Extract all rebar materials with quantities"
- "Find anchor bolt callouts"
- "Query the door schedule"
- "What's the foundation design?"

## What Gets Extracted

- ✅ Materials with quantities
- ✅ Schedules (door, window, beam, column)
- ✅ Dimensions and callouts
- ✅ Specifications
- ✅ Tables and data
- ✅ Cross-document relationships

## Troubleshooting

### Ollama not running

```bash
ollama serve
```

### Models not found

```bash
ollama pull llava:13b
ollama pull nomic-embed-text
```

### Claude Desktop not seeing MCP

1. Check config: `~/Library/Application Support/Claude/claude_desktop_config.json`
2. Restart Claude Desktop
3. Look for "constructosaurus" in MCP status

### No search results

1. Verify processing completed: `ls -lh data/lancedb/`
2. Try broader queries first
3. Check documents were in source/ directory

## Support

- Documentation: `docs/`
- Test MCP: `node src/tools/test-mcp-server.js`
- GitHub Issues: https://github.com/dajtuba/constructosaurus/issues

## Next Steps

Once working:
- Process all your project PDFs
- Query across multiple documents
- Extract material takeoffs
- Find conflicts between drawings
- Generate supply lists

Enjoy! 🦕
