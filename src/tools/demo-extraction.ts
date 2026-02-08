import * as fs from 'fs';
import * as path from 'path';
import { MaterialsExtractor } from '../extraction/materials-extractor';
import { ContextExtractionService } from '../services/context-extraction-service';
import { ValidationService } from '../services/validation-service';
import { CorrelationService } from '../services/correlation-service';
import { TextExtractionService } from '../services/text-extraction-service';
import { FastenerCalculator } from '../services/fastener-calculator';
import { AdhesiveCalculator } from '../services/adhesive-calculator';
import { FinishCalculator } from '../services/finish-calculator';

/**
 * End-to-end demo: Process real construction PDFs
 * 
 * This demonstrates the full Constructosaurus pipeline:
 * 1. Extract materials from documents
 * 2. Track context (phase, location, conditionals)
 * 3. Validate quantities
 * 4. Detect cross-document conflicts
 * 5. Calculate derived materials (fasteners, adhesives, finishes)
 */

async function runDemo() {
  console.log('🦕 CONSTRUCTOSAURUS - End-to-End Extraction Demo\n');
  console.log('=' .repeat(60));
  
  const blueprintsDir = path.join(__dirname, '../../docs/blueprints');
  const pdfs = fs.readdirSync(blueprintsDir).filter(f => f.endsWith('.pdf'));
  
  console.log(`\n📁 Found ${pdfs.length} PDFs in docs/blueprints/:\n`);
  pdfs.forEach((pdf, i) => console.log(`   ${i + 1}. ${pdf}`));
  
  console.log('\n' + '='.repeat(60));
  console.log('\n⚠️  PDF EXTRACTION REQUIRES CLAUDE DESKTOP');
  console.log('\nTo extract data from these PDFs, you need to:');
  console.log('1. Open Claude Desktop');
  console.log('2. Upload the PDFs from docs/blueprints/');
  console.log('3. Use this prompt:\n');
  
  console.log('─'.repeat(60));
  console.log(generateExtractionPrompt());
  console.log('─'.repeat(60));
  
  console.log('\n📊 DEMO: Simulated Extraction Results\n');
  console.log('(Using sample data to demonstrate pipeline)\n');
  
  // Simulate extracted materials from PDFs
  const sampleMaterials = [
    {
      name: '2x6 PT Sill Plate',
      quantity: 240,
      unit: 'linear feet',
      specification: 'Pressure treated lumber',
      location: 'Foundation perimeter',
      category: 'Wood',
      source: 'Sitka Construction Shell Set.pdf',
      page: 'S-101'
    },
    {
      name: '1/2" Anchor Bolts',
      quantity: 48,
      unit: 'each',
      specification: 'Galvanized, 10" embedment',
      location: 'Foundation walls',
      category: 'Steel',
      source: 'Sitka Construction Shell Set.pdf',
      page: 'S-101'
    },
    {
      name: 'Concrete 3000 PSI',
      quantity: 25,
      unit: 'cubic yards',
      specification: '3000 PSI, 4" slump',
      location: 'Foundation and slab',
      category: 'Concrete',
      source: 'Sitka Construction Shell Set.pdf',
      page: 'S-102'
    },
    {
      name: '#4 Rebar',
      quantity: 800,
      unit: 'linear feet',
      specification: 'Grade 60',
      location: 'Foundation walls',
      category: 'Steel',
      source: 'Sitka Construction Shell Set.pdf',
      page: 'S-101'
    },
    {
      name: '3/4" Plywood Sheathing',
      quantity: 120,
      unit: 'sheets',
      specification: 'CDX grade',
      location: 'Roof and walls',
      category: 'Wood',
      source: 'Sitka Shell Set - Outline Specifications.pdf',
      page: '06100'
    }
  ];
  
  console.log('📦 EXTRACTED MATERIALS:\n');
  sampleMaterials.forEach((m, i) => {
    console.log(`${i + 1}. ${m.name}`);
    console.log(`   Quantity: ${m.quantity} ${m.unit}`);
    console.log(`   Spec: ${m.specification}`);
    console.log(`   Location: ${m.location}`);
    console.log(`   Source: ${m.source} (${m.page})\n`);
  });
  
  // Context extraction
  console.log('\n🗺️  CONTEXT TRACKING:\n');
  const contextService = new ContextExtractionService();
  const sampleContext = contextService.extractContext(
    'Phase 1: Install foundation. Phase 2: Frame walls at north elevation.'
  );
  console.log(`   Phase: ${sampleContext.phase || 'Not specified'}`);
  console.log(`   Location: ${sampleContext.location || 'Not specified'}`);
  console.log(`   Conditionals: ${sampleContext.conditionals?.length || 0} rules found`);
  
  // Cross-document correlation
  console.log('\n🔗 CROSS-DOCUMENT CORRELATION:\n');
  const correlationService = new CorrelationService();
  const conflicts = correlationService.trackMaterialAcrossDocuments('Concrete 3000 PSI', [
    { id: 'Sitka Construction Shell Set.pdf', quantity: 25, spec: '3000 PSI' },
    { id: 'Sitka Shell Set - Outline Specifications.pdf', quantity: 27, spec: '3000 PSI' }
  ]);
  console.log(`   Documents tracked: 2`);
  console.log(`   Conflicts detected: ${conflicts.length}`);
  if (conflicts.length > 0) {
    conflicts.forEach(c => {
      console.log(`   ⚠️  ${c.description}`);
      if (c.resolution) console.log(`      Resolution: ${c.resolution}`);
    });
  }
  
  // Derived materials
  console.log('\n🔩 CALCULATED DERIVED MATERIALS:\n');
  
  const fastenerCalc = new FastenerCalculator();
  const fasteners = fastenerCalc.calculateForDrywall(120);
  console.log(`   Fasteners for 120 sheets: ${fasteners.quantity} ${fasteners.type}`);
  console.log(`      Size: ${fasteners.size}, Type: ${fasteners.connectionType}`);
  
  const adhesiveCalc = new AdhesiveCalculator();
  const adhesive = adhesiveCalc.calculateConstructionAdhesive(500);
  console.log(`   Adhesive for 500 SF: ${adhesive.tubes} tubes`);
  console.log(`      Type: ${adhesive.type}, Coverage: ${adhesive.coverage} SF/tube`);
  
  const finishCalc = new FinishCalculator();
  const finish = finishCalc.calculatePaint(2000);
  console.log(`   Paint for 2000 SF walls: ${finish.gallons} gallons`);
  console.log(`      Type: ${finish.type}, Coverage: ${finish.coverage} SF/gallon`);
  
  console.log('\n' + '='.repeat(60));
  console.log('\n✅ DEMO COMPLETE\n');
  console.log('Next steps:');
  console.log('1. Use Claude Desktop to extract real data from PDFs');
  console.log('2. Feed extracted JSON into this pipeline');
  console.log('3. Review validation warnings and conflicts');
  console.log('4. Export to supply list or cost estimate\n');
}

function generateExtractionPrompt(): string {
  return `I have construction documents for the Sitka project. Please extract ALL materials with quantities from these PDFs.

For each material, provide:
- name: Material name
- quantity: Numeric quantity
- unit: Unit of measure (sheets, linear feet, cubic yards, each, square feet, lbs)
- specification: Size, grade, or specification
- location: Where it's used
- category: Concrete, Steel, Wood, Masonry, Finishes, MEP
- source: Which PDF it came from
- page: Page number or drawing number

Return as JSON array:
[
  {
    "name": "Material name",
    "quantity": 100,
    "unit": "linear feet",
    "specification": "Details",
    "location": "Where used",
    "category": "Wood",
    "source": "Sitka Construction Shell Set.pdf",
    "page": "S-101"
  }
]

Focus on:
- Structural materials (concrete, rebar, steel, lumber)
- Finishes (plywood, drywall, tile, paint)
- MEP materials (pipes, conduit, fixtures)
- Quantities from schedules and callouts
- Materials from specifications

Extract from ALL 4 PDFs and combine into one JSON array.`;
}

runDemo().catch(console.error);
