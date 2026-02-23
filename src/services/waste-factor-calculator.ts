/**
 * Waste Factor Calculator - Apply construction waste factors
 * Phase 1 improvement: 10% joists, 5% beams, 15% plates
 */

export interface WasteFactorConfig {
  material: string;
  baseFactor: number;      // Base waste percentage (0.10 = 10%)
  cutFactor?: number;      // Additional factor for cutting waste
  damageFactor?: number;   // Additional factor for damage/defects
  description: string;
}

export interface MaterialWithWaste {
  spec: string;
  baseQuantity: number;
  wasteQuantity: number;
  totalQuantity: number;
  wasteFactor: number;
  unit: string;
  calculation: string;
}

export class WasteFactorCalculator {
  
  private static readonly WASTE_FACTORS: Record<string, WasteFactorConfig> = {
    // Joists - 10% waste (cutting, defects, extras)
    'joist': {
      material: 'joist',
      baseFactor: 0.10,
      cutFactor: 0.05,
      damageFactor: 0.02,
      description: 'Floor/ceiling joists with cutting and defect allowance'
    },
    
    // Beams - 5% waste (minimal cutting, engineered)
    'beam': {
      material: 'beam',
      baseFactor: 0.05,
      cutFactor: 0.02,
      damageFactor: 0.01,
      description: 'Engineered beams with minimal waste'
    },
    
    // Plates - 15% waste (lots of cutting, corners, openings)
    'plate': {
      material: 'plate',
      baseFactor: 0.15,
      cutFactor: 0.08,
      damageFactor: 0.03,
      description: 'Sill/top plates with high cutting waste'
    },
    
    // Columns/Posts - 8% waste (some cutting, damage)
    'column': {
      material: 'column',
      baseFactor: 0.08,
      cutFactor: 0.03,
      damageFactor: 0.02,
      description: 'Columns and posts with moderate waste'
    },
    
    // Blocking - 20% waste (lots of small pieces)
    'blocking': {
      material: 'blocking',
      baseFactor: 0.20,
      cutFactor: 0.12,
      damageFactor: 0.03,
      description: 'Blocking with high cutting waste'
    },
    
    // Sheathing - 12% waste (cutting around openings)
    'sheathing': {
      material: 'sheathing',
      baseFactor: 0.12,
      cutFactor: 0.08,
      damageFactor: 0.02,
      description: 'Sheathing with opening cutouts'
    },
    
    // Hardware - 5% waste (minimal loss)
    'hardware': {
      material: 'hardware',
      baseFactor: 0.05,
      cutFactor: 0.00,
      damageFactor: 0.02,
      description: 'Fasteners and hardware'
    }
  };

  /**
   * Identify material type from specification
   */
  static identifyMaterialType(spec: string): string {
    const specLower = spec.toLowerCase();
    
    // Joists
    if (specLower.includes('tji') || 
        specLower.includes('joist') || 
        specLower.match(/d\d+/) || // D1, D2, etc.
        specLower.includes('2x10') || 
        specLower.includes('2x12')) {
      return 'joist';
    }
    
    // Beams
    if (specLower.includes('glb') || 
        specLower.includes('lvl') || 
        specLower.includes('psl') || 
        specLower.includes('beam') ||
        specLower.match(/w\d+x\d+/) || // W18x106
        specLower.includes('x') && specLower.includes('"')) { // 5 1/8" x 18"
      return 'beam';
    }
    
    // Plates
    if (specLower.includes('plate') || 
        specLower.includes('sill') || 
        specLower.includes('pt') ||
        (specLower.includes('2x') && (specLower.includes('6') || specLower.includes('8')))) {
      return 'plate';
    }
    
    // Columns
    if (specLower.includes('column') || 
        specLower.includes('post') || 
        specLower.includes('6x6') || 
        specLower.includes('4x4') ||
        specLower.includes('hss')) {
      return 'column';
    }
    
    // Blocking
    if (specLower.includes('block')) {
      return 'blocking';
    }
    
    // Sheathing
    if (specLower.includes('sheath') || 
        specLower.includes('osb') || 
        specLower.includes('plywood')) {
      return 'sheathing';
    }
    
    // Hardware
    if (specLower.includes('bolt') || 
        specLower.includes('screw') || 
        specLower.includes('nail') ||
        specLower.includes('hanger')) {
      return 'hardware';
    }
    
    // Default to joist if uncertain
    return 'joist';
  }

