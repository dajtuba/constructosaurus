import { QuantityCalculator } from './src/services/quantity-calculator.js';
import { OllamaVisionAnalyzer } from './src/vision/ollama-vision-analyzer.js';
import fs from 'fs';

async function testQuantityCalculation() {
  console.log('🧮 Testing Quantity Calculator...\n');
  
  const vision = new OllamaVisionAnalyzer();
  const calculator = new QuantityCalculator(vision);
  
  // Load zone extraction data
  const zoneData = JSON.parse(fs.readFileSync('zone-extraction-result.json', 'utf8'));
  console.log('📊 Zone data loaded:', zoneData.sheet);
  
  // Test spacing parsing
  console.log('\n🔢 Testing spacing parsing:');
  const spacingTests = [
    '14" TJI 560 @ 16" OC',
    '2x10 @ 12 OC',
    '11 7/8" TJI 360 @ 19.2" OC',
    'GLB @ 24" OC'
  ];
  
  spacingTests.forEach(spec => {
    const spacing = calculator.parseSpacing(spec);
    console.log(`  ${spec} → ${spacing}"`);
  });
  
  // Test quantity calculation
  console.log('\n📏 Testing quantity calculation:');
  const testSpans = [288, 240, 360]; // 24', 20', 30'
  const testSpacing = 16;
  
  testSpans.forEach(span => {
    const qty = calculator.calculateJoistQuantity(span, testSpacing);
    console.log(`  ${span}" span @ ${testSpacing}" OC → ${qty} joists`);
  });
  
  // Generate material takeoff
  console.log('\n📋 Generating material takeoff...');
  const imagePath = 'data/images/shell-set-page-33.png';
  
  if (!fs.existsSync(imagePath)) {
    console.log(`❌ Image not found: ${imagePath}`);
    console.log('Available images:');
    if (fs.existsSync('data/images')) {
      fs.readdirSync('data/images').forEach(file => {
        console.log(`  - data/images/${file}`);
      });
    }
    return;
  }
  
  try {
    const takeoff = await calculator.generateTakeoff(zoneData, imagePath);
    
    console.log(`\n📊 Material Takeoff for ${takeoff.sheet}:`);
    console.log('=' .repeat(50));
    
    takeoff.materials.forEach(material => {
      console.log(`\n${material.spec}:`);
      console.log(`  Quantity: ${material.quantity} ${material.unit}`);
      console.log(`  Locations: ${material.locations.join(', ')}`);
      console.log(`  Calculation: ${material.calculation}`);
    });
    
    console.log('\n📈 Totals:');
    Object.entries(takeoff.totals).forEach(([spec, qty]) => {
      console.log(`  ${spec}: ${qty}`);
    });
    
    // Validate quantities
    console.log('\n✅ Validation:');
    const validation = calculator.validateQuantities(takeoff);
    
    if (validation.valid) {
      console.log('  ✅ All quantities look reasonable');
    } else {
      console.log('  ❌ Validation errors:');
      validation.errors.forEach(error => {
        console.log(`    - ${error}`);
      });
    }
    
    // Save results
    const outputPath = 'material-takeoff-result.json';
    fs.writeFileSync(outputPath, JSON.stringify(takeoff, null, 2));
    console.log(`\n💾 Results saved to: ${outputPath}`);
    
    // Summary for S2.1
    const joistMaterials = takeoff.materials.filter(m => 
      m.spec.includes('TJI') || m.spec.toLowerCase().includes('joist')
    );
    
    const totalJoists = joistMaterials.reduce((sum, m) => sum + m.quantity, 0);
    
    console.log('\n🏠 S2.1 Summary:');
    console.log(`  Total joists needed: ${totalJoists}`);
    console.log(`  Joist types: ${joistMaterials.length}`);
    
    if (totalJoists > 200) {
      console.log('  ⚠️  WARNING: Joist count seems high for residential');
    } else if (totalJoists < 10) {
      console.log('  ⚠️  WARNING: Joist count seems low');
    } else {
      console.log('  ✅ Joist count looks reasonable for residential');
    }
    
  } catch (error) {
    console.error('❌ Error generating takeoff:', error);
  }
}

testQuantityCalculation().catch(console.error);