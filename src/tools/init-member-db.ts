#!/usr/bin/env node

/**
 * Member Database Initialization Script
 * 
 * Creates LanceDB tables for member cross-references.
 * Run: npm run init-member-db
 */

import { MemberDatabase } from '../storage/member-database';
import { EmbeddingService } from '../embeddings/embedding-service';

async function initializeMemberDatabase() {
  console.log('Initializing member database...');
  
  const dbPath = process.env.DATABASE_PATH || './data/lancedb';
  const embedService = new EmbeddingService();
  const memberDb = new MemberDatabase(dbPath, embedService);
  
  try {
    await memberDb.initialize();
    console.log('✅ Member database initialized successfully');
    console.log(`📁 Database path: ${dbPath}`);
    console.log('📋 Tables created: members, sheets, conflicts');
  } catch (error) {
    console.error('❌ Failed to initialize member database:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  initializeMemberDatabase();
}