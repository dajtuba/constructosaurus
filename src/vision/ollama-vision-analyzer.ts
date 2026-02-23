import * as fs from "fs";
import { Ollama } from "ollama";
import JSON5 from "json5";
import { ImagePreprocessor, PreprocessingOptions } from "./image-preprocessor";
import { GridLineCounter, GridInfo } from "./grid-line-counter";
import { ScheduleCrossChecker, QuantityDiscrepancy } from "./schedule-cross-checker";

export interface VisionSchedule {
  scheduleType: string;
  entries: Record<string, any>[];
  pageNumber: number;
}

export interface VisionDimension {
  location: string;
  value: string;
  gridReference?: string;
  element?: string;
}

export interface VisionItemCount {
  item: string;
  mark: string;
  count: number;
}

export interface VisionAnalysisResult {
  schedules: VisionSchedule[];
  beams?: Array<{mark: string; length?: string; gridLocation?: string; count?: number; elevation?: string}>;
  columns?: Array<{mark: string; gridLocation?: string; height?: string; basePlate?: string}>;
  joists?: Array<{mark: string; spacing?: string; span?: string; count?: number}>;
  connections?: Array<{type: string; location?: string; detail?: string}>;
  foundation?: Array<{type: string; size?: string; rebar?: string; count?: number}>;
  symbols?: Array<{type: string; location?: string; detail?: string}>;
  dimensions: VisionDimension[];
  itemCounts: VisionItemCount[];
  gridInfo?: GridInfo;
  quantityDiscrepancies?: QuantityDiscrepancy[];
  preprocessingApplied?: boolean;
}

export class OllamaVisionAnalyzer {
  private ollama: Ollama;
  private model: string;
  private preprocessor: ImagePreprocessor;
  private gridCounter: GridLineCounter;
  private crossChecker: ScheduleCrossChecker;

  constructor(ollamaUrl: string = "http://localhost:11434", model: string = "glm-ocr") {
    this.ollama = new Ollama({ host: ollamaUrl });
    this.model = model;
    this.preprocessor = new ImagePreprocessor();
    this.gridCounter = new GridLineCounter(ollamaUrl, model);
    this.crossChecker = new ScheduleCrossChecker();
  }

  async analyzeDrawingPage(
    imagePath: string,
    pageNumber: number,
    discipline?: string,
    enablePreprocessing: boolean = true,
    preprocessingOptions?: PreprocessingOptions
  ): Promise<VisionAnalysisResult> {
    let processedImagePath = imagePath;
    let tempFiles: string[] = [];
    let gridInfo: GridInfo | undefined;

    try {
      // Step 1: Count grid lines to determine bay structure
      console.log('🔍 Analyzing grid structure...');
      gridInfo = await this.gridCounter.countGridLines(imagePath);
      console.log(`📐 Found ${gridInfo.verticalGrids.length} vertical grids, ${gridInfo.horizontalGrids.length} horizontal grids, ${gridInfo.bayCount} bays`);

      // Step 2: Apply preprocessing if enabled
      if (enablePreprocessing) {
        console.log('🔧 Applying image preprocessing...');
        processedImagePath = await this.preprocessor.preprocessImage(
          imagePath,
          preprocessingOptions || {
            normalize: true,
            sharpen: true,
            upscale: 2,
            contrast: 1.2,
            brightness: 1.1
          }
        );
        tempFiles.push(processedImagePath);
        console.log('✅ Preprocessing complete');
      }

      // Step 3: Perform vision analysis on processed image
      const imageData = fs.readFileSync(processedImagePath);
      const base64Image = imageData.toString('base64');

      const response = await this.ollama.generate({
        model: this.model,
        prompt: this.getExtractionPrompt(discipline, gridInfo),
        images: [base64Image],
        options: {
          temperature: 0.3,
        }
      });

      const result = this.parseVisionResponse(response.response, pageNumber);
      
      // Step 4: Add grid info and preprocessing flag
      result.gridInfo = gridInfo;
      result.preprocessingApplied = enablePreprocessing;

      // Step 5: Cross-check quantities if schedules are found
      if (result.schedules.length > 0) {
        console.log('📊 Cross-checking quantities...');
        const calculatedQuantities = this.extractCalculatedQuantities(result);
        const scheduleEntries = result.schedules.flatMap(s => 
          s.entries.map(entry => ({
            mark: entry.mark || entry.size || 'unknown',
            quantity: entry.quantity || entry.qty || 1,
            ...entry
          }))
        );
        result.quantityDiscrepancies = this.crossChecker.compareQuantities(scheduleEntries, calculatedQuantities);
        
        if (result.quantityDiscrepancies.length > 0) {
          const report = this.crossChecker.generateDiscrepancyReport(result.quantityDiscrepancies);
          console.log(report);
        }
      }

      return result;
    } finally {
      // Clean up temporary files
      if (tempFiles.length > 0) {
        this.preprocessor.cleanup(tempFiles);
      }
    }
  }

