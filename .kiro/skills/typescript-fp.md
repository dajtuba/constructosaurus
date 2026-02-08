---
name: typescript-fp
description: TypeScript functional programming patterns. Use when writing TypeScript code with arrays, transformations, or data processing. Prefer functional methods over imperative loops.
---

# TypeScript Functional Programming

## Core Principles

- **Prefer `const` over `let`**: Immutability by default
- **Use functional array methods**: `map`, `filter`, `reduce`, `flatMap` over loops
- **Pure functions**: Predictable, no side effects
- **Function composition**: Build complex behavior from simple functions

## Array Operations

### Prefer Functional Methods

```typescript
// ✅ Good: Functional approach
const structuralDocs = documents.filter(doc => doc.type === 'Structural');
const titles = documents.map(doc => doc.title);
const totalPages = documents.reduce((sum, doc) => sum + doc.pageCount, 0);
const allTags = documents.flatMap(doc => doc.tags);

// Chain operations
const processedChunks = rawChunks
  .filter(isValid)
  .map(normalize)
  .sort(compareByRelevance);

// ❌ Avoid: Imperative loops
const structuralDocs = [];
for (const doc of documents) {
  if (doc.type === 'Structural') {
    structuralDocs.push(doc);
  }
}
```

### Common Patterns

```typescript
// Transform and filter
const processDocuments = (docs: Document[]): ProcessedDoc[] =>
  docs
    .filter(doc => doc.isValid)
    .map(doc => ({
      id: doc.id,
      title: doc.title,
      chunks: doc.chunks.length
    }));

// Group by with reduce
const groupByType = (docs: Document[]): Record<string, Document[]> =>
  docs.reduce((groups, doc) => ({
    ...groups,
    [doc.type]: [...(groups[doc.type] || []), doc]
  }), {} as Record<string, Document[]>);

// Find first match
const findStructural = (docs: Document[]): Document | null =>
  docs.find(doc => doc.type === 'Structural') ?? null;

// Check conditions
const hasStructural = docs.some(doc => doc.type === 'Structural');
const allProcessed = docs.every(doc => doc.isProcessed);
```

## Immutable Updates

```typescript
// ✅ Good: Immutable operations
const updateDocument = (doc: Document, updates: Partial<Document>): Document => ({
  ...doc,
  ...updates,
  updatedAt: new Date()
});

const addChunk = (doc: Document, chunk: Chunk): Document => ({
  ...doc,
  chunks: [...doc.chunks, chunk]
});

// ❌ Avoid: Mutation
doc.chunks.push(chunk);
Object.assign(doc, updates);
```

## Type Safety

```typescript
// Use readonly for immutability
interface ReadonlyDocument {
  readonly id: string;
  readonly title: string;
  readonly chunks: readonly Chunk[];
}

// Readonly arrays
const processDocuments = (docs: readonly Document[]): readonly ProcessedDoc[] =>
  docs.map(processDocument);
```

## When to Use Loops

Use `for...of` only when:
- Early termination is needed (`break`)
- Performance is critical for large datasets
- Side effects are unavoidable

Otherwise, prefer `map`, `filter`, `reduce`, `flatMap`, `find`, `some`, `every`.
