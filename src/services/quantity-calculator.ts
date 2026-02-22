import { OllamaVisionAnalyzer } from '../vision/ollama-vision-analyzer.js';

export interface DimensionData {
  span: number; // in inches
  width?: number; // in inches
  area?: number; // in square feet
  location: string;
}

export interface MaterialQuantity {
  spec: string;
  quantity: number;
  unit: 'EA' | 'LF' | 'SF' | 'BF';
  span?: number;
  locations: string[];
  calculation: string;
}

export interface MaterialTakeoff {
  sheet: string;
  materials: MaterialQuantity[];
  totals: Record<string, number>;
  calculated_at: string;
}

export class QuantityCalculator {
  constructor(private vision: OllamaVisionAnalyzer) {}

  // Parse spacing from spec string (@ 16" OC → 16)
  parseSpacing(spec: string): number {
    const match = spec.match(/@\s*(\d+(?:\.\d+)?)\s*["\s]*OC/i);
    return match ? parseFloat(match[1]) : 16; // default 16" OC
  }

  // Extract dimensions from plan using vision
  async extractDimensions(imagePath: string, zone?: string): Promise<DimensionData[]> {
    const result = await this.vision.analyzeDrawingPage(imagePath, 1, 'structural');
    
    // Extract dimensions from vision result
    const dimensions: DimensionData[] = [];
    
    if (result.dimensions) {
      result.dimensions.forEach(dim => {
        const span = this.parseDimension(dim.value);
        if (span > 0) {
          dimensions.push({
            span,
            location: dim.location || dim.element || 'unknown'
          });
        }
      });
    }
    
    // If no dimensions found, try to extract from any text in the result
    if (dimensions.length === 0) {
      const resultText = JSON.stringify(result);
      return this.extractDimensionsFromText(resultText);
    }
    
    return dimensions;
  }

  // Parse dimension string to inches (24'-6" → 294)
  private parseDimension(dim: string): number {
    if (typeof dim === 'number') return dim;
    
    // Handle feet-inches format (24'-6")
    const feetInches = dim.match(/(\d+)'-(\d+)"/);
    if (feetInches) {
      return parseInt(feetInches[1]) * 12 + parseInt(feetInches[2]);
    }
    
    // Handle feet only (24')
    const feetOnly = dim.match(/(\d+)'/);
    if (feetOnly) {
      return parseInt(feetOnly[1]) * 12;
    }
    
    // Handle inches only (18")
    const inchesOnly = dim.match(/(\d+)"/);
    if (inchesOnly) {
      return parseInt(inchesOnly[1]);
    }
    
    // Handle decimal feet (24.5)
    const decimal = parseFloat(dim);
    if (!isNaN(decimal)) {
      return decimal > 50 ? decimal : decimal * 12; // assume feet if > 50
    }
    
    return 0;
  }

  // Fallback dimension extraction from text
  private extractDimensionsFromText(text: string): DimensionData[] {
    const dimensions: DimensionData[] = [];
    const dimRegex = /(\d+(?:'-\d+"?|\'\d*"?|"\d*|\.?\d*))/g;
    const matches = text.match(dimRegex) || [];
    
    matches.forEach((match, i) => {
      const span = this.parseDimension(match);
      if (span > 0) {
        dimensions.push({
          span,
          location: `dimension_${i + 1}`
        });
      }
    });
    
    return dimensions;
  }

  // Calculate joist quantity: span ÷ spacing + 1
  calculateJoistQuantity(span: number, spacing: number): number {
    if (span <= 0 || spacing <= 0) return 0;
    return Math.floor(span / spacing) + 1;
  }

  // Calculate beam quantity (typically 1 per span)
  calculateBeamQuantity(spans: number[]): number {
    return spans.length;
  }

  // Generate material takeoff from zone data and dimensions
  async generateTakeoff(
    zoneData: any,
    imagePath: string
  ): Promise<MaterialTakeoff> {
    const dimensions = await this.extractDimensions(imagePath);
    const materials: MaterialQuantity[] = [];
    
    // Process each zone
    for (const zone of zoneData.zones) {
      const zoneDims = dimensions.filter(d => 
        d.location.toLowerCase().includes(zone.zone) ||
        d.location.toLowerCase().includes('overall') ||
        d.span > 200 // likely main spans
      );
      
      const mainSpan = zoneDims.length > 0 
        ? Math.max(...zoneDims.map(d => d.span))
        : 288; // default 24' span
      
      // Calculate joists
      for (const joistSpec of zone.joists || []) {
        const spacing = this.parseSpacing(joistSpec);
        const quantity = this.calculateJoistQuantity(mainSpan, spacing);
        
        materials.push({
          spec: joistSpec,
          quantity,
          unit: 'EA',
          span: mainSpan,
          locations: [zone.zone],
          calculation: `${mainSpan}" span ÷ ${spacing}" OC + 1 = ${quantity} EA`
        });
      }
      
      // Calculate beams (1 per span typically)
      for (const beamSpec of zone.beams || []) {
        materials.push({
          spec: beamSpec,
          quantity: 1,
          unit: 'EA',
          span: mainSpan,
          locations: [zone.zone],
          calculation: `1 beam per ${zone.zone} zone = 1 EA`
        });
      }
      
      // Calculate plates (perimeter)
      for (const plateSpec of zone.plates || []) {
        const perimeter = mainSpan * 2; // simplified
        materials.push({
          spec: plateSpec,
          quantity: Math.ceil(perimeter / 12), // convert to LF
          unit: 'LF',
          locations: [zone.zone],
          calculation: `${perimeter}" perimeter ÷ 12 = ${Math.ceil(perimeter / 12)} LF`
        });
      }
      
      // Calculate columns (count as-is)
      for (const columnSpec of zone.columns || []) {
        materials.push({
          spec: columnSpec,
          quantity: 2, // typical per zone
          unit: 'EA',
          locations: [zone.zone],
          calculation: `2 columns per ${zone.zone} zone = 2 EA`
        });
      }
    }
    
    // Consolidate duplicate specs
    const consolidated = this.consolidateMaterials(materials);
    
    // Calculate totals
    const totals: Record<string, number> = {};
    consolidated.forEach(m => {
      totals[m.spec] = m.quantity;
    });
    
    return {
      sheet: zoneData.sheet,
      materials: consolidated,
      totals,
      calculated_at: new Date().toISOString()
    };
  }

  // Consolidate materials with same spec
  private consolidateMaterials(materials: MaterialQuantity[]): MaterialQuantity[] {
    const consolidated = new Map<string, MaterialQuantity>();
    
    materials.forEach(material => {
      const existing = consolidated.get(material.spec);
      if (existing) {
        existing.quantity += material.quantity;
        existing.locations = [...new Set([...existing.locations, ...material.locations])];
        existing.calculation += ` + ${material.calculation}`;
      } else {
        consolidated.set(material.spec, { ...material });
      }
    });
    
    return Array.from(consolidated.values());
  }

  // Validate quantities (sanity check)
  validateQuantities(takeoff: MaterialTakeoff): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    takeoff.materials.forEach(material => {
      // Check for obviously wrong quantities
      if (material.quantity <= 0) {
        errors.push(`${material.spec}: Quantity is ${material.quantity} (should be > 0)`);
      }
      
      if (material.unit === 'EA' && material.quantity > 500) {
        errors.push(`${material.spec}: ${material.quantity} pieces seems excessive for residential`);
      }
      
      if (material.unit === 'LF' && material.quantity > 5000) {
        errors.push(`${material.spec}: ${material.quantity} LF seems excessive for residential`);
      }
      
      // Check joist quantities specifically
      if (material.spec.includes('TJI') || material.spec.includes('joist')) {
        if (material.quantity > 200) {
          errors.push(`${material.spec}: ${material.quantity} joists seems excessive (typical house: 50-150)`);
        }
        if (material.quantity < 5) {
          errors.push(`${material.spec}: ${material.quantity} joists seems too few`);
        }
      }
    });
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}