# ClaudeHopper 2.0 - MCP Setup Instructions

## Step 1: Verify Files Are Ready

The system has already been built and configured. Verify these exist:

```bash
# Check compiled server exists
ls -lh /Users/dryjohn/Desktop/rogers-house/dist/index.js

# Check database exists
ls -lh /Users/dryjohn/Desktop/rogers-house/data/lancedb

# Should see:
# - dist/index.js (~13KB)
# - data/lancedb/ directory (~1.9MB)
```

## Step 2: Configure Claude Desktop

1. **Open Claude Desktop configuration file:**
   - Location: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - You can open it with: `open ~/Library/Application\ Support/Claude/claude_desktop_config.json`

2. **Replace the entire contents with this:**

```json
{
  "mcpServers": {
    "claudehopper": {
      "command": "node",
      "args": [
        "/Users/dryjohn/Desktop/rogers-house/dist/index.js"
      ],
      "env": {
        "DATABASE_PATH": "/Users/dryjohn/Desktop/rogers-house/data/lancedb",
        "OLLAMA_URL": "http://localhost:11434",
        "EMBED_MODEL": "nomic-embed-text"
      }
    }
  }
}
```

3. **Save the file**

## Step 3: Restart Claude Desktop

1. **Completely quit Claude Desktop:**
   - Press `Cmd + Q` (don't just close the window)
   - Or: Claude Desktop menu → Quit Claude Desktop

2. **Reopen Claude Desktop**

3. **Wait 5-10 seconds** for the MCP server to connect

## Step 4: Verify Connection

1. **Look for the 🔌 icon** in the bottom-right corner of Claude Desktop

2. **Click the 🔌 icon** - you should see:
   - Server name: "claudehopper"
   - Status: Connected (green)
   - Tools: 4 available tools

3. **If you see tools listed:**
   - ✅ search_construction_docs
   - ✅ extract_materials
   - ✅ ingest_document
   - ✅ analyze_drawing

   **You're ready!** Proceed to Step 5.

## Step 5: Test the System

Try these queries in Claude Desktop:

### Test 1: Basic Search
```
Search for foundation details in the construction documents
```

**Expected:** Claude will use the `search_construction_docs` tool and return results with drawing numbers and text snippets.

### Test 2: Materials Extraction
```
Extract materials needed for the foundation from the structural calculations
```

**Expected:** Claude will search relevant documents and generate a materials extraction prompt.

### Test 3: Specifications Search
```
What are the concrete specifications mentioned in the documents?
```

**Expected:** Results from Division 3 specifications and structural calculations.

### Test 4: Cross-Document Query
```
Search for beam sizing calculations in the structural documents
```

**Expected:** Results from the 293-page structural calculations document.

## Troubleshooting

### Issue: 🔌 icon shows "disconnected" or error

**Solution 1: Check Ollama is running**
```bash
curl http://localhost:11434
# Should return: "Ollama is running"
```

If not running:
```bash
open -a Ollama
```

**Solution 2: Check server logs**
- In Claude Desktop: Help → View Logs
- Look for errors related to "claudehopper"

**Solution 3: Test server manually**
```bash
cd /Users/dryjohn/Desktop/rogers-house
node dist/index.js
# Should print: "ClaudeHopper MCP Server running on stdio"
# Press Ctrl+C to stop
```

### Issue: Tools not showing up

**Solution:** Verify the config file has correct JSON syntax:
```bash
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | python3 -m json.tool
# Should print formatted JSON without errors
```

### Issue: "Database not found" error

**Solution:** Verify database exists:
```bash
ls -lh /Users/dryjohn/Desktop/rogers-house/data/lancedb
# Should show construction_docs.lance directory
```

If missing, reprocess documents:
```bash
cd /Users/dryjohn/Desktop/rogers-house
npm run process
```

## What's Available

### Documents Processed (353 sheets total):
1. **Sitka CD Shell Set Memo** (1 page)
2. **Sitka Construction Shell Set** (40 pages) - Architectural drawings
3. **Sitka Shell Set - Outline Specifications** (48 pages) - Specifications
4. **Sitka Structural Calculations** (293 pages) - Structural calculations

### Projects Detected:
- Sitka Project
- 216 Shotgun Alley, Sitka, AK 99835

### Disciplines Available:
- Architectural
- Structural
- General (Specifications)

## Example Queries to Try

**Search queries:**
- "Show me all structural drawings"
- "Find information about the foundation design"
- "What specifications are there for concrete?"
- "Search for beam calculations"

**Materials extraction:**
- "Extract all materials from the foundation section"
- "What materials are needed for the structural work?"
- "List materials mentioned in Division 3 specifications"

**Analysis:**
- "Summarize the structural calculations for the foundation"
- "What are the key specifications for this project?"
- "Compare the architectural drawings with the specifications"

## Success Indicators

✅ **You'll know it's working when:**
1. 🔌 icon shows "claudehopper" connected
2. Claude responds with specific drawing numbers (like "S-101", "A-201")
3. Results include project name "Sitka" or "216 Shotgun Alley"
4. Text snippets from actual documents appear in responses

## Need Help?

If you encounter issues:
1. Check all paths in the config match your system
2. Ensure Ollama is running
3. Verify database was created successfully
4. Check Claude Desktop logs for specific errors
