import { ContextExtractionService } from '../services/context-extraction-service';
import { Phase } from '../types';

async function testContextExtraction() {
  const service = new ContextExtractionService();
  
  console.log('🧪 Testing Context Extraction Service\n');
  
  // Test 1: Phase extraction
  console.log('Test 1: Phase Extraction');
  const foundationText = "Foundation work includes concrete footings";
  const phase1 = service.extractPhase(foundationText);
  console.assert(phase1 === Phase.FOUNDATION, `Expected FOUNDATION, got ${phase1}`);
  console.log(`✓ Extracted phase: ${phase1}\n`);
  
  // Test 2: Location extraction
  console.log('Test 2: Location Extraction');
  const locationText = "Install at grid A-3, 2nd Floor, Room 201";
  const location = service.extractLocation(locationText);
  console.assert(location.gridRef === 'A-3', `Expected A-3, got ${location.gridRef}`);
  console.assert(location.floor === '2', `Expected 2, got ${location.floor}`);
  console.assert(location.room === '201', `Expected 201, got ${location.room}`);
  console.log(`✓ Extracted location:`, location, '\n');
  
  // Test 3: Conditional extraction
  console.log('Test 3: Conditional Extraction');
  const conditionalText = "Use 3000 psi concrete if soil bearing < 2000 psf";
  const conditionals = service.extractConditionals(conditionalText);
  console.assert(conditionals.length > 0, 'Expected conditionals');
  console.assert(conditionals[0].condition.includes('soil bearing'), 'Expected soil bearing condition');
  console.log(`✓ Extracted conditionals:`, conditionals, '\n');
  
  // Test 4: Sequencing extraction
  console.log('Test 4: Sequencing Extraction');
  const sequencingText = "Install after foundation curing is complete";
  const sequencing = service.extractSequencing(sequencingText);
  console.assert(sequencing !== undefined, 'Expected sequencing');
  console.assert(sequencing?.includes('after'), 'Expected "after" in sequencing');
  console.log(`✓ Extracted sequencing: ${sequencing}\n`);
  
  // Test 5: Complete context extraction
  console.log('Test 5: Complete Context Extraction');
  const fullText = "Foundation work at grid B-2, 1st Floor. Install concrete footings after excavation. Use 4000 psi concrete if required by engineer.";
  const context = service.extractContext(fullText);
  console.assert(context.phase === Phase.FOUNDATION, 'Expected FOUNDATION phase');
  console.assert(context.location?.gridRef === 'B-2', 'Expected B-2 grid ref');
  console.assert(context.location?.floor === '1', 'Expected 1st floor');
  console.assert(context.conditionals && context.conditionals.length > 0, 'Expected conditionals');
  console.assert(context.sequencing?.includes('after'), 'Expected sequencing');
  console.log(`✓ Extracted complete context:`, context, '\n');
  
  console.log('✅ All context extraction tests passed!');
}

testContextExtraction().catch(console.error);
