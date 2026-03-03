import { ScheduleStore } from './src/storage/schedule-store';
import { OllamaVisionAnalyzer } from './src/vision/ollama-vision-analyzer';
import { PDFImageConverter } from './src/vision/pdf-image-converter';
import * as path from 'path';
import * as fs from 'fs';

async function analyzeUnknowns() {
  const scheduleStorePath = path.join('./data', 'schedules');
  const store = new ScheduleStore(scheduleStorePath);
  const visionAnalyzer = new OllamaVisionAnalyzer();
  const imageConverter = new PDFImageConverter();
  
  const allSchedules = store.getAllSchedules();
  const unknowns = allSchedules.filter(s => s.scheduleType === 'unknown');
  
  console.log(`📊 Found ${unknowns.length} unknown schedules\n`);
  
  // Group by page
  const pageMap = new Map<number, string[]>();
  unknowns.forEach(s => {
    if (!pageMap.has(s.pageNumber)) {
      pageMap.set(s.pageNumber, []);
    }
    pageMap.get(s.pageNumber)!.push(s.id);
  });
  
  console.log(`📄 Across ${pageMap.size} pages\n`);
  
  // Analyze first 5 pages
  const pagesToAnalyze = Array.from(pageMap.keys()).slice(0, 5);
  const results: any[] = [];
  
  for (const pageNum of pagesToAnalyze) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`🔍 Analyzing Page ${pageNum}`);
    console.log('='.repeat(70));
    
    try {
      const pdfPath = './source-single/Shell-Set.pdf';
      const imageDir = './data/vision-temp';
      const imagePath = await imageConverter.convertPageToImage(pdfPath, pageNum, imageDir);
      
      const result = await visionAnalyzer.analyzeDrawingPage(imagePath, pageNum, 'Structural');
      
      const beams = result.beams || [];
      const columns = result.columns || [];
      const joists = result.joists || [];
      const foundation = result.foundation || [];
      const schedules = result.schedules || [];
      
      const summary = {
        page: pageNum,
        beams: beams.length,
        columns: columns.length,
        joists: joists.length,
        foundation: foundation.length,
        schedules: schedules.length,
        scheduleTypes: schedules.map(s => s.scheduleType),
        classification: 'unknown'
      };
      
      // Classify what this page actually is
      if (schedules.length > 0) {
        summary.classification = 'has_schedules';
      } else if (beams.length > 0 || columns.length > 0 || joists.length > 0) {
        summary.classification = 'structural_callouts_only';
      } else if (foundation.length > 0) {
        summary.classification = 'foundation_details';
      } else {
        summary.classification = 'notes_or_legend';
      }
      
      console.log(`\n📋 Results:`);
      console.log(`  Beams: ${beams.length}`);
      console.log(`  Columns: ${columns.length}`);
      console.log(`  Joists: ${joists.length}`);
      console.log(`  Foundation: ${foundation.length}`);
      console.log(`  Schedules: ${schedules.length}`);
      
      if (schedules.length > 0) {
        console.log(`\n  📊 Schedule types:`);
        schedules.forEach(s => {
          console.log(`    - ${s.scheduleType}: ${s.entries.length} entries`);
        });
      }
      
      console.log(`\n  🏷️  Classification: ${summary.classification}`);
      
      results.push(summary);
      
    } catch (error: any) {
      console.error(`❌ Error analyzing page ${pageNum}:`, error.message);
    }
  }
  
  // Summary
  console.log(`\n${'='.repeat(70)}`);
  console.log('📊 SUMMARY');
  console.log('='.repeat(70));
  
  const classifications = results.reduce((acc, r) => {
    acc[r.classification] = (acc[r.classification] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log('\nPage classifications:');
  Object.entries(classifications).forEach(([type, count]) => {
    console.log(`  ${type}: ${count} pages`);
  });
  
  console.log('\n💡 Recommendations:');
  if (classifications.has_schedules) {
    console.log(`  ✅ ${classifications.has_schedules} pages have schedules - reprocess to extract them`);
  }
  if (classifications.structural_callouts_only) {
    console.log(`  ℹ️  ${classifications.structural_callouts_only} pages have callouts only - no schedules expected`);
  }
  if (classifications.notes_or_legend) {
    console.log(`  📝 ${classifications.notes_or_legend} pages are notes/legends - reclassify, don't reprocess`);
  }
  
  // Save results
  fs.writeFileSync('unknown-analysis-results.json', JSON.stringify(results, null, 2));
  console.log('\n💾 Saved detailed results to unknown-analysis-results.json');
}

analyzeUnknowns().catch(console.error);
