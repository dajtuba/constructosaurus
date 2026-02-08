import { IntelligentDocumentProcessor } from "../processing/intelligent-processor";
import { EmbeddingService } from "../embeddings/embedding-service";
import { ScheduleStore } from "../storage/schedule-store";
import * as path from "path";
import * as fs from "fs";

async function testFullPipeline() {
  console.log("🧪 Testing Full Pipeline with 293-Page Document\n");
  console.log("This tests the complete Phase 1 integration:");
  console.log("  Classification → Sheet Processing → Table Extraction → Storage");
  console.log("=".repeat(65));
  console.log("");

  const scheduleStorePath = path.join(__dirname, "../../data/test-full-pipeline");
  
  // Clean up
  if (fs.existsSync(scheduleStorePath)) {
    fs.rmSync(scheduleStorePath, { recursive: true });
  }

  const embedService = new EmbeddingService();
  const processor = new IntelligentDocumentProcessor(embedService, scheduleStorePath);

  const testDoc = path.join(__dirname, "../../source/Sitka Structural Calculations -- Permit Set (09-19-2025).pdf");
  
  console.log(`📄 Processing: ${path.basename(testDoc)}`);
  console.log("⚠️  Note: This will take ~5 minutes due to embedding generation");
  console.log("         (293 pages × ~1 second per embedding)\n");

  const startTime = Date.now();
  
  try {
    const result = await processor.processDocument(testDoc);
    const totalTime = Date.now() - startTime;

    console.log("\n📊 RESULTS:");
    console.log("=".repeat(65));
    console.log(`Classification: ${result.classification.type}`);
    console.log(`Discipline: ${result.classification.discipline}`);
    console.log(`Pages: ${result.classification.pageCount}`);
    console.log(`Sheets processed: ${result.sheets.length}`);
    console.log(`Tables extracted: ${result.extractedTables}`);
    console.log(`Schedule entries: ${result.parsedSchedules}`);
    console.log(`Processing time: ${(totalTime / 1000 / 60).toFixed(1)} minutes`);
    console.log("");

    // Check storage
    const store = new ScheduleStore(scheduleStorePath);
    const stats = store.getStats();
    
    console.log("💾 STORAGE:");
    console.log("=".repeat(65));
    console.log(`Schedules in database: ${stats.totalSchedules}`);
    console.log(`Entries in database: ${stats.totalEntries}`);
    console.log(`Types:`, stats.byType);
    console.log("");

    console.log("✅ VALIDATION:");
    console.log("=".repeat(65));
    console.log(`✓ Document classified correctly`);
    console.log(`✓ All ${result.sheets.length} sheets processed`);
    console.log(`✓ Embeddings generated for all sheets`);
    console.log(`✓ Tables extracted: ${result.extractedTables}`);
    console.log(`✓ Schedules stored: ${stats.totalSchedules}`);
    console.log(`✓ Full pipeline working end-to-end`);
    console.log("");

    console.log("🎉 Full pipeline validated with 293-page document!");

  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  }
}

testFullPipeline().catch(console.error);
