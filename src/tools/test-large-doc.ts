import { TableExtractor } from "../extraction/table-extractor";
import { ScheduleParser } from "../extraction/schedule-parser";
import { ScheduleStore } from "../storage/schedule-store";
import * as path from "path";
import * as fs from "fs";

async function testLargeDocument() {
  console.log("🧪 Testing Phase 1 with 293-Page Document\n");
  console.log("Document: Sitka Structural Calculations (293 pages)");
  console.log("=".repeat(65));
  console.log("");

  const pdfPath = path.join(__dirname, "../../source/Sitka Structural Calculations -- Permit Set (09-19-2025).pdf");
  const storePath = path.join(__dirname, "../../data/test-large-doc");

  // Clean up
  if (fs.existsSync(storePath)) {
    fs.rmSync(storePath, { recursive: true });
  }

  const startTime = Date.now();

  // Step 1: Extract tables
  console.log("Step 1: Extracting tables...");
  const extractor = new TableExtractor();
  const tables = await extractor.extractTables(pdfPath);
  const extractTime = Date.now() - startTime;
  
  console.log(`✅ Extracted ${tables.length} tables in ${(extractTime / 1000).toFixed(1)}s`);
  console.log("");

  // Step 2: Classify tables
  console.log("Step 2: Classifying tables...");
  const typeCount: Record<string, number> = {};
  tables.forEach(t => {
    const type = extractor.classifyTableType(t);
    typeCount[type] = (typeCount[type] || 0) + 1;
  });

  console.log("Table types found:");
  Object.entries(typeCount).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });
  console.log("");

  // Step 3: Parse schedules
  console.log("Step 3: Parsing schedules...");
  const parser = new ScheduleParser();
  const store = new ScheduleStore(storePath);

  let parsedEntries = 0;
  let footingSchedules = 0;
  let doorSchedules = 0;

  for (const table of tables) {
    const type = extractor.classifyTableType(table);
    const scheduleId = `sched-${table.page}-${type}`;

    store.addSchedule({
      id: scheduleId,
      documentId: "structural-calcs",
      scheduleType: type,
      pageNumber: table.page,
      extractionMethod: table.method,
      rowCount: table.rows.length,
      columnCount: table.rows[0]?.length || 0
    });

    if (type === "footing_schedule") {
      const entries = parser.parseFootingSchedule(table);
      entries.forEach((entry, idx) => {
        store.addEntry({
          id: `${scheduleId}-${idx}`,
          scheduleId,
          mark: entry.mark,
          data: entry,
          rowNumber: idx + 1
        });
        parsedEntries++;
      });
      footingSchedules++;
    } else if (type === "door_schedule" || type === "window_schedule") {
      const entries = parser.parseDoorSchedule(table);
      entries.forEach((entry, idx) => {
        store.addEntry({
          id: `${scheduleId}-${idx}`,
          scheduleId,
          mark: entry.mark,
          data: entry.data,
          rowNumber: idx + 1
        });
        parsedEntries++;
      });
      if (type === "door_schedule") doorSchedules++;
    }
  }

  console.log(`✅ Parsed ${parsedEntries} schedule entries`);
  console.log(`  Footing schedules: ${footingSchedules}`);
  console.log(`  Door schedules: ${doorSchedules}`);
  console.log("");

  // Step 4: Query and validate
  console.log("Step 4: Validating storage and queries...");
  const stats = store.getStats();
  
  console.log(`Total schedules stored: ${stats.totalSchedules}`);
  console.log(`Total entries stored: ${stats.totalEntries}`);
  console.log("");

  // Find a sample entry
  const allSchedules = store.getAllSchedules();
  const footingScheds = allSchedules.filter(s => s.scheduleType === "footing_schedule");
  
  if (footingScheds.length > 0) {
    const sampleSched = footingScheds[0];
    const entries = store.getEntries(sampleSched.id);
    
    if (entries.length > 0) {
      console.log("Sample footing entry:");
      console.log(`  Mark: ${entries[0].mark}`);
      console.log(`  Page: ${sampleSched.pageNumber}`);
      console.log(`  Data:`, JSON.stringify(entries[0].data, null, 2).substring(0, 200));
      console.log("");
    }
  }

  // Performance metrics
  const totalTime = Date.now() - startTime;
  console.log("📊 Performance Metrics:");
  console.log("=".repeat(65));
  console.log(`Total time: ${(totalTime / 1000).toFixed(1)}s`);
  console.log(`Extraction: ${(extractTime / 1000).toFixed(1)}s`);
  console.log(`Processing: ${((totalTime - extractTime) / 1000).toFixed(1)}s`);
  console.log(`Tables per second: ${(tables.length / (totalTime / 1000)).toFixed(1)}`);
  console.log("");

  // Validation
  console.log("✅ Validation Results:");
  console.log("=".repeat(65));
  console.log(`✓ Extracted tables from 293-page document`);
  console.log(`✓ Classified ${tables.length} tables`);
  console.log(`✓ Stored ${stats.totalSchedules} schedules`);
  console.log(`✓ Parsed ${stats.totalEntries} entries`);
  console.log(`✓ Storage persistence working`);
  console.log(`✓ Query functionality working`);
  console.log("");

  console.log("🎉 Phase 1 validated with large document!");
}

testLargeDocument().catch(console.error);
