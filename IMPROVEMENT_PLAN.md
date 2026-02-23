# Improving Vision Confidence & Quantity Accuracy

## Current Performance
- **Vision Confidence:** 75-85%
- **Quantity Accuracy:** 70-80%

---

## Vision Confidence Improvements

### 1. Better Vision Models (Immediate Impact)
**Current:** glm-ocr (2.2GB, general OCR)

**Upgrade Options:**
```bash
# Try larger vision models with better accuracy
ollama pull llama3.2-vision:11b    # 7GB, better reasoning
ollama pull llama3.2-vision:90b    # 55GB, highest accuracy
ollama pull qwen2-vl:7b            # 4.7GB, specialized for documents
```

**Expected Improvement:** 75-85% → 85-95% confidence

**Trade-off:** Slower analysis (5-10s vs 2-5s)

---

### 2. Image Preprocessing (High Impact)
**Problem:** Construction drawings have low contrast, small text

**Solutions:**
```typescript
// Add to vision pipeline
async preprocessImage(imagePath: string): Promise<string> {
  // 1. Increase contrast
  await sharp(imagePath)
    .normalize()  // Auto-adjust contrast
    .sharpen()    // Enhance edges
    .toFile(preprocessedPath);
  
  // 2. Crop to zone (reduce noise)
  await sharp(imagePath)
    .extract({ left: zoneX, top: zoneY, width: zoneW, height: zoneH })
    .toFile(croppedPath);
  
  // 3. Increase resolution for small text
  await sharp(imagePath)
    .resize({ width: originalWidth * 2 })  // 2x upscale
    .toFile(highResPath);
}
```

**Expected Improvement:** +5-10% confidence

**Cost:** Minimal (preprocessing is fast)

---

### 3. Multi-Pass Extraction (Medium Impact)
**Strategy:** Ask same question multiple ways, compare results

```typescript
async extractWithConfidence(image: string, target: string) {
  // Pass 1: Direct question
  const result1 = await vision.analyze(image, 
    `What is the joist specification in the left area?`);
  
  // Pass 2: Multiple choice
  const result2 = await vision.analyze(image,
    `Is the joist spec: A) 14" TJI 560, B) 11 7/8" TJI 360, C) 2x10?`);
  
  // Pass 3: Verification
  const result3 = await vision.analyze(image,
    `Confirm: Is "14\" TJI 560 @ 16\" OC" visible? Yes/No`);
  
  // Compare results, return consensus
  return findConsensus([result1, result2, result3]);
}
```

**Expected Improvement:** +10-15% confidence

**Cost:** 3x slower (but can cache)

---

### 4. Prompt Engineering (Low Effort, Medium Impact)
**Current Prompts:** Generic

**Improved Prompts:**
```typescript
// BAD (current)
const prompt = `Find the joist specification`;

// GOOD (specific)
const prompt = `You are analyzing a construction floor framing plan.

Look for FLOOR JOIST callouts in the LEFT third of the drawing.

Floor joists are typically labeled with:
- Depth: 11 7/8", 14", 16", etc.
- Type: TJI, I-joist, or dimensional lumber (2x10, 2x12)
- Series: TJI 360, TJI 560, etc.
- Spacing: @ 12" OC, @ 16" OC, @ 19.2" OC, @ 24" OC

Return ONLY the exact text you see, including spacing.
Example: "14\" TJI 560 @ 16\" OC"

If you cannot find a clear joist callout, return "NOT FOUND"`;
```

**Expected Improvement:** +5-10% confidence

**Cost:** Zero (just better prompts)

---

### 5. Ensemble Models (High Impact, High Cost)
**Strategy:** Use multiple vision models, vote on results

```typescript
async ensembleExtraction(image: string, query: string) {
  const models = ['glm-ocr', 'llama3.2-vision', 'qwen2-vl'];
  
  const results = await Promise.all(
    models.map(model => analyzeWithModel(image, query, model))
  );
  
  // Weighted voting (better models get more weight)
  return weightedConsensus(results, {
    'glm-ocr': 1.0,
    'llama3.2-vision': 1.5,
    'qwen2-vl': 1.2
  });
}
```

**Expected Improvement:** 75-85% → 90-95% confidence

**Cost:** 3x slower, 3x disk space

---

## Quantity Accuracy Improvements

### 1. Extract Dimensions from Plans (Critical)
**Current:** Assumes 24' spans (guessing)

**Solution:** Use vision to extract actual dimensions

```typescript
async extractDimensions(image: string, zone: string) {
  const prompt = `Find all dimension strings in the ${zone} area.

Look for:
- Span dimensions: 24'-6", 18'-0", 12'-3"
- Grid spacing: 16'-0", 20'-0"
- Bay widths: 12'-0", 14'-0"

Return JSON:
{
  "spans": ["24'-6\"", "18'-0\""],
  "grid_spacing": ["16'-0\""],
  "bay_widths": ["12'-0\""]
}`;

  return await vision.analyze(image, prompt);
}
```

**Expected Improvement:** 70-80% → 85-90% accuracy

**Critical:** This is the biggest gap right now

---

### 2. Count Grid Lines (High Impact)
**Current:** Assumes 3 zones

**Solution:** Count actual grid lines to determine bays

```typescript
async countBays(image: string) {
  const prompt = `Count the vertical grid lines on this floor plan.

Grid lines are labeled with letters (A, B, C, D...) or numbers (1, 2, 3...).

