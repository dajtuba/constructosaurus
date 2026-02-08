# Constructosaurus - Setup for Roger

## The Absolute Easiest Way

Copy this ONE prompt into Claude:

```
Clone https://github.com/dajtuba/constructosaurus.git to my Desktop, 
run ./setup.sh, and handle any errors. Only show me errors or the 
final success message. When done, tell me to restart Claude Desktop.
```

Wait 10-15 minutes, restart Claude Desktop, and you're done!

---

## What This Is

Constructosaurus processes your construction PDFs (drawings, specs, schedules) and lets you query them in Claude Desktop using natural language.

**Cost**: $0 (uses local Ollama AI instead of expensive APIs)

## What Claude Does For You

1. ✅ Clones repository to your Desktop
2. ✅ Installs Ollama (local AI)
3. ✅ Downloads AI models (~8GB)
4. ✅ Installs dependencies
5. ✅ Builds the project
6. ✅ Configures Claude Desktop
7. ✅ Tests everything
8. ✅ Reports success

**You do:** Copy/paste one prompt
**Claude does:** Everything else

## After Setup

### 1. Restart Claude Desktop

Quit and restart Claude Desktop to load the MCP server.

### 2. Add Your Documents

```bash
cp ~/your-project-pdfs/*.pdf ~/Desktop/constructosaurus/source/
```

### 3. Process Documents

```bash
cd ~/Desktop/constructosaurus
npm run process source data/lancedb
```

This extracts everything from your PDFs using local AI.

**Time**: ~1-2 minutes per PDF page

### 4. Query Your Documents

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
