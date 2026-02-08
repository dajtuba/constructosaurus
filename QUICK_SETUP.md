# Quick Setup with Claude

Roger, copy and paste this ONE prompt into Claude:

---

```
Clone https://github.com/dajtuba/constructosaurus.git to my Desktop, 
run ./setup.sh, and handle any errors. Only show me errors or the 
final success message. When done, tell me to restart Claude Desktop.
```

---

That's it! Claude will:
1. Clone the repo to ~/Desktop/constructosaurus
2. Run the setup script
3. Fix any issues silently
4. Only report errors or success
5. Tell you to restart Claude Desktop

**Total time:** 10-15 minutes (mostly downloading AI models)
**Token usage:** ~500-1000 tokens
**Roger's effort:** Copy/paste one prompt

## What Claude Does Automatically

```bash
cd ~/Desktop
git clone https://github.com/dajtuba/constructosaurus.git
cd constructosaurus
./setup.sh
# Handles any errors
# Tests MCP server
# Reports success
```

## Alternative: More Control

If Roger wants to see progress:

```
Clone https://github.com/dajtuba/constructosaurus.git to my Desktop 
and set it up. Show me progress for major steps (cloning, installing 
Ollama, downloading models, building). Fix any errors automatically.
```

## For Troubleshooting

If something goes wrong:

```
I have constructosaurus on my Desktop. Run diagnostics and fix any 
issues with the setup. Check Ollama, models, npm build, and MCP 
configuration.
```

## After Setup

Roger just needs to:
1. Restart Claude Desktop (can't be automated)
2. Copy PDFs: `cp ~/my-pdfs/*.pdf ~/Desktop/constructosaurus/source/`
3. Process: `cd ~/Desktop/constructosaurus && npm run process source data/lancedb`
4. Query in Claude Desktop!

## Token Usage Estimate

- **One-prompt setup**: ~500-1000 tokens
- **With progress updates**: ~1500-2000 tokens  
- **With troubleshooting**: ~2000-3000 tokens
- **Manual step-by-step**: ~5000+ tokens

The one-prompt approach is the most efficient!
