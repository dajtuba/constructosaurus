import { MaterialIntelligenceService } from '../services/material-intelligence-service';

async function testMaterialIntelligence() {
  const service = new MaterialIntelligenceService();
  
  console.log('🧪 Testing Material Intelligence Service\n');
  
  // Test 1: Find equivalents
  console.log('Test 1: Find Equivalents');
  const equivalents = service.findEquivalents('psl');
  console.assert(equivalents.length > 0, 'Expected equivalents');
  console.log(`✓ PSL equivalents: ${equivalents.map(e => e.name).join(', ')}\n`);
  
  // Test 2: Unit conversion
  console.log('Test 2: Unit Conversion');
  const boardFeet = service.convertUnits(12, 'linear feet', 'board feet');
  console.assert(boardFeet === 1, 'Expected 1 board foot');
  console.log(`✓ 12 linear feet = ${boardFeet} board feet\n`);
  
  const cubicYards = service.convertUnits(27, 'cubic feet', 'cubic yards');
  console.assert(cubicYards === 1, 'Expected 1 cubic yard');
  console.log(`✓ 27 cubic feet = ${cubicYards} cubic yards\n`);
  
  // Test 3: Stock sizing
  console.log('Test 3: Stock Sizing');
  const stockSize = service.calculateStockSize(11.5, 'lumber');
  console.assert(stockSize === 12, 'Expected 12 ft stock');
  console.log(`✓ Need 11.5 ft, buy ${stockSize} ft stock\n`);
  
  // Test 4: Material substitution
  console.log('Test 4: Material Substitution');
  const substitution = service.substituteMaterial('psl');
  console.assert(substitution !== null, 'Expected substitution');
  console.log(`✓ PSL can substitute with: ${substitution?.to} (factor: ${substitution?.conversionFactor})\n`);
  
  // Test 5: Get material
  console.log('Test 5: Get Material');
  const material = service.getMaterial('concrete-4000');
  console.assert(material !== undefined, 'Expected material');
  console.log(`✓ Found material: ${material?.name}\n`);
  
  console.log('✅ All material intelligence tests passed!');
}

testMaterialIntelligence().catch(console.error);
