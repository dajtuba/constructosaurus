import { TableExtractor } from '../extraction/table-extractor';
import { ScheduleParser } from '../extraction/schedule-parser';
import * as path from 'path';

async function testScheduleParser() {
  console.log('🧪 Testing Schedule Parser\n');
  
  const extractor = new TableExtractor();
  const parser = new ScheduleParser();
  
  const pdfPath = path.join(__dirname, '../../source/Sitka Construction Shell Set.pdf');
  
  console.log(`📄 Processing: ${path.basename(pdfPath)}\n`);
  
  const tables = await extractor.extractTables(pdfPath);
  console.log(`Found ${tables.length} tables\n`);
  
  let parsedCount = 0;
  
  for (let i = 0; i < tables.length; i++) {
    const table = tables[i];
    const type = extractor.classifyTableType(table);
    
    if (type === 'door_schedule') {
      console.log(`\n🚪 Door Schedule (Table ${i + 1}, Page ${table.page}):`);
      console.log('='.repeat(60));
      
      const entries = parser.parseDoorSchedule(table);
      console.log(`Parsed ${entries.length} entries\n`);
      
      entries.slice(0, 3).forEach(entry => {
        console.log(`Mark: ${entry.mark}`);
        console.log(`Data:`, JSON.stringify(entry.data, null, 2));
        console.log('');
      });
      
      parsedCount++;
    } else if (type === 'footing_schedule') {
      console.log(`\n🏗️  Footing Schedule (Table ${i + 1}, Page ${table.page}):`);
      console.log('='.repeat(60));
      
      const entries = parser.parseFootingSchedule(table);
      console.log(`Parsed ${entries.length} entries\n`);
      
      entries.slice(0, 3).forEach(entry => {
        console.log(`Mark: ${entry.mark}`);
        if (entry.width) console.log(`  Width: ${entry.width.original} (${entry.width.value} inches)`);
        if (entry.depth) console.log(`  Depth: ${entry.depth.original} (${entry.depth.value} inches)`);
        if (entry.concrete_strength) console.log(`  Concrete: ${entry.concrete_strength} PSI`);
        if (entry.rebar_vertical) console.log(`  Rebar Vert: ${entry.rebar_vertical}`);
        console.log('');
      });
      
      parsedCount++;
    }
  }
  
  // Test dimension parsing
  console.log('\n📏 Testing Dimension Parsing:');
  console.log('='.repeat(60));
  
  const testDimensions = [
    '16"',
    '2\'-4"',
    '24.5\'',
    '1\'-0"'
  ];
  
  testDimensions.forEach(dim => {
    const parsed = parser.parseDimension(dim);
    if (parsed) {
      console.log(`${dim} → ${parsed.value} inches (${parsed.feet}' ${parsed.inches}")`);
    }
  });
  
  // Test concrete strength parsing
  console.log('\n🏗️  Testing Concrete Strength Parsing:');
  console.log('='.repeat(60));
  
  const testStrengths = ['3000 PSI', '3000', '3000psi', 'f\'c = 3000'];
  testStrengths.forEach(str => {
    const parsed = parser.parseConcreteStrength(str);
    console.log(`"${str}" → ${parsed} PSI`);
  });
  
  console.log(`\n✅ Successfully parsed ${parsedCount} schedules`);
}

testScheduleParser().catch(console.error);
