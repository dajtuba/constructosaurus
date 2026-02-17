import { EmbeddingService } from "./src/embeddings/embedding-service";
import { HybridSearchEngine } from "./src/search/hybrid-search-engine";

async function test() {
  const embedService = new EmbeddingService();
  const searchEngine = new HybridSearchEngine("./data/lancedb", embedService);
  
  await searchEngine.initialize();
  
  const results = await searchEngine.search({
    query: "door schedule",
    top_k: 3
  });
  
  console.log("Search results:", JSON.stringify(results, null, 2));
}

test().catch(console.error);
