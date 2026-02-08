---
name: solid-principles
description: SOLID design principles for object-oriented software architecture. Use when designing classes, refactoring code, or reviewing code structure.
---

# SOLID Principles

## Single Responsibility Principle (SRP)
A class should have one, and only one, reason to change.

**Example**: Separate data access from business logic
```typescript
// Bad: Mixed responsibilities
class DocumentService {
  processDocument(doc: Document) { /* Processing logic */ }
  saveToDatabase(doc: Document) { /* DB logic */ }
}

// Good: Single responsibilities
class DocumentProcessor {
  process(doc: Document) { /* Processing logic */ }
}
class DocumentStore {
  save(doc: Document) { /* DB logic */ }
}
```

## Open/Closed Principle (OCP)
Software entities should be open for extension, closed for modification.

**Example**: Use interfaces and composition
```typescript
interface DocumentClassifier {
  classify(doc: Document): DocumentType;
}

class StructuralClassifier implements DocumentClassifier {
  classify(doc: Document) { /* Structural logic */ }
}

class ArchitecturalClassifier implements DocumentClassifier {
  classify(doc: Document) { /* Architectural logic */ }
}
```

## Liskov Substitution Principle (LSP)
Subtypes must be substitutable for their base types without altering correctness.

## Interface Segregation Principle (ISP)
Many specific interfaces are better than one general-purpose interface.

**Example**: Split large interfaces
```typescript
// Bad: Fat interface
interface Processor {
  processText(): void;
  processImage(): void;
  processTable(): void;
}

// Good: Segregated interfaces
interface TextProcessor { processText(): void; }
interface ImageProcessor { processImage(): void; }
interface TableProcessor { processTable(): void; }
```

## Dependency Inversion Principle (DIP)
Depend on abstractions, not concretions.

**Example**: Inject dependencies
```typescript
// Bad: Direct dependency
class SearchEngine {
  private db = new LanceDB();
}

// Good: Depend on abstraction
interface VectorStore {
  search(query: string): Promise<Result[]>;
}

class SearchEngine {
  constructor(private store: VectorStore) {}
}
```

## When to Apply

- Designing new classes and modules
- Refactoring existing code
- Reviewing code for maintainability
- Resolving tight coupling issues
