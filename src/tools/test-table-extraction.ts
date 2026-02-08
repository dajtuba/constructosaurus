import { TableExtractor } from '../extraction/table-extractor';
import * as path from 'path';

async function testTableExtraction() {
  console.log('🧪 Testing Table Extraction\n');
  
  const extractor = new TableExtractor();
  
  // Test with multiple documents
  const testDocs = [
    'Sitka Construction Shell Set.pdf',
    'Sitka Shell Set - Outline Specifications.pdf'
  ];
  
  for (const docName of testDocs) {
    const pdfPath = path.join(__dirname, '../../source', docName);
    
    console.log(`\n📄 Processing: ${docName}`);
    console.log('='.repeat(60));
    
    try {
      const tables = await extractor.extractTables(pdfPath);
      
      console.log(`✅ Extracted ${tables.length} tables\n`);
      
      // Show first 2 tables
      for (let i = 0; i < Math.min(2, tables.length); i++) {
        const table = tables[i];
        const type = extractor.classifyTableType(table);
        
        console.log(`Table ${i + 1}:`);
        console.log(`  Page: ${table.page}`);
        console.log(`  Type: ${type}`);
        console.log(`  Rows: ${table.rows.length}`);
        console.log(`  Columns: ${table.rows[0]?.length || 0}`);
        
        // Show all rows for small tables
        if (table.rows.length <= 5) {
          table.rows.forEach((row, idx) => {
            console.log(`  Row ${idx}: ${row.join(' | ')}`);
          });
        } else {
          console.log(`  Headers: ${table.rows[0]?.join(' | ')}`);
          console.log(`  Sample: ${table.rows[1]?.join(' | ')}`);
        }
        console.log('');
      }
      
      // Statistics
      const typeCount: Record<string, number> = {};
      tables.forEach(t => {
        const type = extractor.classifyTableType(t);
        typeCount[type] = (typeCount[type] || 0) + 1;
      });
      
      console.log('📊 Table Types Found:');
      Object.entries(typeCount).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });
      
    } catch (error) {
      console.error('❌ Error:', error);
    }
  }
}

testTableExtraction().catch(console.error);
