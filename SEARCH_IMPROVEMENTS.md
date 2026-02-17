# Search Improvements for Structural Queries

## Problem
When asking "how many steel beams", Claude couldn't find the specific structural framing plans (S2.1, S2.2) that contain beam schedules with W18x106, W10x100 designations.

## Root Causes

1. **Poor Vision Extraction**: S2.1 exists in database but text extraction was minimal ("er\nProject Contact...")
2. **Query Not Specific Enough**: Generic "steel beams" query didn't match framing plan content
3. **Tool Guidance Unclear**: Claude didn't know to use `summary` → `get_result_details` workflow

## Improvements Applied

### 1. Query Expansion (`query-intent-detector.ts`)
Added `expandQuery()` method that automatically adds relevant terms:

```typescript
// "steel beams" → "steel beams S2.1 S2.2 framing plan structural plan"
if (/\b(beam|steel|column|framing)\b/i.test(query)) {
  expansions.push('S2.1', 'S2.2', 'framing plan', 'structural plan');
}
```

**Impact**: Structural queries now automatically search for framing plan drawings.

### 2. Enhanced Intent Detection
Added structural keywords to quantity_takeoff pattern:
- `beams?`, `columns?`, `footings?`

Added W-shape pattern to specifications:
- `W\d+x\d+` (matches W18x106, W10x100, etc.)

**Impact**: Better classification of structural queries.

### 3. Improved Tool Descriptions (`mcp/tools.ts`)

**count_items**:
- Added: "For steel beams, searches for W-shapes (W18x106, W10x100, etc.) in structural schedules"

**search_construction_docs**:
- Added: "For structural queries, automatically searches framing plans (S2.1, S2.2)"

**get_result_details**:
- Added: "Use after summary search to drill down into S2.1 (First Floor Framing), S2.2 (Roof Framing)"
- Added: "This retrieves the complete content including beam schedules and quantities"

**Impact**: Claude now understands the two-step workflow:
1. Use `summary=true` to find relevant drawings
2. Use `get_result_details` with specific drawing numbers

## Recommended Workflow

For "how many steel beams" queries, Claude should now:

1. **First try**: `count_items(item="steel beams")` - checks schedules directly
2. **If no schedules**: `search_construction_docs(query="steel beams", summary=true)` - finds S2.1, S2.2
3. **Then**: `get_result_details(drawingNumber="S2.1", query="steel beams")` - gets full content
4. **Repeat**: `get_result_details(drawingNumber="S2.2", query="steel beams")` - gets roof framing

## Known Limitation

The S2.1 text extraction is poor because the vision analysis didn't properly extract the beam schedule table. This is a **data quality issue**, not a search issue.

**Solution**: Re-process the PDF with better vision prompts or table extraction:
```bash
npm run process source data/lancedb
```

Consider adding specific prompts for structural drawings in `src/vision/ollama-vision-analyzer.ts`.

## Testing

After restart Claude Desktop:
```
Q: "How many steel beams are in the project?"

Expected flow:
1. count_items(item="steel beams") → checks schedules
2. If empty, search_construction_docs(query="steel beams", summary=true)
3. Response: "Found S2.1, S2.2"
4. get_result_details(drawingNumber="S2.1")
5. get_result_details(drawingNumber="S2.2")
```

## Files Modified

- `src/search/query-intent-detector.ts` - Added expandQuery() method
- `src/search/hybrid-search-engine.ts` - Use expanded query for embeddings
- `src/mcp/tools.ts` - Improved tool descriptions
