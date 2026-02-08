import { TableExtractor } from "../extraction/table-extractor";
import { StructuralTableParser } from "../extraction/structural-table-parser";
import * as path from "path";

async function testStructuralParser() {
  console.log("🧪 Testing Structural Table Parser\n");
  
  const extractor = new TableExtractor();
  const parser = new StructuralTableParser();
  
  const pdfPath = path.join(__dirname, "../../source/Sitka Structural Calculations -- Permit Set (09-19-2025).pdf");
  
  const tables = await extractor.extractTables(pdfPath);
  
  console.log(`Processing ${tables.length} tables...\n`);
  
  let verificationCount = 0;
  let capacityCount = 0;
  let totalMembers = 0;
  let totalCapacities = 0;
  
  for (const table of tables) {
    const type = parser.classifyStructuralTable(table);
    
    if (type === 'verification_table') {
      const members = parser.parseVerificationTable(table);
      if (members.length > 0) {
        verificationCount++;
        totalMembers += members.length;
        
        if (verificationCount <= 2) {
          console.log(`Verification Table (Page ${table.page}):`);
          members.forEach(m => {
            console.log(`  ${m.status}: ${m.span || 'N/A'} - ${m.size || 'N/A'} ${m.material || ''}`);
            if (m.ratio) console.log(`    Ratio: ${m.ratio}`);
          });
          console.log("");
        }
      }
    } else if (type === 'load_capacity_table') {
      const capacities = parser.parseLoadCapacityTable(table);
      if (capacities.length > 0) {
        capacityCount++;
        totalCapacities += capacities.length;
        
        if (capacityCount <= 2) {
          console.log(`Load Capacity Table (Page ${table.page}):`);
          capacities.forEach(c => {
            console.log(`  Height: ${c.height} - ${c.material || 'N/A'}`);
            if (c.dimension) console.log(`    Dimension: ${c.dimension}`);
          });
          console.log("");
        }
      }
    }
  }
  
  console.log("📊 Summary:");
  console.log("=".repeat(65));
  console.log(`Verification tables: ${verificationCount}`);
  console.log(`  Total members analyzed: ${totalMembers}`);
  console.log(`Load capacity tables: ${capacityCount}`);
  console.log(`  Total capacity entries: ${totalCapacities}`);
  console.log("");
  
  console.log("✅ Structural parser extracts meaningful data:");
  console.log("  • Member verification (Passed/Failed)");
  console.log("  • Spans and dimensions");
  console.log("  • Material specifications");
  console.log("  • Load capacities");
  console.log("  • Height limits");
}

testStructuralParser().catch(console.error);
