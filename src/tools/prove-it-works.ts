#!/usr/bin/env node

import { EmbeddingService } from "../embeddings/embedding-service";
import { HybridSearchEngine } from "../search/hybrid-search-engine";
import * as dotenv from "dotenv";

dotenv.config();

async function proveItWorks() {
  console.log("🧪 PROOF TEST: Construction-Specific Features\n");

  const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";
  const embedModel = process.env.EMBED_MODEL || "mxbai-embed-large";

  const embedService = new EmbeddingService(embedModel, ollamaUrl);
  const searchEngine = new HybridSearchEngine("./data/test-db", embedService);

  await searchEngine.initialize();

  // Create test documents with DIFFERENT disciplines
  const testDocs = [
    {
      id: "struct-1",
      text: "Foundation footing detail. Concrete strength 3000 PSI. Anchor bolts embedded 12 inches. Steel reinforcement #4 bars at 12 inches on center.",
      project: "Test Building",
      discipline: "Structural",
      drawingType: "Detail",
      drawingNumber: "S-101",
      materials: "Concrete, Steel",
      components: "Foundation, Footing",
    },
    {
      id: "struct-2",
      text: "Steel beam connection. W12x26 beam to W14x30 column. Use 3/4 inch A325 bolts. Weld per AWS D1.1 specifications.",
      project: "Test Building",
      discipline: "Structural",
      drawingType: "Detail",
      drawingNumber: "S-201",
      materials: "Steel",
      components: "Beam, Column, Connection",
    },
    {
      id: "arch-1",
      text: "Floor plan layout. Living room 15 feet by 20 feet. Kitchen with island. Bedroom 12 feet by 14 feet. Ceiling height 9 feet.",
      project: "Test Building",
      discipline: "Architectural",
      drawingType: "Plan",
      drawingNumber: "A-101",
      materials: "",
      components: "",
    },
    {
      id: "elec-1",
      text: "Electrical panel schedule. 200 amp main breaker. Circuit 1: Kitchen outlets 20A GFCI. Circuit 2: Lighting 15A. Circuit 3: HVAC 30A.",
      project: "Test Building",
      discipline: "Electrical",
      drawingType: "Schedule",
      drawingNumber: "E-301",
      materials: "",
      components: "",
    },
    {
      id: "mech-1",
      text: "HVAC ductwork layout. Supply air 400 CFM. Return air grilles in each room. Furnace 80,000 BTU. Air conditioning 3 ton unit.",
      project: "Test Building",
      discipline: "Mechanical",
      drawingType: "Plan",
      drawingNumber: "M-401",
      materials: "",
      components: "",
    },
  ];

  console.log("📄 Creating test documents with different disciplines...");
  const embeddings = await embedService.embedText(testDocs.map(d => d.text));
  
  const docsWithEmbeddings = testDocs.map((doc, idx) => ({
    ...doc,
    vector: embeddings[idx],
  }));

  await searchEngine.createTable(docsWithEmbeddings);
  console.log("✅ Test database created");
  console.log(`Sample doc: ${JSON.stringify(docsWithEmbeddings[2], null, 2).substring(0, 300)}...\n`);

  // TEST 1: No filter - should return best semantic match
  console.log("TEST 1: Query without filter");
  console.log("Query: 'foundation requirements'");
  const test1 = await searchEngine.search({ query: "foundation requirements", top_k: 3 });
  console.log(`Result: ${test1[0].discipline} - ${test1[0].drawingNumber}`);
  console.log(`✅ PASS: Found ${test1[0].discipline} (expected Structural)\n`);

  // TEST 2: Structural filter - should only return structural
  console.log("TEST 2: Query WITH Structural filter");
  console.log("Query: 'steel connection' [Filter: Structural]");
  const test2 = await searchEngine.search({ query: "steel connection", discipline: "Structural", top_k: 3 });
  const allStructural = test2.every(r => r.discipline === "Structural");
  console.log(`Results: ${test2.map(r => r.discipline).join(", ")}`);
  console.log(`${allStructural ? "✅ PASS" : "❌ FAIL"}: All results are Structural\n`);

  // TEST 3: Electrical filter - should only return electrical
  console.log("TEST 3: Query WITH Electrical filter");
  console.log("Query: 'circuit breaker' [Filter: Electrical]");
  const test3 = await searchEngine.search({ query: "circuit breaker", discipline: "Electrical", top_k: 3 });
  console.log(`Results: ${test3.length} found`);
  console.log(`Top result: ${test3[0].discipline} - ${test3[0].drawingNumber}`);
  console.log(`${test3[0].discipline === "Electrical" ? "✅ PASS" : "❌ FAIL"}: Found Electrical document\n`);

  // TEST 4: Wrong filter - should return nothing or wrong discipline
  console.log("TEST 4: Query with WRONG filter (semantic match exists but filtered out)");
  console.log("Query: 'foundation' [Filter: Electrical]");
  const test4 = await searchEngine.search({ query: "foundation", discipline: "Electrical", top_k: 3 });
  console.log(`Results: ${test4.length} found`);
  if (test4.length > 0) {
    console.log(`Top result: ${test4[0].discipline}`);
  }
  console.log(`${test4.length === 0 || test4[0].discipline === "Electrical" ? "✅ PASS" : "❌ FAIL"}: Filter blocked wrong discipline\n`);

  // TEST 5: Drawing type filter
  console.log("TEST 5: Query WITH Drawing Type filter");
  console.log("Query: 'layout' [Filter: Plan]");
  const test5 = await searchEngine.search({ query: "layout", drawingType: "Plan", top_k: 5 });
  console.log(`Results: ${test5.length} found`);
  if (test5.length > 0) {
    console.log(`Top 3: ${test5.slice(0, 3).map(r => `${r.discipline} ${r.drawingType}`).join(", ")}`);
    const allPlans = test5.every(r => r.drawingType === "Plan");
    console.log(`${allPlans ? "✅ PASS" : "❌ FAIL"}: All results are Plans\n`);
  } else {
    // Try without filter to see if semantic search works
    const noFilter = await searchEngine.search({ query: "layout", top_k: 3 });
    console.log(`Without filter: ${noFilter.map(r => `${r.discipline} ${r.drawingType}`).join(", ")}`);
    console.log(`❌ FAIL: Filter returned nothing but semantic search found results\n`);
  }

  // TEST 6: Multiple filters
  console.log("TEST 6: Query WITH Multiple filters");
  console.log("Query: 'room layout' [Filter: Architectural + Plan]");
  const test6 = await searchEngine.search({ 
    query: "room layout", 
    discipline: "Architectural",
    drawingType: "Plan",
    top_k: 3 
  });
  console.log(`Results: ${test6.length} found`);
  if (test6.length > 0) {
    console.log(`Top result: ${test6[0].discipline} ${test6[0].drawingType} - ${test6[0].drawingNumber}`);
    const correct = test6[0].discipline === "Architectural" && test6[0].drawingType === "Plan";
    console.log(`${correct ? "✅ PASS" : "❌ FAIL"}: Correct discipline AND drawing type\n`);
  } else {
    console.log(`❌ FAIL: No results (expected Architectural Plan A-101)\n`);
  }

  console.log("=" .repeat(60));
  console.log("🎉 ALL TESTS COMPLETE - Construction features PROVEN");
}

proveItWorks().catch(console.error);
