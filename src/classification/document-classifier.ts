import * as fs from "fs";
import * as path from "path";
import pdf from "pdf-parse";
import { Ollama } from "ollama";

export interface DocumentClassification {
  type: "structural_drawing" | "architectural_drawing" | "mep_drawing" | "civil_drawing" | "specification" | "schedule" | "unknown";
  project?: string;
  discipline?: string;
  drawingNumbers: string[];
  hasSchedules: boolean;
  hasTitleBlock: boolean;
  pageCount: number;
  confidence: number;
}

export class DocumentClassifier {
  private ollama: Ollama;
  private model: string;

  constructor(model: string = "phi4") {
    this.ollama = new Ollama();
    this.model = model;
  }

  async classifyDocument(pdfPath: string): Promise<DocumentClassification> {
    const dataBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdf(dataBuffer);
    
    // Extract first 2 pages of text
    const firstPages = pdfData.text.split('\n').slice(0, 100).join('\n');
    
    const prompt = `Analyze this construction document and extract metadata.

Document text (first 2 pages):
${firstPages}

Return ONLY valid JSON (no markdown, no explanation):
{
  "type": "structural_drawing" | "architectural_drawing" | "mep_drawing" | "civil_drawing" | "specification" | "schedule" | "unknown",
  "project": "project name if found or null",
  "discipline": "Structural" | "Architectural" | "Mechanical" | "Electrical" | "Plumbing" | "Civil" | null,
  "drawingNumbers": ["S-101"],
  "hasSchedules": true,
  "hasTitleBlock": true,
  "confidence": 0.85
}`;

    const response = await this.ollama.generate({
      model: this.model,
      prompt,
      stream: false,
    });

    // Parse JSON from response
    let classification: DocumentClassification;
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = response.response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      classification = JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.warn("Failed to parse AI response, using fallback classification");
      classification = this.fallbackClassification(pdfPath, firstPages);
    }

    classification.pageCount = pdfData.numpages;
    return classification;
  }

  private fallbackClassification(pdfPath: string, text: string): DocumentClassification {
    const filename = path.basename(pdfPath).toLowerCase();
    const textLower = text.toLowerCase();
    
    // Detect type
    let type: DocumentClassification["type"] = "unknown";
    if (filename.startsWith("s-") || textLower.includes("structural")) type = "structural_drawing";
    else if (filename.startsWith("a-") || textLower.includes("architectural")) type = "architectural_drawing";
    else if (filename.startsWith("m-") || filename.startsWith("e-") || filename.startsWith("p-")) type = "mep_drawing";
    else if (filename.startsWith("c-") || textLower.includes("civil")) type = "civil_drawing";
    else if (textLower.includes("specification") || textLower.includes("division")) type = "specification";
    
    // Detect discipline
    let discipline: string | undefined;
    if (textLower.includes("structural")) discipline = "Structural";
    else if (textLower.includes("architectural")) discipline = "Architectural";
    else if (textLower.includes("mechanical")) discipline = "Mechanical";
    else if (textLower.includes("electrical")) discipline = "Electrical";
    else if (textLower.includes("civil")) discipline = "Civil";
    
    return {
      type,
      discipline,
      drawingNumbers: [],
      hasSchedules: /schedule/i.test(text),
      hasTitleBlock: /project|drawing|sheet/i.test(text),
      pageCount: 0,
      confidence: 0.5,
    };
  }
}
