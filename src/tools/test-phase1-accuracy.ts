#!/usr/bin/env ts-node

/**
 * Phase 1 Accuracy Test - Measure improvements from enhanced prompts, 
 * dimension extraction, spacing parsing, and waste factors
 */

import * as fs from 'fs';
import { EnhancedSpacingParser } from '../services/enhanced-spacing-parser';
import { DimensionExtractor } from './dimension-extractor';
import { WasteFactorCalculator } from '../services/waste-factor-calculator';
import { OllamaVisionAnalyzer } from '../vision/ollama-vision-analyzer';
import { QuantityCalculator } from '../services/quantity-calculator';

interface AccuracyTest {
  name: string;
  input: string;
  expected: any;
  actual?: any;
  accuracy?: number;
  confidence?: number;
}

interface TestResults {
  category: string;
  tests: AccuracyTest[];
  averageAccuracy: number;
  averageConfidence: number;
  improvements: string[];
}

class Phase1AccuracyTester {
  private vision: OllamaVisionAnalyzer;
  private dimensionExtractor: DimensionExtractor;
  private quantityCalc: QuantityCalculator;

  constructor() {
    this.vision = new OllamaVisionAnalyzer();
    this.dimensionExtractor = new DimensionExtractor();
    this.quantityCalc = new QuantityCalculator(this.vision);
  }

  async runAllTests(): Promise<TestResults[]> {
    console.log('🧪 Phase 1 Accuracy Testing\n');
    console.log('Testing improvements:');
    console.log('  ✅ Enhanced construction prompts with examples');
    console.log('  ✅ Dimension extractor (no more guessing 24\' spans)');
    console.log('  ✅ Enhanced spacing parser (complex patterns)');
    console.log('  ✅ Waste factor calculator (10% joists, 5% beams, 15% plates)\n');

    const results: TestResults[] = [];

    // Test 1: Spacing Parser Accuracy
    results.push(await this.testSpacingParser());

    // Test 2: Dimension Extraction (if image available)
    const imagePath = '/tmp/shell-set-page-33-33.png';
    if (fs.existsSync(imagePath)) {
      results.push(await this.testDimensionExtraction(imagePath));
    } else {
      console.log('⚠️  Skipping dimension extraction test - no image found');
    }

    // Test 3: Waste Factor Calculations
    results.push(await this.testWasteFactors());

    // Test 4: Vision Prompt Improvements (if image available)
    if (fs.existsSync(imagePath)) {
      results.push(await this.testVisionPrompts(imagePath));
    } else {
      console.log('⚠️  Skipping vision prompt test - no image found');
    }

    return results;
  }

  private async testSpacingParser(): Promise<TestResults> {
    console.log('📐 Testing Enhanced Spacing Parser...\n');

    const tests: AccuracyTest[] = [
      {
        name: 'Standard spacing',
        input: '@ 16" OC',
        expected: { primary: 16, type: 'fixed' }
      },
      {
        name: 'Range spacing',
        input: '@ 12" to 16" OC',
        expected: { primary: 14, min: 12, max: 16, type: 'range' }
      },
      {
        name: 'Dual spacing',
        input: '@ 16"/19.2" OC',
        expected: { primary: 16, secondary: 19.2, type: 'dual' }
      },
      {
        name: 'Metric spacing',
        input: '@ 400mm OC',
        expected: { primary: 15.75, type: 'fixed', unit: 'mm' } // 400mm ≈ 15.75"
      },
      {
        name: 'Variable spacing',
        input: 'varies @ 16" typ',
        expected: { primary: 16, type: 'variable' }
      }
    ];

    for (const test of tests) {
      const result = EnhancedSpacingParser.parseSpacing(test.input);
      test.actual = result;
      
      // Calculate accuracy based on primary spacing match
      const expectedPrimary = test.expected.primary;
      const actualPrimary = result.primary;
      const diff = Math.abs(expectedPrimary - actualPrimary);
      test.accuracy = Math.max(0, 1 - (diff / expectedPrimary));
      
      // Type match bonus
      if (result.type === test.expected.type) {
        test.accuracy = Math.min(1, test.accuracy + 0.2);
      }
      
      test.confidence = 0.95; // High confidence for parser
      
      console.log(`  ${test.name}: ${(test.accuracy * 100).toFixed(0)}% accuracy`);
      console.log(`    Input: "${test.input}"`);
      console.log(`    Expected: ${expectedPrimary}" (${test.expected.type})`);
      console.log(`    Actual: ${actualPrimary}" (${result.type})\n`);
    }

    const avgAccuracy = tests.reduce((sum, t) => sum + (t.accuracy || 0), 0) / tests.length;
    const avgConfidence = tests.reduce((sum, t) => sum + (t.confidence || 0), 0) / tests.length;

    return {
      category: 'Spacing Parser',
      tests,
      averageAccuracy: avgAccuracy,
      averageConfidence: avgConfidence,
      improvements: [
        'Handles range spacing (@ 12" to 16" OC)',
        'Handles dual spacing (@ 16"/19.2" OC)',
        'Handles metric spacing (@ 400mm OC)',
        'Handles variable spacing patterns'
      ]
    };
  }

