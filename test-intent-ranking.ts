import { HybridSearchEngine } from "./src/search/hybrid-search-engine";
import { EmbeddingService } from "./src/embeddings/embedding-service";

async function test() {
  const embedService = new EmbeddingService();
  const searchEngine = new HybridSearchEngine("./data/lancedb", embedService);
  await searchEngine.initialize();
  
  const queries = [
    "floor sheathing materials",
    "warmboard specifications",
    "deck detail connections",
    "building dimensions"
  ];
  
  for (const query of queries) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Query: "${query}"`);
    console.log("=".repeat(60));
    
    const results = await searchEngine.search({ query, top_k: 3 }, false);
    
    results.forEach((r, i) => {
      console.log(`\n${i + 1}. ${r.drawingNumber} (${r.drawingType}) - Score: ${r.score.toFixed(2)}`);
      console.log(`   ${r.text.substring(0, 100)}...`);
    });
  }
}

test().catch(console.error);
