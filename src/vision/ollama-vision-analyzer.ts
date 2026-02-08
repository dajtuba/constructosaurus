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
  dimensions: VisionDimension[];
  itemCounts: VisionItemCount[];
}

export class OllamaVisionAnalyzer {
  private ollama: Ollama;
  private model: string;

  constructor(ollamaUrl: string = "http://localhost:11434", model: string = "llava:13b") {
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
- Tables or schedules with marks (like D101, W1, F1)
- Dimension strings (like 24'-6", 3'-0", 12")
- Symbols that repeat (doors, windows, etc.)

Provide your answer as JSON:
{
  "schedules": [{"type": "door_schedule", "entries": [{"mark": "D101", "width": "3'-0\""}]}],
  "dimensions": [{"location": "wall", "value": "24'-6\""}],
  "itemCounts": [{"item": "door", "mark": "D101", "count": 2}]
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
