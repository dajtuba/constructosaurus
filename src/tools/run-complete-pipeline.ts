#!/usr/bin/env ts-node

/**
 * Complete Pipeline: Extract all sheets and populate database
 * Clears existing data to avoid conflicts
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const DB_PATH = path.join(process.cwd(), 'data/lancedb');

async function main() {
  console.log('🦕 Complete Pipeline: Extract & Populate Database\n');
  
  // Step 1: Clear existing database
  console.log('📦 Step 1: Clearing existing database...');
  if (fs.existsSync(DB_PATH)) {
    const tables = ['members.lance', 'sheets.lance', 'conflicts.lance'];
    for (const table of tables) {
      const tablePath = path.join(DB_PATH, table);
      if (fs.existsSync(tablePath)) {
        fs.rmSync(tablePath, { recursive: true, force: true });
        console.log(`  ✓ Removed ${table}`);
      }
    }
  }
  console.log('  ✓ Database cleared\n');
  
  // Step 2: Extract all sheets
  console.log('📄 Step 2: Extracting all sheets...');
  console.log('  → Running zone extraction for S2.1...');
  try {
    execSync('npm run zone-extractor', { stdio: 'inherit' });
    console.log('  ✓ S2.1 extracted\n');
  } catch (e) {
    console.error('  ✗ S2.1 extraction failed:', e);
  }
  
  // Step 3: Initialize database with extracted data
  console.log('💾 Step 3: Initializing database...');
  try {
    execSync('npm run init-member-db', { stdio: 'inherit' });
    console.log('  ✓ Database initialized\n');
  } catch (e) {
    console.error('  ✗ Database initialization failed:', e);
  }
  
  // Step 4: Verify database
  console.log('🔍 Step 4: Verifying database...');
  try {
    execSync('npm run test-member-db', { stdio: 'inherit' });
    console.log('  ✓ Database verified\n');
  } catch (e) {
    console.error('  ✗ Database verification failed:', e);
  }
  
  console.log('✅ Pipeline complete!');
  console.log('\nNext steps:');
  console.log('  1. Test MCP tools in Claude Desktop');
  console.log('  2. Query: "What\'s the spec for D1?"');
  console.log('  3. Query: "Give me material takeoff for S2.1"');
}

main().catch(console.error);
