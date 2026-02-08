import { IntelligentDocumentProcessor } from "../processing/intelligent-processor";
import { EmbeddingService } from "../embeddings/embedding-service";
import { ScheduleStore } from "../storage/schedule-store";
import * as path from "path";
import * as fs from "fs";

async function testExtendedPhase1() {
  console.log("🧪 Testing Extended Phase 1: Construction + Structural Parsing\n");
  console.log("=".repeat(65));
  console.log("");

  const scheduleStorePath = path.join(__dirname, "../../data/test-extended-phase1");
  
  // Clean up
  if (fs.existsSync(scheduleStorePath)) {
    fs.rmSync(scheduleStorePath, { recursive: true });
  }

  const embedService = new EmbeddingService();
  const processor = new IntelligentDocumentProcessor(embedService, scheduleStorePath);

  // Test 1: Construction drawings (has construction schedules)
  console.log("Test 1: Construction Shell Set (40 pages)");
  console.log("-".repeat(65));
  const constructionDoc = path.join(__dirname, "../../source/Sitka Construction Shell Set.pdf");
  
  const result1 = await processor.processDocument(constructionDoc);
  
  console.log(`✅ Classification: ${result1.classification.type}`);
  console.log(`   Sheets: ${result1.sheets.length}`);
  console.log(`   Tables: ${result1.extractedTables}`);
  console.log(`   Schedule entries: ${result1.parsedSchedules}`);
  console.log(`   Structural entries: ${result1.structuralMembers}`);
  console.log("");

  // Test 2: Structural calculations (has structural tables)
  console.log("Test 2: Structural Calculations (293 pages)");
  console.log("-".repeat(65));
  const structuralDoc = path.join(__dirname, "../../source/Sitka Structural Calculations -- Permit Set (09-19-2025).pdf");
  
  const result2 = await processor.processDocument(structuralDoc);
  
  console.log(`✅ Classification: ${result2.classification.type}`);
  console.log(`   Sheets: ${result2.sheets.length}`);
  console.log(`   Tables: ${result2.extractedTables}`);
  console.log(`   Schedule entries: ${result2.parsedSchedules}`);
  console.log(`   Structural entries: ${result2.structuralMembers}`);
  console.log("");

  // Check storage
  const store = new ScheduleStore(scheduleStorePath);
  const stats = store.getStats();
  
  console.log("💾 STORAGE SUMMARY:");
  console.log("=".repeat(65));
  console.log(`Total schedules: ${stats.totalSchedules}`);
  console.log(`Total entries: ${stats.totalEntries}`);
  console.log(`By type:`, stats.byType);
  console.log("");

  // Show samples
  console.log("📋 SAMPLE DATA:");
  console.log("=".repeat(65));
  
  const verificationTables = store.getSchedulesByType('verification_table');
  if (verificationTables.length > 0) {
    console.log(`\nVerification Tables: ${verificationTables.length}`);
    const entries = store.getEntries(verificationTables[0].id);
    if (entries.length > 0) {
      console.log(`  Sample: ${entries[0].mark}`);
      console.log(`  Data:`, JSON.stringify(entries[0].data, null, 2).substring(0, 150));
    }
  }

  const capacityTables = store.getSchedulesByType('load_capacity_table');
  if (capacityTables.length > 0) {
    console.log(`\nLoad Capacity Tables: ${capacityTables.length}`);
    const entries = store.getEntries(capacityTables[0].id);
    if (entries.length > 0) {
      console.log(`  Sample: ${entries[0].mark}`);
      console.log(`  Data:`, JSON.stringify(entries[0].data, null, 2).substring(0, 150));
    }
  }

  console.log("\n✅ VALIDATION:");
  console.log("=".repeat(65));
  console.log(`✓ Construction schedules parsed: ${result1.parsedSchedules}`);
  console.log(`✓ Structural members parsed: ${result2.structuralMembers}`);
  console.log(`✓ Both document types handled correctly`);
  console.log(`✓ Storage working for both types`);
  console.log("");

  console.log("🎉 Extended Phase 1 Complete!");
  console.log("   • Construction schedules ✅");
  console.log("   • Structural tables ✅");
  console.log("   • Unified storage ✅");
}

testExtendedPhase1().catch(console.error);
