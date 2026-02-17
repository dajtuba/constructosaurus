import { DimensionExtractor } from "./src/extraction/dimension-extractor";
import { HybridSearchEngine } from "./src/search/hybrid-search-engine";
import { EmbeddingService } from "./src/embeddings/embedding-service";

async function test() {
  const extractor = new DimensionExtractor();
  
  // Test with sample text
  const sampleText = `
    Building dimensions: 82'-0" × 25'-0"
    Living room: 15'-6" × 22'-6"
    Kitchen: 13'-0" × 11'-5"
    Deck: 12'-0" × 8'-6"
  `;
  
  console.log("=== Extracted Dimensions ===");
  const dims = extractor.extractDimensions(sampleText);
  console.log(dims);
  
  console.log("\n=== Calculated Areas ===");
  const areas = extractor.calculateAreas(sampleText);
  areas.forEach(area => {
    console.log(`${area.length.original} × ${area.width.original} = ${area.squareFeet} sq ft`);
  });
  
  console.log("\n=== Building Envelope ===");
  const building = extractor.findBuildingDimensions(sampleText);
  console.log(building);
  
  // Test with real search results
  console.log("\n=== Testing with Real Documents ===");
  const embedService = new EmbeddingService();
  const searchEngine = new HybridSearchEngine("./data/lancedb", embedService);
  await searchEngine.initialize();
  
  const results = await searchEngine.search({
    query: "floor plan dimensions",
    top_k: 3
  });
  
  for (const result of results) {
    console.log(`\n--- ${result.drawingNumber} ---`);
    const dims = extractor.extractDimensions(result.text);
    console.log(`Found ${dims.length} dimensions`);
    
    const areas = extractor.calculateAreas(result.text);
    if (areas.length > 0) {
      console.log(`Calculated ${areas.length} areas:`);
      areas.slice(0, 3).forEach(a => {
        console.log(`  ${a.length.original} × ${a.width.original} = ${a.squareFeet} sq ft`);
      });
    }
  }
}

test().catch(console.error);
