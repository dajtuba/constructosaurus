export interface ExtractedDimension {
  feet: number;
  inches: number;
  totalInches: number;
  original: string;
  context?: string;
}

export interface AreaCalculation {
  length: ExtractedDimension;
  width: ExtractedDimension;
  squareFeet: number;
  context?: string;
}

export class DimensionExtractor {
  // Matches: 82'-0", 25'-6", 12'6", 6", etc.
  private dimensionPattern = /(\d+)[''][-\s]*(\d+)?[""]?/g;
  
  extractDimensions(text: string): ExtractedDimension[] {
    const dimensions: ExtractedDimension[] = [];
    const matches = text.matchAll(this.dimensionPattern);
    
    for (const match of matches) {
      const feet = parseInt(match[1]);
      const inches = match[2] ? parseInt(match[2]) : 0;
      
      dimensions.push({
        feet,
        inches,
        totalInches: feet * 12 + inches,
        original: match[0]
      });
    }
    
    return dimensions;
  }
  
  calculateAreas(text: string): AreaCalculation[] {
    const dimensions = this.extractDimensions(text);
    const areas: AreaCalculation[] = [];
    
    // Look for dimension pairs (simple heuristic: consecutive dimensions likely form area)
    for (let i = 0; i < dimensions.length - 1; i++) {
      const d1 = dimensions[i];
      const d2 = dimensions[i + 1];
      
      // Skip if dimensions are identical (likely same dimension repeated)
      if (d1.totalInches === d2.totalInches) continue;
      
      const sqFt = (d1.totalInches / 12) * (d2.totalInches / 12);
      
      areas.push({
        length: d1,
        width: d2,
        squareFeet: Math.round(sqFt)
      });
    }
    
    return areas;
  }
  
  findBuildingDimensions(text: string): { length?: number; width?: number; area?: number } {
    const dimensions = this.extractDimensions(text);
    
    // Find largest two dimensions (likely building envelope)
    const sorted = dimensions.sort((a, b) => b.totalInches - a.totalInches);
    
    if (sorted.length >= 2) {
      const length = sorted[0].totalInches / 12;
      const width = sorted[1].totalInches / 12;
      
      return {
        length,
        width,
        area: Math.round(length * width)
      };
    }
    
    return {};
  }
}
