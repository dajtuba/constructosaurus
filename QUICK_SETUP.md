# Quick Setup with Claude

Roger, copy and paste this into Claude:

---

```
I just cloned constructosaurus. Run ./setup.sh and handle any errors. Only show me errors or the final success message. When done, tell me to restart Claude Desktop.
```

---

That's it! Claude will:
- Run the setup script
- Fix any issues silently
- Only report errors or success
- Minimal token usage

## Alternative: Step-by-Step

If Roger wants more control:

```
Help me set up constructosaurus step by step:
1. Check if Node.js is installed
2. Run ./setup.sh
3. Fix any errors
4. Test the MCP server
Report status after each step.
```

## For Troubleshooting

If setup fails, Roger can ask:

```
Setup failed. Run diagnostics and fix the issue:
- Check Ollama status
- Check model downloads
- Check npm build
- Test MCP server
Fix what's broken and report.
```

## Token Usage Estimate

- **Simple setup**: ~500-1000 tokens (just runs script)
- **With errors**: ~2000-3000 tokens (troubleshooting)
- **Full explanation**: ~5000+ tokens (not needed)

By using the simple prompt, Roger gets setup done with minimal token usage!
