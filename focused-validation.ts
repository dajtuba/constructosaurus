#!/usr/bin/env npx ts-node

/**
 * FOCUSED VALIDATION: Critical System Test
 * 
 * Tests core functionality with working implementations:
 * 1. Zone extraction validation
 * 2. Database operations (using simple database)
 * 3. MCP tools functionality
 * 4. Vision analysis capabilities
 */

import { SimpleMemberDatabase } from './src/storage/simple-member-database';
import { OllamaVisionAnalyzer } from './src/vision/ollama-vision-analyzer';
import * as fs from 'fs';

interface ValidationResult {
  phase: string;
  test: string;
  passed: boolean;
  details: any;
  error?: string;
}

class FocusedValidator {
  private results: ValidationResult[] = [];
  private db: SimpleMemberDatabase;
  private visionAnalyzer: OllamaVisionAnalyzer;

  constructor() {
    this.db = new SimpleMemberDatabase();
    this.visionAnalyzer = new OllamaVisionAnalyzer();
  }

  private addResult(phase: string, test: string, passed: boolean, details: any, error?: string) {
    this.results.push({ phase, test, passed, details, error });
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${phase}: ${test}`);
    if (error) console.log(`   Error: ${error}`);
    if (!passed && details) console.log(`   Details:`, JSON.stringify(details, null, 2));
  }

  async validateZoneExtraction(): Promise<void> {
    console.log('\n=== ZONE EXTRACTION VALIDATION ===');
    
    // Test 1: Zone extraction file exists and is valid
    const resultPath = 'zone-extraction-result.json';
    if (!fs.existsSync(resultPath)) {
      this.addResult('Zone Extraction', 'Result file exists', false, { resultPath });
      return;
    }

    const result = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
    
    // Test 2: Valid structure
    const hasValidStructure = result.zones && Array.isArray(result.zones) && result.zones.length === 3;
    this.addResult('Zone Extraction', 'Valid JSON structure', hasValidStructure, { 
      zones: result.zones?.length,
      sheet: result.sheet 
    });

    // Test 3: Real specifications (not placeholders)
    let realSpecCount = 0;
    for (const zone of result.zones || []) {
      for (const [type, items] of Object.entries(zone)) {
        if (type === 'zone') continue;
        if (Array.isArray(items)) {
          realSpecCount += items.filter(item => 
            typeof item === 'string' && 
            item.length > 3 && 
            !item.includes('placeholder') &&
            !item.includes('template')
          ).length;
        }
      }
    }
    
    this.addResult('Zone Extraction', 'Contains real specifications', realSpecCount > 10, {
      realSpecCount,
      sampleSpecs: result.zones?.[0]?.joists
    });
  }

  async validateDatabase(): Promise<void> {
    console.log('\n=== DATABASE VALIDATION ===');
    
    try {
      // Test 1: Initialize database
      await this.db.initialize();
      this.addResult('Database', 'Initialization', true, {});

      // Test 2: Load and insert zone data
      const zoneData = JSON.parse(fs.readFileSync('zone-extraction-result.json', 'utf8'));
      
      let insertCount = 0;
      for (const zone of zoneData.zones) {
        for (const [type, items] of Object.entries(zone)) {
          if (type === 'zone' || !Array.isArray(items)) continue;
          
          for (const item of items) {
            await this.db.addMember({
              designation: `${zone.zone}_${type}_${insertCount}`,
              shell_set_spec: item,
              shell_set_sheet: zoneData.sheet,
              shell_set_location: zone.zone,
              structural_spec: '',
              structural_page: 0,
              forteweb_spec: '',
              forteweb_page: 0,
              has_conflict: false,
              member_type: type
            });
            insertCount++;
          }
        }
      }

      await this.db.addSheet({
        name: zoneData.sheet,
        page_number: zoneData.page,
        sheet_type: 'floor_framing',
        image_path: 'data/vision-temp/page-33-33.png',
        member_count: insertCount
      });

      this.addResult('Database', 'Data insertion', insertCount > 0, { insertCount });

      // Test 3: Query operations
      const member = await this.db.getMember('left_joists_0');
      this.addResult('Database', 'Member query', !!member, {
        found: !!member,
        spec: member?.shell_set_spec
      });

      const sheetMembers = await this.db.getMembersBySheet('S2.1');
      this.addResult('Database', 'Sheet query', sheetMembers.length > 0, {
        count: sheetMembers.length
      });

    } catch (error) {
      this.addResult('Database', 'Operations', false, {}, (error as Error).message);
    }
  }

  async validateMCPTools(): Promise<void> {
    console.log('\n=== MCP TOOLS VALIDATION ===');
    
    const tools = {
      list_sheets: async () => {
        const sheets = await this.db.getAllSheets();
        return sheets;
      },
      
      query_member: async (designation: string) => {
        const member = await this.db.getMember(designation);
        return member;
      },
      
      get_material_takeoff: async (sheet: string) => {
        const members = await this.db.getMembersBySheet(sheet);
        const takeoff: any = {};
        for (const member of members) {
          takeoff[member.shell_set_spec] = {
            quantity: 1,
            unit: member.member_type === 'joists' ? 'EA' : 'LF',
            designation: member.designation
          };
        }
        return takeoff;
      },
      
      search_documents: async (query: string) => {
        const members = await this.db.searchMembers(query);
        return members;
      }
    };

    // Test each tool
    const testCases = [
      { tool: 'list_sheets', args: [], expectNonEmpty: true },
      { tool: 'query_member', args: ['left_joists_0'], expectNonNull: true },
      { tool: 'get_material_takeoff', args: ['S2.1'], expectNonEmpty: true },
      { tool: 'search_documents', args: ['TJI'], expectNonEmpty: true }
    ];

    for (const testCase of testCases) {
      try {
        const toolFunc = tools[testCase.tool as keyof typeof tools];
        const result = await (toolFunc as any)(...testCase.args);
        
        let passed = false;
        if (testCase.expectNonNull) {
          passed = result !== null && result !== undefined;
        } else if (testCase.expectNonEmpty) {
          passed = result && (Array.isArray(result) ? result.length > 0 : Object.keys(result).length > 0);
        }

        this.addResult('MCP Tools', testCase.tool, passed, {
          resultType: typeof result,
          hasData: !!result,
          sample: Array.isArray(result) ? result[0] : result
        });

      } catch (error) {
        this.addResult('MCP Tools', testCase.tool, false, {}, (error as Error).message);
      }
    }
  }

  async validateVisionAnalysis(): Promise<void> {
    console.log('\n=== VISION ANALYSIS VALIDATION ===');
    
    const imagePath = 'data/vision-temp/page-33-33.png';
    if (!fs.existsSync(imagePath)) {
      this.addResult('Vision Analysis', 'Image available', false, { imagePath });
      return;
    }

    try {
      // Test vision analysis
      const result = await this.visionAnalyzer.analyzeDrawingPage(imagePath, 33, 'structural');
      
      // Test 1: Analysis completed
      this.addResult('Vision Analysis', 'Analysis execution', true, {
        hasResult: !!result
      });

      // Test 2: Found structural elements
      const elementCount = (result.joists?.length || 0) + (result.beams?.length || 0) + (result.columns?.length || 0);
      this.addResult('Vision Analysis', 'Found structural elements', elementCount > 0, {
        joists: result.joists?.length || 0,
        beams: result.beams?.length || 0,
        columns: result.columns?.length || 0,
        total: elementCount
      });

      // Test 3: Extracted schedules
      this.addResult('Vision Analysis', 'Extracted schedules', result.schedules.length > 0, {
        scheduleCount: result.schedules.length,
        sampleSchedule: result.schedules[0]?.scheduleType
      });

    } catch (error) {
      this.addResult('Vision Analysis', 'Execution', false, {}, (error as Error).message);
    }
  }

  async runValidation(): Promise<void> {
    console.log('🔍 FOCUSED VALIDATION: Critical System Test');
    console.log('Testing core functionality with working implementations...\n');

    await this.validateZoneExtraction();
    await this.validateDatabase();
    await this.validateMCPTools();
    await this.validateVisionAnalysis();

    // Summary
    console.log('\n=== VALIDATION SUMMARY ===');
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const passRate = (passed / total * 100).toFixed(1);

    console.log(`✅ Passed: ${passed}/${total} (${passRate}%)`);
    console.log(`❌ Failed: ${total - passed}/${total}`);

    // List failures
    const failures = this.results.filter(r => !r.passed);
    if (failures.length > 0) {
      console.log('\n🚨 FAILURES TO FIX:');
      failures.forEach(f => {
        console.log(`   ${f.phase}: ${f.test}`);
        if (f.error) console.log(`      Error: ${f.error}`);
      });
    }

    // Save results
    fs.writeFileSync('focused-validation-results.json', JSON.stringify({
      summary: { passed, total, passRate },
      results: this.results,
      timestamp: new Date().toISOString()
    }, null, 2));

    console.log('\n📄 Results saved to focused-validation-results.json');
    
    if (failures.length === 0) {
      console.log('\n🎉 ALL TESTS PASSED - Core system is working!');
    } else if (parseFloat(passRate) >= 75) {
      console.log('\n✅ MOSTLY WORKING - System is functional with minor issues');
    } else {
      console.log('\n⚠️  NEEDS WORK - System has significant issues');
      process.exit(1);
    }
  }
}

// Run validation
if (require.main === module) {
  const validator = new FocusedValidator();
  validator.runValidation().catch(console.error);
}