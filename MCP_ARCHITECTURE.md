# MCP Architecture: How Claude Queries Construction Documents

## Two Approaches

### Approach 1: Pre-Process to Vector DB (Current System)
**What happens:**
```
PDFs → Extract pages → Vision analysis → Structured data → LanceDB → Claude queries
```

**Flow:**
1. Run `npm run process` ONCE to extract all data
2. Vision model analyzes every page, extracts structured info
3. Store in LanceDB vector database
4. Claude queries the database via MCP tools
5. Claude NEVER sees the actual images

**Pros:**
- ✅ Fast queries (database lookup, not vision analysis)
- ✅ Cheap (no repeated vision calls)
- ✅ Semantic search across all documents
- ✅ Works offline after initial processing

**Cons:**
- ❌ Extraction quality depends on initial processing
- ❌ Can't ask follow-up questions about images
- ❌ Misses details not extracted initially
- ❌ Requires reprocessing if extraction logic changes

---

### Approach 2: On-Demand Vision via MCP (Proposed)
**What happens:**
```
Claude asks question → MCP tool → Vision model analyzes image → Return answer
```

**Flow:**
1. User asks: "What's the joist spec in the left bay of S2.1?"
2. Claude calls MCP tool: `analyze_drawing({ sheet: "S2.1", zone: "left", query: "joist spec" })`
3. MCP tool loads image, runs vision analysis with targeted prompt
4. Returns answer directly to Claude
5. No pre-processing needed

**Pros:**
- ✅ Always fresh analysis
- ✅ Can ask follow-up questions
- ✅ Extracts exactly what's needed
- ✅ No reprocessing required

**Cons:**
- ❌ Slower (vision analysis per query)
- ❌ More expensive (repeated vision calls)
- ❌ Requires Ollama running
- ❌ No semantic search across documents

---

## Hybrid Approach (RECOMMENDED)

**Combine both for best results:**

### Phase 1: Pre-Process Core Data
```typescript
// Run once to build database
npm run process

// Extracts and stores:
- All member designations (D1, D2, D3...)
- All section references (3/S3.0, 4/S3.0...)
- All schedules and tables
- Document structure (sheets, pages, types)
- Cross-document links
```

### Phase 2: On-Demand Vision for Details
```typescript
// MCP tools for live analysis
{
  "analyze_zone": {
    "description": "Analyze specific zone of drawing",
    "parameters": {
      "sheet": "S2.1",
      "zone": "left|center|right",
      "query": "What joists are shown here?"
    }
  },
  
  "get_member_details": {
    "description": "Get full member info from database + live image",
    "parameters": {
      "designation": "D1"
    }
    // Returns: DB data + fresh image analysis
  },
  
  "verify_spec": {
    "description": "Verify spec by looking at actual drawing",
    "parameters": {
      "sheet": "S2.1",
      "location": "left bay",
      "expected": "14\" TJI 560 @ 16\" OC"
    }
    // Returns: Confirmed or conflict detected
  }
}
```

---

## Recommended MCP Architecture

```typescript
// MCP Server Structure
class ConstructionMCP {
  private db: LanceDB;           // Pre-processed data
  private vision: OllamaVision;  // On-demand analysis
  private imageCache: Map;       // Cached page images
  
  // Fast queries from database
  async queryMember(designation: string) {
    return await this.db.query({ designation });
  }
  
  // Live vision analysis
  async analyzeZone(sheet: string, zone: string, query: string) {
    const image = await this.getImage(sheet);
    const prompt = this.buildZonePrompt(zone, query);
    return await this.vision.analyze(image, prompt);
  }
  
  // Hybrid: DB + Vision
  async getMemberWithVerification(designation: string) {
    // Get from database
    const dbData = await this.db.query({ designation });
    
    // Verify with live vision
    const verification = await this.analyzeZone(
      dbData.sheet,
      dbData.zone,
      `Verify spec: ${dbData.spec}`
    );
    
    return {
      ...dbData,
      verified: verification.matches,
      live_analysis: verification
    };
  }
}
```

---

## MCP Tools Design

### Tier 1: Fast Database Queries
```typescript
// No vision analysis, instant results
- list_sheets()           // All sheets in document set
- query_member(designation)  // Get member from DB
- find_conflicts()        // Pre-computed conflicts
- get_material_takeoff()  // Pre-computed quantities
- search_documents(text)  // Semantic search
```

### Tier 2: On-Demand Vision
```typescript
// Live vision analysis, slower but accurate
- analyze_drawing(sheet, query)     // Full sheet analysis
- analyze_zone(sheet, zone, query)  // Targeted zone
- extract_callout(sheet, location)  // Specific callout
- verify_spec(sheet, location, expected)  // Verification
```

