# Phase 2: Vision-Based Analysis - Implementation Plan

## Proof of Concept: VALIDATED ✅

Phase 2 proof of concept demonstrates that Claude Vision API can extract the missing data from Phase 1.

## What Phase 2 Will Extract

### 1. Graphical Schedules ✅
**Problem Solved**: Phase 1 found 49 tables but 0 schedule entries because schedules are graphical

**Vision Extraction**:
```json
{
  "scheduleType": "door_schedule",
  "entries": [
    {
      "mark": "D101",
      "width": "3'-0\"",
      "height": "7'-0\"",
      "type": "Solid Core",
      "hardware": "Lockset A"
    }
  ]
}
```

**Impact**: Extract door, window, and finish schedules from CAD drawings

### 2. Item Counts ✅
**Problem Solved**: Phase 1 cannot count how many items are needed

**Vision Extraction**:
```json
{
  "item": "Doors",
  "count": 12,
  "breakdown": {
    "D101": 3,
    "D102": 6,
    "D103": 3
  }
}
```

**Impact**: Know quantities for ordering (12 doors, 8 windows, etc.)

### 3. Dimension Strings ✅
**Problem Solved**: Phase 1 only gets dimensions from text, misses drawing annotations

**Vision Extraction**:
```json
{
  "location": "North wall",
  "value": "24'-6\"",
  "grid_reference": "Grid A to Grid D"
}
```

**Impact**: Complete dimensional data for calculations

### 4. Detail Callouts ✅
**Problem Solved**: Phase 1 cannot follow references between drawings

**Vision Extraction**:
```json
{
  "type": "detail_callout",
  "text": "3/S2.1",
  "detail_number": "3",
  "sheet": "S2.1",
  "location": "Footing F1"
}
```

**Impact**: Navigate from plan to detail to specification

## Supply List Capability Improvement

### Current (Phase 1): 30%
- ✅ Material types from text
- ❌ Quantities
- ❌ Graphical schedules
- ❌ Item counts

### After Phase 2: 70%
- ✅ Material types
- ✅ Graphical schedules
- ✅ Item counts
- ✅ Dimensions from drawings
- ❌ Calculated totals (need Phase 3)

### Example Query: "How much lumber do I need?"

**Phase 1 Response**:
```
I found these lumber specifications:
- Hem-Fir lumber
- Parallam PSL beams: 3 1/2" x 5 1/4"

But I cannot tell you quantities.
```

**Phase 2 Response**:
```
I found:
- 12 Parallam PSL beams: 3 1/2" x 5 1/4" x 12'-0"
- 24 Hem-Fir studs: 2x6 x 9'-7"
- 8 Douglas Fir headers: 2x8 x 6'-0"

Total linear feet: 
- Parallam: 144 LF
- Hem-Fir: 230 LF
- Douglas Fir: 48 LF
```

## Implementation Architecture

### Vision Analyzer
```typescript
class DrawingVisionAnalyzer {
  async analyzeDrawingPage(imagePath: string): Promise<{
    schedules: Schedule[];
    dimensions: Dimension[];
    itemCounts: ItemCount[];
    callouts: Callout[];
  }>;
}
```

### Integration Points
1. **Document Processor**: Add vision analysis after text extraction
2. **Schedule Store**: Store vision-extracted schedules
3. **MCP Tools**: Query vision-extracted data
4. **Quantity Calculator**: Use counts for totals (Phase 3)

## Cost Analysis

**Claude Vision API**: ~$3-8 per 1000 images

For Sitka project (40 pages):
- Cost: $0.12 - $0.32 per document
- One-time during ingestion
- Cached results

**ROI**: Eliminates manual schedule transcription (2-4 hours @ $50-100/hr = $100-400)

## Implementation Steps

### Step 1: Vision Service (Week 1)
- Create DrawingVisionAnalyzer
- PDF to image conversion
- Claude Vision API integration
- Schedule extraction prompts

### Step 2: Data Parsing (Week 1)
- Parse vision responses to structured data
- Validate extracted schedules
- Store in ScheduleStore

### Step 3: Item Counting (Week 2)
- Symbol recognition
- Count items by mark
- Aggregate quantities

### Step 4: Integration (Week 2)
- Add to IntelligentDocumentProcessor
- Update MCP tools
- End-to-end testing

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Schedule extraction accuracy | 90%+ | Manual validation |
| Item count accuracy | 95%+ | Compare to manual count |
| Dimension extraction | 85%+ | Spot check dimensions |
| Processing time | <5 sec/page | Timed tests |
| Cost per document | <$0.50 | API usage tracking |

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| API costs too high | Cache results, selective processing |
| Extraction errors | Confidence scores, manual review flag |
| Complex drawings | Fallback to text extraction |
| Rate limits | Batch processing, retry logic |

## Deliverables

1. **DrawingVisionAnalyzer** - Vision analysis service
2. **Schedule extraction** - Graphical table parsing
3. **Item counting** - Symbol-based counting
4. **Dimension extraction** - Drawing annotation parsing
5. **Integration tests** - Validate on real documents
6. **Documentation** - Usage guide and examples

## Status

✅ **Proof of Concept Complete**
- Vision capabilities validated
- Data structures defined
- Integration points identified

**Ready to implement Phase 2**

---

**Next**: Begin implementation with vision service and schedule extraction
