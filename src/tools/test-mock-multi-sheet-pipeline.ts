#!/usr/bin/env ts-node

import { CrossReferenceValidator } from '../processing/cross-reference-validator';
import { DatabasePopulator } from '../processing/database-populator';
import * as fs from 'fs';

// Mock data that simulates what the vision analysis would extract
const MOCK_EXTRACTION_RESULTS = [
  {
    sheet: 'S2.1',
    type: 'floor_framing',
    data: {
      zones: [
        {
          zone: 'left',
          joists: ['14" TJI 560 @ 16" OC', 'D1 @ 16" OC'],
          beams: ['5 1/8" x 18" GLB'],
          plates: ['2x14 PT'],
          columns: ['6x6 PT'],
          sections: ['3/S3.0', '4/S3.0']
        },
        {
          zone: 'center',
          joists: ['D2 @ 16" OC'],
          beams: ['3 1/2" x 14" LVL'],
          plates: ['2x12'],
          columns: [],
          sections: ['5/S3.0']
        },
        {
          zone: 'right',
          joists: ['11 7/8" TJI 360 @ 16" OC'],
          beams: [],
          plates: ['2x14 PT'],
          columns: ['4x4 PSL'],
          sections: []
        }
      ]
    },
    cross_references: ['3/S3.0', '4/S3.0', '5/S3.0']
  },
  {
    sheet: 'S2.2',
    type: 'roof_framing',
    data: {
      rafters: ['2x12 @ 16" OC', '2x10 @ 24" OC'],
      ridges: ['5 1/8" x 18" GLB'],
      hips: ['3 1/2" x 14" LVL'],
      ceiling_joists: ['2x8 @ 16" OC'],
      trusses: [],
      sections: ['6/S3.0']
    },
    cross_references: ['6/S3.0']
  },
  {
    sheet: 'S3.0',
    type: 'details',
    data: {
      details: [
        { number: '3', title: 'Beam Connection Detail', references: [] },
        { number: '4', title: 'Joist Hanger Detail', references: [] },
        { number: '5', title: 'Column Base Detail', references: [] },
        { number: '6', title: 'Ridge Beam Connection', references: [] },
        { number: '10', title: 'Footing Detail Per 10/S4.0', references: [] }
      ],
      sections: []
    },
    cross_references: ['10/S4.0']
  },
  {
    sheet: 'S4.0',
    type: 'schedules',
    data: {
      beam_schedule: [
        { mark: 'B1', size: '5 1/8" x 18" GLB', length: '24\'-6"' },
        { mark: 'B2', size: '3 1/2" x 14" LVL', length: '18\'-0"' }
      ],
      column_schedule: [
        { mark: 'C1', size: '6x6 PT', height: '8\'-0"' },
        { mark: 'C2', size: '4x4 PSL', height: '8\'-0"' }
      ],
      footing_schedule: [
        { mark: 'F1', size: '2\'-0" x 2\'-0" x 1\'-0"', concrete: '3000 PSI' }
      ],
      sections: []
    },
    cross_references: []
  }
];

async function main() {
  console.log('🦕 Multi-Sheet Processing Pipeline (Mock Test)');
  console.log('='.repeat(60));

  try {
    // Step 1: Use mock extraction results
    console.log('\n📄 Step 1: Using mock extraction results...');
    const results = MOCK_EXTRACTION_RESULTS;

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
      
      // For demo purposes, don't fail on broken refs
      console.log('\n⚠️  Note: Some cross-references are broken, but continuing for demo...');
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
    console.log(`✅ ${validRefs.length}/${crossRefs.length} cross-references validated`);
    console.log('✅ Database populated with complete project data');

    // Show summary of extracted data
    console.log('\n📊 EXTRACTION SUMMARY:');
    for (const result of results) {
      console.log(`\n${result.sheet} (${result.type}):`);
      if (result.data.zones) {
        for (const zone of result.data.zones) {
          const memberCount = (zone.joists?.length || 0) + (zone.beams?.length || 0) + 
                            (zone.plates?.length || 0) + (zone.columns?.length || 0);
          console.log(`  - ${zone.zone} zone: ${memberCount} members, ${zone.sections?.length || 0} section refs`);
        }
      }
      if (result.data.details) {
        console.log(`  - ${result.data.details.length} details`);
      }
      if (result.data.beam_schedule) {
        console.log(`  - ${result.data.beam_schedule.length} beam schedule entries`);
      }
      if (result.data.column_schedule) {
        console.log(`  - ${result.data.column_schedule.length} column schedule entries`);
      }
      if (result.data.footing_schedule) {
        console.log(`  - ${result.data.footing_schedule.length} footing schedule entries`);
      }
    }

    // Show cross-reference analysis
    console.log('\n🔗 CROSS-REFERENCE ANALYSIS:');
    console.log('Valid references:');
    for (const ref of validRefs) {
      console.log(`  ✅ ${ref.source_sheet} → ${ref.reference} → ${ref.target_sheet}`);
    }
    
    if (brokenRefs.length > 0) {
      console.log('Broken references:');
      for (const ref of brokenRefs) {
        console.log(`  ❌ ${ref.source_sheet} → ${ref.reference} (target not found: ${ref.target_sheet})`);
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

export { main as runMockMultiSheetPipeline };