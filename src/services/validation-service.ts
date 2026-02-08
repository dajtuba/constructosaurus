import { ValidationRule, ValidationResult, ValidationStatus, MaterialContext } from '../types';

export class ValidationService {
  private rules: Map<string, ValidationRule[]> = new Map();

  /**
   * Register validation rules for a material type
   */
  registerRules(materialType: string, rules: ValidationRule[]) {
    this.rules.set(materialType.toLowerCase(), rules);
  }

  /**
   * Generate validation report
   */
  generateReport(results: ValidationResult[]): string {
    const errors = results.flatMap(r => r.errors);
    const warnings = results.flatMap(r => r.warnings);
    
    let report = '# Validation Report\n\n';
    
    if (errors.length === 0 && warnings.length === 0) {
      report += '✅ All validations passed!\n';
      return report;
    }
    
    if (errors.length > 0) {
      report += `## Errors (${errors.length})\n\n`;
      errors.forEach((error, i) => {
        report += `${i + 1}. ❌ ${error}\n`;
      });
      report += '\n';
    }
    
    if (warnings.length > 0) {
      report += `## Warnings (${warnings.length})\n\n`;
      warnings.forEach((warning, i) => {
        report += `${i + 1}. ⚠️  ${warning}\n`;
      });
      report += '\n';
    }
    
    report += `## Summary\n\n`;
    report += `- Total Errors: ${errors.length}\n`;
    report += `- Total Warnings: ${warnings.length}\n`;
    report += `- Status: ${errors.length > 0 ? '❌ FAILED' : warnings.length > 0 ? '⚠️  NEEDS REVIEW' : '✅ PASSED'}\n`;
    
    return report;
  }

  /**
   * Validate a material quantity
   */
  validate(
    material: string,
    quantity: number,
    unit: string,
    context?: MaterialContext
  ): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      status: ValidationStatus.VALID,
      warnings: [],
      errors: []
    };

    // Get rules for this material type
    const materialRules = this.rules.get(material.toLowerCase()) || [];

    for (const rule of materialRules) {
      // Check min/max bounds
      if (rule.min !== undefined && quantity < rule.min) {
        result.errors.push(`${material}: ${quantity} ${unit} is below minimum ${rule.min}. ${rule.message}`);
        result.valid = false;
        result.status = ValidationStatus.ERROR;
      }

      if (rule.max !== undefined && quantity > rule.max) {
        result.errors.push(`${material}: ${quantity} ${unit} exceeds maximum ${rule.max}. ${rule.message}`);
        result.valid = false;
        result.status = ValidationStatus.ERROR;
      }
    }

    // Statistical outlier detection (3 sigma rule)
    // This would be enhanced with actual historical data
    if (quantity > 1000000) {
      result.warnings.push(`${material}: ${quantity} ${unit} seems unusually high. Please verify.`);
      if (result.status === ValidationStatus.VALID) {
        result.status = ValidationStatus.WARNING;
      }
    }

    return result;
  }

  /**
   * Validate ratio between two materials
   */
  validateRatio(
    material1: string,
    quantity1: number,
    material2: string,
    quantity2: number,
    expectedMin: number,
    expectedMax: number
  ): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      status: ValidationStatus.VALID,
      warnings: [],
      errors: []
    };

    if (quantity2 === 0) {
      result.warnings.push(`Cannot validate ratio: ${material2} quantity is zero`);
      result.status = ValidationStatus.WARNING;
      return result;
    }

    const ratio = quantity1 / quantity2;

    if (ratio < expectedMin || ratio > expectedMax) {
      result.errors.push(
        `Ratio of ${material1} to ${material2} is ${ratio.toFixed(2)}, expected ${expectedMin}-${expectedMax}`
      );
      result.valid = false;
      result.status = ValidationStatus.ERROR;
    }

    return result;
  }

  /**
   * Validate multiple materials together
   */
  validateBatch(materials: Array<{ name: string; quantity: number; unit: string; context?: MaterialContext }>): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      status: ValidationStatus.VALID,
      warnings: [],
      errors: []
    };

    for (const material of materials) {
      const materialResult = this.validate(material.name, material.quantity, material.unit, material.context);
      
      result.warnings.push(...materialResult.warnings);
      result.errors.push(...materialResult.errors);
      
      if (!materialResult.valid) {
        result.valid = false;
      }
      
      if (materialResult.status === ValidationStatus.ERROR) {
        result.status = ValidationStatus.ERROR;
      } else if (materialResult.status === ValidationStatus.WARNING && result.status === ValidationStatus.VALID) {
        result.status = ValidationStatus.WARNING;
      }
    }

    return result;
  }
}
