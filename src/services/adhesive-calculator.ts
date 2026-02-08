import { Adhesive } from '../types';

export class AdhesiveCalculator {
  /**
   * Calculate sealant for joints
   */
  calculateSealant(linearFeet: number, beadSize: number = 0.25): Adhesive {
    const coveragePerTube = 40; // 30-50 LF per tube for 1/4" bead
    const tubes = Math.ceil(linearFeet / coveragePerTube);
    
    return {
      type: 'sealant',
      coverage: coveragePerTube,
      linearFeet,
      tubes
    };
  }

  /**
   * Calculate construction adhesive
   */
  calculateConstructionAdhesive(surfaceArea: number): Adhesive {
    const coveragePerTube = 100; // sqft per tube
    const tubes = Math.ceil(surfaceArea / coveragePerTube);
    
    return {
      type: 'construction adhesive',
      coverage: coveragePerTube,
      linearFeet: 0,
      tubes
    };
  }
}