### Tier 3: Hybrid (Best of Both)
```typescript
// Combines DB speed + vision accuracy
- get_member_verified(designation)  // DB + live check
- get_inventory_verified(sheet)     // DB + spot checks
- find_conflicts_verified()         // DB + image proof
```

---

## Data Flow Examples

### Example 1: "What's the spec for D1?"
```
User: "What's the spec for D1?"

Claude → MCP: query_member({ designation: "D1" })
         ↓
      LanceDB lookup (fast)
         ↓
      Returns: {
        designation: "D1",
        shell_set: "14\" TJI 560 @ 16\" OC",
        forteweb: "2x10 HF No.2 @ 16\" OC",
        conflict: true
      }
         ↓
Claude: "D1 has a conflict: Shell-Set shows 14\" TJI 560 but 
         ForteWEB shows 2x10 HF No.2"
```

### Example 2: "Show me the actual callout for D1"
```
User: "Show me the actual callout for D1 on the drawing"

Claude → MCP: analyze_zone({ 
           sheet: "S2.1", 
           zone: "left",
           query: "Find D1 callout text"
         })
         ↓
      Load image + run vision (slower)
         ↓
      Returns: {
        found: "14\" TJI 560 @ 16\" OC",
        location: { x: 150, y: 800 },
        confidence: 0.95
      }
         ↓
Claude: "The drawing shows '14\" TJI 560 @ 16\" OC' at 
         coordinates (150, 800)"
```

### Example 3: "Give me material takeoff for S2.1"
```
User: "Give me material takeoff for S2.1"

Claude → MCP: get_material_takeoff({ sheet: "S2.1" })
         ↓
      LanceDB lookup (fast)
         ↓
      Returns: {
        "14\" TJI 560 @ 16\" OC": { qty: 45, unit: "EA" },
        "2x10 HF No.2 @ 16\" OC": { qty: 12, unit: "EA" },
        ...
      }
         ↓
Claude: "Material takeoff for S2.1:
         - 45 EA 14\" TJI 560 @ 16\" OC
         - 12 EA 2x10 HF No.2 @ 16\" OC
         ..."
```

---

## Storage Strategy

### What Goes in LanceDB
```json
{
  "members": [
    {
      "designation": "D1",
      "shell_set": { "sheet": "S2.1", "spec": "14\" TJI 560 @ 16\" OC" },
      "structural": { "page": 5, "loads": ["1050 LB", "607 LB"] },
      "forteweb": { "page": 109, "spec": "2x10 HF No.2 @ 16\" OC" },
      "conflict": true,
      "embedding": [0.123, 0.456, ...]  // For semantic search
    }
  ],
  "sheets": [
    {
      "name": "S2.1",
      "page": 33,
      "type": "floor_framing",
      "image_path": "/tmp/shell-set-page-33.png",
      "members": ["D1", "D2", "D3"],
      "sections": ["3/S3.0", "4/S3.0"]
    }
  ]
}
```

### What Stays as Images
```
/tmp/
  shell-set-page-33.png      # S2.1 floor plan
  shell-set-page-35.png      # S3.0 details
  structural-page-5.png      # Structural calc
  structural-page-109.png    # ForteWEB report
```

---

## Performance Comparison

| Operation | Database Only | Vision Only | Hybrid |
|-----------|--------------|-------------|--------|
| Query member | 10ms | 2-5s | 10ms + verify on demand |
| Material takeoff | 50ms | 30-60s | 50ms + spot checks |
| Find conflicts | 100ms | 60-120s | 100ms + image proof |
| Verify callout | N/A | 2-5s | 2-5s |
| Semantic search | 200ms | N/A | 200ms |

---

## Recommendation

**Use Hybrid Approach:**

1. **Pre-process** to LanceDB for:
   - Member designations and cross-references
   - Schedules and tables
   - Document structure
   - Known conflicts

2. **On-demand vision** for:
   - Verification requests
   - Detailed callout extraction
   - Follow-up questions
   - Spot checks

3. **MCP tools** provide both:
   - Fast tier: Database queries
   - Accurate tier: Live vision
   - Smart tier: Hybrid with caching

**Result:** Fast queries with ability to drill down to actual images when needed.

---

## Implementation Priority

1. ✅ **Done:** Tracer bullet proves vision works
2. **Next:** Build database schema for pre-processed data
3. **Then:** Create MCP tools for database queries
4. **Then:** Add on-demand vision tools
5. **Finally:** Optimize with caching and parallel processing

**Estimated:** 8-14 hours for full hybrid system.
