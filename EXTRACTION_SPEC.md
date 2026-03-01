# Data Extraction Improvements

## Priority 1: Fix Empty Schedule Types

### Pier Schedule Parser (32 schedules, 0 entries)
- Tables are detected but not parsed
- Need to extract: mark, diameter, depth, rebar (vertical/spiral), concrete strength, grid location, top elevation
- Location: `src/extraction/structural-table-parser.ts`

### Unknown Schedules (47 schedules, 0 entries)
- Classify into: notes, legend, sheet_metadata, or retry with flexible schema
- Add classification logic before discarding

## Priority 2: Deduplication

Current issue: B1/W18x106 appears 4x per page (duplicates)

Implement composite key checking:
- beam_schedule: `sheetNumber + mark + gridLocation`
- pier_schedule: `sheetNumber + mark + gridLocation`  
- door_schedule: `sheetNumber + mark`

Location: `src/storage/schedule-store.ts` - add dedup check in `addEntry()`

## Priority 3: Data Quality

### Add Confidence Scoring
- Vision extraction should return confidence (0.0-1.0)
- Flag entries < 0.90 for review
- Location: `src/vision/ollama-vision-analyzer.ts`

### Required Metadata
All entries need: sheetNumber, pageNumber, discipline, confidence, boundingBox, extractedAt

## Priority 4: Enhanced Field Extraction

### Beam Schedule
Add: length, gridStart, gridEnd, camber, connectionLeft, connectionRight, quantity

### Door Schedule  
Add: height, frameType, doorType, hardwareSet, fireRating, roomFrom, roomTo

### New Schedule Types
- footing_schedule
- joist_schedule
- column_schedule
- connection_schedule
- anchor_bolt_schedule

## Reference
Full spec: See user feedback with JSON schema examples
