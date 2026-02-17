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
  beams?: Array<{mark: string; gridLocation?: string; count?: number}>;
  columns?: Array<{mark: string; gridLocation?: string}>;
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
    pageNumber: number
  ): Promise<VisionAnalysisResult> {
    const imageData = fs.readFileSync(imagePath);
    const base64Image = imageData.toString('base64');

    const response = await this.ollama.generate({
      model: this.model,
      prompt: this.getExtractionPrompt(),
      images: [base64Image],
      options: {
        temperature: 0.3,
      }
    });

    return this.parseVisionResponse(response.response, pageNumber);
  }

  private getExtractionPrompt(): string {
    return `You are analyzing a construction drawing. Look carefully at the image.

List everything you can see:
- Beam callouts (W18x106, W10x100, W12x65, etc.) - these are steel beam sizes
- Column callouts (W14x90, HSS8x8x1/2, etc.)
- Tables or schedules with marks (like D101, W1, F1, B1)
- Dimension strings (like 24'-6", 3'-0", 12")
- Grid lines and labels (A, B, C, 1, 2, 3)

Provide your answer as JSON:
{
  "beams": [{"mark": "W18x106", "gridLocation": "between A-B/1-2", "count": 1}],
  "columns": [{"mark": "W14x90", "gridLocation": "at A/1"}],
  "schedules": [{"type": "beam_schedule", "entries": [{"mark": "B1", "size": "W18x106"}]}],
  "dimensions": [{"location": "wall", "value": "24'-6\""}]
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
      // Remove all triple quotes
      while (jsonText.includes('"""')) {
        jsonText = jsonText.replace('"""', '"');
      }
      // Remove trailing quotes before closing braces/brackets
      jsonText = jsonText.replace(/""\s*([}\]])/g, '"$1');
      
      // Try JSON5 first (more lenient)
      let parsed;
      try {
        parsed = JSON5.parse(jsonText);
      } catch {
        parsed = JSON.parse(jsonText);
      }

      return {
        schedules: (parsed.schedules || []).map((s: any) => ({
          scheduleType: s.type || 'unknown',
          entries: s.entries || [],
          pageNumber
        })),
        beams: parsed.beams || [],
        columns: parsed.columns || [],
        dimensions: parsed.dimensions || [],
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
}
