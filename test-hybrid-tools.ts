import { HybridMCPTools } from "./src/mcp/hybrid-tools";
import * as fs from "fs";

async function testHybridTools() {
  console.log("🧪 Testing Hybrid MCP Tools");
  
  const hybridTools = new HybridMCPTools("data/lancedb");

  // Test 1: Member verification
  console.log("\n1. Testing getMemberVerified...");
  try {
    const memberResult = await hybridTools.getMemberVerified("D1");
    console.log("✅ Member verification result:", {
      designation: memberResult.designation,
      verified: memberResult.verified,
      discrepancies: memberResult.discrepancies.length
    });
    
    // Should catch the known D1 conflict
    if (memberResult.db_data?.conflict) {
      console.log("✅ Correctly identified D1 conflict");
    } else {
      console.log("❌ Failed to identify D1 conflict");
    }
  } catch (error) {
    console.log("❌ Member verification failed:", error);
  }

  // Test 2: Inventory verification
  console.log("\n2. Testing getInventoryVerified...");
  try {
    const inventoryResult = await hybridTools.getInventoryVerified("S2.1");
    console.log("✅ Inventory verification result:", {
      total_items: inventoryResult.db_inventory.length,
      spot_checks: inventoryResult.spot_checks.length,
      confidence: inventoryResult.overall_confidence
    });
    
    // Should have reasonable confidence
    if (inventoryResult.overall_confidence > 0.5) {
      console.log("✅ Reasonable confidence level");
    } else {
      console.log("⚠️ Low confidence - may indicate issues");
    }
  } catch (error) {
    console.log("❌ Inventory verification failed:", error);
  }

  // Test 3: Conflict verification
  console.log("\n3. Testing findConflictsVerified...");
  try {
    const conflictResult = await hybridTools.findConflictsVerified();
    console.log("✅ Conflict verification result:", {
      db_conflicts: conflictResult.db_conflicts.length,
      verified_conflicts: conflictResult.verified_conflicts.length,
      false_positives: conflictResult.false_positives.length
    });
    
    // Should find at least the D1 conflict
    if (conflictResult.verified_conflicts.length > 0) {
      console.log("✅ Found verified conflicts");
      conflictResult.verified_conflicts.forEach(conflict => {
        console.log(`  - ${conflict.designation}: ${conflict.shell_set_spec} vs ${conflict.forteweb_spec}`);
      });
    } else {
      console.log("⚠️ No verified conflicts found");
    }
  } catch (error) {
    console.log("❌ Conflict verification failed:", error);
  }

  // Test 4: Caching
  console.log("\n4. Testing caching...");
  const start1 = Date.now();
  await hybridTools.getMemberVerified("D1");
  const time1 = Date.now() - start1;
  
  const start2 = Date.now();
  await hybridTools.getMemberVerified("D1"); // Should be cached
  const time2 = Date.now() - start2;
  
  console.log(`First call: ${time1}ms, Second call: ${time2}ms`);
  if (time2 < time1 * 0.5) {
    console.log("✅ Caching working - second call much faster");
  } else {
    console.log("⚠️ Caching may not be working effectively");
  }

  console.log("\n🎯 Hybrid tools test complete!");
}

// Run the test
testHybridTools().catch(console.error);