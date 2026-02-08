import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";

interface DrawingAnalysis {
  drawingType: string;
  discipline: string;
  components: string[];
  dimensions: Array<{ value: string; unit: string }>;
  materials: string[];
  notes: string[];
  references: string[];
}

export class CadVisionProcessor {
  private anthropic: Anthropic;

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({ apiKey });
  }

  async analyzeDrawing(imagePath: string, query?: string): Promise<DrawingAnalysis> {
    const imageData = fs.readFileSync(imagePath);
    const base64Image = imageData.toString("base64");

    const prompt = query
      ? `Analyze this construction drawing and answer: ${query}`
      : `Analyze this construction drawing and extract:
1. Drawing type (plan, elevation, section, detail)
2. Discipline (structural, architectural, civil, MEP)
3. Key components visible
4. Dimensions and measurements shown
5. Material callouts
6. Notes and annotations
7. Reference to other drawings or specifications`;

    const response = await this.anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/png",
                data: base64Image,
              },
            },
            {
              type: "text",
              text: prompt,
            },
          ],
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    return this.parseDrawingAnalysis(text);
  }

  private parseDrawingAnalysis(text: string): DrawingAnalysis {
    return {
      drawingType: this.extractField(text, "Drawing type"),
      discipline: this.extractField(text, "Discipline"),
      components: this.extractList(text, "Key components"),
      dimensions: this.extractDimensions(text),
      materials: this.extractList(text, "Material callouts"),
      notes: this.extractList(text, "Notes"),
      references: this.extractReferences(text),
    };
  }

  private extractField(text: string, fieldName: string): string {
    const regex = new RegExp(`${fieldName}:\\s*([^\n]+)`);
    const match = text.match(regex);
    return match ? match[1].trim() : "";
  }

  private extractList(text: string, sectionName: string): string[] {
    const regex = new RegExp(`${sectionName}:[^\n]*\n([\\s\\S]*?)(?=\n\n|\\d+\\.|$)`);
    const match = text.match(regex);
    if (!match) return [];

    return match[1]
      .split("\n")
      .map((line) => line.replace(/^[-*•]\s*/, "").trim())
      .filter((line) => line.length > 0);
  }

  private extractDimensions(text: string): Array<{ value: string; unit: string }> {
    const patterns = [
      /(\d+(?:\.\d+)?)\s*(?:ft|')/gi,
      /(\d+(?:\.\d+)?)\s*(?:in|")/gi,
      /(\d+(?:\.\d+)?)\s*(?:m|mm|cm)/gi,
    ];

    const dimensions: Array<{ value: string; unit: string }> = [];

    patterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        dimensions.push({
          value: match[1],
          unit: match[0].replace(match[1], "").trim(),
        });
      }
    });

    return dimensions;
  }

  private extractReferences(text: string): string[] {
    const pattern = /(?:See|Ref(?:erence)?)[:\s]+([A-Z0-9\-\/\.]+)/gi;
    const matches = [...text.matchAll(pattern)];
    return matches.map((m) => m[1]);
  }
}
