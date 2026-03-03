import { StructuralTableParser } from './src/extraction/structural-table-parser';
import * as fs from 'fs';
import pdf from 'pdf-parse';

async function testWithPDFParse() {
  const parser = new StructuralTableParser();
  const pdfPath = './source/Structural-Calculations.pdf';
  
  const dataBuffer = fs.readFileSync(pdfPath);
  const pdfData = await pdf(dataBuffer);
  
  console.log(`Total pages: ${pdfData.numpages}`);
  console.log(`Total text length: ${pdfData.text.length} chars\n`);
  
  // Rough page split
  const charsPerPage = Math.ceil(pdfData.text.length / pdfData.numpages);
  
  // Test page 6
  const page6Start = 5 * charsPerPage;
  const page6End = 6 * charsPerPage;
  const text6 = pdfData.text.substring(page6Start, page6End);
  
  console.log('=== Page 6: Detail References ===\n');
  console.log('Text sample (first 300 chars):');
  console.log(text6.substring(0, 300));
  
  const detailRefs = parser.parseDetailReferences(text6);
  console.log(`\n📍 Found ${detailRefs.length} detail references:`);
  detailRefs.forEach(ref => {
    console.log(`  ${ref.detailNumber}/${ref.sheetReference}` + 
                (ref.gridLocation ? ` @ ${ref.gridLocation}` : '') +
                ` (confidence: ${ref.confidence.toFixed(2)})`);
  });
  
  // Test page 8
  const page8Start = 7 * charsPerPage;
  const page8End = 8 * charsPerPage;
  const text8 = pdfData.text.substring(page8Start, page8End);
  
  console.log('\n\n=== Page 8: Load Tables ===\n');
  console.log('Text sample (first 500 chars):');
  console.log(text8.substring(0, 500));
  
  // Look for ForteWeb patterns
  const hasForteWeb = text8.toLowerCase().includes('forteweb') || text8.toLowerCase().includes('forte');
  console.log(`\n${hasForteWeb ? '✅' : '❌'} Contains ForteWeb reference`);
  
  // Look for table-like patterns
  const lines = text8.split('\n').filter(l => l.trim().length > 0);
  console.log(`\n📊 Found ${lines.length} non-empty lines`);
  console.log('\nFirst 15 lines:');
  lines.slice(0, 15).forEach((line, idx) => {
    console.log(`  ${idx + 1}: ${line.substring(0, 80)}`);
  });
}

testWithPDFParse().catch(console.error);
