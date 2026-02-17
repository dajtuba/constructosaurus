import { HybridSearchEngine } from "./src/search/hybrid-search-engine";
import { EmbeddingService } from "./src/embeddings/embedding-service";

async function test() {
  const embedService = new EmbeddingService();
  const searchEngine = new HybridSearchEngine("./data/lancedb", embedService);
  await searchEngine.initialize();
  
  console.log("=== Searching for floor sheathing materials ===\n");
  const results = await searchEngine.search({
    query: "floor sheathing materials warmboard",
    top_k: 3
  });
  
  for (const result of results) {
    console.log(`\n📄 ${result.drawingNumber} (${result.discipline})`);
    console.log(`Score: ${result.score.toFixed(3)}`);
    
    if (result.dimensions && result.dimensions.length > 0) {
      console.log(`\n📏 Dimensions found: ${result.dimensions.length}`);
      result.dimensions.slice(0, 5).forEach(d => {
        console.log(`  ${d.original} = ${d.feet}'-${d.inches}"`);
      });
    }
    
    if (result.calculatedAreas && result.calculatedAreas.length > 0) {
      console.log(`\n📐 Areas calculated: ${result.calculatedAreas.length}`);
      result.calculatedAreas.slice(0, 3).forEach(a => {
        console.log(`  ${a.length.original} × ${a.width.original} = ${a.squareFeet} sq ft`);
      });
    }
    
    console.log(`\n📝 Text preview:`);
    console.log(result.text.substring(0, 200) + "...");
  }
}

test().catch(console.error);
