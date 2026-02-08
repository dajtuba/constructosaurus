# ClaudeHopper 2.0

Modern RAG system for construction documents with vision-language capabilities.

## Features

- **Hybrid Search**: Vector + keyword search with reranking
- **Vision AI**: CAD drawing analysis using Claude Vision
- **Smart Processing**: Document classification and intelligent chunking
- **Caching**: LRU cache for fast repeated queries
- **MCP Integration**: Model Context Protocol server for Claude Desktop

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your API keys
```

3. Build:
```bash
npm run build
```

4. Run:
```bash
npm start
```

## Usage

### Search Documents
```typescript
{
  "tool": "search_construction_docs",
  "query": "foundation details with anchor bolts",
  "discipline": "Structural",
  "top_k": 10
}
```

### Ingest Document
```typescript
{
  "tool": "ingest_document",
  "pdfPath": "/path/to/drawing.pdf"
}
```

### Analyze Drawing
```typescript
{
  "tool": "analyze_drawing",
  "imagePath": "/path/to/drawing.png",
  "query": "What is the concrete strength?"
}
```

## Architecture

```
PDF → Classification → Processing → Embedding → LanceDB
                                                    ↓
Query → Embedding → Vector Search → Reranking → Results
```

## Configuration

See `.env.example` for all configuration options.

## Development

```bash
npm run dev      # Development mode
npm run test     # Run tests
npm run lint     # Lint code
```

## License

MIT
