import { OllamaVisionAnalyzer } from './src/vision/ollama-vision-analyzer';
import { PDFImageConverter } from './src/vision/pdf-image-converter';
import * as fs from 'fs';

async function inspectPage(pageNum: number) {
  const visionAnalyzer = new OllamaVisionAnalyzer();
  const imageConverter = new PDFImageConverter();
  
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🔍 Inspecting Page ${pageNum}`);
  console.log('='.repeat(70));
  
  // Try to determine which PDF based on page content
  const pdfPath = process.argv[3] || './source/Structural-Calculations.pdf';
  console.log(`📄 Using PDF: ${pdfPath}`);
  const imageDir = './data/vision-temp';
  const imagePath = await imageConverter.convertPageToImage(pdfPath, pageNum, imageDir);
  
  console.log(`\n📸 Image saved to: ${imagePath}`);
  console.log(`   Open this file to see what the vision analyzer sees\n`);
  
  // Get raw vision response
  const result = await visionAnalyzer.analyzeDrawingPage(imagePath, pageNum, 'Structural');
  
  console.log(`📊 Vision Analysis Results:\n`);
  console.log(`Beams: ${result.beams?.length || 0}`);
  console.log(`Columns: ${result.columns?.length || 0}`);
  console.log(`Joists: ${result.joists?.length || 0}`);
  console.log(`Foundation: ${result.foundation?.length || 0}`);
  console.log(`Schedules: ${result.schedules?.length || 0}\n`);
  
  if (result.schedules && result.schedules.length > 0) {
    console.log(`📋 Schedule Details:\n`);
    result.schedules.forEach((schedule, idx) => {
      console.log(`Schedule ${idx + 1}:`);
      console.log(`  Type: ${schedule.scheduleType}`);
      console.log(`  Entries: ${schedule.entries.length}`);
      
      if (schedule.entries.length > 0) {
        console.log(`  Sample entry:`, JSON.stringify(schedule.entries[0], null, 2));
      } else {
        console.log(`  ⚠️  No entries extracted - likely failed to parse`);
      }
      console.log();
    });
  }
  
  // Save full result
  const outputPath = `page-${pageNum}-analysis.json`;
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log(`💾 Full analysis saved to: ${outputPath}`);
  console.log(`\n💡 Next: Open ${imagePath} to see what's on the page`);
}

const pageNum = parseInt(process.argv[2] || '3');
inspectPage(pageNum).catch(console.error);