  /**
   * Calculate waste factor for material type
   */
  static getWasteFactor(materialType: string, projectType: 'residential' | 'commercial' = 'residential'): number {
    const config = this.WASTE_FACTORS[materialType];
    if (!config) {
      console.warn(`⚠️  Unknown material type: ${materialType}, using 10% waste`);
      return 0.10;
    }
    
    let totalFactor = config.baseFactor;
    
    // Add cutting and damage factors
    if (config.cutFactor) totalFactor += config.cutFactor;
    if (config.damageFactor) totalFactor += config.damageFactor;
    
    // Adjust for project type
    if (projectType === 'commercial') {
      totalFactor *= 0.8; // Commercial has less waste due to better planning
    }
    
    return Math.min(totalFactor, 0.25); // Cap at 25% waste
  }

  /**
   * Apply waste factor to material quantity
   */
  static applyWasteFactor(
    spec: string, 
    baseQuantity: number, 
    unit: string,
    projectType: 'residential' | 'commercial' = 'residential'
  ): MaterialWithWaste {
    const materialType = this.identifyMaterialType(spec);
    const wasteFactor = this.getWasteFactor(materialType, projectType);
    
    const wasteQuantity = Math.ceil(baseQuantity * wasteFactor);
    const totalQuantity = baseQuantity + wasteQuantity;
    
    const calculation = `${baseQuantity} + ${(wasteFactor * 100).toFixed(0)}% waste (${wasteQuantity}) = ${totalQuantity} ${unit}`;
    
    return {
      spec,
      baseQuantity,
      wasteQuantity,
      totalQuantity,
      wasteFactor,
      unit,
      calculation
    };
  }

  /**
   * Apply waste factors to entire material list
   */
  static applyWasteFactors(
    materials: Array<{spec: string; quantity: number; unit: string}>,
    projectType: 'residential' | 'commercial' = 'residential'
  ): MaterialWithWaste[] {
    return materials.map(material => 
      this.applyWasteFactor(material.spec, material.quantity, material.unit, projectType)
    );
  }

  /**
   * Get waste factor summary
   */
  static getWasteFactorSummary(): Record<string, WasteFactorConfig> {
    return { ...this.WASTE_FACTORS };
  }

  /**
   * Test waste factor calculations
   */
  static test(): void {
    console.log('🧪 Testing Waste Factor Calculator\n');
    
    const testMaterials = [
      { spec: '14" TJI 560 @ 16" OC', quantity: 45, unit: 'EA' },
      { spec: '5 1/8" x 18" GLB', quantity: 3, unit: 'EA' },
      { spec: '2x6 PT sill plate', quantity: 200, unit: 'LF' },
      { spec: '6x6 PT post', quantity: 8, unit: 'EA' },
      { spec: '2x10 blocking', quantity: 50, unit: 'LF' },
      { spec: 'W18x106 beam', quantity: 2, unit: 'EA' }
    ];
    
    console.log('📊 WASTE FACTOR CALCULATIONS:\n');
    
    const results = this.applyWasteFactors(testMaterials);
    
    results.forEach(result => {
      const materialType = this.identifyMaterialType(result.spec);
      console.log(`${result.spec}`);
      console.log(`  Type: ${materialType}`);
      console.log(`  Base: ${result.baseQuantity} ${result.unit}`);
      console.log(`  Waste: ${result.wasteQuantity} ${result.unit} (${(result.wasteFactor * 100).toFixed(0)}%)`);
      console.log(`  Total: ${result.totalQuantity} ${result.unit}`);
      console.log(`  Calculation: ${result.calculation}\n`);
    });
    
    // Summary
    const totalWaste = results.reduce((sum, r) => sum + r.wasteQuantity, 0);
    const totalBase = results.reduce((sum, r) => sum + r.baseQuantity, 0);
    const avgWasteFactor = totalWaste / totalBase;
    
    console.log('📈 SUMMARY:');
    console.log(`  Average waste factor: ${(avgWasteFactor * 100).toFixed(1)}%`);
    console.log(`  Total base quantity: ${totalBase}`);
    console.log(`  Total waste quantity: ${totalWaste}`);
    
    // Show waste factor table
    console.log('\n📋 WASTE FACTOR TABLE:');
    Object.entries(this.WASTE_FACTORS).forEach(([type, config]) => {
      const factor = this.getWasteFactor(type);
      console.log(`  ${type.padEnd(10)}: ${(factor * 100).toFixed(0)}% - ${config.description}`);
    });
  }
}

// CLI test
if (require.main === module) {
  WasteFactorCalculator.test();
}