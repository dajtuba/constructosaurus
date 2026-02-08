import { TableExtractor } from "../extraction/table-extractor";
import * as path from "path";

async function analyzeTableContent() {
  console.log("🔍 Analyzing Table Content from Structural Calculations\n");
  
  const extractor = new TableExtractor();
  const pdfPath = path.join(__dirname, "../../source/Sitka Structural Calculations -- Permit Set (09-19-2025).pdf");
  
  const tables = await extractor.extractTables(pdfPath);
  
  console.log(`Found ${tables.length} tables. Showing first 5 in detail:\n`);
  
  for (let i = 0; i < Math.min(5, tables.length); i++) {
    const table = tables[i];
    console.log(`Table ${i + 1} (Page ${table.page}):`);
    console.log("=".repeat(70));
    
    // Show all rows
    table.rows.forEach((row, idx) => {
      console.log(`Row ${idx}: ${row.join(" | ")}`);
    });
    
    console.log("");
  }
  
  // Analyze patterns
  console.log("\n📊 Pattern Analysis:");
  console.log("=".repeat(70));
  
  const headerPatterns: Record<string, number> = {};
  
  tables.forEach(t => {
    if (t.rows.length > 0) {
      const firstRow = t.rows[0].join(" ").toLowerCase();
      
      // Look for common structural calculation patterns
      if (firstRow.includes("load") || firstRow.includes("psf") || firstRow.includes("plf")) {
        headerPatterns["load_table"] = (headerPatterns["load_table"] || 0) + 1;
      }
      if (firstRow.includes("beam") || firstRow.includes("joist") || firstRow.includes("span")) {
        headerPatterns["member_table"] = (headerPatterns["member_table"] || 0) + 1;
      }
      if (firstRow.includes("dimension") || firstRow.includes("size") || firstRow.includes("width")) {
        headerPatterns["dimension_table"] = (headerPatterns["dimension_table"] || 0) + 1;
      }
      if (firstRow.includes("stress") || firstRow.includes("capacity") || firstRow.includes("ratio")) {
        headerPatterns["analysis_table"] = (headerPatterns["analysis_table"] || 0) + 1;
      }
      if (firstRow.includes("passed") || firstRow.includes("failed") || firstRow.includes("check")) {
        headerPatterns["verification_table"] = (headerPatterns["verification_table"] || 0) + 1;
      }
    }
  });
  
  console.log("Detected table types:");
  Object.entries(headerPatterns).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });
}

analyzeTableContent().catch(console.error);