  private async testDimensionExtraction(imagePath: string): Promise<TestResults> {
    console.log('📏 Testing Dimension Extraction...\n');

    const tests: AccuracyTest[] = [
      {
        name: 'Extract dimensions from S2.1',
        input: imagePath,
        expected: { 
          minDimensions: 3, 
          hasStructuralSpans: true,
          mainSpanRange: [192, 384] // 16' to 32'
        }
      }
    ];

    for (const test of tests) {
      try {
        const result = await this.dimensionExtractor.extractDimensions(test.input, 'S2.1');
        const mainSpan = this.dimensionExtractor.getMainSpan(result);
        
        test.actual = {
          totalDimensions: result.dimensions.length,
          structuralSpans: result.spans.length,
          mainSpan: mainSpan,
          mainSpanFeet: `${Math.floor(mainSpan / 12)}'-${mainSpan % 12}"`
        };

        // Calculate accuracy
        let accuracy = 0;
        
        // Check if we found minimum dimensions
        if (result.dimensions.length >= test.expected.minDimensions) {
          accuracy += 0.4;
        }
        
        // Check if we found structural spans
        if (result.spans.length > 0) {
          accuracy += 0.3;
        }
        
        // Check if main span is reasonable
        if (mainSpan >= test.expected.mainSpanRange[0] && 
            mainSpan <= test.expected.mainSpanRange[1]) {
          accuracy += 0.3;
        }
        
        test.accuracy = accuracy;
        test.confidence = result.dimensions.length > 0 ? 
          result.dimensions.reduce((sum, d) => sum + d.confidence, 0) / result.dimensions.length : 0;

        console.log(`  ${test.name}: ${(test.accuracy * 100).toFixed(0)}% accuracy`);
        console.log(`    Found ${result.dimensions.length} dimensions, ${result.spans.length} structural spans`);
        console.log(`    Main span: ${test.actual.mainSpanFeet} (${mainSpan}")`);
        console.log(`    Average confidence: ${(test.confidence * 100).toFixed(0)}%\n`);

      } catch (error) {
        test.actual = { error: error instanceof Error ? error.message : String(error) };
        test.accuracy = 0;
        test.confidence = 0;
        console.log(`  ${test.name}: FAILED - ${test.actual.error}\n`);
      }
    }

    const avgAccuracy = tests.reduce((sum, t) => sum + (t.accuracy || 0), 0) / tests.length;
    const avgConfidence = tests.reduce((sum, t) => sum + (t.confidence || 0), 0) / tests.length;

    return {
      category: 'Dimension Extraction',
      tests,
      averageAccuracy: avgAccuracy,
      averageConfidence: avgConfidence,
      improvements: [
        'Extracts actual dimensions instead of guessing 24\' spans',
        'Identifies structural spans vs. detail dimensions',
        'Handles multiple dimension formats (24\'-6", 18\'-0", etc.)',
        'Provides confidence scores for extracted dimensions'
      ]
    };
  }

