// Simple test of quantity calculation logic without vision dependency
import fs from 'fs';

// Mock dimension data for testing
const mockDimensions = [
  { span: 288, location: 'main_span' }, // 24'
  { span: 240, location: 'left_bay' },  // 20'
  { span: 360, location: 'right_bay' }  // 30'
];

// Parse spacing from spec string (@ 16" OC → 16)
function parseSpacing(spec: string): number {
  const match = spec.match(/@\s*(\d+(?:\.\d+)?)\s*["\s]*OC/i);
  return match ? parseFloat(match[1]) : 16; // default 16" OC
}

// Calculate joist quantity: span ÷ spacing + 1
function calculateJoistQuantity(span: number, spacing: number): number {
  if (span <= 0 || spacing <= 0) return 0;
  return Math.floor(span / spacing) + 1;
}

// Validate quantities (sanity check)
function validateQuantities(materials: any[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  materials.forEach(material => {
    if (material.quantity <= 0) {
      errors.push(`${material.spec}: Quantity is ${material.quantity} (should be > 0)`);
    }
    
    if (material.unit === 'EA' && material.quantity > 500) {
      errors.push(`${material.spec}: ${material.quantity} pieces seems excessive for residential`);
    }
    
    // Check joist quantities specifically
    if (material.spec.includes('TJI') || material.spec.includes('joist')) {
      if (material.quantity > 200) {
        errors.push(`${material.spec}: ${material.quantity} joists seems excessive (typical house: 50-150)`);
      }
      if (material.quantity < 5) {
        errors.push(`${material.spec}: ${material.quantity} joists seems too few`);
      }
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
}

async function testQuantityLogic() {
  console.log('🧮 Testing Quantity Calculation Logic...\n');
  
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
    const spacing = parseSpacing(spec);
    console.log(`  ${spec} → ${spacing}"`);
  });
  
  // Test quantity calculation
  console.log('\n📏 Testing quantity calculation:');
  mockDimensions.forEach(dim => {
    const spacing = 16;
    const qty = calculateJoistQuantity(dim.span, spacing);
    console.log(`  ${dim.span}" span @ ${spacing}" OC → ${qty} joists (${dim.location})`);
  });
  
  // Generate material takeoff from zone data
  console.log('\n📋 Generating material takeoff...');
  const materials: any[] = [];
  
  // Process each zone
  for (const zone of zoneData.zones) {
    const mainSpan = 288; // Use 24' as default span
    
    // Calculate joists
    for (const joistSpec of zone.joists || []) {
      const spacing = parseSpacing(joistSpec);
      const quantity = calculateJoistQuantity(mainSpan, spacing);
      
      materials.push({
        spec: joistSpec,
        quantity,
        unit: 'EA',
        span: mainSpan,
        locations: [zone.zone],
        calculation: `${mainSpan}" span ÷ ${spacing}" OC + 1 = ${quantity} EA`
      });
    }
    
    // Calculate beams (1 per span typically)
    for (const beamSpec of zone.beams || []) {
      materials.push({
        spec: beamSpec,
        quantity: 1,
        unit: 'EA',
        span: mainSpan,
        locations: [zone.zone],
        calculation: `1 beam per ${zone.zone} zone = 1 EA`
      });
    }
    
    // Calculate columns (2 per zone)
    for (const columnSpec of zone.columns || []) {
      materials.push({
        spec: columnSpec,
        quantity: 2,
        unit: 'EA',
        locations: [zone.zone],
        calculation: `2 columns per ${zone.zone} zone = 2 EA`
      });
    }
  }
  
  // Consolidate duplicate specs
  const consolidated = new Map<string, any>();
  materials.forEach(material => {
    const existing = consolidated.get(material.spec);
    if (existing) {
      existing.quantity += material.quantity;
      existing.locations = [...new Set([...existing.locations, ...material.locations])];
      existing.calculation += ` + ${material.calculation}`;
    } else {
      consolidated.set(material.spec, { ...material });
    }
  });
  
  const finalMaterials = Array.from(consolidated.values());
  
  // Display results
  console.log(`\n📊 Material Takeoff for ${zoneData.sheet}:`);
  console.log('='.repeat(50));
  
  finalMaterials.forEach(material => {
    console.log(`\n${material.spec}:`);
    console.log(`  Quantity: ${material.quantity} ${material.unit}`);
    console.log(`  Locations: ${material.locations.join(', ')}`);
    console.log(`  Calculation: ${material.calculation}`);
  });
  
  // Calculate totals
  const totals: Record<string, number> = {};
  finalMaterials.forEach(m => {
    totals[m.spec] = m.quantity;
  });
  
  console.log('\n📈 Totals:');
  Object.entries(totals).forEach(([spec, qty]) => {
    console.log(`  ${spec}: ${qty}`);
  });
  
  // Validate quantities
  console.log('\n✅ Validation:');
  const validation = validateQuantities(finalMaterials);
  
  if (validation.valid) {
    console.log('  ✅ All quantities look reasonable');
  } else {
    console.log('  ❌ Validation errors:');
    validation.errors.forEach(error => {
      console.log(`    - ${error}`);
    });
  }
  
  // Summary for S2.1
  const joistMaterials = finalMaterials.filter(m => 
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
  
  // Save results
  const takeoff = {
    sheet: zoneData.sheet,
    materials: finalMaterials,
    totals,
    calculated_at: new Date().toISOString()
  };
  
  const outputPath = 'material-takeoff-result.json';
  fs.writeFileSync(outputPath, JSON.stringify(takeoff, null, 2));
  console.log(`\n💾 Results saved to: ${outputPath}`);
  
  // Methodology documentation
  console.log('\n📖 Calculation Methodology:');
  console.log('  1. Parse spacing from specs (@ 16" OC → 16)');
  console.log('  2. Calculate joist quantity: span ÷ spacing + 1');
  console.log('  3. Beams: 1 per zone (simplified)');
  console.log('  4. Columns: 2 per zone (typical)');
  console.log('  5. Consolidate duplicate specs across zones');
  console.log('  6. Validate against reasonable ranges');
  console.log('  7. Flag quantities outside expected ranges');
}

testQuantityLogic().catch(console.error);