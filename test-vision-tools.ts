#!/usr/bin/env tsx

import { VisionMCPTools } from "./src/mcp/vision-tools";

async function testVisionTools() {
  console.log("🔍 Testing Vision MCP Tools...\n");
  
  const visionTools = new VisionMCPTools("/tmp", "glm-ocr");
  
  // Test 1: Analyze zone
  console.log("Test 1: Analyze Zone");
  const zoneResult = await visionTools.analyzeZone("S2.1", "left", "Find joist specifications");
  console.log("Result:", JSON.stringify(zoneResult, null, 2));
  console.log();
  
  // Test 2: Analyze full drawing
  console.log("Test 2: Analyze Drawing");
  const drawingResult = await visionTools.analyzeDrawing("S2.1", "Extract all structural members");
  console.log("Result:", JSON.stringify(drawingResult, null, 2));
  console.log();
  
  // Test 3: Extract callout
  console.log("Test 3: Extract Callout");
  const calloutResult = await visionTools.extractCallout("S2.1", "left bay");
  console.log("Result:", JSON.stringify(calloutResult, null, 2));
  console.log();
  
  // Test 4: Verify spec
  console.log("Test 4: Verify Spec");
  const verifyResult = await visionTools.verifySpec("S2.1", "left bay", "14\" TJI 560 @ 16\" OC");
  console.log("Result:", JSON.stringify(verifyResult, null, 2));
  console.log();
  
  console.log("✅ Vision tools test complete!");
}

testVisionTools().catch(console.error);