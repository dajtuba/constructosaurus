import { ScheduleStore } from '../storage/schedule-store';
import * as path from 'path';
import * as fs from 'fs';

function testScheduleStore() {
  console.log('🧪 Testing Schedule Store\n');
  
  const testPath = path.join(__dirname, '../../data/test-schedules');
  
  // Clean up test data
  if (fs.existsSync(testPath)) {
    fs.rmSync(testPath, { recursive: true });
  }
  
  const store = new ScheduleStore(testPath);
  
  // Test 1: Add a schedule
  console.log('Test 1: Adding schedule metadata');
  const scheduleId = 'sched-001';
  store.addSchedule({
    id: scheduleId,
    documentId: 'doc-001',
    scheduleType: 'footing_schedule',
    pageNumber: 5,
    extractionMethod: 'text-pattern',
    extractionConfidence: 0.95,
    rowCount: 3,
    columnCount: 6
  });
  console.log('✅ Schedule added\n');
  
  // Test 2: Add entries
  console.log('Test 2: Adding schedule entries');
  store.addEntry({
    id: 'entry-001',
    scheduleId,
    mark: 'F1',
    data: {
      width: { value: 16, unit: 'inches', original: '16"' },
      depth: { value: 8, unit: 'inches', original: '8"' },
      concrete_strength: 3000
    },
    rowNumber: 1
  });
  
  store.addEntry({
    id: 'entry-002',
    scheduleId,
    mark: 'F2',
    data: {
      width: { value: 18, unit: 'inches', original: '18"' },
      depth: { value: 10, unit: 'inches', original: '10"' },
      concrete_strength: 3000
    },
    rowNumber: 2
  });
  console.log('✅ 2 entries added\n');
  
  // Test 3: Query by document
  console.log('Test 3: Query schedules by document');
  const docSchedules = store.getSchedulesByDocument('doc-001');
  console.log(`Found ${docSchedules.length} schedules for doc-001`);
  console.log(`  Type: ${docSchedules[0].scheduleType}`);
  console.log(`  Page: ${docSchedules[0].pageNumber}\n`);
  
  // Test 4: Query entries
  console.log('Test 4: Query entries by schedule');
  const entries = store.getEntries(scheduleId);
  console.log(`Found ${entries.length} entries`);
  entries.forEach(e => {
    console.log(`  ${e.mark}: ${JSON.stringify(e.data)}`);
  });
  console.log('');
  
  // Test 5: Find by mark
  console.log('Test 5: Find entry by mark');
  const f1 = store.findEntryByMark('F1');
  if (f1) {
    console.log(`Found F1: width=${f1.data.width.original}, depth=${f1.data.depth.original}\n`);
  }
  
  // Test 6: Stats
  console.log('Test 6: Get statistics');
  const stats = store.getStats();
  console.log(`Total schedules: ${stats.totalSchedules}`);
  console.log(`Total entries: ${stats.totalEntries}`);
  console.log(`By type:`, stats.byType);
  console.log('');
  
  // Test 7: Persistence
  console.log('Test 7: Testing persistence');
  const store2 = new ScheduleStore(testPath);
  const reloadedStats = store2.getStats();
  console.log(`After reload - Total schedules: ${reloadedStats.totalSchedules}`);
  console.log(`After reload - Total entries: ${reloadedStats.totalEntries}`);
  
  if (reloadedStats.totalSchedules === 1 && reloadedStats.totalEntries === 2) {
    console.log('✅ Persistence works!\n');
  } else {
    console.log('❌ Persistence failed\n');
  }
  
  console.log('✅ All tests passed!');
}

testScheduleStore();