  private getExtractionPrompt(discipline?: string, gridInfo?: GridInfo): string {
    const gridContext = gridInfo ? 
      `\nGRID CONTEXT: This drawing has ${gridInfo.bayCount} bays with grids ${gridInfo.verticalGrids.join(', ')} (vertical) and ${gridInfo.horizontalGrids.join(', ')} (horizontal).` : '';

    if (discipline === 'Structural') {
      return `You are analyzing a STRUCTURAL construction drawing. Extract ALL structural data with EXACT formatting.${gridContext}

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

    return `You are analyzing a FRAMING construction drawing. Extract ALL framing members with EXACT specifications.${gridContext}

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

  private parseVisionResponse(text: string, pageNumber: number): VisionAnalysisResult {
    try {
      let jsonText = text.trim();
      
      // Remove markdown code blocks
      if (jsonText.includes('```')) {
        const matches = jsonText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (matches) {
          jsonText = matches[1];
        }
      }
      
      // Find JSON object boundaries
      const firstBrace = jsonText.indexOf('{');
      const lastBrace = jsonText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        jsonText = jsonText.substring(firstBrace, lastBrace + 1);
      }

      // Fix common JSON issues from vision models
      while (jsonText.includes('"""')) {
        jsonText = jsonText.replace('"""', '"');
      }
      jsonText = jsonText.replace(/""\s*([}\]])/g, '"$1');
      // Sanitize control characters inside string values
      jsonText = jsonText.replace(/[\x00-\x1f\x7f]/g, (ch) => {
        if (ch === '\n' || ch === '\r' || ch === '\t') return ' ';
        return '';
      });
      // Fix dimension strings with escaped quotes that break JSON
      // e.g., "34'-6\"" inside a JSON string — replace \" with ''
      jsonText = jsonText.replace(/(\d+)'[-\s]*(\d+)\\"/g, "$1'-$2in");
      
      let parsed;
      try {
        parsed = JSON5.parse(jsonText);
      } catch {
        try {
          parsed = JSON.parse(jsonText);
        } catch {
          // Truncated response — try to salvage partial JSON
          parsed = this.salvagePartialJson(jsonText);
        }
      }

      // Post-process OCR corrections on all extracted data
      const fixOcr = (s: string) => this.fixOcrErrors(s);

      return {
        schedules: (parsed.schedules || []).map((s: any) => ({
          scheduleType: s.type || 'unknown',
          entries: (s.entries || []).map((e: any) => {
            const fixed: Record<string, any> = {};
            for (const [k, v] of Object.entries(e)) {
              fixed[k] = typeof v === 'string' ? fixOcr(v) : v;
            }
            return fixed;
          }),
          pageNumber
        })),
        beams: (parsed.beams || []).map((b: any) => ({
          ...b,
          mark: fixOcr(b.mark || ''),
          length: b.length ? fixOcr(b.length) : undefined
        })),
        columns: (parsed.columns || []).map((c: any) => ({
          ...c,
          mark: fixOcr(c.mark || '')
        })),
        joists: (parsed.joists || []).map((j: any) => ({
          ...j,
          mark: fixOcr(j.mark || '')
        })),
        connections: parsed.connections || [],
        foundation: parsed.foundation || [],
        symbols: parsed.symbols || [],
        dimensions: (parsed.dimensions || []).map((d: any) => ({
          ...d,
          value: d.value ? fixOcr(d.value) : d.value
        })),
        itemCounts: parsed.itemCounts || []
      };
    } catch (error) {
      console.error('Failed to parse vision response:', error);
      console.error('Raw response:', text.substring(0, 500));
      return {
        schedules: [],
        dimensions: [],
        itemCounts: []
      };
    }
  }

