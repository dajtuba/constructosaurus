/**
 * Construction-specific vision prompts with examples and patterns
 * Phase 1 improvement: Add construction context and typical patterns
 */

export interface ConstructionPromptConfig {
  discipline: string;
  memberTypes: string[];
  examples: string[];
  patterns: string[];
}

export class ConstructionPrompts {
  
  static getStructuralPrompt(): string {
    return `You are analyzing a STRUCTURAL construction drawing. Extract ALL structural data with EXACT formatting.

CRITICAL PATTERNS TO RECOGNIZE:
1. STEEL BEAMS: W18x106, W10x100, W12x65, W14x90 (always W + depth + x + weight)
2. STEEL COLUMNS: W14x90, HSS6x6x1/4, HSS8x8x1/2 (HSS = hollow structural section)
3. JOISTS: 18K4, 22K9, 14" TJI 560, 11 7/8" TJI 360 (K-series or TJI with depth)
4. LUMBER: 2x10, 2x12, 4x12, 6x6 PT (pressure treated)
5. ENGINEERED: 5 1/8" x 18" GLB, 3 1/2" x 14" LVL, 7" x 18" PSL

SPACING PATTERNS:
- @ 16" OC (on center)
- @ 12" to 16" OC (variable spacing)
- @ 400mm OC (metric)
- @ 16"/19.2" OC (dual spacing)

DIMENSION PATTERNS:
- 24'-6" (feet-inches)
- 18'-0" (feet only)
- 3'-6" (short spans)
- 30'-0" (long spans)

TYPICAL EXAMPLES:
- Floor joists: "14" TJI 560 @ 16" OC"
- Beams: "5 1/8" x 18" GLB"
- Columns: "6x6 PT" or "HSS6x6x1/4"
- Designations: "D1", "D2", "B1", "C1"

Return ONLY valid JSON:
{
  "beams": [{"mark": "W18x106", "length": "34'-6\\"", "gridLocation": "A-B/1-2", "count": 1, "elevation": ""}],
  "columns": [{"mark": "HSS6x6x1/4", "gridLocation": "at A/1", "height": "", "basePlate": ""}],
  "joists": [{"mark": "14\\" TJI 560", "spacing": "@ 16\\" OC", "span": "24'-0\\"", "count": 0}],
  "connections": [{"type": "bolted", "location": "beam-to-column", "detail": ""}],
  "schedules": [{"type": "beam_schedule", "entries": [{"mark": "B1", "size": "W18x106", "length": "", "qty": 1}]}],
  "dimensions": [{"location": "bay spacing", "value": "24'-6\\"", "gridReference": "A to B", "element": "beam span"}],
  "symbols": [{"type": "weld", "location": "", "detail": ""}],
  "foundation": [{"type": "pier", "size": "", "rebar": "", "count": 0}]
}`;
  }

  static getFramingPrompt(): string {
    return `You are analyzing a FRAMING construction drawing. Extract ALL framing members with EXACT specifications.

WOOD FRAMING PATTERNS:
1. JOISTS: 2x10, 2x12, 14" TJI 560, 11 7/8" TJI 360, 16" TJI 230
2. BEAMS: 5 1/8" x 18" GLB, 3 1/2" x 14" LVL, 7" x 18" PSL
3. PLATES: 2x6 PT, 2x8 PT, 2x10 PT (sill plates)
4. POSTS: 6x6 PT, 4x4 PT, 6x8 PT
5. BLOCKING: 2x10 blocking, 2x12 blocking

DESIGNATION PATTERNS:
- D1, D2, D3 (joist designations)
- B1, B2, B3 (beam designations)
- P1, P2, P3 (post designations)

SPACING EXAMPLES:
- "@ 16" OC" (standard)
- "@ 12" OC" (closer spacing)
- "@ 19.2" OC" (engineered spacing)
- "@ 12" to 16" OC" (variable)

DIMENSION EXAMPLES:
- Spans: 24'-6", 18'-0", 30'-0"
- Heights: 8'-0", 9'-0", 10'-0"
- Depths: 14", 11 7/8", 16"

SECTION REFERENCES:
- 3/S3.0, 4/S3.0, 5/S3.0 (detail callouts)
- A/S4.1, B/S4.1 (section markers)

Return ONLY valid JSON:
{
  "joists": [{"mark": "D1", "spec": "14\\" TJI 560 @ 16\\" OC", "span": "24'-6\\"", "count": 0}],
  "beams": [{"mark": "B1", "spec": "5 1/8\\" x 18\\" GLB", "length": "24'-6\\"", "count": 1}],
  "plates": [{"mark": "sill", "spec": "2x6 PT", "length": "", "count": 0}],
  "posts": [{"mark": "P1", "spec": "6x6 PT", "height": "8'-0\\"", "count": 2}],
  "sections": [{"reference": "3/S3.0", "location": "left bay", "detail": "joist connection"}],
  "dimensions": [{"location": "main span", "value": "24'-6\\"", "element": "joist span"}]
}`;
  }

