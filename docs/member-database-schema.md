# Member Database Schema Documentation

## Overview

LanceDB schema for storing member cross-references between Shell-Set, Structural Calc, and ForteWEB documents. Enables fast queries by designation, sheet, or member type.

## Tables

### 1. Members Table
Stores individual member records with cross-document references.

```typescript
interface MemberRecord {
  designation: string;           // Primary key: D1, D2, D3, etc.
  shell_set_spec: string;       // Shell-Set specification
  shell_set_sheet: string;      // Sheet name (S2.1, S2.2, etc.)
  shell_set_location: string;   // Location description
  structural_spec?: string;     // Structural calc specification
  structural_page?: number;     // Structural calc page number
  forteweb_spec?: string;       // ForteWEB specification
  forteweb_page?: number;       // ForteWEB page number
  has_conflict: boolean;        // True if specs don't match
  member_type: string;          // joist, beam, column, etc.
  embedding: number[];          // Vector embedding for search
}
```

**Indexes:**
- Primary: `designation`
- Secondary: `shell_set_sheet`, `member_type`

### 2. Sheets Table
Stores sheet metadata for image references.

```typescript
interface SheetRecord {
  name: string;                 // Primary key: S2.1, S2.2, etc.
  page_number: number;          // PDF page number
  sheet_type: string;           // floor_framing, roof_framing, details, schedules
  image_path: string;           // Path to extracted PNG
  member_count: number;         // Number of members on sheet
  embedding: number[];          // Vector embedding for search
}
```

**Indexes:**
- Primary: `name`
- Secondary: `sheet_type`

### 3. Conflicts Table
Tracks specification mismatches between documents.

```typescript
interface ConflictRecord {
  id: string;                   // Primary key: UUID
  designation: string;          // Member designation (D1, D2, etc.)
  conflict_type: string;        // spec_mismatch, missing_forteweb, etc.
  shell_set_value: string;      // Value from Shell-Set
  forteweb_value?: string;      // Value from ForteWEB (if exists)
  severity: string;             // high, medium, low
  embedding: number[];          // Vector embedding for search
}
```

**Indexes:**
- Primary: `id`
- Secondary: `designation`, `conflict_type`, `severity`

## Usage Examples

### Initialize Database
```bash
npm run init-member-db
```

### Query by Designation
```typescript
const member = await memberDb.getMember('D1');
// Returns: Full member info with cross-references
```

### Query by Sheet
```typescript
const members = await memberDb.getMembersBySheet('S2.1');
// Returns: All members on sheet S2.1
```

### Query by Type
```typescript
const joists = await memberDb.getMembersByType('joist');
// Returns: All joist members
```

### Get Conflicts
```typescript
const conflicts = await memberDb.getConflicts();
// Returns: All specification conflicts
```

## Performance

- **Fast queries**: Direct index lookups by designation, sheet, or type
- **Vector search**: Semantic search across all fields
- **Scalability**: Handles thousands of members efficiently

## Integration

The member database integrates with:
- **Vision extraction**: Populates from Shell-Set analysis
- **Structural parsing**: Links to structural calculations
- **ForteWEB parsing**: Links to ForteWEB reports
- **MCP tools**: Provides data for Claude Desktop queries

## Migration

To initialize or migrate the database:

1. Run `npm run init-member-db` to create tables
2. Use `MemberDatabase.addMember()` to populate data
3. Use `MemberDatabase.addConflict()` to track issues

## Schema Evolution

The schema supports:
- **Adding fields**: New optional fields can be added
- **Indexing**: Additional indexes for performance
- **Relationships**: Foreign key relationships between tables