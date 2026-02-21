import * as fs from "fs";
import { Ollama } from "ollama";
import JSON5 from "json5";

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
}

export class OllamaVisionAnalyzer {
  private ollama: Ollama;
  private model: string;

  constructor(ollamaUrl: string = "http://localhost:11434", model: string = "glm-ocr") {
    this.ollama = new Ollama({ host: ollamaUrl });
    this.model = model;
  }

  async analyzeDrawingPage(
    imagePath: string,
    pageNumber: number,
    discipline?: string
  ): Promise<VisionAnalysisResult> {
    const imageData = fs.readFileSync(imagePath);
    const base64Image = imageData.toString('base64');

    const response = await this.ollama.generate({
      model: this.model,
      prompt: this.getExtractionPrompt(discipline),
      images: [base64Image],
      options: {
        temperature: 0.3,
      }
    });

    return this.parseVisionResponse(response.response, pageNumber);
  }

  private getExtractionPrompt(discipline?: string): string {
    if (discipline === 'Structural') {
      return `You are analyzing a STRUCTURAL construction drawing. Extract ALL structural data.

CRITICAL - Look for these specific items:
1. STEEL BEAMS: W-shapes (W18x106, W10x100, W12x65), with lengths (34'-6"), quantities, grid locations
2. STEEL COLUMNS: W-shapes, HSS (HSS6x6x1/4, HSS8x8x1/2), pipe columns
3. JOISTS: Open-web steel joists (18K4, 22K9) with spacing
4. CONNECTIONS: Bolted, welded, base plates, clip angles
5. SCHEDULE TABLES: Beam schedules, column schedules with marks (B1, C1)
6. DIMENSIONS: Member lengths, spacing, elevations, setbacks
7. GRID LINES: Labels (A, B, C, 1, 2, 3) and spacing
8. FOUNDATION: Piers, footings, grade beams with sizes and rebar
9. SYMBOLS: Structural symbols (I-beam sections, weld symbols, bolt patterns)

Return ONLY valid JSON:
{
  "beams": [{"mark": "W18x106", "length": "34'-6\\"", "gridLocation": "A-B/1-2", "count": 1, "elevation": ""}],
  "columns": [{"mark": "HSS6x6x1/4", "gridLocation": "at A/1", "height": "", "basePlate": ""}],
  "joists": [{"mark": "18K4", "spacing": "4'-0\\"", "span": "24'-0\\"", "count": 0}],
  "connections": [{"type": "bolted", "location": "beam-to-column", "detail": ""}],
  "schedules": [{"type": "beam_schedule", "entries": [{"mark": "B1", "size": "W18x106", "length": "", "qty": 1}]}],
  "dimensions": [{"location": "bay spacing", "value": "24'-6\\"", "gridReference": "A to B", "element": "beam span"}],
  "symbols": [{"type": "weld", "location": "", "detail": ""}],
  "foundation": [{"type": "pier", "size": "", "rebar": "", "count": 0}]
}`;
    }

    return `You are analyzing a construction drawing. Extract ALL visible data.

Look for:
- Beam callouts (W18x106, W10x100, etc.) with lengths and quantities
- Column callouts (W14x90, HSS8x8x1/2, etc.)
- Tables or schedules with marks (D101, W1, F1, B1) - extract ALL rows
- Dimension strings (24'-6", 3'-0", 12") with what they measure
- Grid lines and labels (A, B, C, 1, 2, 3)
- Door/window marks and sizes
- Material callouts and specifications
- Symbols (structural, electrical, plumbing)

Return ONLY valid JSON:
{
  "beams": [{"mark": "W18x106", "length": "34'-6\\"", "gridLocation": "A-B/1-2", "count": 1}],
  "columns": [{"mark": "W14x90", "gridLocation": "at A/1"}],
  "schedules": [{"type": "beam_schedule", "entries": [{"mark": "B1", "size": "W18x106", "length": "", "qty": 1}]}],
  "dimensions": [{"location": "wall", "value": "24'-6\\"", "element": ""}],
  "symbols": [{"type": "", "location": "", "detail": ""}]
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

      // Fix common JSON issues from LLaVA
      while (jsonText.includes('"""')) {
        jsonText = jsonText.replace('"""', '"');
      }
      jsonText = jsonText.replace(/""\s*([}\]])/g, '"$1');
      
      let parsed;
      try {
        parsed = JSON5.parse(jsonText);
      } catch {
        parsed = JSON.parse(jsonText);
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
}
