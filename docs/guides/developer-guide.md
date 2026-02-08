# Developer Guide

## Development Setup

### Environment

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Watch mode for development
npm run build -- --watch
```

### Project Structure

```
src/
├── extraction/       # Data extraction from PDFs
├── processing/       # Document processing pipeline
├── storage/          # LanceDB storage layer
├── services/         # Business logic services
├── vision/           # Computer vision processors
├── classification/   # Document classification
├── search/           # Search and retrieval
├── embeddings/       # Text embedding generation
├── cache/            # Query caching
├── mcp/              # MCP server and tools
├── tools/            # CLI tools and scripts
└── types.ts          # TypeScript type definitions
```

## Adding New Features

### Adding a New Extractor

1. Create extractor in `src/extraction/`:

```typescript
// src/extraction/my-extractor.ts
export class MyExtractor {
  async extract(document: Document): Promise<ExtractedData> {
    // Extraction logic
    return extractedData;
  }
}
```

2. Register in processing pipeline:

```typescript
// src/processing/document-processor.ts
import { MyExtractor } from '../extraction/my-extractor';

const myExtractor = new MyExtractor();
const data = await myExtractor.extract(document);
```

### Adding a New MCP Tool

1. Define tool in `src/mcp/tools.ts`:

```typescript
{
  name: "my_tool",
  description: "Description of what the tool does",
  inputSchema: {
    type: "object",
    properties: {
      param1: {
        type: "string",
        description: "Parameter description"
      }
    },
    required: ["param1"]
  }
}
```

2. Implement handler in MCP server

### Adding New Document Types

1. Update `CONSTRUCTION_TAXONOMY` in `src/types.ts`:

```typescript
export const CONSTRUCTION_TAXONOMY = {
  disciplines: [..., "NewDiscipline"],
  drawingTypes: [..., "NewType"],
  // ...
};
```

2. Add classification logic in `src/classification/document-classifier.ts`

3. Create specialized processor if needed

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test
npm test -- test-name

# Run with coverage
npm test -- --coverage
```

### Writing Tests

Create test files in `src/tools/test-*.ts`:

```typescript
import { MyExtractor } from '../extraction/my-extractor';

async function testMyExtractor() {
  const extractor = new MyExtractor();
  const result = await extractor.extract(testDocument);
  
  console.assert(result.length > 0, "Should extract data");
  console.log("✓ Test passed");
}

testMyExtractor();
```

## Code Style

### TypeScript Guidelines

- Use strict mode
- Define interfaces for all data structures
- Avoid `any` type
- Use async/await over promises
- Export types alongside implementations

### Naming Conventions

- **Files**: kebab-case (`my-extractor.ts`)
- **Classes**: PascalCase (`MyExtractor`)
- **Functions**: camelCase (`extractData`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRIES`)
- **Interfaces**: PascalCase (`ExtractedData`)

### Error Handling

```typescript
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  console.error("Operation failed:", error);
  throw new Error(`Failed to process: ${error.message}`);
}
```

## Performance Optimization

### Caching

Use query cache for repeated queries:

```typescript
import { QueryCache } from '../cache/query-cache';

const cache = new QueryCache();
const cached = cache.get(queryKey);
if (cached) return cached;

const result = await expensiveOperation();
cache.set(queryKey, result);
return result;
```

### Batch Processing

Process multiple documents in parallel:

```typescript
const results = await Promise.all(
  documents.map(doc => processor.process(doc))
);
```

### Vector Store Optimization

- Use appropriate embedding dimensions
- Batch insert operations
- Create indexes for frequently queried fields

## Debugging

### Enable Verbose Logging

```typescript
// Set environment variable
process.env.DEBUG = "constructosaurus:*";
```

### Inspect Database

```bash
npm run inspect-db
```

### Test Individual Components

```bash
npm run test-extraction
npm run test-search
npm run test-vision
```

## Contributing

### Workflow

1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes and test
3. Commit with descriptive message
4. Push and create pull request

### Commit Messages

Follow conventional commits:
- `feat: Add new extractor`
- `fix: Correct schedule parsing`
- `docs: Update API documentation`
- `refactor: Simplify processing pipeline`
- `test: Add extraction tests`

### Code Review

- Ensure tests pass
- Update documentation
- Follow code style guidelines
- Add comments for complex logic

## Deployment

### Building for Production

```bash
npm run build
npm prune --production
```

### Environment Variables

Required for production:
- `ANTHROPIC_API_KEY`: Claude API key
- `NODE_ENV=production`
- `DB_PATH`: Path to LanceDB directory

### Running in Production

```bash
NODE_ENV=production node dist/mcp/server.js
```

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [LanceDB Documentation](https://lancedb.github.io/lancedb/)
- [MCP Protocol Spec](https://modelcontextprotocol.io/)
- [Anthropic API Docs](https://docs.anthropic.com/)
