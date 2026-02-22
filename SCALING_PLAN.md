# Scaling Plan: From Tracer Bullet to Full System

**Status:** Tracer bullet complete ✅  
**Next:** Scale to production system

---

## What We Proved (Tracer Bullet)

✅ **End-to-end extraction works**
- Shell-Set → Structural Calc → ForteWEB linking
- Cross-document member tracking (D1 designation)
- Conflict detection (TJI 560 vs 2x10)
- Structured JSON output

✅ **Vision model capabilities**
- Extracts schedules/tables perfectly (ForteWEB)
- Reads load diagrams (1050 LB, 607 LB)
- Finds section references (3/S3.0, 4/S3.0)
- Handles structured text (notes, legends)

✅ **Infrastructure is solid**
- Ollama integration working
- PDF → PNG extraction pipeline
- TypeScript processing framework
- Bead tracking system

---

## Scaling Strategy

### Phase 1: Zone-Based Extraction (2-4 hours)

**Goal:** Extract all members from S2.1 floor plan

**Approach:**
```typescript
// Divide plan into extraction zones
const zones = [
  { name: 'left', bounds: { x: 0, y: 0, w: 33, h: 100 } },
  { name: 'center', bounds: { x: 33, y: 0, w: 34, h: 100 } },
  { name: 'right', bounds: { x: 67, y: 0, w: 33, h: 100 } }
];

// Extract by member type per zone
const memberTypes = ['joists', 'beams', 'plates', 'columns', 'sections'];

for (const zone of zones) {
  for (const type of memberTypes) {
    const prompt = buildTargetedPrompt(zone, type);
    results[`${zone.name}_${type}`] = await extract(image, prompt);
  }
}
```

**Output:**
```json
{
  "left_joists": "14\" TJI 560 @ 16\" OC",
  "center_joists": "D1 @ 16\" OC",
  "right_joists": "11 7/8\" TJI 360 @ 16\" OC",
  "beams": ["5 1/8\" x 18\" GLB", "3 1/2\" x 14\" LVL"],
  "sections": ["3/S3.0", "4/S3.0", "5/S3.0"]
}
```

### Phase 2: Cross-Document Linking (1-2 hours)

**Goal:** Link every member to structural calcs and ForteWEB

**Approach:**
```typescript
// For each member designation found (D1, D2, D3...)
for (const designation of designations) {
  // Find in structural calc
  const structuralData = await findInStructuralCalc(designation);
  
  // Find in ForteWEB reports
  const fortewebData = await findInForteWeb(designation);
  
  // Link together
  memberDatabase[designation] = {
    shell_set: shellData,
    structural: structuralData,
    forteweb: fortewebData,
    conflicts: detectConflicts(shellData, fortewebData)
  };
}
```

### Phase 3: Quantity Calculation (2-3 hours)

**Goal:** Generate material takeoff with quantities

**Approach:**
```typescript
// Extract dimensions from plan
const dimensions = await extractDimensions(image);

// Calculate quantities
const inventory = {};
for (const member of members) {
  const span = dimensions[member.location];
  const spacing = parseSpacing(member.spec); // "@ 16\" OC" → 16
  const qty = calculateQuantity(span, spacing);
  
  inventory[member.spec] = {
    quantity: qty,
    unit: member.type === 'joist' ? 'EA' : 'LF',
    span: span,
    locations: member.locations
  };
}
```

**Output:**
```json
{
  "14\" TJI 560 @ 16\" OC": {
    "quantity": 45,
    "unit": "EA",
    "span": "24'-6\"",
    "locations": ["left bay", "grid A-B"]
  },
  "5 1/8\" x 18\" GLB": {
    "quantity": 3,
    "unit": "EA",
    "length": "24'-6\"",
    "locations": ["grid line A"]
  }
}
```

### Phase 4: Multi-Sheet Processing (2-3 hours)

**Goal:** Process all sheets in document set

**Approach:**
```typescript
const sheets = [
  { name: 'S2.1', page: 33, type: 'floor_framing' },
  { name: 'S2.2', page: 34, type: 'roof_framing' },
  { name: 'S3.0', page: 35, type: 'details' },
  { name: 'S4.0', page: 36, type: 'schedules' }
];

for (const sheet of sheets) {
  const processor = getProcessor(sheet.type);
  const data = await processor.extract(sheet);
  database.addSheet(sheet.name, data);
}
```

### Phase 5: MCP Tools for Claude (1-2 hours)

**Goal:** Query via natural language in Claude Desktop

**Tools to add:**
```typescript
// Query member by designation
query_member({ designation: "D1" })
// Returns: Full member info with conflicts

// Get material takeoff
get_material_takeoff({ sheet: "S2.1" })
// Returns: Complete inventory with quantities

// Find conflicts
find_conflicts({ sheet: "S2.1" })
// Returns: List of spec mismatches

// Get section details
get_section_details({ reference: "3/S3.0" })
// Returns: Detail drawing info
```

---

## Timeline

| Phase | Effort | Deliverable |
|-------|--------|-------------|
| 1. Zone extraction | 2-4 hrs | All members from S2.1 |
| 2. Cross-doc linking | 1-2 hrs | Full member database |
| 3. Quantity calc | 2-3 hrs | Material takeoff |
| 4. Multi-sheet | 2-3 hrs | All sheets processed |
| 5. MCP tools | 1-2 hrs | Claude Desktop queries |
| **Total** | **8-14 hrs** | **Production system** |

---

## Success Criteria

✅ Extract all members from S2.1 with specs  
✅ Link every designation to structural calcs  
✅ Generate accurate material takeoff  
✅ Detect all spec conflicts  
✅ Process all sheets in document set  
✅ Query via Claude Desktop natural language  

---

## Risk Mitigation

**Risk:** Vision model misses callouts  
**Mitigation:** Zone-based extraction with verification prompts

**Risk:** Designation linking fails  
**Mitigation:** Fuzzy matching + manual review for edge cases

**Risk:** Quantity calculations wrong  
**Mitigation:** Cross-check with known totals, add validation

**Risk:** Performance too slow  
**Mitigation:** Parallel processing, cache results

---

## Next Steps

1. **Create bead** for Phase 1 (zone extraction)
2. **Implement zone divider** for S2.1
3. **Write targeted prompts** for each member type
4. **Test on left zone** first (tracer bullet approach)
5. **Scale to full sheet** once proven
6. **Iterate** through remaining phases

**Ready to start when you are!**