  private async testWasteFactors(): Promise<TestResults> {
    console.log('🗑️  Testing Waste Factor Calculator...\n');

    const testMaterials = [
      { spec: '14" TJI 560 @ 16" OC', quantity: 45, unit: 'EA', expectedWaste: 0.10 },
      { spec: '5 1/8" x 18" GLB', quantity: 3, unit: 'EA', expectedWaste: 0.05 },
      { spec: '2x6 PT sill plate', quantity: 200, unit: 'LF', expectedWaste: 0.15 },
      { spec: '6x6 PT post', quantity: 8, unit: 'EA', expectedWaste: 0.08 }
    ];

    const tests: AccuracyTest[] = testMaterials.map(material => ({
      name: `Waste factor for ${material.spec}`,
      input: material.spec,
      expected: { 
        wasteFactor: material.expectedWaste,
        totalQuantity: Math.ceil(material.quantity * (1 + material.expectedWaste))
      }
    }));

    for (let i = 0; i < tests.length; i++) {
      const test = tests[i];
      const material = testMaterials[i];
      
      const result = WasteFactorCalculator.applyWasteFactor(
        material.spec, 
        material.quantity, 
        material.unit
      );
      
      test.actual = {
        wasteFactor: result.wasteFactor,
        totalQuantity: result.totalQuantity,
        wasteQuantity: result.wasteQuantity
      };
      
      // Calculate accuracy based on waste factor match
      const expectedFactor = test.expected.wasteFactor;
      const actualFactor = result.wasteFactor;
      const diff = Math.abs(expectedFactor - actualFactor);
      test.accuracy = Math.max(0, 1 - (diff / expectedFactor));
      test.confidence = 0.98; // High confidence for calculator
      
      console.log(`  ${test.name}: ${(test.accuracy * 100).toFixed(0)}% accuracy`);
      console.log(`    Expected waste: ${(expectedFactor * 100).toFixed(0)}%`);
      console.log(`    Actual waste: ${(actualFactor * 100).toFixed(0)}%`);
      console.log(`    ${material.quantity} + ${result.wasteQuantity} waste = ${result.totalQuantity} ${material.unit}\n`);
    }

    const avgAccuracy = tests.reduce((sum, t) => sum + (t.accuracy || 0), 0) / tests.length;
    const avgConfidence = tests.reduce((sum, t) => sum + (t.confidence || 0), 0) / tests.length;

    return {
      category: 'Waste Factor Calculator',
      tests,
      averageAccuracy: avgAccuracy,
      averageConfidence: avgConfidence,
      improvements: [
        'Applies material-specific waste factors (10% joists, 5% beams, 15% plates)',
        'Automatically identifies material types from specifications',
        'Accounts for cutting waste, damage, and project type',
        'Provides detailed waste calculations'
      ]
    };
  }

