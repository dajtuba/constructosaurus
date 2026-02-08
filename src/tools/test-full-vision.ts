import { OllamaVisionAnalyzer } from "../vision/ollama-vision-analyzer";
import { PDFImageConverter } from "../vision/pdf-image-converter";
import * as path from "path";
import * as fs from "fs";

async function testFullDocument() {
  console.log("🧪 Full 40-Page Vision Analysis Test\n");
  console.log("Document: Construction Shell Set (40 pages)");
  console.log("Model: llava:13b (FREE, LOCAL)");
  console.log("=".repeat(65));
  console.log("");

  const analyzer = new OllamaVisionAnalyzer();
  const converter = new PDFImageConverter();

  const pdfPath = path.join(__dirname, "../../source/Sitka Construction Shell Set.pdf");
  const imageDir = path.join(__dirname, "../../data/test-full-vision");

  if (!fs.existsSync(imageDir)) {
    fs.mkdirSync(imageDir, { recursive: true });
  }

  const totalPages = 40;
  const results = {
    schedules: [] as any[],
    dimensions: [] as any[],
    itemCounts: [] as any[],
    pageStats: [] as any[]
  };

  console.log(`📄 Processing ${totalPages} pages...\n`);
  const startTime = Date.now();

  for (let page = 1; page <= totalPages; page++) {
    const pageStart = Date.now();
    
    try {
      const imagePath = await converter.convertPageToImage(pdfPath, page, imageDir);
      const result = await analyzer.analyzeDrawingPage(imagePath, page);
      
      results.schedules.push(...result.schedules);
      results.dimensions.push(...result.dimensions);
      results.itemCounts.push(...result.itemCounts);
      
      const duration = ((Date.now() - pageStart) / 1000).toFixed(1);
      const found = result.schedules.length + result.dimensions.length + result.itemCounts.length;
      
      results.pageStats.push({
        page,
        duration: parseFloat(duration),
        schedules: result.schedules.length,
        dimensions: result.dimensions.length,
        itemCounts: result.itemCounts.length,
        total: found
      });
      
      const status = found > 0 ? `✓ ${found} items` : '○ empty';
      console.log(`Page ${page.toString().padStart(2)}/40: ${duration}s - ${status}`);
      
    } catch (error) {
      console.log(`Page ${page.toString().padStart(2)}/40: ERROR - ${error}`);
    }
  }

  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
  const avgPerPage = (parseFloat(totalDuration) / totalPages).toFixed(1);

  console.log("\n" + "=".repeat(65));
  console.log("📊 RESULTS SUMMARY");
  console.log("=".repeat(65));
  console.log(`Total time: ${totalDuration}s (${avgPerPage}s per page)`);
  console.log(`Schedules found: ${results.schedules.length}`);
  console.log(`Dimensions found: ${results.dimensions.length}`);
  console.log(`Item counts found: ${results.itemCounts.length}`);
  console.log(`Total extractions: ${results.schedules.length + results.dimensions.length + results.itemCounts.length}`);
  console.log("");

  // Pages with most data
  const topPages = results.pageStats
    .filter(p => p.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  if (topPages.length > 0) {
    console.log("📋 Top 5 Pages by Data:");
    topPages.forEach(p => {
      console.log(`  Page ${p.page}: ${p.total} items (${p.schedules}s, ${p.dimensions}d, ${p.itemCounts}c)`);
    });
    console.log("");
  }

  // Schedule types
  const scheduleTypes = new Map<string, number>();
  results.schedules.forEach(s => {
    scheduleTypes.set(s.scheduleType, (scheduleTypes.get(s.scheduleType) || 0) + 1);
  });

  if (scheduleTypes.size > 0) {
    console.log("📑 Schedule Types:");
    Array.from(scheduleTypes.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });
    console.log("");
  }

  // Sample extractions
  if (results.schedules.length > 0) {
    console.log("📋 Sample Schedule:");
    const sample = results.schedules[0];
    console.log(`  Type: ${sample.scheduleType}`);
    console.log(`  Page: ${sample.pageNumber}`);
    if (sample.entries.length > 0) {
      console.log(`  Entry:`, JSON.stringify(sample.entries[0], null, 2));
    }
    console.log("");
  }

  if (results.dimensions.length > 0) {
    console.log("📏 Sample Dimensions:");
    results.dimensions.slice(0, 3).forEach(d => {
      console.log(`  ${d.location}: ${d.value}`);
    });
    console.log("");
  }

  if (results.itemCounts.length > 0) {
    console.log("🔢 Sample Item Counts:");
    results.itemCounts.slice(0, 3).forEach(c => {
      console.log(`  ${c.item} (${c.mark}): ${c.count}`);
    });
    console.log("");
  }

  console.log("✅ VALIDATION:");
  console.log("=".repeat(65));
  console.log(`✓ Processed ${totalPages} pages`);
  console.log(`✓ Average ${avgPerPage}s per page`);
  console.log(`✓ Total cost: $0 (FREE)`);
  console.log(`✓ ${results.schedules.length + results.dimensions.length + results.itemCounts.length} total extractions`);
  console.log("");
  console.log("🎉 Full document vision analysis complete!");
}

testFullDocument().catch(console.error);
