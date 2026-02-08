import { IntelligentDocumentProcessor } from "../processing/intelligent-processor";
import { EmbeddingService } from "../embeddings/embedding-service";
import { HybridSearchEngine } from "../search/hybrid-search-engine";
import * as path from "path";

async function testIntelligentProcessing() {
  console.log("🧪 Testing Intelligent Document Processing\n");

  const embedService = new EmbeddingService();
  const scheduleStorePath = path.join(__dirname, "../../data/test-schedules");

  const processor = new IntelligentDocumentProcessor(embedService, scheduleStorePath);

  // Test with Sitka document
  const testDoc = path.join(__dirname, "../../source/Sitka Construction Shell Set.pdf");
  
  console.log("Testing with:", testDoc);
  
  const result = await processor.processDocument(testDoc);

  console.log("\n📊 RESULTS:");
  console.log("=".repeat(60));
  console.log(`Classification: ${result.classification.type}`);
  console.log(`Project: ${result.classification.project || "N/A"}`);
  console.log(`Discipline: ${result.classification.discipline || "N/A"}`);
  console.log(`Drawing Numbers: ${result.classification.drawingNumbers.join(", ")}`);
  console.log(`Has Schedules: ${result.classification.hasSchedules}`);
  console.log(`Confidence: ${(result.classification.confidence * 100).toFixed(1)}%`);
  console.log(`\nSheets Processed: ${result.sheets.length}`);
  console.log(`Schedules Found: ${result.schedules.length}`);

  if (result.schedules.length > 0) {
    console.log("\n📋 Schedule Details:");
    result.schedules.forEach((schedule, idx) => {
      console.log(`  ${idx + 1}. ${schedule.type} (Page ${schedule.pageNumber})`);
      console.log(`     Headers: ${schedule.headers.join(", ")}`);
      console.log(`     Rows: ${schedule.rows.length}`);
    });
  }

  // Test search with sheet-level chunks
  console.log("\n🔍 Testing Search with Sheet-Level Chunks:");
  console.log("=".repeat(60));

  const searchEngine = new HybridSearchEngine("./data/test-sheets-db", embedService);
  await searchEngine.initialize();

  // Create table with sheets
  const sheetsForDb = result.sheets.map(sheet => ({
    id: sheet.id,
    text: sheet.text,
    project: sheet.metadata.project || "",
    discipline: sheet.metadata.discipline || "",
    drawingType: sheet.metadata.drawingType || "",
    drawingNumber: sheet.metadata.drawingNumber || "",
    materials: sheet.metadata.materials || "",
    components: sheet.metadata.components || "",
    vector: sheet.vector,
  }));

  await searchEngine.createTable(sheetsForDb);

  // Test queries
  const queries = [
    "foundation details",
    "structural steel connections",
    "concrete specifications",
  ];

  for (const query of queries) {
    console.log(`\nQuery: "${query}"`);
    const results = await searchEngine.search({ query, top_k: 3 });
    results.forEach((r, idx) => {
      console.log(`  ${idx + 1}. ${r.drawingNumber} (${r.discipline})`);
      console.log(`     ${r.text.substring(0, 100)}...`);
    });
  }

  console.log("\n✅ Test complete!");
}

testIntelligentProcessing().catch(console.error);
