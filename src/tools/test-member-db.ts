#!/usr/bin/env node

/**
 * Test Member Database Schema
 * 
 * Verifies the member database schema works correctly.
 */

import { MemberDatabase } from '../storage/member-database';
import { EmbeddingService } from '../embeddings/embedding-service';

async function testMemberDatabase() {
  console.log('Testing member database schema...');
  
  const dbPath = './data/test-member-db';
  const embedService = new EmbeddingService();
  const memberDb = new MemberDatabase(dbPath, embedService);
  
  try {
    // Initialize database
    await memberDb.initialize();
    console.log('✅ Database initialized');
    
    // Add test member
    await memberDb.addMember({
      designation: 'D1',
      shell_set_spec: '14" TJI 560 @ 16" OC',
      shell_set_sheet: 'S2.1',
      shell_set_location: 'left bay',
      structural_spec: '14" TJI 560',
      structural_page: 5,
      forteweb_spec: '2x10 HF No.2 @ 16" OC',
      forteweb_page: 109,
      has_conflict: true,
      member_type: 'joist'
    });
    console.log('✅ Member added');
    
    // Add test sheet
    await memberDb.addSheet({
      name: 'S2.1',
      page_number: 33,
      sheet_type: 'floor_framing',
      image_path: '/tmp/shell-set-page-33.png',
      member_count: 1
    });
    console.log('✅ Sheet added');
    
    // Add test conflict
    await memberDb.addConflict({
      id: 'conflict-d1',
      designation: 'D1',
      conflict_type: 'spec_mismatch',
      shell_set_value: '14" TJI 560 @ 16" OC',
      forteweb_value: '2x10 HF No.2 @ 16" OC',
      severity: 'high'
    });
    console.log('✅ Conflict added');
    
    // Test queries
    const member = await memberDb.getMember('D1');
    console.log('✅ Query by designation:', member?.designation);
    
    const sheetMembers = await memberDb.getMembersBySheet('S2.1');
    console.log('✅ Query by sheet:', sheetMembers.length, 'members');
    
    const joists = await memberDb.getMembersByType('joist');
    console.log('✅ Query by type:', joists.length, 'joists');
    
    const conflicts = await memberDb.getConflicts();
    console.log('✅ Query conflicts:', conflicts.length, 'conflicts');
    
    console.log('🎉 All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  testMemberDatabase();
}