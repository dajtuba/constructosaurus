import { IntelligentDocumentProcessor } from "../processing/intelligent-processor";
import { EmbeddingService } from "../embeddings/embedding-service";
import { ScheduleStore } from "../storage/schedule-store";
import * as path from "path";
import * as fs from "fs";

async function testIntegration() {
  console.log("🧪 Testing Full Integration: Table Extraction → Storage\n");

  const scheduleStorePath = path.join(__dirname, "../../data/test-integration");
  
  // Clean up
  if (fs.existsSync(scheduleStorePath)) {
    fs.rmSync(scheduleStorePath, { recursive: true });
  }

  const embedService = new EmbeddingService();
  const processor = new IntelligentDocumentProcessor(embedService, scheduleStorePath);

  // Test with a document that has tables
  const testDoc = path.join(__dirname, "../../source/Sitka Construction Shell Set.pdf");
  
  console.log(`📄 Processing: ${path.basename(testDoc)}\n`);
  
  const result = await processor.processDocument(testDoc);

  console.log("\n📊 PROCESSING RESULTS:");
  console.log("=".repeat(60));
  console.log(`Classification: ${result.classification.type}`);
  console.log(`Sheets processed: ${result.sheets.length}`);
  console.log(`Old schedules: ${result.schedules.length}`);
  console.log(`Tables extracted: ${result.extractedTables}`);
  console.log(`Schedule entries parsed: ${result.parsedSchedules}`);

  // Check storage
  console.log("\n💾 STORAGE CHECK:");
  console.log("=".repeat(60));
  const store = new ScheduleStore(scheduleStorePath);
  const stats = store.getStats();
  
  console.log(`Total schedules in store: ${stats.totalSchedules}`);
  console.log(`Total entries in store: ${stats.totalEntries}`);
  console.log(`Schedule types:`, stats.byType);

  // Show sample entries
  if (stats.totalEntries > 0) {
    console.log("\n📋 SAMPLE ENTRIES:");
    console.log("=".repeat(60));
    const allSchedules = store.getAllSchedules();
    for (const schedule of allSchedules.slice(0, 2)) {
      console.log(`\nSchedule: ${schedule.scheduleType} (Page ${schedule.pageNumber})`);
      const entries = store.getEntries(schedule.id);
      entries.slice(0, 3).forEach(entry => {
        console.log(`  ${entry.mark}:`, JSON.stringify(entry.data).substring(0, 100));
      });
    }
  }

  console.log("\n✅ Integration test complete!");
}

testIntegration().catch(console.error);
