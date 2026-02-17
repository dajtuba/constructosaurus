import pdf from "pdf-parse";
import * as fs from "fs";

export interface Sheet {
  pageNumber: number;
  text: string;
  metadata: {
    source: string;
    project?: string;
    discipline?: string;
    drawingNumber?: string;
    drawingType?: string;
    materials?: string;
    components?: string;
  };
}

export class SheetProcessor {
  async processDrawing(pdfPath: string, classification: any): Promise<Sheet[]> {
    const dataBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdf(dataBuffer);

    const sheets: Sheet[] = [];
    
    // pdf-parse doesn't split by page, so we'll create one sheet per page
    // using the total page count and dividing the text
    const totalPages = pdfData.numpages;
    const allText = pdfData.text;
    
    // Simple approach: split text evenly across pages
    // (Not perfect but works for now - better would be to use pdf-lib)
    const charsPerPage = Math.ceil(allText.length / totalPages);
    
    for (let i = 0; i < totalPages; i++) {
      const start = i * charsPerPage;
      const end = Math.min((i + 1) * charsPerPage, allText.length);
      const pageText = allText.substring(start, end).trim();
      
      if (!pageText) continue;

      sheets.push({
        pageNumber: i + 1,
        text: pageText,
        metadata: {
          source: pdfPath,
          project: classification.project,
          discipline: this.inferDiscipline(pageText),
          drawingNumber: this.extractDrawingNumber(pageText) || `Page-${i + 1}`,
          drawingType: this.inferDrawingType(pageText),
        },
      });
    }

    return sheets;
  }

  async processSpecification(pdfPath: string, classification: any): Promise<Sheet[]> {
    const dataBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdf(dataBuffer);

    // For specs, detect sections by CSI division headers
    const sections = this.detectSections(pdfData.text);
    
    return sections.map((section, idx) => ({
      pageNumber: idx + 1,
      text: section.text,
      metadata: {
        source: pdfPath,
        project: classification.project,
        discipline: classification.discipline,
        drawingNumber: section.sectionNumber,
        drawingType: "Specification",
      },
    }));
  }

  private inferDrawingType(text: string): string {
    const lower = text.toLowerCase();
    if (lower.includes("plan") || lower.includes("floor plan")) return "Plan";
    if (lower.includes("elevation")) return "Elevation";
    if (lower.includes("section")) return "Section";
    if (lower.includes("detail")) return "Detail";
    if (lower.includes("schedule")) return "Schedule";
    return "General";
  }

  private inferDiscipline(text: string): string {
    const upper = text.toUpperCase();
    
    // Check for drawing number prefixes (most reliable)
    if (/\bS\d+\.\d+\b/.test(upper) || /STRUCTURAL|FOUNDATION PLAN|FRAMING PLAN|BEAM|FOOTING/.test(upper)) {
      return "Structural";
    }
    if (/\bA\d+\.\d+\b/.test(upper) || /ARCHITECTURAL|FLOOR PLAN|ELEVATION|SITE PLAN/.test(upper)) {
      return "Architectural";
    }
    if (/\bM\d+\.\d+\b/.test(upper) || /MECHANICAL|HVAC/.test(upper)) {
      return "Mechanical";
    }
    if (/\bE\d+\.\d+\b/.test(upper) || /ELECTRICAL|LIGHTING/.test(upper)) {
      return "Electrical";
    }
    if (/\bP\d+\.\d+\b/.test(upper) || /PLUMBING/.test(upper)) {
      return "Plumbing";
    }
    if (/\bC\d+\.\d+\b/.test(upper) || /CIVIL|SITE/.test(upper)) {
      return "Civil";
    }
    
    return "General";
  }

  private extractDrawingNumber(text: string): string | null {
    // Match common drawing number patterns: S2.0, A101, E202, etc.
    const match = text.match(/\b([ASMEPC])(\d+)\.(\d+)\b/);
    return match ? match[0] : null;
  }

  private detectSections(text: string): Array<{ sectionNumber: string; text: string }> {
    // Simple section detection - split by "DIVISION" or "SECTION"
    const sectionRegex = /(DIVISION|SECTION)\s+(\d+)/gi;
    const matches = [...text.matchAll(sectionRegex)];
    
    if (matches.length === 0) {
      return [{ sectionNumber: "General", text }];
    }

    const sections: Array<{ sectionNumber: string; text: string }> = [];
    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index!;
      const end = i < matches.length - 1 ? matches[i + 1].index! : text.length;
      const sectionText = text.slice(start, end);
      sections.push({
        sectionNumber: `${matches[i][1]}-${matches[i][2]}`,
        text: sectionText,
      });
    }

    return sections;
  }
}
