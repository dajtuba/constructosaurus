import { HybridSearchEngine } from "./src/search/hybrid-search-engine";
import { EmbeddingService } from "./src/embeddings/embedding-service";

async function test() {
  const embedService = new EmbeddingService();
  const searchEngine = new HybridSearchEngine("./data/lancedb", embedService);
  await searchEngine.initialize();
  
  console.log("=== Searching for decking materials ===\n");
  const results = await searchEngine.search({
    query: "WD-3 decking materials",
    top_k: 2
  });
  
  for (const result of results) {
    console.log(`\n📄 ${result.drawingNumber}`);
    
    if (result.crossReferences && result.crossReferences.length > 0) {
      console.log(`\n🔗 Cross-references found: ${result.crossReferences.length}`);
      
      for (const ref of result.crossReferences.slice(0, 3)) {
        console.log(`\n  Reference: ${ref.reference} (${ref.type})`);
        console.log(`  Context: "${ref.context.substring(0, 80)}..."`);
        
        if (ref.resolvedContent) {
          console.log(`  ✅ Resolved to: ${ref.resolvedContent.drawingNumber}`);
          console.log(`  Content: "${ref.resolvedContent.text.substring(0, 100)}..."`);
        }
      }
    }
    
    console.log(`\n📝 Text preview:`);
    console.log(result.text.substring(0, 150) + "...");
  }
}

test().catch(console.error);
