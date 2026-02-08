import { MaterialsExtractor } from "../extraction/materials-extractor";

async function testMaterialsExtraction() {
  console.log("🧪 Testing Materials Extraction\n");

  const extractor = new MaterialsExtractor();

  // Sample construction text
  const sampleText = `
Foundation Requirements:
- 12 cubic yards of 4000 PSI concrete for footings
- 200 linear feet of #4 rebar at 12 inches on center
- 50 sheets of 3/4" CDX plywood for formwork
- 24 anchor bolts, 3/4" x 12" long

Framing Materials:
- 150 pieces of 2x4x8 SPF lumber for wall framing
- 75 pieces of 2x6x12 SPF lumber for floor joists
- 30 sheets of 1/2" OSB sheathing
`;

  // Test 1: Generate extraction prompt
  console.log("TEST 1: Generate Extraction Prompt");
  console.log("=".repeat(60));
  const prompt = extractor.extractMaterialsPrompt(sampleText, "Foundation and framing");
  console.log(prompt.substring(0, 300) + "...\n");

  // Test 2: Parse mock LLM response
  console.log("TEST 2: Parse Materials Response");
  console.log("=".repeat(60));
  
  const mockResponse = `[
    {
      "name": "Concrete 4000 PSI",
      "quantity": 12,
      "unit": "cubic yards",
      "specification": "4000 PSI",
      "location": "Footings",
      "category": "Concrete"
    },
    {
      "name": "#4 Rebar",
      "quantity": 200,
      "unit": "linear feet",
      "specification": "12 inches on center",
      "location": "Footings",
      "category": "Steel"
    },
    {
      "name": "CDX Plywood",
      "quantity": 50,
      "unit": "sheets",
      "specification": "3/4 inch",
      "location": "Formwork",
      "category": "Wood"
    },
    {
      "name": "2x4x8 SPF Lumber",
      "quantity": 150,
      "unit": "pieces",
      "specification": "SPF grade",
      "location": "Wall framing",
      "category": "Wood"
    }
  ]`;

  const materials = extractor.parseMaterialsResponse(mockResponse);
  console.log(`Parsed ${materials.length} materials:`);
  materials.forEach((m, idx) => {
    console.log(`  ${idx + 1}. ${m.name}: ${m.quantity} ${m.unit}`);
  });
  console.log();

  // Test 3: Aggregate materials
  console.log("TEST 3: Aggregate into Supply List");
  console.log("=".repeat(60));
  
  // Add duplicate materials to test aggregation
  const moreMaterials = [
    ...materials,
    {
      name: "Concrete 4000 PSI",
      quantity: 8,
      unit: "cubic yards",
      specification: "4000 PSI",
      location: "Slab",
      category: "Concrete",
    },
    {
      name: "#4 Rebar",
      quantity: 150,
      unit: "linear feet",
      specification: "12 inches on center",
      location: "Slab",
      category: "Steel",
    },
  ];

  const supplyList = extractor.aggregateMaterials(moreMaterials);
  console.log(`Aggregated into ${supplyList.length} supply items:`);
  supplyList.forEach((item, idx) => {
    console.log(`  ${idx + 1}. ${item.material}: ${item.totalQuantity} ${item.unit}`);
    console.log(`     Locations: ${item.locations.join(", ")}`);
  });
  console.log();

  // Test 4: Format supply list
  console.log("TEST 4: Format Supply List");
  console.log("=".repeat(60));
  const formatted = extractor.formatSupplyList(supplyList);
  console.log(formatted);

  console.log("✅ All tests complete!");
}

testMaterialsExtraction().catch(console.error);
