import { StructuralTableParser } from './src/extraction/structural-table-parser';
import { OllamaVisionAnalyzer } from './src/vision/ollama-vision-analyzer';
import { PDFImageConverter } from './src/vision/pdf-image-converter';

async function testParsers() {
  const parser = new StructuralTableParser();
  const visionAnalyzer = new OllamaVisionAnalyzer();
  const imageConverter = new PDFImageConverter();
  
  const pdfPath = './source/Structural-Calculations.pdf';
  const testPages = [6, 8];
  
  for (const pageNum of testPages) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`Testing Page ${pageNum}`);
    console.log('='.repeat(70));
    
    // Convert to image
    const imagePath = await imageConverter.convertPageToImage(pdfPath, pageNum, './data/vision-temp');
    
    // Get vision analysis
    const result = await visionAnalyzer.analyzeDrawingPage(imagePath, pageNum, 'Structural');
    
    // Test detail reference parser on page 6
    if (pageNum === 6) {
      console.log('\n📍 Testing Detail Reference Parser:');
      const textContent = JSON.stringify(result);
      const detailRefs = parser.parseDetailReferences(textContent);
      
      console.log(`Found ${detailRefs.length} detail references:`);
      detailRefs.forEach(ref => {
        console.log(`  ${ref.detailNumber}/${ref.sheetReference}` + 
                    (ref.gridLocation ? ` @ ${ref.gridLocation}` : '') +
                    ` (confidence: ${ref.confidence.toFixed(2)})`);
      });
    }
    
    // Test load table parser on page 8
    if (pageNum === 8) {
      console.log('\n📊 Testing Load Table Parser:');
      
      // Check if vision found any tables
      if (result.schedules && result.schedules.length > 0) {
        console.log(`Vision found ${result.schedules.length} schedules`);
        
        result.schedules.forEach((schedule, idx) => {
          console.log(`\nSchedule ${idx + 1}: ${schedule.scheduleType}`);
          console.log(`Entries: ${schedule.entries.length}`);
          
          // Try to parse as load table
          const mockTable = {
            headers: ['Member', 'Size', 'Span', 'Load', 'Criteria'],
            rows: schedule.entries.map(e => Object.values(e))
          };
          
          const loadEntries = parser.parseLoadTable(mockTable as any);
          console.log(`Parsed ${loadEntries.length} load table entries:`);
          
          loadEntries.slice(0, 3).forEach(entry => {
            console.log(`  ${entry.memberMark}: ${entry.size} @ ${entry.span} - ${entry.loadCapacity} (${entry.confidence.toFixed(2)})`);
          });
        });
      } else {
        console.log('⚠️  Vision analyzer found no schedules on this page');
        console.log('This is expected - the table might need text extraction instead');
      }
    }
  }
}

testParsers().catch(console.error);
