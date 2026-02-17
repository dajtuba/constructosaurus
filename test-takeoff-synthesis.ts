import { HybridSearchEngine } from "./src/search/hybrid-search-engine";
import { EmbeddingService } from "./src/embeddings/embedding-service";

async function test() {
  const embedService = new EmbeddingService();
  const searchEngine = new HybridSearchEngine("./data/lancedb", embedService);
  await searchEngine.initialize();
  
  console.log("=== QUERY: Floor sheathing materials ===\n");
  
  const results = await searchEngine.search({
    query: "floor sheathing materials warmboard",
    top_k: 5
  }, false);
  
  console.log("Raw search results:");
  results.forEach((r, i) => {
    console.log(`${i + 1}. ${r.drawingNumber} (${r.drawingType})`);
  });
  
  console.log("\n" + "=".repeat(60));
  console.log("SYNTHESIZED MATERIAL TAKEOFF");
  console.log("=".repeat(60) + "\n");
  
  const takeoff = searchEngine.synthesizeTakeoff(results);
  
  for (const item of takeoff) {
    console.log(`📦 ${item.material.toUpperCase()}`);
    
    if (item.specification) {
      console.log(`   Spec: ${item.specification}`);
    }
    
    if (item.area) {
      console.log(`   Area: ${item.area} ${item.unit}`);
    }
    
    if (item.dimensions && item.dimensions.length > 0) {
      console.log(`   Dimensions: ${item.dimensions.join(', ')}`);
    }
    
    if (item.installation) {
      console.log(`   Installation: ${item.installation}`);
    }
    
    console.log(`   Sources: ${item.sources.join(', ')}`);
    console.log();
  }
}

test().catch(console.error);
