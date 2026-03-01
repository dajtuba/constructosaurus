import { OllamaVisionAnalyzer } from "../vision/ollama-vision-analyzer";
import { PDFImageConverter } from "../vision/pdf-image-converter";
import * as path from "path";
import * as fs from "fs";

async function testSinglePage() {
  const pdfPath = process.argv[2];
  const pageNum = parseInt(process.argv[3]);

  if (!pdfPath || !pageNum) {
    console.error("Usage: npm run test-page <pdf-path> <page-number>");
    console.error("Example: npm run test-page source/my-doc.pdf 17");
    process.exit(1);
  }

  if (!fs.existsSync(pdfPath)) {
    console.error(`❌ PDF not found: ${pdfPath}`);
    process.exit(1);
  }

  console.log(`\n🧪 Testing page ${pageNum} from ${path.basename(pdfPath)}\n`);

  const imageDir = path.join(path.dirname(pdfPath), '../data/vision-temp');
  const imageConverter = new PDFImageConverter();
  const visionAnalyzer = new OllamaVisionAnalyzer("http://localhost:11434", "glm-ocr");

  try {
    console.log("📸 Converting page to image...");
    const imagePath = await imageConverter.convertPageToImage(pdfPath, pageNum, imageDir);
    console.log(`✅ Image saved: ${imagePath}\n`);

    console.log("👁️  Analyzing with Ollama vision...");
    const result = await visionAnalyzer.analyzeDrawingPage(imagePath, pageNum, 'Structural');

    console.log("\n✅ Analysis complete!\n");
    console.log("Results:");
    console.log(JSON.stringify(result, null, 2));

  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`);
    if (error.stack) {
      console.error("\nStack trace:");
      console.error(error.stack);
    }
    process.exit(1);
  }
}

testSinglePage();