  static getZonePrompt(zone: string, memberType: string): string {
    const zoneInstructions = {
      left: "Focus ONLY on the LEFT THIRD of the drawing",
      center: "Focus ONLY on the CENTER THIRD of the drawing", 
      right: "Focus ONLY on the RIGHT THIRD of the drawing",
      top: "Focus ONLY on the TOP HALF of the drawing",
      bottom: "Focus ONLY on the BOTTOM HALF of the drawing"
    };

    const memberPrompts = {
      joists: `Find floor joist specifications in the ${zone} zone.
LOOK FOR:
- TJI callouts: "14\\" TJI 560", "11 7/8\\" TJI 360"
- Lumber joists: "2x10", "2x12"
- Designations: "D1", "D2", "D3"
- Spacing: "@ 16\\" OC", "@ 12\\" OC"

EXAMPLES: ["14\\" TJI 560 @ 16\\" OC", "D1 @ 16\\" OC", "2x10 @ 16\\" OC"]`,

      beams: `Find beam specifications in the ${zone} zone.
LOOK FOR:
- GLB: "5 1/8\\" x 18\\" GLB", "3 1/2\\" x 16\\" GLB"
- LVL: "3 1/2\\" x 14\\" LVL", "1 3/4\\" x 11 7/8\\" LVL"
- PSL: "7\\" x 18\\" PSL"
- Steel: "W18x106", "W10x100"

EXAMPLES: ["5 1/8\\" x 18\\" GLB", "3 1/2\\" x 14\\" LVL"]`,

      plates: `Find plate specifications in the ${zone} zone.
LOOK FOR:
- Sill plates: "2x6 PT", "2x8 PT", "2x10 PT"
- Top plates: "2x6", "2x8", "2x10"
- PT = Pressure Treated

EXAMPLES: ["2x6 PT", "2x8 PT", "2x10"]`,

      columns: `Find column/post specifications in the ${zone} zone.
LOOK FOR:
- Wood posts: "6x6 PT", "4x4 PT", "6x8 PT"
- Steel columns: "HSS6x6x1/4", "W14x90"
- Pipe columns: "4\\" STD PIPE"

EXAMPLES: ["6x6 PT", "4x4 PT", "HSS6x6x1/4"]`,

      sections: `Find section reference markers in the ${zone} zone.
LOOK FOR:
- Detail callouts: circles with triangles containing "3/S3.0", "4/S3.0"
- Section markers: "A/S4.1", "B/S4.1"
- Elevation markers: "1/A4.1", "2/A4.1"

EXAMPLES: ["3/S3.0", "4/S3.0", "5/S3.0"]`
    };

    return `${zoneInstructions[zone as keyof typeof zoneInstructions]}.

${memberPrompts[memberType as keyof typeof memberPrompts]}

Return ONLY a valid JSON array. If nothing found, return: []`;
  }

  static getDimensionExtractionPrompt(): string {
    return `Extract ALL dimension strings from this construction drawing.

DIMENSION PATTERNS TO FIND:
1. FEET-INCHES: 24'-6", 18'-0", 3'-6", 30'-0"
2. FEET ONLY: 24', 18', 30' (with apostrophe)
3. INCHES ONLY: 18", 6", 3" (with quote mark)
4. METRIC: 7200mm, 6000mm, 400mm
5. DECIMAL FEET: 24.5', 18.0', 30.25'

TYPICAL CONSTRUCTION DIMENSIONS:
- Spans: 16'-0", 20'-0", 24'-0", 28'-0", 32'-0"
- Joist spacing: 12", 16", 19.2", 24"
- Beam depths: 14", 16", 18", 20"
- Column spacing: 8'-0", 10'-0", 12'-0"

LOOK FOR DIMENSIONS ON:
- Grid lines (column spacing)
- Span callouts (beam/joist lengths)
- Room dimensions
- Foundation dimensions
- Detail dimensions

Return ONLY valid JSON:
{
  "dimensions": [
    {"value": "24'-6\\"", "location": "main span", "element": "joist span", "gridReference": "A to B"},
    {"value": "16\\"", "location": "joist spacing", "element": "spacing", "gridReference": ""},
    {"value": "18'-0\\"", "location": "bay width", "element": "column spacing", "gridReference": "1 to 2"}
  ]
}`;
  }
}