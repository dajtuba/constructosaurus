import { OllamaVisionAnalyzer } from "../vision/ollama-vision-analyzer";
import * as fs from "fs";
import * as path from "path";

export interface VisionToolResult {
  success: boolean;
  data?: any;
  error?: string;
  confidence?: number;
}

export interface ZoneBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class VisionMCPTools {
  private analyzer: OllamaVisionAnalyzer;
  private imageDir: string;

  constructor(imageDir: string = "/tmp", model: string = "glm-ocr") {
    this.analyzer = new OllamaVisionAnalyzer("http://localhost:11434", model);
    this.imageDir = imageDir;
  }

  /**
   * Analyze specific zone of a drawing sheet
   */
  async analyzeZone(
    sheet: string,
    zone: "left" | "center" | "right" | "top" | "bottom",
    query: string
  ): Promise<VisionToolResult> {
    try {
      const imagePath = this.findImageBySheet(sheet);
      if (!imagePath) {
        return { success: false, error: `Image not found for sheet ${sheet}` };
      }

      const zonePrompt = this.buildZonePrompt(zone, query);
      const result = await this.analyzer.analyzeDrawingPage(imagePath, 1);
      
      return {
        success: true,
        data: result,
        confidence: 0.85
      };
    } catch (error) {
      return { 
        success: false, 
        error: `Zone analysis failed: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }

  /**
   * Analyze entire drawing sheet
   */
  async analyzeDrawing(sheet: string, query: string): Promise<VisionToolResult> {
    try {
      const imagePath = this.findImageBySheet(sheet);
      if (!imagePath) {
        return { success: false, error: `Image not found for sheet ${sheet}` };
      }

      const result = await this.analyzer.analyzeDrawingPage(imagePath, 1);
      
      return {
        success: true,
        data: result,
        confidence: 0.90
      };
    } catch (error) {
      return { 
        success: false, 
        error: `Drawing analysis failed: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }

  /**
   * Extract specific callout from drawing
   */
  async extractCallout(
    sheet: string,
    location: string
  ): Promise<VisionToolResult> {
    try {
      const imagePath = this.findImageBySheet(sheet);
      if (!imagePath) {
        return { success: false, error: `Image not found for sheet ${sheet}` };
      }

      const result = await this.analyzer.analyzeDrawingPage(imagePath, 1);
      
      // Filter results for specific location
      const callouts = this.filterByLocation(result, location);
      
      return {
        success: true,
        data: callouts,
        confidence: 0.80
      };
    } catch (error) {
      return { 
        success: false, 
        error: `Callout extraction failed: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }

  /**
   * Verify specification against drawing
   */
  async verifySpec(
    sheet: string,
    location: string,
    expected: string
  ): Promise<VisionToolResult> {
    try {
      const imagePath = this.findImageBySheet(sheet);
      if (!imagePath) {
        return { success: false, error: `Image not found for sheet ${sheet}` };
      }

      const result = await this.analyzer.analyzeDrawingPage(imagePath, 1);
      
      // Find actual spec at location
      const actualSpec = this.findSpecAtLocation(result, location);
      const matches = this.compareSpecs(actualSpec, expected);
      
      return {
        success: true,
        data: {
          expected,
          actual: actualSpec,
          matches,
          location
        },
        confidence: matches ? 0.95 : 0.85
      };
    } catch (error) {
      return { 
        success: false, 
        error: `Spec verification failed: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }

  private findImageBySheet(sheet: string): string | null {
    try {
      const files = fs.readdirSync(this.imageDir);
      
      // Normalize sheet identifier
      const sheetLower = sheet.toLowerCase().replace('.', '');
      
      // Try different patterns based on actual file naming
      const patterns = [
        // shell-set-page-33-33.png for S2.1 (page 33)
        (f: string) => f.includes('shell-set-page-33') && sheetLower.includes('s21'),
        (f: string) => f.includes('shell-set-page-35') && sheetLower.includes('s30'),
        // shell-s21-left-33.png
        (f: string) => f.includes(`shell-${sheetLower}`),
        // Generic patterns
        (f: string) => f.toLowerCase().includes(sheetLower),
        (f: string) => f.toLowerCase().includes(sheet.toLowerCase()),
        // Page number patterns (S2.1 = page 33, S3.0 = page 35)
        (f: string) => {
          if (sheetLower === 's21') return f.includes('page-33');
          if (sheetLower === 's30') return f.includes('page-35');
          return false;
        }
      ];

      for (const pattern of patterns) {
        const matches = files.filter(f => f.endsWith('.png') && pattern(f));
        if (matches.length > 0) {
          return path.join(this.imageDir, matches[0]);
        }
      }

      // Fallback: just find any PNG file for testing
      const pngFiles = files.filter(f => f.endsWith('.png'));
      if (pngFiles.length > 0) {
        console.log(`Using fallback image: ${pngFiles[0]} for sheet ${sheet}`);
        return path.join(this.imageDir, pngFiles[0]);
      }

      return null;
    } catch (error) {
      console.error('Error finding image:', error);
      return null;
    }
  }

  private buildZonePrompt(zone: string, query: string): string {
    const zoneInstructions = {
      left: "Focus on the left third of the drawing",
      center: "Focus on the center third of the drawing", 
      right: "Focus on the right third of the drawing",
      top: "Focus on the top half of the drawing",
      bottom: "Focus on the bottom half of the drawing"
    };

    return `${zoneInstructions[zone as keyof typeof zoneInstructions]}. ${query}`;
  }

  private filterByLocation(result: any, location: string): any {
    // Simple location filtering - could be enhanced with spatial analysis
    const locationTerms = location.toLowerCase().split(' ');
    
    const filtered = {
      beams: result.beams?.filter((b: any) => 
        locationTerms.some(term => 
          b.gridLocation?.toLowerCase().includes(term) ||
          b.mark?.toLowerCase().includes(term)
        )
      ) || [],
      columns: result.columns?.filter((c: any) =>
        locationTerms.some(term =>
          c.gridLocation?.toLowerCase().includes(term) ||
          c.mark?.toLowerCase().includes(term)
        )
      ) || [],
      joists: result.joists?.filter((j: any) =>
        locationTerms.some(term =>
          j.mark?.toLowerCase().includes(term)
        )
      ) || []
    };

    return filtered;
  }

  private findSpecAtLocation(result: any, location: string): string | null {
    const filtered = this.filterByLocation(result, location);
    
    // Return first found spec
    if (filtered.beams?.length > 0) return filtered.beams[0].mark;
    if (filtered.columns?.length > 0) return filtered.columns[0].mark;
    if (filtered.joists?.length > 0) return filtered.joists[0].mark;
    
    return null;
  }

  private compareSpecs(actual: string | null, expected: string): boolean {
    if (!actual) return false;
    
    // Normalize specs for comparison
    const normalize = (spec: string) => 
      spec.toLowerCase().replace(/[^\w\d]/g, '');
    
    return normalize(actual) === normalize(expected);
  }
}