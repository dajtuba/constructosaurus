---
name: domain-driven-design
description: Domain-Driven Design patterns for construction document processing. Use when modeling business logic, designing aggregates, or establishing bounded contexts.
---

# Domain-Driven Design

## Ubiquitous Language
Use consistent domain terminology across code, docs, and conversations.

**Example**: If domain experts call it "Schedule", don't call it "Table" in code.

## Bounded Contexts
Define clear boundaries between different domain models.

**Example**: "Document" in Processing context vs "Document" in Search context may have different attributes.

## Entities
Objects with identity that persists over time.

```typescript
class ConstructionDocument {
  constructor(
    private readonly id: DocumentId,
    private classification: DocumentType,
    private chunks: Chunk[]
  ) {}
  
  getId(): DocumentId { return this.id; }
  
  equals(other: ConstructionDocument): boolean {
    return this.id.equals(other.id);
  }
}
```

## Value Objects
Immutable objects defined by their attributes, not identity.

```typescript
class Dimension {
  constructor(
    private readonly value: number,
    private readonly unit: string
  ) {}
  
  equals(other: Dimension): boolean {
    return this.value === other.value && 
           this.unit === other.unit;
  }
}
```

## Aggregates
Cluster of entities and value objects with consistency boundaries.

```typescript
class Schedule { // Aggregate Root
  private items: ScheduleItem[] = [];
  
  addItem(item: ScheduleItem): void {
    // Enforce invariants
    if (this.isLocked) {
      throw new Error('Cannot modify locked schedule');
    }
    this.items.push(item);
  }
}
```

## Domain Events
Capture significant occurrences in the domain.

```typescript
class DocumentProcessed {
  constructor(
    public readonly documentId: DocumentId,
    public readonly processedAt: Date
  ) {}
}
```

## Repositories
Abstract data access patterns.

```typescript
interface DocumentRepository {
  findById(id: DocumentId): Promise<Document | null>;
  save(doc: Document): Promise<void>;
  findByType(type: DocumentType): Promise<Document[]>;
}
```

## Domain Services
Domain logic that doesn't naturally fit in entities or value objects.

```typescript
class MaterialCalculator {
  calculateQuantity(schedule: Schedule, item: string): number {
    // Logic involving multiple aggregates
  }
}
```

## When to Use DDD

- Complex business domains
- Rich domain logic beyond CRUD
- Systems with multiple bounded contexts
- When ubiquitous language adds clarity
