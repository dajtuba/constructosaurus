#!/usr/bin/env node

import { EmbeddingService } from "../embeddings/embedding-service";
import { HybridSearchEngine } from "../search/hybrid-search-engine";
import { ConstructionDocumentProcessor } from "../processing/document-processor";
import * as dotenv from "dotenv";

dotenv.config();

async function demo() {
  console.log("🏗️  Constructosaurus 2.0 Demo\n");

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    console.error("❌ ANTHROPIC_API_KEY not set in .env file");
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

  // Demo: Create sample construction documents
  console.log("📄 Creating sample construction documents...");
  const sampleDocs = [
    {
      id: "doc-1",
      text: "Foundation detail showing anchor bolts embedded 12 inches into concrete footing. Concrete strength f'c = 3000 PSI. Steel grade A36.",
      vector: [] as number[],
    },
    {
      id: "doc-2",
      text: "Structural steel beam connection detail. W12x26 beam to W14x30 column. Use 3/4 inch A325 bolts. Weld per AWS D1.1.",
      vector: [] as number[],
    },
    {
      id: "doc-3",
      text: "Floor plan showing layout of residential units. Living room 15'x20', bedrooms 12'x14'. Ceiling height 9 feet.",
      vector: [] as number[],
    },
  ];

  // Embed documents
  console.log("🔢 Generating embeddings...");
  const texts = sampleDocs.map((d) => d.text);
  const embeddings = await embedService.embedText(texts);

  const docsWithEmbeddings = sampleDocs.map((doc, idx) => ({
    id: doc.id,
    text: doc.text,
    vector: embeddings[idx],
  }));

  await searchEngine.createTable(docsWithEmbeddings);
  console.log("✅ Documents indexed\n");

  // Demo: Search
  console.log("🔍 Testing search queries...\n");

  const queries = [
    "foundation details with anchor bolts",
    "steel beam connections",
    "residential floor plan",
  ];

  for (const query of queries) {
    console.log(`Query: "${query}"`);
    const results = await searchEngine.search({ query, top_k: 2 });

    results.forEach((result, idx) => {
      console.log(`  ${idx + 1}. [${result.id}] ${result.text.substring(0, 80)}...`);
      console.log(`     Score: ${result.score.toFixed(4)}`);
    });
    console.log();
  }

  console.log("✅ Demo complete!");
}

demo().catch(console.error);
