import { IntelligentDocumentProcessor } from "../processing/intelligent-processor";
import { EmbeddingService } from "../embeddings/embedding-service";
import { HybridSearchEngine } from "../search/hybrid-search-engine";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

async function processDocuments() {
  console.log("📚 Constructosaurus 2.0 - Document Processing\n");

  // Get source directory from args or use default
  const sourceDir = process.argv[2] || "./source";
  const dbPath = process.argv[3] || "./data/lancedb";
  const scheduleStorePath = path.join(path.dirname(dbPath), "schedules");

  if (!fs.existsSync(sourceDir)) {
    console.error(`❌ Source directory not found: ${sourceDir}`);
    console.error("Usage: npm run process [source-dir] [db-path]");
    process.exit(1);
  }

  console.log(`📁 Source directory: ${sourceDir}`);
  console.log(`💾 Database path: ${dbPath}`);
  console.log(`📋 Schedule store: ${scheduleStorePath}`);
  console.log(`👁️  Vision analysis: ENABLED (Ollama LLaVA - FREE)\n`);

  // Initialize services
  const embedService = new EmbeddingService();
  const processor = new IntelligentDocumentProcessor(
    embedService, 
    scheduleStorePath,
    { type: 'ollama', model: 'glm-ocr' } // Use free Ollama vision
  );
  const searchEngine = new HybridSearchEngine(dbPath, embedService);

  // Find all PDFs
  const files = fs.readdirSync(sourceDir)
    .filter(f => f.toLowerCase().endsWith(".pdf"))
    .map(f => path.join(sourceDir, f));

  if (files.length === 0) {
    console.error(`❌ No PDF files found in ${sourceDir}`);
    process.exit(1);
  }

  console.log(`Found ${files.length} PDF(s) to process:\n`);
  files.forEach((f, idx) => {
    console.log(`  ${idx + 1}. ${path.basename(f)}`);
  });
  console.log();

  // Initialize database first
  await searchEngine.initialize();
  
  // Process each PDF separately
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    console.log(`\n[${i + 1}/${files.length}] Processing: ${path.basename(file)}`);
    console.log("=".repeat(70));

    try {
      const result = await processor.processDocument(file, async (pageSheets) => {
        // Write each page to database immediately
        const sheetsForDb = pageSheets.map(sheet => ({
          id: sheet.id,
          text: sheet.text,
          project: sheet.metadata.project || "",
          discipline: sheet.metadata.discipline || "",
          drawingType: sheet.metadata.drawingType || "",
          drawingNumber: sheet.metadata.drawingNumber || "",
          sheetNumber: sheet.metadata.drawingNumber || "",
          pageNumber: sheet.pageNumber || 0,
          materials: sheet.metadata.materials || "",
          components: sheet.metadata.components || "",
          vector: sheet.vector,
        }));
        
        await searchEngine.addDocuments(sheetsForDb);
        console.log(`    💾 Wrote page ${pageSheets[0].pageNumber} (${sheetsForDb.length} chunks)`);
      });
      
      console.log(`✅ Processed: ${result.sheets.length} sheets, ${result.schedules.length} schedules`);
    } catch (error: any) {
      console.error(`❌ Error processing ${path.basename(file)}: ${error.message}`);
    }
  }

  // Final summary
  console.log("\n" + "=".repeat(70));
  console.log("💾 Database write complete\n");

  // Summary
  console.log("\n" + "=".repeat(70));
  console.log("📊 PROCESSING COMPLETE\n");
  console.log(`Total PDFs processed: ${files.length}`);
  console.log(`Total PDFs processed: ${files.length}`);
  console.log(`Database: ${dbPath}`);

  console.log("\n✅ Ready for Claude Desktop!");
  console.log("\nNext steps:");
  console.log("1. Restart Claude Desktop");
  console.log("2. Start asking questions about your documents");
}

processDocuments().catch(console.error);
