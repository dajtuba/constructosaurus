import { StructuralTableParser } from './src/extraction/structural-table-parser';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

async function testWithOCR() {
  const parser = new StructuralTableParser();
  const pdfPath = './source/Structural-Calculations.pdf';
  
  // Load PDF
  const loadingTask = pdfjsLib.getDocument(pdfPath);
  const pdf = await loadingTask.promise;
  
  // Test page 6 for detail references
  console.log('\n=== Page 6: Detail References ===\n');
  const page6 = await pdf.getPage(6);
  const textContent6 = await page6.getTextContent();
  const text6 = textContent6.items.map((item: any) => item.str).join(' ');
  
  console.log('Extracted text (first 500 chars):');
  console.log(text6.substring(0, 500));
  
  const detailRefs = parser.parseDetailReferences(text6);
  console.log(`\n📍 Found ${detailRefs.length} detail references:`);
  detailRefs.forEach(ref => {
    console.log(`  ${ref.detailNumber}/${ref.sheetReference}` + 
                (ref.gridLocation ? ` @ ${ref.gridLocation}` : '') +
                ` (confidence: ${ref.confidence.toFixed(2)})`);
  });
  
  // Test page 8 for load tables
  console.log('\n\n=== Page 8: Load Tables ===\n');
  const page8 = await pdf.getPage(8);
  const textContent8 = await page8.getTextContent();
  const text8 = textContent8.items.map((item: any) => item.str).join(' ');
  
  console.log('Extracted text (first 500 chars):');
  console.log(text8.substring(0, 500));
  
  // Look for table patterns
  const lines = text8.split('\n').filter(l => l.trim());
  console.log(`\n📊 Found ${lines.length} text lines`);
  console.log('\nFirst 10 lines:');
  lines.slice(0, 10).forEach((line, idx) => {
    console.log(`  ${idx + 1}: ${line.substring(0, 80)}`);
  });
}

testWithOCR().catch(console.error);
