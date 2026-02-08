# Testing Constructosaurus with Real PDFs

## System Architecture

Constructosaurus is an **MCP (Model Context Protocol) server** that:
1. Runs as a background service
2. Connects to Claude Desktop via MCP
3. Provides tools for ingesting and querying construction documents
4. Stores processed data in LanceDB for semantic search

## How to Test with Your Sitka PDFs

### Step 1: Start the MCP Server

The server should already be configured in your Claude Desktop MCP settings.

Check: `~/.config/Claude/claude_desktop_config.json`

Should contain:
```json
{
  "mcpServers": {
    "constructosaurus": {
      "command": "node",
      "args": ["/Users/dryjohn/Desktop/rogers-house/dist/index.js"],
      "env": {
        "ANTHROPIC_API_KEY": "your-key",
        "DATABASE_PATH": "/Users/dryjohn/Desktop/rogers-house/data/lancedb"
      }
    }
  }
}
```

### Step 2: Ingest PDFs via Claude Desktop

In Claude Desktop, use the MCP tool to ingest each PDF:

**Ingest Construction Shell Set:**
```
Use the ingest_document tool with:
pdfPath: /Users/dryjohn/Desktop/rogers-house/docs/blueprints/Sitka Construction Shell Set.pdf
```

**Ingest Specifications:**
```
Use the ingest_document tool with:
pdfPath: /Users/dryjohn/Desktop/rogers-house/docs/blueprints/Sitka Shell Set - Outline Specifications.pdf
```

**Ingest Structural Calculations:**
```
Use the ingest_document tool with:
pdfPath: /Users/dryjohn/Desktop/rogers-house/docs/blueprints/Sitka Structural Calculations -- Permit Set (09-19-2025).pdf
```

**Ingest Memo:**
```
Use the ingest_document tool with:
pdfPath: /Users/dryjohn/Desktop/rogers-house/docs/blueprints/Sitka CD Shell Set Memo .pdf
```

### Step 3: Query the Ingested Data

Once ingested, you can query via Claude Desktop:

**Example Queries:**

"Search for all concrete specifications"
```
Use search_construction_docs tool with:
query: concrete specifications
discipline: Structural
```

"Find all rebar callouts"
```
Use search_construction_docs tool with:
query: rebar #4 #5 reinforcement
discipline: Structural
```

"Extract materials from foundation drawings"
```
Use extract_materials tool with:
query: foundation materials
```

"Get door schedule"
```
Use query_schedule tool with:
scheduleType: door
```

### Step 4: Verify Extraction

The system will:
1. ✅ Process PDFs through vision pipeline
2. ✅ Extract text, tables, and annotations
3. ✅ Store in LanceDB with embeddings
4. ✅ Enable semantic search across all documents
5. ✅ Track context (phase, location, conditionals)
6. ✅ Detect cross-document conflicts
7. ✅ Calculate derived materials

## What Gets Extracted

From your Sitka PDFs, the system will extract:

- **Structural materials**: Concrete, rebar, steel beams, columns
- **Framing materials**: Lumber dimensions and quantities
- **Finishes**: Plywood, drywall, paint, tile
- **MEP**: Pipes, conduit, fixtures
- **Schedules**: Door, window, beam, column schedules
- **Annotations**: Callouts, notes, dimensions
- **Specifications**: Material specs from outline specs

## Testing the Pipeline

To verify everything works:

1. **Ingest one PDF first** (start with the memo - smallest file)
2. **Query for something specific** you know is in that document
3. **Verify results** - should return relevant chunks with context
4. **Ingest remaining PDFs**
5. **Test cross-document queries** - search across all documents
6. **Test conflict detection** - query same material from different docs

## Troubleshooting

**If ingestion fails:**
- Check MCP server is running: Look for Constructosaurus in Claude Desktop MCP status
- Check file paths are absolute
- Check ANTHROPIC_API_KEY is set
- Check logs in Claude Desktop developer console

**If search returns no results:**
- Verify documents were ingested successfully
- Check LanceDB path exists: `data/lancedb/`
- Try broader search queries first
- Check embeddings are being generated

**If extraction is incomplete:**
- PDFs may need OCR if they're scanned images
- Complex CAD drawings may need vision processing
- Tables may need manual verification

## Next Steps After Testing

Once ingestion works:
1. Query for specific materials you need
2. Generate supply lists
3. Detect quantity conflicts between documents
4. Calculate derived materials (fasteners, adhesives)
5. Export to cost estimates
