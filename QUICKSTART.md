# Quick Start Guide

## Prerequisites

- Node.js 18+ installed
- Anthropic API key (get from https://console.anthropic.com/)
- Optional: Cohere API key for reranking (get from https://cohere.com/)

## Installation

1. **Clone or navigate to the project**
```bash
cd /Users/dryjohn/Desktop/rogers-house
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
```bash
cp .env.example .env
```

Edit `.env` and add your API keys:
```bash
ANTHROPIC_API_KEY=sk-ant-...
COHERE_API_KEY=...  # Optional
```

4. **Build the project**
```bash
npm run build
```

## Running the Demo

Test the system with sample construction documents:

```bash
npm run demo
```

This will:
- Initialize the embedding and search services
- Create sample construction documents (foundation details, steel connections, floor plans)
- Generate embeddings and index documents
- Run test queries and display results

Expected output:
```
🏗️  ClaudeHopper 2.0 Demo

✅ Initializing services...
✅ Services initialized

📄 Creating sample construction documents...
🔢 Generating embeddings...
✅ Documents indexed

🔍 Testing search queries...

Query: "foundation details with anchor bolts"
  1. [S-101] Foundation detail showing anchor bolts embedded 12 inches into concrete...
     Score: 0.9234

Query: "steel beam connections"
  1. [S-201] Structural steel beam connection detail. W12x26 beam to W14x30 column...
     Score: 0.9156

Query: "residential floor plan"
  1. [A-101] Floor plan showing layout of residential units. Living room 15'x20'...
     Score: 0.8987

✅ Demo complete!
```

## Using as MCP Server

### 1. Start the server

```bash
npm start
```

The server runs on stdio and waits for MCP protocol messages.

### 2. Configure Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "claudehopper": {
      "command": "node",
      "args": ["/Users/dryjohn/Desktop/rogers-house/dist/index.js"]
    }
  }
}
```

### 3. Restart Claude Desktop

The ClaudeHopper tools will now be available in Claude Desktop.

## Available Tools

### 1. search_construction_docs

Search indexed construction documents.

**Parameters:**
- `query` (required): Search query
- `discipline` (optional): Filter by discipline (Structural, Architectural, etc.)
- `drawingType` (optional): Filter by type (Plan, Elevation, Section, Detail)
- `project` (optional): Filter by project name
- `top_k` (optional): Number of results (default: 10)

**Example:**
```json
{
  "query": "foundation details with anchor bolts",
  "discipline": "Structural",
  "top_k": 5
}
```

### 2. ingest_document

Process and index a PDF document.

**Parameters:**
- `pdfPath` (required): Path to PDF file

**Example:**
```json
{
  "pdfPath": "/path/to/structural-drawings.pdf"
}
```

### 3. analyze_drawing

Analyze a construction drawing image.

**Parameters:**
- `imagePath` (required): Path to image file
- `query` (optional): Specific question about the drawing

**Example:**
```json
{
  "imagePath": "/path/to/foundation-detail.png",
  "query": "What is the concrete strength?"
}
```

## Troubleshooting

### "Cannot find module" errors
```bash
npm install
npm run build
```

### "ANTHROPIC_API_KEY not set"
Make sure `.env` file exists and contains your API key:
```bash
cat .env
```

### Database errors
Delete the database and restart:
```bash
rm -rf ./data/lancedb
npm run demo
```

### Node version issues
Upgrade to Node 18+:
```bash
nvm install 18
nvm use 18
```

## Next Steps

1. **Index your documents**: Use `ingest_document` to add your construction PDFs
2. **Test searches**: Try different queries and filters
3. **Analyze drawings**: Use `analyze_drawing` on CAD images
4. **Customize**: Modify `src/types.ts` to add custom metadata fields
5. **Optimize**: Enable Cohere reranking for better results

## Development

### Run in development mode
```bash
npm run dev
```

### Run tests (when implemented)
```bash
npm test
```

### Format code
```bash
npm run format
```

## Support

For issues or questions:
1. Check `IMPLEMENTATION.md` for architecture details
2. Review the refactoring plan in `# ClaudeHopper Refactoring Plan for 2025.md`
3. Check the code comments in `src/` directory

## Performance Tips

1. **Enable caching**: Set `ENABLE_CACHING=true` in `.env`
2. **Use reranking**: Add Cohere API key and set `ENABLE_RERANKING=true`
3. **Batch ingestion**: Process multiple documents at once
4. **Filter queries**: Use discipline/type filters to narrow results
5. **Adjust top_k**: Start with smaller values (5-10) for faster results
