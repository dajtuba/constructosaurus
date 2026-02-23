import { OllamaVisionAnalyzer } from '../vision/ollama-vision-analyzer';
import { EnhancedSpacingParser, SpacingResult } from './enhanced-spacing-parser';
import { DimensionExtractor } from '../tools/dimension-extractor';
import { WasteFactorCalculator } from './waste-factor-calculator';

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
  private dimensionExtractor: DimensionExtractor;

  constructor(private vision: OllamaVisionAnalyzer) {
    this.dimensionExtractor = new DimensionExtractor();
  }

  // Parse spacing from spec string using enhanced parser
  parseSpacing(spec: string): SpacingResult {
    return EnhancedSpacingParser.parseSpacing(spec);
  }

  // Extract dimensions from plan using dedicated extractor
  async extractDimensions(imagePath: string, sheet: string, zone?: string): Promise<DimensionData[]> {
    const result = await this.dimensionExtractor.extractDimensions(imagePath, sheet);
    
    // Convert to legacy format for compatibility
    const dimensions: DimensionData[] = result.dimensions.map(dim => ({
      span: dim.inches,
      location: dim.location
    }));
    
    // If zone specified, filter dimensions
    if (zone) {
      return dimensions.filter(d => 
        d.location.toLowerCase().includes(zone.toLowerCase())
      );
    }
    
    return dimensions;
  }

  // Get main span using dimension extractor
  async getMainSpan(imagePath: string, sheet: string): Promise<number> {
    const result = await this.dimensionExtractor.extractDimensions(imagePath, sheet);
    return this.dimensionExtractor.getMainSpan(result);
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

  // Calculate joist quantity using enhanced spacing parser
  calculateJoistQuantity(span: number, spacingSpec: string): number {
    const spacingResult = this.parseSpacing(spacingSpec);
    return EnhancedSpacingParser.calculateQuantity(span, spacingResult);
  }

  // Calculate beam quantity (typically 1 per span)
  calculateBeamQuantity(spans: number[]): number {
    return spans.length;
  }

  // Generate material takeoff with waste factors
  async generateTakeoff(
    zoneData: any,
    imagePath: string
  ): Promise<MaterialTakeoff> {
    const dimensions = await this.extractDimensions(imagePath, zoneData.sheet);
    const mainSpan = await this.getMainSpan(imagePath, zoneData.sheet);
    const materials: MaterialQuantity[] = [];
    
    console.log(`📏 Using main span: ${Math.floor(mainSpan / 12)}'-${mainSpan % 12}" (${mainSpan}")`);
    
    // Process each zone
    for (const zone of zoneData.zones) {
      // Calculate joists with enhanced spacing parser
      for (const joistSpec of zone.joists || []) {
        const quantity = this.calculateJoistQuantity(mainSpan, joistSpec);
        
        materials.push({
          spec: joistSpec,
          quantity,
          unit: 'EA',
          span: mainSpan,
          locations: [zone.zone],
          calculation: `Enhanced spacing calculation: ${quantity} EA`
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
    
    // Apply waste factors
    const withWaste = WasteFactorCalculator.applyWasteFactors(
      consolidated.map(m => ({ spec: m.spec, quantity: m.quantity, unit: m.unit }))
    );
    
    // Convert back to MaterialQuantity format
    const finalMaterials: MaterialQuantity[] = consolidated.map((material, index) => {
      const wasteData = withWaste[index];
      return {
        ...material,
        quantity: wasteData.totalQuantity,
        calculation: `${material.calculation} + ${(wasteData.wasteFactor * 100).toFixed(0)}% waste = ${wasteData.totalQuantity} ${material.unit}`
      };
    });
    
    // Calculate totals
    const totals: Record<string, number> = {};
    finalMaterials.forEach(m => {
      totals[m.spec] = m.quantity;
    });
    
    return {
      sheet: zoneData.sheet,
      materials: finalMaterials,
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