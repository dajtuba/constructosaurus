import { Finish } from '../types';

export class FinishCalculator {
  /**
   * Calculate paint quantity
   */
  calculatePaint(surfaceArea: number, coats: number = 2): Finish {
    const coveragePerGallon = 375; // 350-400 sqft per gallon
    const totalArea = surfaceArea * coats;
    const gallons = Math.ceil(totalArea / coveragePerGallon);
    
    return {
      type: 'paint',
      coverage: coveragePerGallon,
      surfaceArea,
      gallons
    };
  }

  /**
   * Calculate stain quantity
   */
  calculateStain(surfaceArea: number): Finish {
    const coveragePerGallon = 250; // 200-300 sqft per gallon
    const gallons = Math.ceil(surfaceArea / coveragePerGallon);
    
    return {
      type: 'stain',
      coverage: coveragePerGallon,
      surfaceArea,
      gallons
    };
  }

  /**
   * Calculate joint compound for drywall
   */
  calculateJointCompound(drywallArea: number): Finish {
    const lbsPerSqft = 0.125; // 1 lb per 8 sqft
    const quantity = Math.ceil(drywallArea * lbsPerSqft);
    
    return {
      type: 'joint compound',
      coverage: 8,
      surfaceArea: drywallArea,
      gallons: quantity // Using gallons field for lbs
    };
  }
}
