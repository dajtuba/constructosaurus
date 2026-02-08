import { ValidationService } from '../services/validation-service';
import { VALIDATION_RULES } from '../services/validation-rules';
import { ValidationStatus } from '../types';

async function testValidation() {
  const service = new ValidationService();
  
  // Register rules
  for (const [material, rules] of Object.entries(VALIDATION_RULES)) {
    service.registerRules(material, rules);
  }
  
  console.log('🧪 Testing Validation Service\n');
  
  // Test 1: Valid quantity
  console.log('Test 1: Valid Quantity');
  const result1 = service.validate('concrete', 100, 'CY');
  console.assert(result1.valid === true, 'Expected valid');
  console.assert(result1.status === ValidationStatus.VALID, 'Expected VALID status');
  console.log(`✓ Valid concrete quantity: ${result1.status}\n`);
  
  // Test 2: Quantity too high (error)
  console.log('Test 2: Quantity Too High');
  const result2 = service.validate('concrete', 600, 'CY');
  console.assert(result2.valid === false, 'Expected invalid');
  console.assert(result2.status === ValidationStatus.ERROR, 'Expected ERROR status');
  console.assert(result2.errors.length > 0, 'Expected errors');
  console.log(`✓ Caught excessive quantity: ${result2.errors[0]}\n`);
  
  // Test 3: Quantity too low (error)
  console.log('Test 3: Quantity Too Low');
  const result3 = service.validate('lumber', 50, 'board feet');
  console.assert(result3.valid === false, 'Expected invalid');
  console.assert(result3.errors.length > 0, 'Expected errors');
  console.log(`✓ Caught insufficient quantity: ${result3.errors[0]}\n`);
  
  // Test 4: Outlier detection (warning)
  console.log('Test 4: Outlier Detection');
  const result4 = service.validate('steel', 2000000, 'lbs');
  console.assert(result4.warnings.length > 0, 'Expected warnings');
  console.log(`✓ Flagged outlier: ${result4.warnings[0]}\n`);
  
  // Test 5: Ratio validation
  console.log('Test 5: Ratio Validation');
  const ratioResult = service.validateRatio('rebar', 125, 'concrete', 1, 100, 150);
  console.assert(ratioResult.valid === true, 'Expected valid ratio');
  console.log(`✓ Valid rebar:concrete ratio\n`);
  
  // Test 6: Invalid ratio
  console.log('Test 6: Invalid Ratio');
  const badRatio = service.validateRatio('rebar', 50, 'concrete', 1, 100, 150);
  console.assert(badRatio.valid === false, 'Expected invalid ratio');
  console.assert(badRatio.errors.length > 0, 'Expected errors');
  console.log(`✓ Caught invalid ratio: ${badRatio.errors[0]}\n`);
  
  // Test 7: Batch validation
  console.log('Test 7: Batch Validation');
  const batchResult = service.validateBatch([
    { name: 'concrete', quantity: 100, unit: 'CY' },
    { name: 'rebar', quantity: 12000, unit: 'lbs' },
    { name: 'lumber', quantity: 5000, unit: 'board feet' }
  ]);
  console.assert(batchResult.valid === true, 'Expected valid batch');
  console.log(`✓ Batch validation passed\n`);
  
  // Test 8: Report generation
  console.log('Test 8: Report Generation');
  const results = [result2, result3, result4];
  const report = service.generateReport(results);
  console.assert(report.includes('Errors'), 'Expected errors in report');
  console.assert(report.includes('Warnings'), 'Expected warnings in report');
  console.log('✓ Generated validation report:\n');
  console.log(report);
  
  console.log('✅ All validation tests passed!');
}

testValidation().catch(console.error);
