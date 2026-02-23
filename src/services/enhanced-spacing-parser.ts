/**
 * Enhanced Spacing Parser - Handle complex spacing patterns
 * Phase 1 improvement: Parse '@ 12" to 16" OC', '@ 400mm OC', '@ 16"/19.2" OC'
 */

export interface SpacingResult {
  primary: number;      // Primary spacing in inches
  secondary?: number;   // Secondary spacing (for dual patterns)
  min?: number;         // Minimum spacing (for ranges)
  max?: number;         // Maximum spacing (for ranges)
  unit: 'inches' | 'mm';
  pattern: string;      // Original pattern
  type: 'fixed' | 'range' | 'dual' | 'variable';
}

export class EnhancedSpacingParser {
  
  /**
   * Parse spacing specification into structured data
   */
  static parseSpacing(spec: string): SpacingResult {
    const normalized = spec.trim().toLowerCase();
    
    // Try different parsing patterns in order of specificity
    
    // 1. Dual spacing: @ 16"/19.2" OC
    const dualMatch = normalized.match(/@\s*(\d+(?:\.\d+)?)["\s]*\/\s*(\d+(?:\.\d+)?)["\s]*\s*oc/);
    if (dualMatch) {
      return {
        primary: parseFloat(dualMatch[1]),
        secondary: parseFloat(dualMatch[2]),
        unit: 'inches',
        pattern: spec,
        type: 'dual'
      };
    }

    // 2. Range spacing: @ 12" to 16" OC
    const rangeMatch = normalized.match(/@\s*(\d+(?:\.\d+)?)["\s]*\s*(?:to|-)\s*(\d+(?:\.\d+)?)["\s]*\s*oc/);
    if (rangeMatch) {
      const min = parseFloat(rangeMatch[1]);
      const max = parseFloat(rangeMatch[2]);
      return {
        primary: (min + max) / 2, // Use average for calculations
        min,
        max,
        unit: 'inches',
        pattern: spec,
        type: 'range'
      };
    }

    // 3. Metric spacing: @ 400mm OC
    const metricMatch = normalized.match(/@\s*(\d+(?:\.\d+)?)\s*mm\s*oc/);
    if (metricMatch) {
      const mm = parseFloat(metricMatch[1]);
      return {
        primary: mm / 25.4, // Convert to inches
        unit: 'mm',
        pattern: spec,
        type: 'fixed'
      };
    }

    // 4. Standard spacing: @ 16" OC
    const standardMatch = normalized.match(/@\s*(\d+(?:\.\d+)?)["\s]*\s*oc/);
    if (standardMatch) {
      return {
        primary: parseFloat(standardMatch[1]),
        unit: 'inches',
        pattern: spec,
        type: 'fixed'
      };
    }

    // 5. Variable spacing indicators
    if (normalized.includes('varies') || normalized.includes('variable') || normalized.includes('typ')) {
      // Extract any numbers as hints
      const numberMatch = normalized.match(/(\d+(?:\.\d+)?)/);
      const spacing = numberMatch ? parseFloat(numberMatch[1]) : 16; // default
      
      return {
        primary: spacing,
        unit: 'inches',
        pattern: spec,
        type: 'variable'
      };
    }

    // 6. Fallback: look for any number
    const anyNumberMatch = spec.match(/(\d+(?:\.\d+)?)/);
    if (anyNumberMatch) {
      const number = parseFloat(anyNumberMatch[1]);
      // Assume inches if reasonable spacing value
      if (number >= 6 && number <= 48) {
        return {
          primary: number,
          unit: 'inches',
          pattern: spec,
          type: 'fixed'
        };
      }
    }

    // Default spacing
    console.warn(`⚠️  Could not parse spacing: "${spec}", using default 16" OC`);
    return {
      primary: 16,
      unit: 'inches',
      pattern: spec,
      type: 'fixed'
    };
  }

  /**
   * Get effective spacing for quantity calculations
   */
  static getEffectiveSpacing(result: SpacingResult): number {
    switch (result.type) {
      case 'fixed':
        return result.primary;
      
      case 'range':
        // Use average of range
        return (result.min! + result.max!) / 2;
      
      case 'dual':
        // Use primary spacing (first value)
        return result.primary;
      
      case 'variable':
        // Use primary with 10% buffer for variability
        return result.primary * 1.1;
      
      default:
        return result.primary;
    }
  }

  /**
   * Calculate quantity with spacing considerations
   */
  static calculateQuantity(span: number, spacingResult: SpacingResult): number {
    const effectiveSpacing = this.getEffectiveSpacing(spacingResult);
    
    if (span <= 0 || effectiveSpacing <= 0) return 0;
    
    let baseQuantity = Math.floor(span / effectiveSpacing) + 1;
    
    // Adjust for spacing type
    switch (spacingResult.type) {
      case 'range':
        // Add extra for range uncertainty
        baseQuantity = Math.ceil(baseQuantity * 1.05);
        break;
      
      case 'dual':
        // Dual spacing might need more members
        baseQuantity = Math.ceil(baseQuantity * 1.1);
        break;
      
      case 'variable':
        // Variable spacing needs buffer
        baseQuantity = Math.ceil(baseQuantity * 1.15);
        break;
    }
    
    return baseQuantity;
  }

  /**
   * Test the parser with common patterns
   */
  static test(): void {
    console.log('🧪 Testing Enhanced Spacing Parser\n');
    
    const testCases = [
      '@ 16" OC',
      '@ 12" to 16" OC',
      '@ 400mm OC',
      '@ 16"/19.2" OC',
      '@ 12 OC',
      '@ 19.2" OC',
      '@ 600mm OC',
      '@ 14" to 18" OC',
      '@ 16"/24" OC',
      'varies @ 16" typ',
      'TJI @ 16" OC',
      '2x10 @ 12" OC',
      'invalid spacing'
    ];

    testCases.forEach(testCase => {
      const result = this.parseSpacing(testCase);
      const effective = this.getEffectiveSpacing(result);
      
      console.log(`Input: "${testCase}"`);
      console.log(`  Type: ${result.type}`);
      console.log(`  Primary: ${result.primary}"`);
      if (result.secondary) console.log(`  Secondary: ${result.secondary}"`);
      if (result.min && result.max) console.log(`  Range: ${result.min}" to ${result.max}"`);
      console.log(`  Effective: ${effective.toFixed(1)}"`);
      console.log(`  Unit: ${result.unit}`);
      
      // Test quantity calculation with 24' span
      const quantity = this.calculateQuantity(288, result); // 24' = 288"
      console.log(`  Quantity (24' span): ${quantity} EA\n`);
    });
  }
}

// CLI test
if (require.main === module) {
  EnhancedSpacingParser.test();
}