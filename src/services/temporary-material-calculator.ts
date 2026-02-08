import { TemporaryMaterial } from '../types';

export class TemporaryMaterialCalculator {
  /**
   * Calculate formwork for concrete
   */
  calculateFormwork(concreteSurfaceArea: number): TemporaryMaterial {
    const formworkFactor = 1.1; // 10% more than concrete surface
    const quantity = Math.ceil(concreteSurfaceArea * formworkFactor);
    
    return {
      type: 'formwork',
      quantity,
      duration: 'until concrete cures'
    };
  }

  /**
   * Calculate scaffolding
   */
  calculateScaffolding(buildingHeight: number, perimeter: number): TemporaryMaterial {
    const quantity = Math.ceil((buildingHeight / 6) * perimeter); // 6ft sections
    
    return {
      type: 'scaffolding',
      quantity,
      duration: 'duration of exterior work'
    };
  }

  /**
   * Calculate shoring
   */
  calculateShoring(floorArea: number, floors: number): TemporaryMaterial {
    const shorePerSqft = 0.01; // Rough estimate
    const quantity = Math.ceil(floorArea * floors * shorePerSqft);
    
    return {
      type: 'shoring',
      quantity,
      duration: 'until structure is self-supporting'
    };
  }
}
