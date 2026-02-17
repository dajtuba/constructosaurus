# GLM-OCR Model Upgrade

## Changes

Upgraded vision model from `llava:13b` to `glm-ocr` for better table and schedule extraction from construction drawings.

## Why GLM-OCR?

GLM-OCR is specifically designed for:
- **Table extraction** - Accurately reconstructs tables with proper structure
- **Document understanding** - Trained on structured documents
- **Semantic Markdown output** - Returns well-formatted data
- **Formula recognition** - Handles technical drawings with dimensions

## Installation

```bash
ollama pull glm-ocr  # 2.2GB download
```

## Code Changes

**File:** `src/vision/ollama-vision-analyzer.ts`

```typescript
// Before
constructor(ollamaUrl: string = "http://localhost:11434", model: string = "llava:13b")

// After  
constructor(ollamaUrl: string = "http://localhost:11434", model: string = "glm-ocr")
```

## Expected Improvements

### Before (llava:13b)
S2.1 extraction:
```
er
Project Contact
Project ArchitectProject
...
```

### After (glm-ocr)
S2.1 extraction should include:
```
BEAM SCHEDULE
Mark | Size      | Length | Qty | Location
B1   | W18x106  | 24'-0" | 2   | Grid A-B
B2   | W10x100  | 18'-6" | 4   | Grid C-D
...
```

## Re-processing Required

To apply the new model:

```bash
cd ~/Desktop/rogers-house
npm run process source data/lancedb
```

This will:
1. Re-analyze all PDFs with GLM-OCR
2. Extract beam schedules properly
3. Update the LanceDB database

**Time:** ~5-10 minutes for the Sitka Construction Shell Set PDF

## Testing

After re-processing, test with:
```
Q: "How many steel beams are in the project?"
```

Should now return accurate count with beam designations (W18x106, W10x100, etc.)

## Rollback

If GLM-OCR doesn't work well:

```bash
# Revert code change
git checkout src/vision/ollama-vision-analyzer.ts

# Or manually change back to llava:13b
npm run build
npm run process source data/lancedb
```

## Alternative Models

If GLM-OCR doesn't meet needs:
- `llama3.2-vision:11b` - General purpose, good OCR
- `yasserrmd/Nanonets-OCR-s` - Compact, fast table extraction
- `qwen2.5-vl:7b` - Document understanding specialist

## References

- GLM-OCR: https://ollama.com/library/glm-ocr
- Benchmark: https://a2aprotocol.ai/blog/2026-glm-ocr-complete-guide
