import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";

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

export class DrawingVisionAnalyzer {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async analyzeDrawingPage(
    imagePath: string,
    pageNumber: number
  ): Promise<VisionAnalysisResult> {
    const imageData = fs.readFileSync(imagePath);
    const base64Image = imageData.toString('base64');

    const response = await this.client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [{
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/png",
              data: base64Image
            }
          },
          {
            type: "text",
            text: this.getExtractionPrompt()
          }
        ]
      }]
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return this.parseVisionResponse(text, pageNumber);
  }

  private getExtractionPrompt(): string {
    return `Analyze this construction drawing and extract ALL data in JSON format.

Extract:
1. SCHEDULES - Any tables with marks/IDs (door, window, room finish, equipment)
2. DIMENSIONS - All dimension strings visible on the drawing
3. ITEM COUNTS - Count symbols by mark (doors, windows, fixtures)

Return ONLY valid JSON in this exact format:
{
  "schedules": [
    {
      "type": "door_schedule",
      "entries": [
        {"mark": "D101", "width": "3'-0\"", "height": "7'-0\"", "type": "Solid Core"}
      ]
    }
  ],
  "dimensions": [
    {"location": "North wall", "value": "24'-6\"", "gridReference": "Grid A-D"}
  ],
  "itemCounts": [
    {"item": "Door", "mark": "D101", "count": 3}
  ]
}

If no data found in a category, use empty array [].
Return ONLY the JSON, no other text.`;
  }

  private parseVisionResponse(text: string, pageNumber: number): VisionAnalysisResult {
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonText = text.trim();
      if (jsonText.includes('```json')) {
        const start = jsonText.indexOf('```json') + 7;
        const end = jsonText.indexOf('```', start);
        jsonText = jsonText.substring(start, end).trim();
      } else if (jsonText.includes('```')) {
        const start = jsonText.indexOf('```') + 3;
        const end = jsonText.indexOf('```', start);
        jsonText = jsonText.substring(start, end).trim();
      }

      const parsed = JSON.parse(jsonText);

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
      return {
        schedules: [],
        dimensions: [],
        itemCounts: []
      };
    }
  }
}