Return JSON:
{
  "grid_lines": ["A", "B", "C", "D"],
  "bay_count": 3
}`;

  const result = await vision.analyze(image, prompt);
  return result.bay_count;  // Use actual count, not assumption
}
```

**Expected Improvement:** +5-10% accuracy

---

### 3. Cross-Check with Schedules (Medium Impact)
**Current:** No validation against schedules

**Solution:** Compare calculated quantities with schedule totals

```typescript
async validateQuantities(calculated: MaterialTakeoff, schedules: Schedule[]) {
  for (const item of calculated.items) {
    const scheduleEntry = schedules.find(s => s.spec === item.spec);
    
    if (scheduleEntry && scheduleEntry.quantity) {
      const diff = Math.abs(item.quantity - scheduleEntry.quantity);
      const percentDiff = (diff / scheduleEntry.quantity) * 100;
      
      if (percentDiff > 20) {
        console.warn(`Quantity mismatch: ${item.spec}`);
        console.warn(`Calculated: ${item.quantity}, Schedule: ${scheduleEntry.quantity}`);
        
        // Use schedule value if available
        item.quantity = scheduleEntry.quantity;
        item.source = 'schedule';
      }
    }
  }
}
```

**Expected Improvement:** +10-15% accuracy

---

### 4. Parse Complex Spacing Patterns (Medium Impact)
**Current:** Only handles "@ 16\" OC"

**Solution:** Handle all spacing patterns

```typescript
function parseSpacing(spec: string): number | null {
  // Standard: "@ 16\" OC"
  let match = spec.match(/@\s*(\d+\.?\d*)\s*["']?\s*OC/i);
  if (match) return parseFloat(match[1]);
  
  // Metric: "@ 400mm OC"
  match = spec.match(/@\s*(\d+)\s*mm\s*OC/i);
  if (match) return parseFloat(match[1]) / 25.4;  // Convert to inches
  
  // Range: "@ 12\" to 16\" OC" (use average)
  match = spec.match(/@\s*(\d+)\s*["']?\s*to\s*(\d+)\s*["']?\s*OC/i);
  if (match) return (parseFloat(match[1]) + parseFloat(match[2])) / 2;
  
  // Variable: "@ 16\"/19.2\" OC" (use first)
  match = spec.match(/@\s*(\d+\.?\d*)\s*["']/);
  if (match) return parseFloat(match[1]);
  
  return null;  // Can't parse
}
```

**Expected Improvement:** +5% accuracy

---

### 5. Add Waste Factor (Low Impact, Industry Standard)
**Current:** Exact calculations

**Solution:** Add 10-15% waste factor

```typescript
function calculateWithWaste(baseQuantity: number, materialType: string): number {
  const wasteFactor = {
    'joist': 1.10,      // 10% waste
    'beam': 1.05,       // 5% waste
    'plate': 1.15,      // 15% waste (cuts)
    'column': 1.05      // 5% waste
  };
  
  const factor = wasteFactor[materialType] || 1.10;
  return Math.ceil(baseQuantity * factor);
}
```

**Expected Improvement:** More realistic estimates (not accuracy per se)

---

## Implementation Priority

### Phase 1: Quick Wins (1-2 hours)
1. ✅ Better prompts (prompt engineering)
2. ✅ Parse complex spacing patterns
3. ✅ Add waste factors

**Expected:** 75-85% → 80-88% confidence, 70-80% → 75-85% accuracy

### Phase 2: Medium Effort (2-4 hours)
1. ✅ Image preprocessing (contrast, crop, upscale)
2. ✅ Extract dimensions from plans
3. ✅ Count grid lines
4. ✅ Cross-check with schedules

**Expected:** 80-88% → 85-92% confidence, 75-85% → 85-92% accuracy

### Phase 3: High Effort (4-8 hours)
1. ✅ Multi-pass extraction with consensus
2. ✅ Upgrade to better vision models
3. ✅ Ensemble models (multiple models voting)

**Expected:** 85-92% → 90-95% confidence, 85-92% → 90-95% accuracy

---

## Cost-Benefit Analysis

| Improvement | Effort | Impact | Cost |
|-------------|--------|--------|------|
| Better prompts | 1h | +5-10% | Free |
| Image preprocessing | 2h | +5-10% | Minimal |
| Extract dimensions | 3h | +15-20% | Free |
| Multi-pass extraction | 2h | +10-15% | 3x slower |
| Better vision model | 1h | +10-15% | Slower, more disk |
| Ensemble models | 4h | +15-20% | 3x slower, 3x disk |

---

## Recommended Approach

**Start with Phase 1 (Quick Wins):**
1. Improve prompts with construction-specific context
2. Add dimension extraction (biggest gap)
3. Parse all spacing patterns
4. Add waste factors

**Then Phase 2 if needed:**
1. Preprocess images (contrast, crop)
2. Count actual grid lines
3. Cross-check with schedules

**Phase 3 only if critical:**
- Use for high-stakes projects
- When 90%+ accuracy required
- Accept slower performance

---

## Expected Final Performance

**After Phase 1+2:**
- Vision Confidence: 85-92%
- Quantity Accuracy: 85-92%
- Processing Time: 3-5s per image
- Good enough for: Preliminary estimates, bid preparation

**After Phase 3:**
- Vision Confidence: 90-95%
- Quantity Accuracy: 90-95%
- Processing Time: 10-15s per image
- Good enough for: Final estimates, material ordering

**Reality Check:**
- 100% accuracy impossible (even humans disagree)
- 90-95% is professional-grade
- Always verify critical quantities manually
