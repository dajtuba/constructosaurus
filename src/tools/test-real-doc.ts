#!/usr/bin/env node

import { EmbeddingService } from "../embeddings/embedding-service";
import { HybridSearchEngine } from "../search/hybrid-search-engine";
import { ConstructionDocumentProcessor } from "../processing/document-processor";
import { ProcessedDocument } from "../types";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config();

async function testRealDoc() {
  console.log("🏗️  Testing Real Construction Document\n");

  const pdfPath = path.join(__dirname, "../../source/Sitka Construction Shell Set.pdf");
  
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    console.error("❌ ANTHROPIC_API_KEY not set");
    process.exit(1);
  }

  const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";
  const embedModel = process.env.EMBED_MODEL || "mxbai-embed-large";

  console.log("✅ Initializing services...");
  const embedService = new EmbeddingService(embedModel, ollamaUrl);
  const searchEngine = new HybridSearchEngine("./data/lancedb", embedService);
  const docProcessor = new ConstructionDocumentProcessor(anthropicKey);

  await searchEngine.initialize();
  console.log("✅ Services initialized\n");

  // Process the PDF
  console.log("📄 Processing PDF...");
  const documents = await docProcessor.process(pdfPath);
  console.log(`✅ Extracted ${documents.length} document(s)\n`);

  // Show first 500 chars of extracted text
  console.log("📝 Sample text:");
  console.log(documents[0].text.substring(0, 500));
  console.log("...\n");

  // Split large text into chunks with metadata
  console.log("🔢 Generating embeddings...");
  
  const chunkSize = 500;
  const chunks: ProcessedDocument[] = [];
  
  documents.forEach((doc, docIdx) => {
    const text = doc.text;
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push({
        id: `${doc.id}-chunk-${Math.floor(i / chunkSize)}`,
        text: text.substring(i, i + chunkSize),
        project: doc.project,
        discipline: doc.discipline,
        drawingType: doc.drawingType,
        drawingNumber: doc.drawingNumber,
        materials: doc.materials,
        components: doc.components,
      });
    }
  });
  
  console.log(`  Split into ${chunks.length} chunks`);
  console.log(`  Detected discipline: ${documents[0].discipline}`);
  console.log(`  Detected drawing type: ${documents[0].drawingType}`);
  console.log(`  Materials found: ${documents[0].materials || "None"}`);
  console.log(`  Components found: ${documents[0].components || "None"}\n`);
  
  const embeddings = await embedService.embedText(chunks.map(c => c.text));

  const docsWithEmbeddings = chunks.map((chunk, idx) => ({
    ...chunk,
    vector: embeddings[idx],
  }));

  await searchEngine.createTable(docsWithEmbeddings);
  console.log("✅ Documents indexed\n");

  // Test queries
  console.log("🔍 Testing search queries...\n");

  const queries = [
    { q: "What are the foundation requirements?", discipline: "Structural" },
    { q: "What type of framing is specified?", discipline: undefined },
    { q: "What are the wall specifications?", discipline: "Structural" },
    { q: "electrical requirements", discipline: "Electrical" },
  ];

  for (const { q, discipline } of queries) {
    console.log(`Query: "${q}"${discipline ? ` [Filter: ${discipline}]` : ""}`);
    const results = await searchEngine.search({ query: q, discipline, top_k: 3 });

    results.forEach((result, idx) => {
      console.log(`  ${idx + 1}. [${result.discipline}${result.drawingNumber ? ` - ${result.drawingNumber}` : ""}] Score: ${result.score.toFixed(4)}`);
      console.log(`     ${result.text.substring(0, 120).replace(/\n/g, ' ')}...`);
    });
    console.log();
  }

  console.log("✅ Test complete!");
}

testRealDoc().catch(console.error);
