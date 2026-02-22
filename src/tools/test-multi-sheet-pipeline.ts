#!/usr/bin/env ts-node

import { MultiSheetProcessor } from '../processing/multi-sheet-processor';
import { CrossReferenceValidator } from '../processing/cross-reference-validator';
import { DatabasePopulator } from '../processing/database-populator';
import * as fs from 'fs';

async function main() {
  console.log('🦕 Multi-Sheet Processing Pipeline (Simplified Test)');
  console.log('='.repeat(60));

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

    // Step 4: Save results
    console.log('\n💾 Step 4: Saving results...');
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
    console.log('='.repeat(60));
    console.log(`✅ All ${results.length} sheets processed successfully`);
    console.log(`✅ All ${crossRefs.length} cross-references validated`);
    console.log('✅ Database populated with complete project data');

    // Show summary of extracted data
    console.log('\n📊 EXTRACTION SUMMARY:');
    for (const result of results) {
      console.log(`\n${result.sheet} (${result.type}):`);
      if (result.data.zones) {
        for (const zone of result.data.zones) {
          const memberCount = (zone.joists?.length || 0) + (zone.beams?.length || 0) + 
                            (zone.plates?.length || 0) + (zone.columns?.length || 0);
          console.log(`  - ${zone.zone} zone: ${memberCount} members`);
        }
      }
      if (result.data.details) {
        console.log(`  - ${result.data.details.length} details`);
      }
      if (result.data.beam_schedule) {
        console.log(`  - ${result.data.beam_schedule.length} beam schedule entries`);
      }
    }

  } catch (error) {
    console.error('\n💥 PIPELINE FAILED:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { main as runMultiSheetPipeline };