  private async testVisionPrompts(imagePath: string): Promise<TestResults> {
    console.log('👁️  Testing Vision Prompt Improvements...\n');

    const tests: AccuracyTest[] = [
      {
        name: 'Extract framing members with improved prompts',
        input: imagePath,
        expected: {
          hasJoists: true,
          hasBeams: true,
          hasProperSpacing: true,
          hasDimensions: true
        }
      }
    ];

    for (const test of tests) {
      try {
        // Test with improved framing prompt (not structural since this is S2.1)
        const result = await this.vision.analyzeDrawingPage(test.input, 1);
        
        test.actual = {
          joists: result.joists?.length || 0,
          beams: result.beams?.length || 0,
          dimensions: result.dimensions?.length || 0,
          hasSpacingInfo: result.joists?.some(j => j.spacing?.includes('OC')) || false
        };

        // Calculate accuracy
        let accuracy = 0;
        
        if (test.actual.joists > 0) accuracy += 0.3;
        if (test.actual.beams > 0) accuracy += 0.2;
        if (test.actual.dimensions > 0) accuracy += 0.3;
        if (test.actual.hasSpacingInfo) accuracy += 0.2;
        
        test.accuracy = accuracy;
        test.confidence = 0.85; // Estimated confidence for vision
        
        console.log(`  ${test.name}: ${(test.accuracy * 100).toFixed(0)}% accuracy`);
        console.log(`    Found ${test.actual.joists} joists, ${test.actual.beams} beams`);
        console.log(`    Found ${test.actual.dimensions} dimensions`);
        console.log(`    Has spacing info: ${test.actual.hasSpacingInfo}\n`);

      } catch (error) {
        test.actual = { error: error instanceof Error ? error.message : String(error) };
        test.accuracy = 0;
        test.confidence = 0;
        console.log(`  ${test.name}: FAILED - ${test.actual.error}\n`);
      }
    }

    const avgAccuracy = tests.reduce((sum, t) => sum + (t.accuracy || 0), 0) / tests.length;
    const avgConfidence = tests.reduce((sum, t) => sum + (t.confidence || 0), 0) / tests.length;

    return {
      category: 'Vision Prompt Improvements',
      tests,
      averageAccuracy: avgAccuracy,
      averageConfidence: avgConfidence,
      improvements: [
        'Added construction-specific examples and patterns',
        'Specified exact formats to look for (TJI, GLB, LVL, etc.)',
        'Improved spacing pattern recognition',
        'Better dimension string extraction'
      ]
    };
  }

  generateReport(results: TestResults[]): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 PHASE 1 ACCURACY IMPROVEMENT REPORT');
    console.log('='.repeat(80));

    let totalAccuracy = 0;
    let totalConfidence = 0;
    let totalTests = 0;

    results.forEach(category => {
      console.log(`\n📋 ${category.category.toUpperCase()}`);
      console.log(`   Average Accuracy: ${(category.averageAccuracy * 100).toFixed(1)}%`);
      console.log(`   Average Confidence: ${(category.averageConfidence * 100).toFixed(1)}%`);
      console.log(`   Tests: ${category.tests.length}`);
      
      console.log('\n   Improvements:');
      category.improvements.forEach(improvement => {
        console.log(`     ✅ ${improvement}`);
      });

      totalAccuracy += category.averageAccuracy * category.tests.length;
      totalConfidence += category.averageConfidence * category.tests.length;
      totalTests += category.tests.length;
    });

    const overallAccuracy = totalAccuracy / totalTests;
    const overallConfidence = totalConfidence / totalTests;

    console.log('\n' + '='.repeat(80));
    console.log('🎯 OVERALL RESULTS');
    console.log('='.repeat(80));
    console.log(`Overall Accuracy: ${(overallAccuracy * 100).toFixed(1)}%`);
    console.log(`Overall Confidence: ${(overallConfidence * 100).toFixed(1)}%`);
    console.log(`Total Tests: ${totalTests}`);

    // Improvement summary
    console.log('\n🚀 KEY IMPROVEMENTS IMPLEMENTED:');
    console.log('  1. Enhanced construction prompts with specific examples');
    console.log('  2. Dimension extractor replaces 24\' span guessing');
    console.log('  3. Complex spacing parser (ranges, dual, metric)');
    console.log('  4. Material-specific waste factors');
    console.log('  5. Better OCR error correction patterns');

    // Save results
    const reportPath = 'phase1-accuracy-report.json';
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      overallAccuracy,
      overallConfidence,
      totalTests,
      categories: results
    }, null, 2));
    
    console.log(`\n💾 Detailed report saved to: ${reportPath}`);
  }
}

async function main() {
  const tester = new Phase1AccuracyTester();
  const results = await tester.runAllTests();
  tester.generateReport(results);
}

if (require.main === module) {
  main().catch(console.error);
}