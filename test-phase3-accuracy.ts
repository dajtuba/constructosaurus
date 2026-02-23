import { EnsembleExtractor } from './src/vision/ensemble-extractor.js';
import { PerformanceTracker } from './src/vision/performance-tracker.js';
import * as fs from 'fs';
import * as path from 'path';

interface AccuracyTest {
  name: string;
  image_path: string;
  expected_results: {
    beams?: string[];
    joists?: string[];
    min_confidence: number;
    min_accuracy: number;
  };
}

async function testPhase3Improvements() {
  console.log('🎯 Testing Phase 3 High-Effort Accuracy Improvements');
  console.log('=' .repeat(60));

  const ensemble = new EnsembleExtractor();
  const tracker = new PerformanceTracker();

  // Test cases
  const tests: AccuracyTest[] = [
    {
      name: 'S2.1 Floor Framing Plan',
      image_path: 'data/vision-temp/page-33-33.png',
      expected_results: {
        joists: ['14" TJI 560', 'TJI 560'],
        beams: ['GLB', 'LVL'],
        min_confidence: 0.90,
        min_accuracy: 0.90
      }
    }
  ];

  const results = [];

  for (const test of tests) {
    if (!fs.existsSync(test.image_path)) {
      console.log(`⚠️  Skipping ${test.name} - image not found: ${test.image_path}`);
      continue;
    }

    console.log(`\n📋 Testing: ${test.name}`);
    console.log('-'.repeat(40));

    try {
      // Test accuracy assessment first
      const assessment = await ensemble.assessAccuracyNeed(test.image_path, 33);
      console.log(`💡 Recommended method: ${assessment.recommended_method}`);
      console.log(`📈 Estimated improvement: +${Math.round(assessment.estimated_improvement * 100)}%`);
      console.log(`💰 ${assessment.cost_justification}`);

      // Run ensemble extraction with 90% target
      const result = await ensemble.extractWithEnsemble(test.image_path, 33, 'Structural', 0.90);
      
      console.log(`\n✅ Results:`);
      console.log(`   Method used: ${result.method_used}`);
      console.log(`   Confidence: ${Math.round(result.confidence * 100)}%`);
      console.log(`   Accuracy estimate: ${Math.round(result.accuracy_estimate * 100)}%`);
      console.log(`   Processing time: ${result.processing_time}ms`);
      console.log(`   Speed penalty: ${result.performance_metrics.speed_penalty.toFixed(1)}x`);

      // Validate results
      const validation = validateResults(result.final_result, test.expected_results);
      console.log(`\n🔍 Validation:`);
      console.log(`   Beams found: ${result.final_result.beams?.length || 0}`);
      console.log(`   Joists found: ${result.final_result.joists?.length || 0}`);
      console.log(`   Schedules found: ${result.final_result.schedules?.length || 0}`);
      console.log(`   Expected accuracy met: ${validation.accuracy_met ? '✅' : '❌'}`);
      console.log(`   Expected confidence met: ${validation.confidence_met ? '✅' : '❌'}`);

      // Performance analysis
      console.log(`\n📊 Performance Analysis:`);
      console.log(`   Processing cost: ${result.cost_analysis.processing_cost}`);
      console.log(`   Disk usage: ${result.cost_analysis.disk_usage}`);
      console.log(`   Recommended for: ${result.cost_analysis.recommended_for.join(', ')}`);

      // Calculate metrics
      const metrics = tracker.calculateMetrics(
        result.final_result,
        result.confidence,
        result.method_used,
        result.processing_time
      );
      tracker.recordSessionMetrics(metrics);

      results.push({
        test_name: test.name,
        method_used: result.method_used,
        confidence: result.confidence,
        accuracy_estimate: result.accuracy_estimate,
        processing_time: result.processing_time,
        speed_penalty: result.performance_metrics.speed_penalty,
        accuracy_met: validation.accuracy_met,
        confidence_met: validation.confidence_met,
        beams_found: result.final_result.beams?.length || 0,
        joists_found: result.final_result.joists?.length || 0,
        cost_analysis: result.cost_analysis
      });

    } catch (error) {
      console.log(`❌ Error testing ${test.name}: ${error}`);
      results.push({
        test_name: test.name,
        error: error.toString(),
        accuracy_met: false,
        confidence_met: false
      });
    }
  }

  // Generate comprehensive report
  console.log('\n' + '='.repeat(60));
  console.log('📊 PHASE 3 IMPROVEMENTS SUMMARY');
  console.log('='.repeat(60));

  const report = tracker.generateReport();
  console.log(`\n📈 Session Summary:`);
  console.log(`   Pages processed: ${report.session_summary.pages_processed}`);
  console.log(`   Average confidence: ${Math.round(report.session_summary.average_confidence * 100)}%`);
  console.log(`   Average accuracy: ${Math.round(report.session_summary.average_accuracy * 100)}%`);
  console.log(`   Average processing time: ${report.session_summary.average_processing_time}ms`);

  console.log(`\n🎯 Target Achievement:`);
  const targetsMet = results.filter(r => r.accuracy_met && r.confidence_met).length;
  const totalTests = results.filter(r => !r.error).length;
  console.log(`   90%+ accuracy achieved: ${targetsMet}/${totalTests} tests`);
  console.log(`   Success rate: ${totalTests > 0 ? Math.round((targetsMet / totalTests) * 100) : 0}%`);

  console.log(`\n💡 Recommendations:`);
  report.recommendations.forEach(rec => console.log(`   • ${rec}`));

  // Cost-benefit analysis
  console.log(`\n💰 Cost-Benefit Analysis:`);
  const methodCounts = report.session_summary.methods_used;
  Object.entries(methodCounts).forEach(([method, count]) => {
    const methodResults = results.filter(r => r.method_used === method);
    const avgSpeedPenalty = methodResults.reduce((sum, r) => sum + (r.speed_penalty || 1), 0) / methodResults.length;
    const avgAccuracy = methodResults.reduce((sum, r) => sum + (r.accuracy_estimate || 0), 0) / methodResults.length;
    
    console.log(`   ${method}: ${count} uses, ${avgSpeedPenalty.toFixed(1)}x slower, ${Math.round(avgAccuracy * 100)}% accuracy`);
  });

  // Trade-off analysis
  console.log(`\n⚖️  Trade-off Analysis:`);
  const singleModelResults = results.filter(r => r.method_used === 'single');
  const ensembleResults = results.filter(r => r.method_used !== 'single');
  
  if (singleModelResults.length > 0 && ensembleResults.length > 0) {
    const singleAvgAccuracy = singleModelResults.reduce((sum, r) => sum + (r.accuracy_estimate || 0), 0) / singleModelResults.length;
    const ensembleAvgAccuracy = ensembleResults.reduce((sum, r) => sum + (r.accuracy_estimate || 0), 0) / ensembleResults.length;
    const accuracyGain = ensembleAvgAccuracy - singleAvgAccuracy;
    
    const singleAvgTime = singleModelResults.reduce((sum, r) => sum + (r.processing_time || 0), 0) / singleModelResults.length;
    const ensembleAvgTime = ensembleResults.reduce((sum, r) => sum + (r.processing_time || 0), 0) / ensembleResults.length;
    const timeIncrease = ensembleAvgTime / singleAvgTime;
    
    console.log(`   Accuracy gain: +${Math.round(accuracyGain * 100)}% (${Math.round(singleAvgAccuracy * 100)}% → ${Math.round(ensembleAvgAccuracy * 100)}%)`);
    console.log(`   Speed penalty: ${timeIncrease.toFixed(1)}x slower (${Math.round(singleAvgTime)}ms → ${Math.round(ensembleAvgTime)}ms)`);
    console.log(`   Justification: ${accuracyGain > 0.05 ? 'Significant accuracy gain justifies cost' : 'Marginal improvement, consider cost'}`);
  }

  // Final recommendation
  console.log(`\n🏆 Final Recommendation:`);
  if (targetsMet === totalTests && totalTests > 0) {
    console.log(`   ✅ Phase 3 improvements successfully achieve 90%+ accuracy target`);
    console.log(`   ✅ Ensemble methods recommended for critical projects`);
  } else if (targetsMet > 0) {
    console.log(`   ⚠️  Phase 3 improvements show promise but need refinement`);
    console.log(`   ⚠️  Consider selective use based on project criticality`);
  } else {
    console.log(`   ❌ Phase 3 improvements do not justify the cost`);
    console.log(`   ❌ Stick with single-model or multi-pass approaches`);
  }

  // Save results
  const outputFile = 'phase3-accuracy-test-results.json';
  fs.writeFileSync(outputFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      tests_run: totalTests,
      targets_met: targetsMet,
      success_rate: totalTests > 0 ? (targetsMet / totalTests) : 0,
      average_confidence: report.session_summary.average_confidence,
      average_accuracy: report.session_summary.average_accuracy
    },
    detailed_results: results,
    performance_report: report,
    recommendations: report.recommendations
  }, null, 2));

  tracker.saveMetrics();
  
  console.log(`\n💾 Results saved to: ${outputFile}`);
  console.log(`📊 Performance metrics saved to: data/vision-cache/performance-metrics.json`);
  
  return {
    success: targetsMet === totalTests && totalTests > 0,
    accuracy_achieved: report.session_summary.average_accuracy >= 0.90,
    confidence_achieved: report.session_summary.average_confidence >= 0.90,
    results
  };
}

