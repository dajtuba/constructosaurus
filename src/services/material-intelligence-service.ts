import { MATERIAL_DATABASE, EQUIVALENCE_RULES, UNIT_CONVERSIONS, STOCK_SIZES } from './material-database';
import { Material, MaterialEquivalence } from '../types';

export class MaterialIntelligenceService {
  /**
   * Find equivalent materials
   */
  findEquivalents(materialId: string): Material[] {
    const material = MATERIAL_DATABASE.find(m => m.id === materialId);
    if (!material) return [];
    
    return MATERIAL_DATABASE.filter(m => 
      material.equivalents.includes(m.id)
    );
  }

  /**
   * Convert units
   */
  convertUnits(quantity: number, fromUnit: string, toUnit: string): number {
    const conversion = UNIT_CONVERSIONS.find(
      c => c.fromUnit === fromUnit && c.toUnit === toUnit
    );
    
    if (!conversion) {
      throw new Error(`No conversion found from ${fromUnit} to ${toUnit}`);
    }
    
    return quantity * conversion.conversionFactor;
  }

  /**
   * Calculate stock size needed
   */
  calculateStockSize(needed: number, materialType: string): number {
    const sizes = STOCK_SIZES[materialType];
    if (!sizes) return needed;
    
    // Find smallest stock size that fits
    const stockSize = sizes.find(size => size >= needed);
    return stockSize || sizes[sizes.length - 1];
  }

  /**
   * Suggest material substitution
   */
  substituteMaterial(materialId: string, constraints?: Record<string, any>): MaterialEquivalence | null {
    const equivalence = EQUIVALENCE_RULES.find(e => e.from === materialId);
    return equivalence || null;
  }

  /**
   * Get material by ID
   */
  getMaterial(materialId: string): Material | undefined {
    return MATERIAL_DATABASE.find(m => m.id === materialId);
  }
}
