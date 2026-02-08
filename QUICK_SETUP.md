# Quick Setup with Claude

Roger, copy and paste this ONE prompt into Claude:

---

```
Clone https://github.com/dajtuba/constructosaurus.git to my Desktop 
(install git if needed), run ./setup.sh, and handle any errors. Only 
show me errors or the final success message. When done, tell me to 
restart Claude Desktop.
```

---

That's it! Claude will:
1. **Install git if not present** (Mac: via Xcode tools, Linux: apt/yum)
2. Clone the repo to ~/Desktop/constructosaurus
3. Run the setup script
4. Install Ollama and AI models
5. Fix any issues silently
6. Only report errors or success
7. Tell you to restart Claude Desktop

**Total time:** 10-15 minutes (mostly downloading AI models)
**Token usage:** ~500-1500 tokens (slightly more if git needs installing)
**Roger's effort:** Copy/paste one prompt

## What Claude Does Automatically

```bash
# If git not installed:
# Mac: xcode-select --install (prompts user once)
# Linux: sudo apt-get install git -y

cd ~/Desktop
git clone https://github.com/dajtuba/constructosaurus.git
cd constructosaurus
./setup.sh
# Handles any errors
# Tests MCP server
# Reports success
```

## If Git Installation Requires User Action

On Mac, if git isn't installed, Claude will:
1. Run `xcode-select --install`
2. Tell Roger: "Click 'Install' in the popup that appeared"
3. Wait for Roger to confirm
4. Continue with clone and setup

This is the ONLY potential user interaction needed.

## Alternative: More Control

If Roger wants to see progress:

```
Clone https://github.com/dajtuba/constructosaurus.git to my Desktop 
(install git if needed) and set it up. Show me progress for major 
steps (installing git, cloning, installing Ollama, downloading models, 
building). Fix any errors automatically.
```

## For Troubleshooting

If something goes wrong:

```
I have constructosaurus on my Desktop. Run diagnostics and fix any 
issues with the setup. Check git, Ollama, models, npm build, and MCP 
configuration.
```

## After Setup

Roger just needs to:
1. Restart Claude Desktop (can't be automated)
2. Copy PDFs: `cp ~/my-pdfs/*.pdf ~/Desktop/constructosaurus/source/`
3. Process: `cd ~/Desktop/constructosaurus && npm run process source data/lancedb`
4. Query in Claude Desktop!

## Token Usage Estimate

- **One-prompt setup (git installed)**: ~500-1000 tokens
- **One-prompt setup (git needs install)**: ~1000-1500 tokens
- **With progress updates**: ~1500-2000 tokens  
- **With troubleshooting**: ~2000-3000 tokens
- **Manual step-by-step**: ~5000+ tokens

The one-prompt approach is the most efficient!
