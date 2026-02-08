# Constructosaurus API Reference

## Overview

Constructosaurus provides a Model Context Protocol (MCP) API for interacting with construction document data. The API is exposed through MCP tools that can be called by LLM agents or directly via the MCP server.

## MCP Tools

### search_construction_docs

Search construction documents with semantic search and metadata filtering.

**Parameters:**
- `query` (string, required): Search query (e.g., 'foundation details', 'steel connections')
- `discipline` (string, optional): Filter by discipline: Structural, Architectural, Mechanical, Electrical, Civil, Plumbing
- `drawingType` (string, optional): Filter by drawing type: Plan, Elevation, Section, Detail, Schedule, Specification
- `project` (string, optional): Filter by project name
- `top_k` (number, optional): Number of results to return (default: 10)

**Returns:** Array of relevant document chunks with context and metadata

**Example:**
```typescript
{
  query: "foundation details",
  discipline: "Structural",
  top_k: 5
}
```

---

### extract_materials

Extract materials list from construction documents.

**Parameters:**
- `query` (string, required): What materials to extract (e.g., 'foundation materials', 'all structural materials')
- `discipline` (string, optional): Filter by discipline to narrow search
- `drawingNumber` (string, optional): Extract from specific drawing number
- `top_k` (number, optional): Number of document chunks to analyze (default: 20)

**Returns:** Structured material data with quantities and specifications

**Example:**
```typescript
{
  query: "all structural steel",
  discipline: "Structural"
}
```

---

### compile_supply_list

Compile aggregated supply list from extracted materials.

**Parameters:**
- `query` (string, required): What to include in supply list (e.g., 'all materials', 'structural only')
- `discipline` (string, optional): Filter by discipline
- `groupBy` (string, optional): Group by: material (default), category, location

**Returns:** Formatted supply list with totals grouped by specified criteria

**Example:**
```typescript
{
  query: "all materials",
  groupBy: "category"
}
```

---

### analyze_document

Get high-level analysis of a construction document.

**Parameters:**
- `project` (string, optional): Filter by project name
- `documentId` (string, optional): Analyze specific document

**Returns:** Document analysis including project info, disciplines, drawing types, and structure

**Example:**
```typescript
{
  project: "Rogers House"
}
```

---

## Service APIs

### ScheduleQueryService

Query interface for schedule data stored in LanceDB.

**Methods:**
- `query(params: SearchParams): Promise<SearchResult[]>` - Query schedules with filters
- `getScheduleById(id: string): Promise<Schedule>` - Retrieve specific schedule
- `listSchedules(filters?: object): Promise<Schedule[]>` - List all schedules with optional filters

---

### QuantityCalculator

Calculate material quantities from extracted data.

**Methods:**
- `calculateQuantities(materials: Material[]): Promise<QuantityResult>` - Calculate totals
- `aggregateByType(materials: Material[]): Promise<AggregatedResult>` - Group and sum by type
- `estimateWaste(quantity: number, wastePercent: number): number` - Apply waste factor

---

### HybridSearchEngine

Hybrid search combining vector similarity and keyword matching.

**Methods:**
- `search(query: string, filters?: SearchFilters): Promise<SearchResult[]>` - Perform hybrid search
- `vectorSearch(embedding: number[], top_k: number): Promise<SearchResult[]>` - Vector-only search
- `keywordSearch(query: string, filters?: SearchFilters): Promise<SearchResult[]>` - Keyword-only search

---

## Data Types

### SearchParams
```typescript
interface SearchParams {
  query: string;
  discipline?: string;
  drawingType?: string;
  project?: string;
  top_k?: number;
}
```

### SearchResult
```typescript
interface SearchResult {
  id: string;
  text: string;
  project: string;
  discipline: string;
  drawingType: string;
  drawingNumber: string;
  score: number;
}
```

### Schedule
```typescript
interface Schedule {
  id: string;
  type: string;
  headers: string[];
  rows: string[][];
  source: string;
  pageNumber?: number;
}
```

### Material
```typescript
interface Material {
  name: string;
  quantity?: number;
  unit?: string;
  specification?: string;
  source: string;
}
```

---

## Error Handling

All API methods return standard error responses:

```typescript
{
  error: string;
  code: string;
  details?: any;
}
```

**Common Error Codes:**
- `INVALID_QUERY`: Query parameters are invalid
- `NOT_FOUND`: Requested resource not found
- `EXTRACTION_FAILED`: Failed to extract data
- `STORAGE_ERROR`: Database operation failed

---

## Rate Limiting

No rate limiting currently implemented. For production use, consider implementing rate limiting at the MCP server level.

---

## Authentication

MCP tools are currently unauthenticated. For production deployment, implement authentication at the MCP server level.
