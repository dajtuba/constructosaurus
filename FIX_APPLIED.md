# Fix Applied: Vision-Extracted Beam Data Now Searchable

## Problem
When searching for "steel beams W18x106 W10x100", the system returned:
- Generic references like "STEEL BEAM, PT-3"
- Sheet titles like "FIRST FLOOR FRAMING PLAN S2.1"
- But NOT the actual beam specifications (W18x106, quantities, lengths)

## Root Cause
The `IntelligentDocumentProcessor` was extracting beam callouts via vision analysis and storing them in `scheduleStore`, but this data was never added to the searchable `sheet.text` field that gets embedded for vector search.

## Solution
Modified `/src/processing/intelligent-processor.ts` to:
1. After vision analysis extracts beams, augment the corresponding sheet's text with formatted beam data
2. Re-embed the sheet with the enriched text
3. Same for columns

## Code Changes
```typescript
// After storing beams in scheduleStore, now also:
const sheetIndex = sheets.findIndex(s => s.pageNumber === pageNum);
if (sheetIndex !== -1) {
  const beamText = visionResult.beams
    .map(b => `BEAM: ${b.mark}${b.gridLocation ? ` at ${b.gridLocation}` : ''}${b.count ? ` (QTY: ${b.count})` : ''}`)
    .join('\n');
  sheets[sheetIndex].text += `\n\nVISION-EXTRACTED STRUCTURAL MEMBERS:\n${beamText}`;
  
  // Re-embed with enriched text
  const enrichedText = sheets[sheetIndex].text.substring(0, 2000);
  sheets[sheetIndex].vector = await this.embedService.embedQuery(enrichedText);
}
```

## Impact
- Searches for "W18x106" will now return the actual structural framing plans
- Beam quantities and locations are now discoverable via semantic search
- No changes needed to search API or MCP tools

## Next Steps
To see the improvement:
1. Reprocess your PDFs: `npm run process source data/lancedb`
2. Search for specific beam sizes: "W18x106 steel beam"
3. The results should now include the vision-extracted specifications

## Remaining Improvements Needed
See IMPROVEMENTS.md for:
- Better OCR for dimension strings
- Schedule table reading
- Drawing-specific search filters
- Structured data extraction for common elements
