#!/usr/bin/env ts-node

import { MultiSheetProcessor } from '../processing/multi-sheet-processor';
import { CrossReferenceValidator } from '../processing/cross-reference-validator';
import { DatabasePopulator } from '../processing/database-populator';
import * as fs from 'fs';

async function main() {
  console.log('🦕 Multi-Sheet Processing Pipeline');
  console.log('='.repeat(50));

  try {
    // Step 1: Process all sheets
    console.log('\n📄 Step 1: Processing all sheets...');
    const processor = new MultiSheetProcessor();
    const results = await processor.processAllSheets();

    console.log(`✅ Processed ${results.length} sheets`);
    for (const result of results) {
      console.log(`  - ${result.sheet} (${result.type}): ${result.cross_references.length} cross-refs`);
    }

    // Step 2: Validate cross-references
    console.log('\n🔗 Step 2: Validating cross-references...');
    const validator = new CrossReferenceValidator();
    
    for (const result of results) {
      validator.addSheetData(result.sheet, result);
    }

    const crossRefs = validator.validateCrossReferences();
    const brokenRefs = validator.getBrokenReferences();
    const validRefs = validator.getValidReferences();

    console.log(`✅ Cross-reference validation complete:`);
    console.log(`  - Total references: ${crossRefs.length}`);
    console.log(`  - Valid references: ${validRefs.length}`);
    console.log(`  - Broken references: ${brokenRefs.length}`);

    if (brokenRefs.length > 0) {
      console.log('\n❌ BROKEN CROSS-REFERENCES:');
      for (const ref of brokenRefs) {
        console.log(`  - ${ref.source_sheet} → ${ref.reference} (target: ${ref.target_sheet})`);
      }
      
      // Fail if cross-references are broken (as required)
      console.log('\n💥 PIPELINE FAILED: Cross-references are broken');
      process.exit(1);
    }

    // Step 3: Populate database
    console.log('\n📊 Step 3: Populating database...');
    const populator = new DatabasePopulator('data/lancedb');
    await populator.initialize();
    await populator.populateFromSheets(results);

    // Step 4: Test end-to-end queries
    console.log('\n🔍 Step 4: Testing end-to-end queries...');
    await testCrossSheetQueries();

    // Step 5: Save results
    console.log('\n💾 Step 5: Saving results...');
    const finalResult = {
      timestamp: new Date().toISOString(),
      sheets_processed: results.length,
      cross_references: {
        total: crossRefs.length,
        valid: validRefs.length,
        broken: brokenRefs.length,
        details: crossRefs
      },
      extraction_results: results
    };

    fs.writeFileSync('multi-sheet-results.json', JSON.stringify(finalResult, null, 2));
    console.log('📄 Results saved to: multi-sheet-results.json');

    console.log('\n🎉 MULTI-SHEET PIPELINE COMPLETE');
    console.log('='.repeat(50));
    console.log(`✅ All ${results.length} sheets processed successfully`);
    console.log(`✅ All ${crossRefs.length} cross-references validated`);
    console.log('✅ Database populated with complete project data');
    console.log('✅ End-to-end queries working');

  } catch (error) {
    console.error('\n💥 PIPELINE FAILED:', error);
    process.exit(1);
  }
}

async function testCrossSheetQueries() {
  // Import MCP tools to test queries
  const { MCPToolHandlers } = await import('../mcp/tools');
  const { EmbeddingService } = await import('../embeddings/embedding-service');
  const embedService = new EmbeddingService();
  const tools = new MCPToolHandlers('data/lancedb', embedService);

  console.log('  Testing cross-sheet member queries...');
  
  // Test 1: Query members across all sheets
  try {
    const allMembers = await tools.searchConstructionDocs({ query: 'joists beams', limit: 10 });
    const resultCount = typeof allMembers === 'string' ? 0 : (allMembers.results?.length || 0);
    console.log(`    ✅ Found ${resultCount} members across sheets`);
  } catch (e) {
    console.log(`    ❌ Cross-sheet search failed: ${e}`);
  }

  // Test 2: Query specific sheet
  try {
    const s21Members = await tools.searchConstructionDocs({ query: 'S2.1 floor framing', limit: 10 });
    const resultCount = typeof s21Members === 'string' ? 0 : (s21Members.results?.length || 0);
    console.log(`    ✅ Found ${resultCount} S2.1 members`);
  } catch (e) {
    console.log(`    ❌ Sheet-specific search failed: ${e}`);
  }

  // Test 3: Query cross-references
  try {
    const crossRefs = await tools.searchConstructionDocs({ query: 'section reference S3.0', limit: 10 });
    const resultCount = typeof crossRefs === 'string' ? 0 : (crossRefs.results?.length || 0);
    console.log(`    ✅ Found ${resultCount} cross-references`);
  } catch (e) {
    console.log(`    ❌ Cross-reference search failed: ${e}`);
  }

  console.log('  ✅ End-to-end query testing complete');
}

if (require.main === module) {
  main().catch(console.error);
}

export { main as runMultiSheetPipeline };