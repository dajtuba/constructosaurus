import * as fs from "fs";
import * as path from "path";
import pdf from "pdf-parse";
import { CadVisionProcessor } from "../vision/cad-vision-processor";
import { ProcessedDocument, ConstructionMetadata, CONSTRUCTION_TAXONOMY } from "../types";

export class ConstructionDocumentProcessor {
  private cadVision: CadVisionProcessor;

  constructor(anthropicApiKey: string) {
    this.cadVision = new CadVisionProcessor(anthropicApiKey);
  }

  async process(pdfPath: string): Promise<ProcessedDocument[]> {
    const dataBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdf(dataBuffer);

    const docType = await this.classifyDocument(pdfData.text);

    if (docType === "CAD_DRAWING") {
      return await this.processCADDrawing(pdfPath, pdfData);
    } else if (docType === "SPECIFICATION") {
      return await this.processSpecification(pdfData);
    } else {
      return await this.processGeneric(pdfData);
    }
  }

  private async classifyDocument(text: string): Promise<string> {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes("drawing") || lowerText.includes("sheet") || lowerText.includes("detail")) {
      return "CAD_DRAWING";
    } else if (lowerText.includes("specification") || lowerText.includes("section")) {
      return "SPECIFICATION";
    }
    
    return "GENERIC";
  }

  private async processCADDrawing(pdfPath: string, pdfData: any): Promise<ProcessedDocument[]> {
    const metadata = await this.extractMetadata(pdfData.text);
    
    return [{
      id: path.basename(pdfPath),
      text: pdfData.text,
      ...metadata,
    }];
  }

  private async processSpecification(pdfData: any): Promise<ProcessedDocument[]> {
    const sections = this.chunkBySection(pdfData.text);
    const metadata = await this.extractMetadata(pdfData.text);
    
    return sections.map((section, idx) => ({
      id: `spec-${idx}`,
      text: section.content,
      project: metadata.project,
      discipline: metadata.discipline,
      drawingType: "Specification",
      drawingNumber: section.number || "",
      materials: metadata.materials,
      components: metadata.components,
    }));
  }

  private async processGeneric(pdfData: any): Promise<ProcessedDocument[]> {
    const metadata = await this.extractMetadata(pdfData.text);
    
    return [{
      id: "generic-doc",
      text: pdfData.text,
      ...metadata,
    }];
  }

  private chunkBySection(text: string): Array<{ number: string; content: string }> {
    const sections: Array<{ number: string; content: string }> = [];
    const lines = text.split("\n");
    
    let currentSection = { number: "", content: "" };
    
    for (const line of lines) {
      const sectionMatch = line.match(/^(\d+(?:\.\d+)*)\s+(.+)/);
      
      if (sectionMatch) {
        if (currentSection.content) {
          sections.push(currentSection);
        }
        currentSection = { number: sectionMatch[1], content: line };
      } else {
        currentSection.content += "\n" + line;
      }
    }
    
    if (currentSection.content) {
      sections.push(currentSection);
    }
    
    return sections;
  }

  private async extractMetadata(text: string): Promise<ConstructionMetadata> {
    const lowerText = text.toLowerCase();
    
    return {
      project: this.extractProject(text),
      discipline: this.extractDiscipline(lowerText),
      drawingType: this.extractDrawingType(lowerText),
      drawingNumber: this.extractDrawingNumber(text),
      materials: this.extractMaterials(lowerText).join(", "),
      components: this.extractComponents(lowerText).join(", "),
    };
  }

  private extractProject(text: string): string {
    const match = text.match(/project[:\s]+([^\n]+)/i);
    return match ? match[1].trim() : "Unknown";
  }

  private extractDiscipline(lowerText: string): string {
    const disciplines = CONSTRUCTION_TAXONOMY.disciplines;
    for (const d of disciplines) {
      if (lowerText.includes(d.toLowerCase())) {
        return d;
      }
    }
    if (lowerText.includes("struct") || lowerText.includes("foundation") || lowerText.includes("beam")) {
      return "Structural";
    }
    if (lowerText.includes("floor plan") || lowerText.includes("elevation")) {
      return "Architectural";
    }
    return "General";
  }

  private extractDrawingType(lowerText: string): string {
    if (lowerText.includes("detail")) return "Detail";
    if (lowerText.includes("plan")) return "Plan";
    if (lowerText.includes("elevation")) return "Elevation";
    if (lowerText.includes("section")) return "Section";
    if (lowerText.includes("schedule")) return "Schedule";
    if (lowerText.includes("specification")) return "Specification";
    return "General";
  }

  private extractDrawingNumber(text: string): string {
    const match = text.match(/[A-Z]-?\d{3,}/);
    return match ? match[0] : "";
  }

  private extractMaterials(lowerText: string): string[] {
    return CONSTRUCTION_TAXONOMY.materials.filter(m => 
      lowerText.includes(m.toLowerCase())
    );
  }

  private extractComponents(lowerText: string): string[] {
    return CONSTRUCTION_TAXONOMY.components.filter(c => 
      lowerText.includes(c.toLowerCase())
    );
  }
}