  /** Attempt to extract usable data from truncated JSON */
  private salvagePartialJson(text: string): any {
    const result: any = {};
    
    // Fix missing commas between objects: }{ or }  {
    const fixed = text.replace(/\}\s*\{/g, '},{');
    
    // Try complete arrays first
    const completePattern = /"(\w+)"\s*:\s*\[([^\]]*)\]/g;
    for (const match of fixed.matchAll(completePattern)) {
      try {
        result[match[1]] = JSON5.parse(`[${match[2]}]`);
      } catch { /* skip */ }
    }
    
    // Try incomplete/truncated arrays — find opening [ and grab all complete objects
    const incompletePattern = /"(\w+)"\s*:\s*\[/g;
    for (const match of fixed.matchAll(incompletePattern)) {
      if (result[match[1]]) continue; // Already got this one
      
      const start = match.index! + match[0].length;
      // Extract all complete {...} objects from the array
      const objects: any[] = [];
      const objPattern = /\{[^{}]*\}/g;
      const remaining = fixed.substring(start);
      for (const objMatch of remaining.matchAll(objPattern)) {
        try {
          objects.push(JSON5.parse(objMatch[0]));
        } catch { /* skip malformed */ }
      }
      if (objects.length > 0) {
        result[match[1]] = objects;
      }
    }
    
    if (Object.keys(result).length > 0) {
      console.log(`  ℹ️  Salvaged partial JSON: ${Object.keys(result).join(', ')}`);
      return result;
    }
    
    // Last resort: extract any individual objects with known marks
    const beams: any[] = [];
    const memberPattern = /\{[^{}]*"mark"\s*:\s*"([^"]+)"[^{}]*\}/g;
    for (const m of text.matchAll(memberPattern)) {
      try { beams.push(JSON5.parse(m[0])); } catch { /* skip */ }
    }
    if (beams.length > 0) {
      console.log(`  ℹ️  Salvaged ${beams.length} individual entries`);
      return { beams };
    }
    
    return { schedules: [], dimensions: [], itemCounts: [] };
  }

  /** Fix common OCR misreads in structural callouts */
  private fixOcrErrors(text: string): string {
    return text
      // Fix W-shape misreads: Wl8x106 -> W18x106, W1Ox100 -> W10x100
      .replace(/W[lI](\d)/g, 'W1$1')
      .replace(/W(\d+)[xX]?[lI](\d)/g, 'W$1x1$2')
      .replace(/W(\d+)\s*[xX]\s*(\d+)/g, 'W$1x$2')
      // Fix HSS misreads
      .replace(/HSS\s*(\d+)\s*[xX]\s*(\d+)\s*[xX]\s*(\d+\/?\d*)/g, 'HSS$1x$2x$3')
      // Fix dimension misreads: l2'-6" -> 12'-6", O -> 0
      .replace(/([^a-zA-Z])l(\d)/g, '$11$2')
      .replace(/(\d)O(\d)/g, '$10$2')
      .replace(/O(\d)/g, '0$1')
      // Normalize quotes in dimensions
      .replace(/(\d+)\s*['']\s*[-–]?\s*(\d+)\s*[""]/g, "$1'-$2\"");
  }

  /** Extract calculated quantities from vision analysis result */
  private extractCalculatedQuantities(result: VisionAnalysisResult): Array<{item: string; calculatedQty: number; unit: string; source: string}> {
    const quantities: Array<{item: string; calculatedQty: number; unit: string; source: string}> = [];

    // Extract from beams
    if (result.beams) {
      for (const beam of result.beams) {
        quantities.push({
          item: beam.mark,
          calculatedQty: beam.count || 1,
          unit: 'EA',
          source: 'vision_analysis'
        });
      }
    }

    // Extract from columns
    if (result.columns) {
      for (const column of result.columns) {
        quantities.push({
          item: column.mark,
          calculatedQty: 1,
          unit: 'EA',
          source: 'vision_analysis'
        });
      }
    }

    // Extract from joists
    if (result.joists) {
      for (const joist of result.joists) {
        quantities.push({
          item: joist.mark,
          calculatedQty: joist.count || 1,
          unit: 'EA',
          source: 'vision_analysis'
        });
      }
    }

    // Extract from item counts
    for (const itemCount of result.itemCounts) {
      quantities.push({
        item: itemCount.item,
        calculatedQty: itemCount.count,
        unit: 'EA',
        source: 'item_count'
      });
    }

    return quantities;
  }
}
