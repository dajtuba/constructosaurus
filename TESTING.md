# Testing Constructosaurus with Real PDFs

## System Architecture

Constructosaurus processes PDFs **locally using Ollama** (free, no API costs):

1. **Offline Processing**: `npm run process` - Uses Ollama LLaVA for vision analysis
2. **Storage**: Processed data stored in LanceDB with embeddings
3. **MCP Server**: Provides search/query tools to Claude Desktop
4. **Query**: Claude Desktop queries the pre-processed data (no re-processing)

**Key Point**: PDFs are processed ONCE with Ollama, then queried many times via MCP (cheap).

## Prerequisites

1. **Ollama installed and running**:
```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull the vision model
ollama pull llava:13b

# Pull the embedding model
ollama pull mxbai-embed-large

# Verify Ollama is running
curl http://localhost:11434/api/tags
```

2. **Build the project**:
```bash
npm install
npm run build
```

## Step 1: Process Your Sitka PDFs with Ollama

This runs **locally** using Ollama (no API costs):

```bash
# Process all PDFs in docs/blueprints/
npm run process docs/blueprints data/lancedb
```

This will:
- ✅ Convert PDFs to images
- ✅ Analyze with Ollama LLaVA (vision model - FREE)
- ✅ Extract schedules, dimensions, materials
- ✅ Generate embeddings with Ollama (FREE)
- ✅ Store in LanceDB at `data/lancedb/`

**Expected output:**
```
📚 Constructosaurus 2.0 - Document Processing

📁 Source directory: docs/blueprints
💾 Database path: data/lancedb
📋 Schedule store: data/schedules
👁️  Vision analysis: ENABLED (Ollama LLaVA - FREE)

Found 4 PDF(s) to process:

  1. Sitka CD Shell Set Memo .pdf
  2. Sitka Construction Shell Set.pdf
  3. Sitka Shell Set - Outline Specifications.pdf
  4. Sitka Structural Calculations -- Permit Set (09-19-2025).pdf

[1/4] Processing: Sitka CD Shell Set Memo .pdf
======================================================================
✅ Processed: 2 sheets, 0 schedules

[2/4] Processing: Sitka Construction Shell Set.pdf
======================================================================
✅ Processed: 45 sheets, 12 schedules

... etc ...

💾 Storing in database...
✅ Stored 150 sheets in database

📊 Summary:
  Total sheets: 150
  Total schedules: 25
  Processing time: 15m 30s
```

## Step 2: Inspect What Was Extracted

```bash
npm run inspect data/lancedb
```

Shows what's in the database:
- Document count
- Schedule types found
- Sample entries

## Step 3: Query via MCP (Optional)

If you want to query via Claude Desktop:

### Configure MCP Server

Edit `~/.config/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "constructosaurus": {
      "command": "node",
      "args": ["/Users/dryjohn/Desktop/rogers-house/dist/index.js"],
      "env": {
        "DATABASE_PATH": "/Users/dryjohn/Desktop/rogers-house/data/lancedb",
        "OLLAMA_URL": "http://localhost:11434",
        "EMBED_MODEL": "mxbai-embed-large"
      }
    }
  }
}
```

### Restart Claude Desktop

Now you can query in Claude Desktop:
- "Search for all concrete specifications"
- "Find rebar callouts in foundation drawings"
- "Show me the door schedule"

**Note**: Queries use embeddings (cheap), not re-processing PDFs.

## Step 4: Test Locally (Without MCP)

You can also test search locally:

```bash
# Run demo with your processed data
npm run demo
```

Or create a custom test script to query specific materials.

## What Gets Extracted (via Ollama Vision)

From your Sitka PDFs:

- **Schedules**: Door, window, beam, column schedules (tables)
- **Dimensions**: All dimension strings (24'-6", 3'-0", etc.)
- **Item Counts**: Repeated symbols (doors, windows, etc.)
- **Materials**: Text-based material specifications
- **Callouts**: Annotations and notes
- **Structural Data**: Rebar, concrete, steel specifications

## Cost Comparison

**Old Way (Claude Vision API)**:
- $0.80 per image (1600x1200)
- 100 pages = $80
- Every re-process = $80

**New Way (Ollama LLaVA)**:
- $0 (runs locally)
- Process once, query forever
- No API costs

## Troubleshooting

**Ollama not running:**
```bash
# Start Ollama
ollama serve

# In another terminal, verify
curl http://localhost:11434/api/tags
```

**Model not found:**
```bash
ollama pull llava:13b
ollama pull mxbai-embed-large
```

**Processing fails:**
- Check PDFs are readable (not encrypted)
- Check disk space for image conversion
- Check Ollama has enough RAM (8GB+ recommended for llava:13b)

**No results in search:**
- Verify processing completed successfully
- Check `data/lancedb/` directory exists and has data
- Try broader search queries

## Next Steps After Processing

Once PDFs are processed:

1. **Query for materials**: Search for specific materials you need
2. **Extract quantities**: Get material quantities from schedules
3. **Detect conflicts**: Find mismatches between documents
4. **Generate supply lists**: Aggregate materials across all documents
5. **Calculate derived materials**: Fasteners, adhesives, finishes

All of this uses the pre-processed data - no re-processing needed!
