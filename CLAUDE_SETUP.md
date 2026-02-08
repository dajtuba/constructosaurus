# Setup Instructions for Claude

Roger, ask Claude to follow these instructions:

---

**Prompt for Claude:**

> Run the Constructosaurus setup. Execute `./setup.sh` and monitor for errors. If any errors occur, troubleshoot and fix them. Report when complete.

---

That's it! Claude will:
1. Run the setup script
2. Monitor output for errors
3. Fix any issues automatically
4. Report when done

## What Claude Will Do

```bash
cd /path/to/constructosaurus
./setup.sh
```

Claude will watch for:
- ❌ Node.js not found → Tell Roger to install Node.js
- ❌ Ollama install fails → Retry or provide manual instructions
- ❌ Model download fails → Retry download
- ❌ npm install fails → Clear cache and retry
- ❌ Build fails → Check TypeScript errors and fix
- ❌ MCP config fails → Manually configure

## Expected Output

```
🦕 Constructosaurus Setup
=========================

Detected OS: Mac
✅ Node.js v20.x.x
✅ npm 10.x.x
✅ Ollama installed
✅ Ollama service running
✅ llava:13b ready
✅ nomic-embed-text ready
✅ Dependencies installed
✅ Project built
✅ Claude Desktop configured
✅ MCP Server working!

✅ Setup Complete!
```

## After Setup

Roger should:
1. Restart Claude Desktop
2. Copy PDFs to `source/` directory
3. Run: `npm run process source data/lancedb`
4. Query in Claude Desktop

## Troubleshooting Commands

If Claude needs to debug:

```bash
# Check Ollama
curl http://localhost:11434/api/tags

# Check models
ollama list

# Test MCP
node src/tools/test-mcp-server.js

# Check build
npm run build

# Check Claude config
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

## Token-Efficient Approach

Claude should:
- ✅ Run commands directly
- ✅ Only show errors (not full output)
- ✅ Fix issues automatically when possible
- ✅ Ask Roger only if manual intervention needed
- ❌ Don't explain every step
- ❌ Don't show full logs unless error

This keeps token usage minimal while ensuring successful setup.
