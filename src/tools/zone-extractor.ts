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
  const zoneInstructions = {
    left: "Focus ONLY on the LEFT THIRD of the drawing",
    center: "Focus ONLY on the CENTER THIRD of the drawing", 
    right: "Focus ONLY on the RIGHT THIRD of the drawing"
  };

  const memberPrompts = {
    joists: `Find floor joist specifications in the ${zone.name} zone.
LOOK FOR:
- TJI callouts: "14\\" TJI 560", "11 7/8\\" TJI 360"
- Lumber joists: "2x10", "2x12"
- Designations: "D1", "D2", "D3"
- Spacing: "@ 16\\" OC", "@ 12\\" OC"

EXAMPLES: ["14\\" TJI 560 @ 16\\" OC", "D1 @ 16\\" OC", "2x10 @ 16\\" OC"]`,

    beams: `Find beam specifications in the ${zone.name} zone.
LOOK FOR:
- GLB: "5 1/8\\" x 18\\" GLB", "3 1/2\\" x 16\\" GLB"
- LVL: "3 1/2\\" x 14\\" LVL", "1 3/4\\" x 11 7/8\\" LVL"
- PSL: "7\\" x 18\\" PSL"
- Steel: "W18x106", "W10x100"

EXAMPLES: ["5 1/8\\" x 18\\" GLB", "3 1/2\\" x 14\\" LVL"]`,

    plates: `Find plate specifications in the ${zone.name} zone.
LOOK FOR:
- Sill plates: "2x6 PT", "2x8 PT", "2x10 PT"
- Top plates: "2x6", "2x8", "2x10"
- PT = Pressure Treated

EXAMPLES: ["2x6 PT", "2x8 PT", "2x10"]`,

    columns: `Find column/post specifications in the ${zone.name} zone.
LOOK FOR:
- Wood posts: "6x6 PT", "4x4 PT", "6x8 PT"
- Steel columns: "HSS6x6x1/4", "W14x90"
- Pipe columns: "4\\" STD PIPE"

EXAMPLES: ["6x6 PT", "4x4 PT", "HSS6x6x1/4"]`,

    sections: `Find section reference markers in the ${zone.name} zone.
LOOK FOR:
- Detail callouts: circles with triangles containing "3/S3.0", "4/S3.0"
- Section markers: "A/S4.1", "B/S4.1"
- Elevation markers: "1/A4.1", "2/A4.1"

EXAMPLES: ["3/S3.0", "4/S3.0", "5/S3.0"]`
  };

  return `${zoneInstructions[zone.name as keyof typeof zoneInstructions]}.

${memberPrompts[memberType as keyof typeof memberPrompts]}

Return ONLY a valid JSON array. If nothing found, return: []`;
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
    // Try to find JSON array in response
    const jsonMatch = response.response.match(/\[[\s\S]*?\]/);
    if (jsonMatch) {
      const cleanJson = jsonMatch[0]
        .replace(/'/g, '"')  // Replace single quotes with double quotes
        .replace(/([^"\\])\n/g, '$1')  // Remove newlines not in strings
        .replace(/,\s*]/g, ']');  // Remove trailing commas
      return JSON.parse(cleanJson);
    }
    
    // Fallback: look for items in quotes
    const quotedItems = response.response.match(/"([^"]+)"/g);
    if (quotedItems) {
      return quotedItems.map((item: string) => item.replace(/"/g, ''));
    }
    
  } catch (e) {
    console.error(`Failed to parse ${memberType} for ${zone.name}:`, response.response.substring(0, 100));
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