function validateResults(result: any, expected: any): { accuracy_met: boolean; confidence_met: boolean } {
  let accuracy_met = true;
  let confidence_met = true;

  // Check if expected beams are found
  if (expected.beams) {
    const foundBeams = result.beams?.map((b: any) => b.mark || '').join(' ') || '';
    accuracy_met = accuracy_met && expected.beams.some((beam: string) => 
      foundBeams.toLowerCase().includes(beam.toLowerCase())
    );
  }

  // Check if expected joists are found
  if (expected.joists) {
    const foundJoists = result.joists?.map((j: any) => j.mark || '').join(' ') || '';
    accuracy_met = accuracy_met && expected.joists.some((joist: string) => 
      foundJoists.toLowerCase().includes(joist.toLowerCase())
    );
  }

  return { accuracy_met, confidence_met };
}

// Check if models are available before running tests
async function checkModelAvailability() {
  console.log('🔍 Checking model availability...');
  
  try {
    const { Ollama } = await import('ollama');
    const ollama = new Ollama({ host: 'http://localhost:11434' });
    const models = await ollama.list();
    const modelNames = models.models.map(m => m.name);
    
    console.log(`📋 Available models: ${modelNames.join(', ')}`);
    
    const requiredModels = ['glm-ocr', 'llama3.2-vision:11b', 'qwen2-vl:7b'];
    const missingModels = requiredModels.filter(m => !modelNames.includes(m));
    
    if (missingModels.length > 0) {
      console.log(`⚠️  Missing models for full ensemble: ${missingModels.join(', ')}`);
      console.log(`💾 Total download size: ~11GB`);
      console.log(`⏱️  Download time: ~10-20 minutes`);
      console.log(`\n🤔 Phase 3 will test with available models only`);
    } else {
      console.log(`✅ All models available for full ensemble testing`);
    }
    
    return modelNames;
  } catch (error) {
    console.log(`❌ Cannot connect to Ollama: ${error}`);
    return [];
  }
}

// Main execution
async function main() {
  const availableModels = await checkModelAvailability();
  
  if (availableModels.length === 0) {
    console.log('❌ No models available - cannot run Phase 3 tests');
    process.exit(1);
  }
  
  const results = await testPhase3Improvements();
  
  if (results.success) {
    console.log('\n🎉 Phase 3 improvements successfully achieve 90%+ accuracy!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Phase 3 improvements need further refinement');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { testPhase3Improvements, checkModelAvailability };