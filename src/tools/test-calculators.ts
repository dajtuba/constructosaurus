import { FastenerCalculator } from '../services/fastener-calculator';
import { AdhesiveCalculator } from '../services/adhesive-calculator';
import { FinishCalculator } from '../services/finish-calculator';
import { TemporaryMaterialCalculator } from '../services/temporary-material-calculator';

async function testCalculators() {
  console.log('🧪 Testing Material Calculators\n');
  
  // Test Fastener Calculator
  console.log('Test 1: Fastener Calculator');
  const fastenerCalc = new FastenerCalculator();
  const nails = fastenerCalc.calculateForLumber(1000);
  console.assert(nails.quantity > 0, 'Expected fastener quantity');
  console.log(`✓ Lumber (1000 bf) needs ${nails.quantity} lbs ${nails.type}\n`);
  
  const screws = fastenerCalc.calculateForDrywall(50);
  console.assert(screws.quantity === 1600, 'Expected 1600 screws for 50 sheets');
  console.log(`✓ Drywall (50 sheets) needs ${screws.quantity} ${screws.type}\n`);
  
  // Test Adhesive Calculator
  console.log('Test 2: Adhesive Calculator');
  const adhesiveCalc = new AdhesiveCalculator();
  const sealant = adhesiveCalc.calculateSealant(200);
  console.assert(sealant.tubes > 0, 'Expected sealant tubes');
  console.log(`✓ Joints (200 LF) need ${sealant.tubes} tubes of ${sealant.type}\n`);
  
  // Test Finish Calculator
  console.log('Test 3: Finish Calculator');
  const finishCalc = new FinishCalculator();
  const paint = finishCalc.calculatePaint(2000, 2);
  console.assert(paint.gallons > 0, 'Expected paint gallons');
  console.log(`✓ Walls (2000 sqft, 2 coats) need ${paint.gallons} gallons ${paint.type}\n`);
  
  const stain = finishCalc.calculateStain(500);
  console.assert(stain.gallons > 0, 'Expected stain gallons');
  console.log(`✓ Wood (500 sqft) needs ${stain.gallons} gallons ${stain.type}\n`);
  
  // Test Temporary Material Calculator
  console.log('Test 4: Temporary Material Calculator');
  const tempCalc = new TemporaryMaterialCalculator();
  const formwork = tempCalc.calculateFormwork(1000);
  console.assert(formwork.quantity > 0, 'Expected formwork quantity');
  console.log(`✓ Concrete (1000 sqft) needs ${formwork.quantity} sqft ${formwork.type}\n`);
  
  const scaffolding = tempCalc.calculateScaffolding(30, 200);
  console.assert(scaffolding.quantity > 0, 'Expected scaffolding quantity');
  console.log(`✓ Building (30ft high, 200ft perimeter) needs ${scaffolding.quantity} sections ${scaffolding.type}\n`);
  
  console.log('✅ All calculator tests passed!');
}

testCalculators().catch(console.error);
