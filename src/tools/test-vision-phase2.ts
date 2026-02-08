import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
dotenv.config();

async function testVisionOnDrawing() {
  console.log("🧪 Phase 2 Test 1: Vision Analysis on Construction Drawing\n");
  
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("❌ ANTHROPIC_API_KEY not set");
    process.exit(1);
  }
  
  const client = new Anthropic({ apiKey });
  
  // Convert first page of construction drawings to image using pdftoppm
  const pdfPath = path.join(__dirname, "../../source/Sitka Construction Shell Set.pdf");
  const outputDir = path.join(__dirname, "../../data/test-vision");
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  console.log("📄 Converting PDF page 1 to image...");
  
  const outputPath = path.join(outputDir, "page-1");
  
  try {
    // Use pdftoppm (comes with poppler-utils on most systems)
    await execAsync(`pdftoppm -png -f 1 -l 1 -r 150 "${pdfPath}" "${outputPath}"`);
    console.log("✅ Image created\n");
  } catch (error) {
    console.error("❌ pdftoppm not available, trying sips (macOS)...");
    // Fallback: use sips on macOS to convert first page
    await execAsync(`sips -s format png "${pdfPath}" --out "${outputPath}-1.png" 2>/dev/null || echo "Using alternative method"`);
  }
  
  // Find the created image
  const files = fs.readdirSync(outputDir).filter(f => f.startsWith('page-1') && f.endsWith('.png'));
  
  if (files.length === 0) {
    console.error("❌ Could not create image. Install poppler-utils: brew install poppler");
    process.exit(1);
  }
  
  const imagePath = path.join(outputDir, files[0]);
  
  // Test 1: Ask Claude to identify what's on the page
  console.log("Test 1: General page analysis");
  console.log("=".repeat(65));
  
  const imageData = fs.readFileSync(imagePath);
  const base64Image = imageData.toString('base64');
  
  const response1 = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [{
      role: "user",
      content: [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: "image/png",
            data: base64Image
          }
        },
        {
          type: "text",
          text: "What type of construction document is this? List all schedules, tables, or data you can see on this page."
        }
      ]
    }]
  });
  
  console.log(response1.content[0].type === 'text' ? response1.content[0].text : '');
  console.log("");
  
  // Test 2: Ask specifically for schedules
  console.log("\nTest 2: Schedule extraction");
  console.log("=".repeat(65));
  
  const response2 = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [{
      role: "user",
      content: [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: "image/png",
            data: base64Image
          }
        },
        {
          type: "text",
          text: `Extract all schedules from this drawing. For each schedule found, provide:
1. Schedule type (door, window, room finish, etc.)
2. All entries with their data
3. Format as JSON

If you see tables with data, extract them completely.`
        }
      ]
    }]
  });
  
  console.log(response2.content[0].type === 'text' ? response2.content[0].text : '');
  
  console.log("\n✅ Vision API test complete!");
  console.log(`\nImage saved at: ${imagePath}`);
  console.log("Review the output to see what Claude can extract from the drawing.");
}

testVisionOnDrawing().catch(console.error);
