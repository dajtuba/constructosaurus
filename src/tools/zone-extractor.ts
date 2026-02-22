#!/usr/bin/env ts-node

/**
 * Zone-based extraction for S2.1 floor plan
 * Divides plan into left/center/right zones and extracts members by type
 */

import * as fs from 'fs';

interface Zone {
  name: string;
  bounds: { x: number; y: number; w: number; h: number };
}

interface ZoneExtractionResult {
  zone: string;
  joists: string[];
  beams: string[];
  plates: string[];
  columns: string[];
  sections: string[];
}

const ZONES: Zone[] = [
  { name: 'left', bounds: { x: 0, y: 0, w: 33, h: 100 } },
  { name: 'center', bounds: { x: 33, y: 0, w: 34, h: 100 } },
  { name: 'right', bounds: { x: 67, y: 0, w: 33, h: 100 } }
];

function buildZonePrompt(zone: Zone, memberType: string): string {
  const prompts = {
    joists: `Focus on the ${zone.name} third of this floor plan. Extract floor joist specifications.
Look for: "TJI 560", "TJI 360", "D1", "D2", etc. with spacing like "@ 16\" OC".
Return JSON array: ["14\" TJI 560 @ 16\" OC", "D1 @ 16\" OC"]`,

    beams: `Focus on the ${zone.name} third of this floor plan. Extract beam specifications.
Look for: "GLB", "LVL", "PSL" with dimensions like "5 1/8\" x 18\"".
Return JSON array: ["5 1/8\" x 18\" GLB", "3 1/2\" x 14\" LVL"]`,

    plates: `Focus on the ${zone.name} third of this floor plan. Extract plate specifications.
Look for: "2x14 (PT)", "2x12", sill plates, top plates.
Return JSON array: ["2x14 (PT)", "2x12"]`,

    columns: `Focus on the ${zone.name} third of this floor plan. Extract column specifications.
Look for: "6x6", "4x4", "PSL", column callouts.
Return JSON array: ["6x6 PT", "3 1/2\" x 5 1/2\" PSL"]`,

    sections: `Focus on the ${zone.name} third of this floor plan. Extract section reference markers.
Look for: circles with triangles containing text like "3/S3.0", "4/S3.0", "5/S3.0".
Return JSON array: ["3/S3.0", "4/S3.0", "5/S3.0"]`
  };

  return prompts[memberType as keyof typeof prompts] || '';
}

async function extractFromZone(imagePath: string, zone: Zone, memberType: string): Promise<string[]> {
  const prompt = buildZonePrompt(zone, memberType);
  
  const imageData = fs.readFileSync(imagePath);
  const base64Image = imageData.toString('base64');
  
  const Ollama = require('ollama').Ollama;
  const ollama = new Ollama({ host: 'http://localhost:11434' });
  
  const response = await ollama.generate({
    model: 'glm-ocr',
    prompt: prompt,
    images: [base64Image],
    options: { temperature: 0.1 }
  });
  
  try {
    const jsonMatch = response.response.match(/\[[\s\S]*?\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error(`Failed to parse ${memberType} for ${zone.name}:`, e);
  }
  
  return [];
}

async function extractZone(imagePath: string, zone: Zone): Promise<ZoneExtractionResult> {
  console.log(`\n📍 Extracting ${zone.name} zone...`);
  
  const memberTypes = ['joists', 'beams', 'plates', 'columns', 'sections'];
  const result: ZoneExtractionResult = {
    zone: zone.name,
    joists: [],
    beams: [],
    plates: [],
    columns: [],
    sections: []
  };
  
  for (const type of memberTypes) {
    console.log(`  - ${type}...`);
    result[type as keyof Omit<ZoneExtractionResult, 'zone'>] = await extractFromZone(imagePath, zone, type);
  }
  
  return result;
}

async function main() {
  console.log('🦕 Zone-based Extraction for S2.1\n');
  
  const imagePath = '/tmp/shell-set-page-33-33.png';
  
  if (!fs.existsSync(imagePath)) {
    console.error('❌ S2.1 image not found. Run: pdftoppm -png -f 33 -l 33 source/Shell-Set.pdf /tmp/shell-set-page-33');
    process.exit(1);
  }
  
  // Test on left zone first (tracer bullet approach)
  console.log('🎯 Testing left zone first (tracer bullet)...');
  const leftResult = await extractZone(imagePath, ZONES[0]);
  
  console.log('\n✓ Left zone result:');
  console.log(JSON.stringify(leftResult, null, 2));
  
  // If left zone works, process all zones
  console.log('\n🚀 Processing all zones...');
  const allResults = [];
  
  for (const zone of ZONES) {
    const result = await extractZone(imagePath, zone);
    allResults.push(result);
  }
  
  const finalResult = {
    sheet: 'S2.1',
    page: 33,
    zones: allResults,
    extracted_at: new Date().toISOString()
  };
  
  console.log('\n' + '='.repeat(80));
  console.log('🎯 ZONE EXTRACTION COMPLETE');
  console.log('='.repeat(80));
  console.log(JSON.stringify(finalResult, null, 2));
  
  // Save result
  const outputPath = 'zone-extraction-result.json';
  fs.writeFileSync(outputPath, JSON.stringify(finalResult, null, 2));
  console.log(`\n💾 Result saved to: ${outputPath}`);
}

main().catch(console.error);