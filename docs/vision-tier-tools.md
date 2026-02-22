# Vision Tier MCP Tools

## Overview

The Vision Tier provides on-demand analysis of construction drawings using the Ollama `glm-ocr` model. These tools analyze PNG images in `/tmp/` and return structured JSON with extracted data and confidence scores.

## Tools

### 1. `analyze_zone`
Analyze specific zone of a drawing sheet.

**Parameters:**
- `sheet` (required): Sheet identifier (e.g., 'S2.1', 'S3.0')
- `zone` (required): Zone to analyze ('left', 'center', 'right', 'top', 'bottom')
- `query` (required): What to look for (e.g., 'joist specifications', 'beam callouts')

**Example:**
```json
{
  "sheet": "S2.1",
  "zone": "left", 
  "query": "Find joist specifications"
}
```

### 2. `analyze_drawing`
Analyze entire drawing sheet.

**Parameters:**
- `sheet` (required): Sheet identifier
- `query` (required): What to analyze (e.g., 'all structural members', 'framing layout')

**Example:**
```json
{
  "sheet": "S2.1",
  "query": "Extract all structural members"
}
```

### 3. `extract_callout`
Extract specific callout text from drawing at given location.

**Parameters:**
- `sheet` (required): Sheet identifier
- `location` (required): Location description (e.g., 'left bay', 'grid A-B', 'center beam')

**Example:**
```json
{
  "sheet": "S2.1",
  "location": "left bay"
}
```

### 4. `verify_spec`
Verify specification against actual drawing.

**Parameters:**
- `sheet` (required): Sheet identifier
- `location` (required): Location to verify
- `expected` (required): Expected specification (e.g., '14" TJI 560 @ 16" OC')

**Example:**
```json
{
  "sheet": "S2.1",
  "location": "left bay",
  "expected": "14\" TJI 560 @ 16\" OC"
}
```

## Image Resolution

The tools automatically find images in `/tmp/` using these patterns:
- `shell-set-page-33-33.png` for S2.1
- `shell-set-page-35-35.png` for S3.0
- `shell-s21-left-33.png` for zone-specific images
- Generic patterns matching sheet identifiers

## Output Format

All tools return structured data with:
- `success`: Boolean indicating if analysis succeeded
- `data`: Extracted structural data (beams, columns, joists, etc.)
- `confidence`: Analysis confidence score (0.0-1.0)
- `error`: Error message if analysis failed

## Performance

- **Speed**: 2-5 seconds per analysis (depends on image size)
- **Accuracy**: 80-95% confidence for structural elements
- **Cost**: Free (uses local Ollama)

## Integration

These tools are automatically available in Claude Desktop when the MCP server is running. Use them for:
- Verification of database results
- Detailed callout extraction
- Follow-up questions about specific drawing areas
- Conflict resolution between documents