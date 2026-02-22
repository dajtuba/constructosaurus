# First Floor Framing Plan - Full Extraction Demo

**Source:** Shell-Set.pdf, Page 33  
**Sheet:** S2.1 - First Floor Framing Plan (Foundation Walls)  
**Extraction Date:** February 22, 2026

---

## What the Vision Model CAN Extract

### ✅ Text-Heavy Sections (Proven)

The glm-ocr model excels at extracting structured text from:

**1. Notes and Legends**
```
1. SW__ INDICATES SHEARWALL TYPE PER SCHEDULE 8/54.0
2. REFER TO GENERAL STRUCTURAL NOTES FOR FLOOR OR ROOF SHEATHING
3. COLUMNS SHALL BE DOUBLE STUD MINIMUM, UNLESS NOTED OTHERWISE
4. AT ALL SHEARWALLS PROVIDE DOUBLE TOP PLATES AND SPLICE PER 12/54.0
5. CS__ INDICATES COILED STRAP TYPE PER SCHEDULE 6/54.0
6. POSTS □, INCLUDING ENDS OF WALL OPENINGS, SHALL BE (2)2x6
7. RIM INDICATES 1/4" LVL
```

**2. Schedules and Tables** (from ForteWEB example)
```json
{
  "reference": "S2.1, D3",
  "specification": "2 x 10 HF No.2 @ 16\" OC",
  "status": "PASSED",
  "reactions": "1829 lbs",
  "shear": "1084 lbs @ 11 3/4\"",
  "moment": "837 Ft-lbs @ 8\"",
  "deflection": "0.004 in @ 1' 4 5/8\""
}
```

**3. Load Diagrams** (from Structural Calc example)
```
Loads extracted:
- 214 PLF
- 142 PLF
- 1231 LB
- 3450 LB
- 3254 LB
- 2343 LB

Dimensions:
- 5'-6"
- 22'-11"
- 16'-6"
- 6'-6"
```

---

## What Requires Targeted Extraction

### 🎯 Callouts on Floor Plans

For extracting specific framing callouts from the plan drawing itself (not the notes), 
we need to use **targeted extraction** with specific prompts for each area:

**Example: Left Side Floor Joists**
```typescript
const prompt = `Look at the LEFT portion of this floor plan.
Find the floor joist specification callout.
It will be text like "14\" TJI 560 @ 16\" OC" or similar.
Return only the exact text you find.`;
```

**Example: Beam Callouts**
```typescript
const prompt = `Find all beam callouts on this plan.
Look for text like "5 1/8\" x 18\" GLB" or "3 1/2\" x 14\" LVL".
List each one you find.`;
```

**Example: Section Markers**
```typescript
const prompt = `Find all circular section markers on this plan.
They look like circles with numbers/letters inside, like "3/S3.0".
List each marker you find.`;
```

---

## Hypothetical Full Floor Framing Extraction

If we ran targeted extraction on each area of S2.1, we would expect to find:

### Floor Joists
```json
{
  "left_area": {
    "specification": "14\" TJI 560 @ 16\" OC",
    "location": "Left side of plan, running north-south",
    "section_refs": ["3/S3.0", "4/S3.0"]
  },
  "center_area": {
    "specification": "2x10 @ 16\" OC",
    "designation": "D1",
    "location": "Center bay"
  },
  "right_area": {
    "specification": "11 7/8\" TJI 360 @ 16\" OC",
    "location": "Right side of plan"
  }
}
```

### Beams
```json
{
  "beams": [
    {
      "mark": "B1",
      "specification": "5 1/8\" x 18\" GLB",
      "location": "Grid line A",
      "span": "24'-6\""
    },
    {
      "mark": "B2",
      "specification": "3 1/2\" x 14\" LVL",
      "location": "Grid line B",
      "span": "18'-0\""
    }
  ]
}
```

### Sill Plates
```json
{
  "perimeter": {
    "specification": "2x14 PT",
    "location": "All exterior walls",
    "note": "Pressure treated"
  }
}
```

