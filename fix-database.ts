#!/usr/bin/env npx ts-node

/**
 * Database Fix: Create a working member database for validation
 */

import { MemberDatabase } from './src/storage/member-database';
import { EmbeddingService } from './src/embeddings/embedding-service';
import * as fs from 'fs';

async function fixDatabase() {
  console.log('🔧 Fixing database issues...');
  
  try {
    // Clean up existing database
    if (fs.existsSync('data/test-member-db')) {
      fs.rmSync('data/test-member-db', { recursive: true, force: true });
    }
    
    // Create fresh database
    const embedService = new EmbeddingService();
    const db = new MemberDatabase('data/test-member-db', embedService);
    
    await db.initialize();
    console.log('✅ Database initialized');
    
    // Add zone extraction data
    const zoneData = JSON.parse(fs.readFileSync('zone-extraction-result.json', 'utf8'));
    
    let insertCount = 0;
    for (const zone of zoneData.zones) {
      for (const [type, items] of Object.entries(zone)) {
        if (type === 'zone' || !Array.isArray(items)) continue;
        
        for (const item of items) {
          const designation = `${zone.zone}_${type}_${insertCount}`;
          await db.addMember({
            designation,
            shell_set_spec: item,
            shell_set_sheet: zoneData.sheet,
            shell_set_location: zone.zone,
            structural_spec: '',
            structural_page: 0,
            forteweb_spec: '',
            forteweb_page: 0,
            has_conflict: false,
            member_type: type as any
          });
          insertCount++;
        }
      }
    }
    
    console.log(`✅ Inserted ${insertCount} members`);
    
    // Add sheet record
    await db.addSheet({
      name: zoneData.sheet,
      page_number: zoneData.page,
      sheet_type: 'floor_framing',
      image_path: 'data/vision-temp/page-33-33.png',
      member_count: insertCount
    });
    
    console.log('✅ Added sheet record');
    
    // Test queries
    const member = await db.getMember('left_joists_0');
    console.log('✅ Query test:', member ? 'SUCCESS' : 'FAILED');
    
    const sheetMembers = await db.getMembersBySheet('S2.1');
    console.log('✅ Sheet query test:', sheetMembers.length > 0 ? 'SUCCESS' : 'FAILED');
    
    console.log('🎉 Database fix complete!');
    
  } catch (error) {
    console.error('❌ Database fix failed:', error);
  }
}

if (require.main === module) {
  fixDatabase();
}