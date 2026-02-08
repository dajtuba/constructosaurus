import { TextExtractionService } from '../services/text-extraction-service';

async function testTextExtraction() {
  const service = new TextExtractionService();
  
  console.log('🧪 Testing Text Extraction Service\n');
  
  // Test 1: Spec text extraction
  console.log('Test 1: Specification Text Extraction');
  const specText = "Use 3/4\" plywood throughout. All connections shall use galvanized fasteners throughout.";
  const specQuantities = service.extractFromSpecText(specText);
  console.assert(specQuantities.length > 0, 'Expected spec quantities');
  console.log(`✓ Extracted ${specQuantities.length} items from spec text\n`);
  
  // Test 2: Callout extraction
  console.log('Test 2: Callout Extraction');
  const calloutText = "Install (12) #4 rebar @ 12\" o.c. and (8) anchor bolts @ 24\" o.c.";
  const callouts = service.extractFromCallouts(calloutText, 1);
  console.assert(callouts.length === 2, 'Expected 2 callouts');
  console.assert(callouts[0].extractedQuantity?.quantity === 12, 'Expected 12 rebar');
  console.log(`✓ Extracted ${callouts.length} callouts: ${callouts[0].extractedQuantity?.material}\n`);
  
  // Test 3: General notes extraction
  console.log('Test 3: General Notes Extraction');
  const notes = "Provide 24 expansion joints. Provide 16 control joints.";
  const noteQuantities = service.extractFromGeneralNotes(notes);
  console.assert(noteQuantities.length === 2, 'Expected 2 quantities');
  console.assert(noteQuantities[0].quantity === 24, 'Expected 24 expansion joints');
  console.log(`✓ Extracted ${noteQuantities.length} items from notes\n`);
  
  // Test 4: Pattern parsing
  console.log('Test 4: Pattern Parsing');
  const pattern = "6 steel beams @ 20 ft spacing";
  const parsed = service.parseQuantityPattern(pattern);
  console.assert(parsed !== null, 'Expected parsed quantity');
  console.assert(parsed?.quantity === 6, 'Expected 6 beams');
  console.log(`✓ Parsed pattern: ${parsed?.quantity} ${parsed?.material}\n`);
  
  console.log('✅ All text extraction tests passed!');
}

testTextExtraction().catch(console.error);