### Section References
```json
{
  "section_markers": [
    "3/S3.0",
    "4/S3.0",
    "5/S3.0",
    "6/S3.0",
    "7/S3.0",
    "8/S3.0"
  ]
}
```

### Shearwalls
```json
{
  "shearwalls": [
    {
      "mark": "SW1",
      "location": "North wall",
      "reference": "See schedule 8/S4.0"
    },
    {
      "mark": "SW2",
      "location": "South wall",
      "reference": "See schedule 8/S4.0"
    }
  ]
}
```

---

## Implementation Strategy

To extract all framing from S2.1, we would:

1. **Divide the plan into zones** (left, center, right, top, bottom)
2. **Run targeted extraction** for each zone with specific prompts
3. **Extract by type** (joists, beams, plates, columns, shearwalls)
4. **Cross-reference** with structural calcs and ForteWEB reports
5. **Assemble** into complete floor framing model

### Example Code Pattern
```typescript
async function extractCompleteFloorFraming(imagePath: string) {
  const zones = ['left', 'center', 'right'];
  const types = ['joists', 'beams', 'plates', 'sections'];
  
  const results = {};
  
  for (const zone of zones) {
    for (const type of types) {
      const prompt = buildPrompt(zone, type);
      results[`${zone}_${type}`] = await extract(imagePath, prompt);
    }
  }
  
  return assembleFramingModel(results);
}
```

---

## Current Tracer Bullet Status

The tracer bullet successfully demonstrates:
- ✅ End-to-end extraction pipeline
- ✅ Cross-document linking (D1 designation)
- ✅ Structured JSON output
- ✅ Conflict detection framework

**Next step:** Refine prompts for targeted extraction of specific callouts from plan drawings.

---

## Conclusion

**Question: "Give me the framing inventory needed for this floor plan"**

**Current Reality:** The vision model focuses on the notes section (clearest text) rather than 
extracting callouts from the plan drawing itself. When asked for inventory, it returns:
```
Materials:
- Floor joists: 1/4" stud minimum, unless noted otherwise.
- Beams: 1/4" stud minimum, unless noted otherwise.
...
```

This is pulling from note #3 ("COLUMNS SHALL BE DOUBLE STUD MINIMUM") rather than actual 
member callouts.

**Why This Happens:**
- The notes section has large, clear, structured text
- Plan callouts are smaller, scattered across the drawing
- The model naturally gravitates to the most readable text

**Solution for Full Inventory:**

To get actual framing inventory, we need a **two-phase approach**:

### Phase 1: Targeted Extraction (Zone by Zone)
```typescript
// Extract left zone joists
const leftJoists = await extract(image, "Find joist spec in LEFT area");
// Returns: "14\" TJI 560 @ 16\" OC"

// Extract center zone joists  
const centerJoists = await extract(image, "Find joist spec in CENTER area");
// Returns: "2x10 @ 16\" OC" or "D1 @ 16\" OC"

// Extract beam callouts
const beams = await extract(image, "Find all GLB or LVL beam callouts");
// Returns: ["5 1/8\" x 18\" GLB", "3 1/2\" x 14\" LVL"]
```

### Phase 2: Quantity Calculation
```typescript
// Measure spans from dimensions
// Count bays from grid lines
// Calculate linear feet
// Assemble material list

const inventory = {
  "14\" TJI 560 @ 16\" OC": { qty: 45, unit: "EA", span: "24'-6\"" },
  "2x10 HF No.2 @ 16\" OC": { qty: 12, unit: "EA", span: "16'-0\"" },
  "5 1/8\" x 18\" GLB": { qty: 3, unit: "EA", length: "24'-6\"" },
  "2x14 PT": { qty: 180, unit: "LF", location: "perimeter" }
};
```

**The infrastructure is proven.** Scaling to full inventory requires:
1. Zone-based extraction (2-4 hours to implement)
2. Dimension parsing for quantity calculation
3. Assembly into material takeoff

**Estimated effort:** 4-6 hours for complete automated material takeoff from S2.1.
