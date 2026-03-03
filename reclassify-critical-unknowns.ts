import { ScheduleStore } from './src/storage/schedule-store';
import * as path from 'path';

// Reclassify unknown schedules based on page analysis
async function reclassify() {
  const scheduleStorePath = path.join('./data', 'schedules');
  const store = new ScheduleStore(scheduleStorePath);
  
  const allSchedules = store.getAllSchedules();
  const unknowns = allSchedules.filter(s => s.scheduleType === 'unknown');
  
  console.log(`Found ${unknowns.length} unknown schedules\n`);
  
  // Classification rules based on manual review
  const classifications: Record<string, Record<number, string>> = {
    // Structural-Calculations.pdf (ac79db9a8adb66a5eb3ff5dbc48abb9f)
    'ac79db9a8adb66a5eb3ff5dbc48abb9f': {
      1: 'cover_page',
      3: 'notes',
      6: 'detail_reference',  // Critical: roof framing plan with detail callouts
      8: 'load_table',        // Critical: ForteWeb design table
      9: 'load_table',
      10: 'load_table'
    },
    // Shell-Set.pdf (d586b274fa90e1436eaa227c47e7077b)
    'd586b274fa90e1436eaa227c47e7077b': {
      // Most are likely notes/legends - would need manual review
    }
  };
  
  let reclassified = 0;
  
  for (const schedule of unknowns) {
    const docClassifications = classifications[schedule.documentId];
    if (docClassifications && docClassifications[schedule.pageNumber]) {
      const newType = docClassifications[schedule.pageNumber];
      console.log(`Page ${schedule.pageNumber}: unknown → ${newType}`);
      
      // Update the schedule type
      schedule.scheduleType = newType;
      reclassified++;
    }
  }
  
  console.log(`\n✅ Reclassified ${reclassified} schedules`);
  console.log(`📝 Remaining unknowns: ${unknowns.length - reclassified}`);
  
  // Save updated schedules
  // Note: ScheduleStore doesn't have an update method, so we'd need to add one
  // For now, just report what would be changed
  
  console.log('\n💡 To apply these changes, we need to:');
  console.log('1. Add update method to ScheduleStore');
  console.log('2. Create parsers for detail_reference and load_table types');
  console.log('3. Re-extract pages 6 and 8 with new parsers');
}

reclassify().catch(console.error);
