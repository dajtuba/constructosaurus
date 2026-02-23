import { Ollama } from "ollama";
import * as fs from "fs";

export interface GridInfo {
  horizontalGrids: string[];
  verticalGrids: string[];
  bayCount: number;
  gridSpacing?: string[];
}

export class GridLineCounter {
  private ollama: Ollama;
  private model: string;

  constructor(ollamaUrl: string = "http://localhost:11434", model: string = "glm-ocr") {
    this.ollama = new Ollama({ host: ollamaUrl });
    this.model = model;
  }

  /**
   * Count grid lines and calculate actual bay count from drawing
   */
  async countGridLines(imagePath: string): Promise<GridInfo> {
    const imageData = fs.readFileSync(imagePath);
    const base64Image = imageData.toString('base64');

    const prompt = `You are analyzing a construction drawing to count grid lines and calculate bay spacing.

TASK: Find ALL grid line labels and determine the actual number of bays.

Look for:
1. VERTICAL grid lines labeled with LETTERS (A, B, C, D, E, etc.)
2. HORIZONTAL grid lines labeled with NUMBERS (1, 2, 3, 4, 5, etc.)
3. Grid line spacing dimensions between grid lines
4. Any grid bubbles or markers showing grid intersections

Count EVERY visible grid line label, even if partially visible.

Return ONLY valid JSON:
{
  "horizontalGrids": ["1", "2", "3", "4"],
  "verticalGrids": ["A", "B", "C", "D", "E"],
  "bayCount": 4,
  "gridSpacing": ["24'-0\"", "30'-0\"", "24'-0\""]
}

Where:
- horizontalGrids: ALL number labels found (1, 2, 3, etc.)
- verticalGrids: ALL letter labels found (A, B, C, etc.)  
- bayCount: Total number of bays (grid count - 1)
- gridSpacing: Dimensions between grid lines if visible`;

    const response = await this.ollama.generate({
      model: this.model,
      prompt,
      images: [base64Image],
      options: {
        temperature: 0.1,
      }
    });

    return this.parseGridResponse(response.response);
  }

  private parseGridResponse(text: string): GridInfo {
    // Don't rely on JSON.parse - extract arrays directly with regex
    // This handles all malformed JSON the LLM might produce

    const extractArray = (key: string): string[] => {
      // Match key: [...] with flexible whitespace and quotes
      const pattern = new RegExp(`"?${key}"?\\s*:\\s*\\[([^\\]]*?)\\]`, 'i');
      const match = text.match(pattern);
      if (!match) return [];
      // Pull out all quoted strings from the array content
      const items = match[1].match(/"([^"]+)"/g);
      return items ? items.map(s => s.replace(/"/g, '')) : [];
    };

    const horizontalGrids = extractArray('horizontalGrids');
    const verticalGrids = extractArray('verticalGrids');
    const gridSpacing = extractArray('gridSpacing');

    // If regex on JSON structure found nothing, try the raw text fallback
    if (horizontalGrids.length === 0 && verticalGrids.length === 0) {
      return this.extractGridsWithRegex(text);
    }

    const horizontalBays = Math.max(0, horizontalGrids.length - 1);
    const verticalBays = Math.max(0, verticalGrids.length - 1);

    return {
      horizontalGrids,
      verticalGrids,
      bayCount: Math.max(horizontalBays, verticalBays),
      gridSpacing
    };
  }

  private extractGridsWithRegex(text: string): GridInfo {
    // Extract letter grid labels (A, B, C, etc.)
    const letterMatches = text.match(/\b[A-Z]\b/g) || [];
    const verticalGrids = Array.from(new Set(letterMatches)).sort();
    
    // Extract number grid labels (1, 2, 3, etc.)
    const numberMatches = text.match(/\b\d+\b/g) || [];
    const horizontalGrids = Array.from(new Set(numberMatches)).sort((a, b) => parseInt(a) - parseInt(b));
    
    const bayCount = Math.max(
      Math.max(0, horizontalGrids.length - 1),
      Math.max(0, verticalGrids.length - 1)
    );

    console.log(`Fallback grid extraction: ${verticalGrids.length} vertical, ${horizontalGrids.length} horizontal, ${bayCount} bays`);
    
    return {
      horizontalGrids,
      verticalGrids,
      bayCount,
      gridSpacing: []
    };
  }

  /**
   * Calculate dynamic zones based on actual grid count
   */
  calculateDynamicZones(gridInfo: GridInfo): Array<{ name: string; x: number; y: number; width: number; height: number }> {
    const { bayCount } = gridInfo;
    
    if (bayCount <= 1) {
      // Single zone for simple drawings
      return [{ name: 'full', x: 0, y: 0, width: 100, height: 100 }];
    }
    
    if (bayCount <= 3) {
      // Traditional left/center/right for 2-3 bays
      return [
        { name: 'left', x: 0, y: 0, width: 33, height: 100 },
        { name: 'center', x: 33, y: 0, width: 34, height: 100 },
        { name: 'right', x: 67, y: 0, width: 33, height: 100 }
      ];
    }
    
    // Dynamic zones for more bays - divide evenly
    const zones: Array<{ name: string; x: number; y: number; width: number; height: number }> = [];
    const zoneWidth = 100 / bayCount;
    
    for (let i = 0; i < bayCount; i++) {
      zones.push({
        name: `bay_${i + 1}`,
        x: i * zoneWidth,
        y: 0,
        width: zoneWidth,
        height: 100
      });
    }
    
    return zones;
  }
}