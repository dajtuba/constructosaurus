# Getting Started with Constructosaurus

## Prerequisites

- Node.js 18+ and npm
- TypeScript 5+
- Anthropic API key (for Claude)
- Ollama (optional, for local LLM)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd rogers-house
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

4. Build the project:
```bash
npm run build
```

## Quick Start

### 1. Ingest a Construction Document

```bash
npm run ingest -- path/to/document.pdf
```

This will:
- Process the PDF
- Extract schedules, materials, and dimensions
- Store data in LanceDB
- Generate embeddings for search

### 2. Search Documents

```typescript
import { HybridSearchEngine } from './src/search/hybrid-search-engine';

const searchEngine = new HybridSearchEngine();
const results = await searchEngine.search("foundation details", {
  discipline: "Structural",
  top_k: 5
});

console.log(results);
```

### 3. Extract Materials

```typescript
import { MaterialsExtractor } from './src/extraction/materials-extractor';

const extractor = new MaterialsExtractor();
const materials = await extractor.extract({
  query: "all structural steel",
  discipline: "Structural"
});

console.log(materials);
```

### 4. Query Schedules

```typescript
import { ScheduleQueryService } from './src/services/schedule-query-service';

const queryService = new ScheduleQueryService();
const schedules = await queryService.query({
  query: "beam schedule",
  project: "Rogers House"
});

console.log(schedules);
```

## Using the MCP Server

Constructosaurus can be used as an MCP server with Claude Desktop or other MCP clients.

### Setup with Claude Desktop

1. Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "constructosaurus": {
      "command": "node",
      "args": ["/path/to/rogers-house/dist/mcp/server.js"],
      "env": {
        "ANTHROPIC_API_KEY": "your-key-here"
      }
    }
  }
}
```

2. Restart Claude Desktop

3. Use MCP tools in conversations:
   - "Search for foundation details"
   - "Extract all structural materials"
   - "Compile a supply list"

## Common Tasks

### Process Multiple Documents

```bash
for file in data/*.pdf; do
  npm run ingest -- "$file"
done
```

### Export Data

```typescript
import { ScheduleStore } from './src/storage/schedule-store';

const store = new ScheduleStore();
const allSchedules = await store.listAll();
console.log(JSON.stringify(allSchedules, null, 2));
```

### Clear Database

```bash
rm -rf data/lancedb
```

## Troubleshooting

### "Cannot find module" errors
Run `npm run build` to compile TypeScript

### "ANTHROPIC_API_KEY not found"
Check your `.env` file has the correct API key

### "LanceDB connection failed"
Ensure `data/lancedb` directory exists and is writable

### Vision processing fails
Install Ollama and pull the llava model:
```bash
ollama pull llava
```

## Next Steps

- Read the [Developer Guide](./developer-guide.md) for advanced usage
- Check the [API Reference](../api/README.md) for detailed API docs
- Review [Architecture Overview](../architecture/overview.md) to understand the system
