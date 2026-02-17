# Remaining Improvements for Structural Drawing Search

## 1. Enhanced Vision Prompt for Structural Details

**Current State**: Vision prompt asks for beam callouts but is too generic

**Needed**: More specific prompts for structural drawings:
```typescript
// Structural-specific prompt
if (discipline === 'Structural') {
  prompt = `Extract ALL structural member callouts:
  - Steel beams: W18x106, W10x100, W12x65 with lengths (e.g., "34'-6\"")
  - Columns: W14x90, HSS8x8x1/2 with grid locations
  - Joists: 18K4, 22K9 with spacing
  - Dimensions: Member lengths, spacing, elevations
  - Quantities: Count of each member type
  
  Format: {"mark": "W18x106", "length": "34'-6\"", "gridLocation": "A-B/1-2", "count": 1}`;
}
```

**File**: `/src/vision/ollama-vision-analyzer.ts`

## 2. Drawing-Specific Search Filters

**Current State**: Search across all documents returns mixed results

**Needed**: Add discipline and sheet filters to search:
```typescript
// In search_construction_docs tool
{
  query: "W18x106",
  discipline: "Structural",
  sheetNumbers: ["S2.1", "S3.0"],  // NEW
  drawingType: "Framing Plan"       // Already exists
}
```

**Files**: 
- `/src/index.ts` (MCP tool schema)
- `/src/search/hybrid-search-engine.ts` (filter implementation)

## 3. Schedule Table Reading

**Current State**: Vision extracts some schedules but misses tabulated data

**Needed**: Dedicated table parser for structural schedules:
```typescript
interface BeamSchedule {
  mark: string;        // B1, B2, B3
  size: string;        // W18x106
  length: string;      // 34'-6"
  quantity: number;    // 1
  location: string;    // Grid A-B
}

// Parse beam schedule tables from vision results
parseBeamScheduleTable(visionResult: VisionAnalysisResult): BeamSchedule[]
```

**File**: `/src/processing/schedule-parser.ts` (new method)

## 4. Dimension String Extraction

**Current State**: Dimensions are stored but not structured

**Needed**: Parse and structure dimension strings:
```typescript
interface Dimension {
  value: string;       // "34'-6\""
  element: string;     // "beam length"
  gridRef: string;     // "between A-B"
  normalized: number;  // 414 inches
}
```

**File**: `/src/extraction/dimension-extractor.ts` (new)

## 5. Structured Material Takeoff

**Current State**: Materials are extracted as comma-separated strings

**Needed**: Structured material list with quantities:
```typescript
interface MaterialTakeoff {
  category: string;    // "Structural Steel"
  items: Array<{
    description: string;  // "W18x106 steel beam"
    quantity: number;     // 1
    unit: string;         // "EA"
    length?: string;      // "34'-6\""
    weight?: number;      // calculated from size
  }>;
}
```

**File**: `/src/services/material-takeoff-service.ts` (new)

## 6. Cross-Document Correlation

**Current State**: Each sheet is processed independently

**Needed**: Detect conflicts between documents:
```typescript
// Example: Beam size mismatch
{
  issue: "Size mismatch",
  element: "Beam at Grid A/1",
  documents: [
    { sheet: "S2.1", value: "W18x106" },
    { sheet: "S3.0", value: "W18x96" }  // Conflict!
  ]
}
```

**File**: `/src/services/conflict-detector.ts` (new)

## 7. Better OCR for CAD Text

**Current State**: PDF text extraction misses small CAD annotations

**Needed**: 
- Use vision model specifically for text-heavy regions
- OCR enhancement for dimension strings and callouts
- Post-process to clean up common OCR errors (0 vs O, 1 vs I)

**File**: `/src/vision/cad-text-enhancer.ts` (new)

## 8. Symbol Recognition

**Current State**: Vision sees symbols but doesn't classify them

**Needed**: Train or prompt for structural symbols:
- Beam symbols (I-beam cross-section)
- Column symbols (square/circular)
- Connection symbols (bolted, welded)
- Foundation symbols (pier, footing)

**File**: `/src/vision/symbol-recognizer.ts` (new)

## Implementation Priority

1. **High Priority** (fixes immediate search issues):
   - Enhanced vision prompt for structural details (#1)
   - Drawing-specific search filters (#2)

2. **Medium Priority** (improves data quality):
   - Schedule table reading (#3)
   - Dimension string extraction (#4)

3. **Low Priority** (nice-to-have features):
   - Structured material takeoff (#5)
   - Cross-document correlation (#6)
   - Better OCR (#7)
   - Symbol recognition (#8)

## Testing Strategy

After each improvement:
1. Reprocess test PDFs: `npm run process source data/lancedb`
2. Run test queries:
   - "W18x106 steel beam"
   - "beam schedule S2.1"
   - "structural framing plan first floor"
3. Verify results include specific callouts, not just generic references

## Notes

- All improvements should maintain backward compatibility
- Vision analysis is expensive (time), so cache results
- Consider adding a "reprocess with vision" flag for existing documents
