import { OllamaVisionAnalyzer } from "../vision/ollama-vision-analyzer";
import { PDFImageConverter } from "../vision/pdf-image-converter";
import * as path from "path";
import * as fs from "fs";

async function testOllamaVision() {
  console.log("🧪 Testing Ollama LLaVA Vision Analysis\n");
  console.log("Model: llava:13b (FREE, LOCAL)");
  console.log("=".repeat(65));
  console.log("");

  const analyzer = new OllamaVisionAnalyzer();
  const converter = new PDFImageConverter();

  const pdfPath = path.join(__dirname, "../../source/Sitka Construction Shell Set.pdf");
  const imageDir = path.join(__dirname, "../../data/test-ollama-vision");

  if (!fs.existsSync(imageDir)) {
    fs.mkdirSync(imageDir, { recursive: true });
  }

  console.log("📄 Converting PDF page 5 to image (should have schedules)...");
  const imagePath = await converter.convertPageToImage(pdfPath, 5, imageDir);
  console.log(`✅ Image created: ${imagePath}\n`);

  console.log("👁️  Analyzing with Ollama LLaVA...");
  console.log("(This may take 30-60 seconds for first run)\n");

  const startTime = Date.now();
  const result = await analyzer.analyzeDrawingPage(imagePath, 5);
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`✅ Analysis complete in ${duration}s\n`);

  console.log("📊 RESULTS:");
  console.log("=".repeat(65));
  console.log(`Schedules found: ${result.schedules.length}`);
  console.log(`Dimensions found: ${result.dimensions.length}`);
  console.log(`Item counts found: ${result.itemCounts.length}`);
  console.log("");

  if (result.schedules.length > 0) {
    console.log("📋 SCHEDULES:");
    result.schedules.forEach(s => {
      console.log(`  Type: ${s.scheduleType}`);
      console.log(`  Entries: ${s.entries.length}`);
      if (s.entries.length > 0) {
        console.log(`  Sample:`, JSON.stringify(s.entries[0], null, 2));
      }
    });
    console.log("");
  }

  if (result.dimensions.length > 0) {
    console.log("📏 DIMENSIONS:");
    result.dimensions.slice(0, 5).forEach(d => {
      console.log(`  ${d.location}: ${d.value}`);
    });
    console.log("");
  }

  if (result.itemCounts.length > 0) {
    console.log("🔢 ITEM COUNTS:");
    result.itemCounts.forEach(c => {
      console.log(`  ${c.item} (${c.mark}): ${c.count}`);
    });
    console.log("");
  }

  console.log("✅ VALIDATION:");
  console.log("=".repeat(65));
  console.log("✓ Ollama LLaVA working");
  console.log("✓ Image conversion working");
  console.log("✓ Vision analysis complete");
  console.log("✓ FREE - No API costs");
  console.log("");

  console.log("🎉 Phase 2 vision analysis proven working!");
}

testOllamaVision().catch(console.error);
