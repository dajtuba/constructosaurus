import { Fastener } from '../types';

export class FastenerCalculator {
  /**
   * Calculate fasteners for lumber framing
   */
  calculateForLumber(boardFeet: number): Fastener {
    const lbsPerBoardFoot = 1.5; // Average 1-2 lbs per board foot
    const quantity = Math.ceil(boardFeet * lbsPerBoardFoot);
    
    return {
      type: 'nails',
      size: '16d',
      quantity,
      connectionType: 'wood framing'
    };
  }

  /**
   * Calculate fasteners for drywall
   */
  calculateForDrywall(sheets: number): Fastener {
    const screwsPerSheet = 32; // Standard 4x8 sheet
    const quantity = sheets * screwsPerSheet;
    
    return {
      type: 'screws',
      size: '1-1/4"',
      quantity,
      connectionType: 'drywall'
    };
  }

  /**
   * Calculate bolts for steel connections
   */
  calculateForSteel(connections: number, boltsPerConnection: number = 4): Fastener {
    return {
      type: 'bolts',
      size: '3/4"',
      quantity: connections * boltsPerConnection,
      connectionType: 'steel'
    };
  }
}
