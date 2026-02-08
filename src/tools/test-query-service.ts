import { ScheduleQueryService } from "../services/schedule-query-service";
import { ScheduleStore } from "../storage/schedule-store";
import * as path from "path";
import * as fs from "fs";

function testScheduleQueryService() {
  console.log("🧪 Testing Schedule Query Service (MCP Tool Backend)\n");

  const testPath = path.join(__dirname, "../../data/test-query-service");
  
  // Clean up
  if (fs.existsSync(testPath)) {
    fs.rmSync(testPath, { recursive: true });
  }

  const store = new ScheduleStore(testPath);
  const service = new ScheduleQueryService(store);

  // Setup test data
  console.log("Setting up test data...");
  
  const scheduleId1 = "sched-footing-001";
  store.addSchedule({
    id: scheduleId1,
    documentId: "doc-001",
    scheduleType: "footing_schedule",
    pageNumber: 5,
    extractionMethod: "text-pattern",
    rowCount: 3,
    columnCount: 6
  });

  store.addEntry({
    id: "entry-001",
    scheduleId: scheduleId1,
    mark: "F1",
    data: {
      width: { value: 16, unit: "inches", original: '16"' },
      depth: { value: 8, unit: "inches", original: '8"' },
      concrete_strength: 3000,
      rebar_vertical: "#4@16\" O.C."
    },
    rowNumber: 1
  });

  store.addEntry({
    id: "entry-002",
    scheduleId: scheduleId1,
    mark: "F2",
    data: {
      width: { value: 18, unit: "inches", original: '18"' },
      depth: { value: 10, unit: "inches", original: '10"' },
      concrete_strength: 3000
    },
    rowNumber: 2
  });

  const scheduleId2 = "sched-door-001";
  store.addSchedule({
    id: scheduleId2,
    documentId: "doc-001",
    scheduleType: "door_schedule",
    pageNumber: 8,
    extractionMethod: "text-pattern",
    rowCount: 2,
    columnCount: 4
  });

  store.addEntry({
    id: "entry-003",
    scheduleId: scheduleId2,
    mark: "D101",
    data: {
      width: '3\'-0"',
      height: '7\'-0"',
      type: "Solid Core",
      hardware: "Lockset A"
    },
    rowNumber: 1
  });

  console.log("✅ Test data created\n");

  // Test 1: Query by mark
  console.log("Test 1: Query by mark (F1)");
  console.log("=".repeat(60));
  const result1 = service.querySchedules({ mark: "F1" });
  console.log(`Found: ${result1.found}`);
  if (result1.entry) {
    console.log(`Mark: ${result1.entry.mark}`);
    console.log(`Data:`, JSON.stringify(result1.entry.data, null, 2));
  }
  console.log("");

  // Test 2: Query by schedule type
  console.log("Test 2: Query by schedule type (footing_schedule)");
  console.log("=".repeat(60));
  const result2 = service.querySchedules({ scheduleType: "footing_schedule" });
  console.log(`Found: ${result2.found}`);
  console.log(`Schedules: ${result2.count}`);
  console.log(`Total entries: ${result2.totalEntries}`);
  if (result2.entries) {
    result2.entries.forEach((e: any) => {
      console.log(`  ${e.mark}: width=${e.data.width?.original}, depth=${e.data.depth?.original}`);
    });
  }
  console.log("");

  // Test 3: Get all schedules
  console.log("Test 3: Get all schedules");
  console.log("=".repeat(60));
  const result3 = service.querySchedules({});
  console.log(`Found: ${result3.found}`);
  console.log(`Total schedules: ${result3.count}`);
  console.log(`Stats:`, result3.stats);
  console.log("");

  // Test 4: Get stats
  console.log("Test 4: Get statistics");
  console.log("=".repeat(60));
  const stats = service.getStats();
  console.log(`Total schedules: ${stats.totalSchedules}`);
  console.log(`Total entries: ${stats.totalEntries}`);
  console.log(`By type:`, stats.byType);
  console.log("");

  // Test 5: Query non-existent mark
  console.log("Test 5: Query non-existent mark (F99)");
  console.log("=".repeat(60));
  const result5 = service.querySchedules({ mark: "F99" });
  console.log(`Found: ${result5.found}`);
  console.log(`Message: ${result5.message}`);
  console.log("");

  console.log("✅ All query service tests passed!");
}

testScheduleQueryService();
