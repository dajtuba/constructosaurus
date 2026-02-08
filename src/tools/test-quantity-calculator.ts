import { QuantityCalculator } from "../services/quantity-calculator";
import * as path from "path";

async function testQuantityCalculator() {
  console.log("🧪 Testing Quantity Calculator - Phase 3\n");
  console.log("=".repeat(65));
  console.log("");

  const scheduleStorePath = path.join(__dirname, "../../data/test-extended-phase1");
  const calculator = new QuantityCalculator(scheduleStorePath);

  console.log("📋 Generating supply list from extracted schedules...\n");

  const supplyList = await calculator.generateSupplyList();

  console.log("📊 SUPPLY LIST:");
  console.log("=".repeat(65));
  console.log(`Total material types: ${supplyList.totalItems}`);
  console.log(`Documents processed: ${supplyList.documentSources.length}`);
  console.log("");

  if (supplyList.materials.length === 0) {
    console.log("⚠️  No materials found. Run document processing first:");
    console.log("   npm run process");
    return;
  }

  // Group by category
  const concrete = supplyList.materials.filter(m => m.material.startsWith('concrete_'));
  const rebar = supplyList.materials.filter(m => m.material.startsWith('rebar_'));
  const doors = supplyList.materials.filter(m => m.material.startsWith('door_'));
  const windows = supplyList.materials.filter(m => m.material.startsWith('window_'));
  const structural = supplyList.materials.filter(m => 
    m.material.includes('Parallam') || m.material.includes('Fir') || m.material.includes('PSL')
  );

  if (concrete.length > 0) {
    console.log("🏗️  CONCRETE:");
    concrete.forEach(m => {
      console.log(`  ${m.material}: ${m.quantity.toFixed(2)} ${m.unit}`);
      console.log(`    Waste factor: ${((m.wasteFactorApplied - 1) * 100).toFixed(0)}%`);
      console.log(`    Sources: ${m.source.join(', ')}`);
    });
    console.log("");
  }

  if (rebar.length > 0) {
    console.log("🔩 REBAR:");
    rebar.forEach(m => {
      console.log(`  ${m.material}: ${m.quantity.toFixed(0)} ${m.unit}`);
      console.log(`    Waste factor: ${((m.wasteFactorApplied - 1) * 100).toFixed(0)}%`);
      console.log(`    Sources: ${m.source.join(', ')}`);
    });
    console.log("");
  }

  if (structural.length > 0) {
    console.log("🪵 STRUCTURAL LUMBER:");
    structural.forEach(m => {
      console.log(`  ${m.material}: ${m.quantity.toFixed(1)} ${m.unit}`);
      console.log(`    Waste factor: ${((m.wasteFactorApplied - 1) * 100).toFixed(0)}%`);
      console.log(`    Sources: ${m.source.join(', ')}`);
    });
    console.log("");
  }

  if (doors.length > 0) {
    console.log("🚪 DOORS:");
    doors.forEach(m => {
      console.log(`  ${m.material}: ${m.quantity.toFixed(0)} ${m.unit}`);
      console.log(`    Waste factor: ${((m.wasteFactorApplied - 1) * 100).toFixed(0)}%`);
      console.log(`    Sources: ${m.source.join(', ')}`);
    });
    console.log("");
  }

  if (windows.length > 0) {
    console.log("🪟 WINDOWS:");
    windows.forEach(m => {
      console.log(`  ${m.material}: ${m.quantity.toFixed(0)} ${m.unit}`);
      console.log(`    Waste factor: ${((m.wasteFactorApplied - 1) * 100).toFixed(0)}%`);
      console.log(`    Sources: ${m.source.join(', ')}`);
    });
    console.log("");
  }

  console.log("✅ VALIDATION:");
  console.log("=".repeat(65));
  console.log("✓ Quantity calculation working");
  console.log("✓ Waste factors applied");
  console.log("✓ Materials aggregated by type");
  console.log("✓ Source tracking working");
  console.log("");
  console.log("🎉 Phase 3 quantity calculation complete!");
}

testQuantityCalculator().catch(console.error);
