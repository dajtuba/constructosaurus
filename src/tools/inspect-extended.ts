import { ScheduleStore } from "../storage/schedule-store";
import * as path from "path";

function inspectExtendedResults() {
  console.log("🔍 Inspecting Extended Phase 1 Results\n");
  
  const store = new ScheduleStore(path.join(__dirname, "../../data/test-extended-phase1"));
  
  const stats = store.getStats();
  console.log("Statistics:");
  console.log(`  Total schedules: ${stats.totalSchedules}`);
  console.log(`  Total entries: ${stats.totalEntries}`);
  console.log(`  By type:`, stats.byType);
  console.log("");
  
  const allSchedules = store.getAllSchedules();
  
  console.log("All Schedules:");
  allSchedules.forEach((sched, idx) => {
    console.log(`\n${idx + 1}. ${sched.scheduleType} (Page ${sched.pageNumber})`);
    console.log(`   ID: ${sched.id}`);
    console.log(`   Rows: ${sched.rowCount}, Cols: ${sched.columnCount}`);
    
    const entries = store.getEntries(sched.id);
    console.log(`   Entries: ${entries.length}`);
    
    if (entries.length > 0) {
      console.log(`   Sample entry:`);
      console.log(`     Mark: ${entries[0].mark}`);
      console.log(`     Data:`, JSON.stringify(entries[0].data, null, 2));
    }
  });
}

inspectExtendedResults();
