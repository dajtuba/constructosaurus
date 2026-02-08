import { OllamaVisionAnalyzer } from "../vision/ollama-vision-analyzer";
import * as path from "path";
import * as fs from "fs";

async function quickTest() {
  console.log("🧪 Quick Vision Test - 3 Sample Pages\n");
  
  const analyzer = new OllamaVisionAnalyzer();
  const imageDir = path.join(__dirname, "../../data/test-full-vision");
  
  // Test pages 5, 10, 15 (should have different content)
  const testPages = [5, 10, 15];
  
  for (const page of testPages) {
    const imagePath = path.join(imageDir, `page-${page}-${page.toString().padStart(2, '0')}.png`);
    
    if (!fs.existsSync(imagePath)) {
      console.log(`Page ${page}: Image not found, skipping\n`);
      continue;
    }
    
    console.log(`Page ${page}:`);
    const result = await analyzer.analyzeDrawingPage(imagePath, page);
    
    console.log(`  Schedules: ${result.schedules.length}`);
    console.log(`  Dimensions: ${result.dimensions.length}`);
    console.log(`  Item counts: ${result.itemCounts.length}`);
    
    if (result.schedules.length > 0) {
      console.log(`  Sample schedule: ${result.schedules[0].scheduleType}`);
    }
    if (result.dimensions.length > 0) {
      console.log(`  Sample dimension: ${result.dimensions[0].value}`);
    }
    if (result.itemCounts.length > 0) {
      console.log(`  Sample count: ${result.itemCounts[0].item} x${result.itemCounts[0].count}`);
    }
    console.log("");
  }
  
  console.log("✅ Quick test complete!");
}

quickTest().catch(console.error);
