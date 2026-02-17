import { MaterialTakeoff } from "../services/takeoff-synthesizer";

interface CostEstimate {
  material: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  category: string;
}

export class CostEstimator {
  // Rough unit costs (placeholder - should come from database)
  private unitCosts: Record<string, { cost: number; unit: string; category: string }> = {
    'warmboard': { cost: 12, unit: 'sq ft', category: 'Flooring' },
    'plywood': { cost: 2.5, unit: 'sq ft', category: 'Sheathing' },
    'concrete': { cost: 150, unit: 'cu yd', category: 'Foundation' },
    'steel beam': { cost: 800, unit: 'ea', category: 'Structural' },
    'lumber': { cost: 3, unit: 'bd ft', category: 'Framing' },
    'drywall': { cost: 1.5, unit: 'sq ft', category: 'Finishes' },
    'insulation': { cost: 1.2, unit: 'sq ft', category: 'Insulation' },
    'rebar': { cost: 0.75, unit: 'lb', category: 'Reinforcement' },
  };
  
  estimateCosts(takeoffs: MaterialTakeoff[]): CostEstimate[] {
    const estimates: CostEstimate[] = [];
    
    for (const takeoff of takeoffs) {
      const materialKey = this.findMaterialKey(takeoff.material);
      
      if (materialKey && takeoff.area) {
        const unitCostData = this.unitCosts[materialKey];
        const quantity = takeoff.area;
        const totalCost = quantity * unitCostData.cost;
        
        estimates.push({
          material: takeoff.material,
          quantity,
          unit: takeoff.unit || unitCostData.unit,
          unitCost: unitCostData.cost,
          totalCost,
          category: unitCostData.category
        });
      }
    }
    
    return estimates;
  }
  
  private findMaterialKey(material: string): string | null {
    const materialLower = material.toLowerCase();
    
    for (const key of Object.keys(this.unitCosts)) {
      if (materialLower.includes(key)) {
        return key;
      }
    }
    
    return null;
  }
  
  summarizeCosts(estimates: CostEstimate[]): { total: number; byCategory: Record<string, number> } {
    const byCategory: Record<string, number> = {};
    let total = 0;
    
    for (const estimate of estimates) {
      total += estimate.totalCost;
      byCategory[estimate.category] = (byCategory[estimate.category] || 0) + estimate.totalCost;
    }
    
    return { total, byCategory };
  }
}
