#!/usr/bin/env ts-node

/**
 * Tracer Bullet Demo: Extract complete information for D1 member across all documents
 * 
 * Demonstrates end-to-end extraction:
 * 1. Shell-Set S2.1 (page 33) - construction spec
 * 2. Structural Calc (page 5) - designation and loads
 * 3. ForteWEB report (page 109) - definition and analysis
 */

import { OllamaVisionAnalyzer } from '../vision/ollama-vision-analyzer';
import * as fs from 'fs';
import * as path from 'path';

interface MemberInfo {
  member: string;
  shell_set: {
    sheet: string;
    page: number;
    spec: string;
    location: { x: number; y: number };
  };
  structural_calc: {
    page: number;
    designation: string;
    loads: string[];
  };
  forteweb: {
    page: number;
    definition: string;
    status: string;
  };
  detail_refs: string[];
  conflict: {
    detected: boolean;
    issue: string;
  };
}

async function extractFromShellSet(analyzer: OllamaVisionAnalyzer, imagePath: string): Promise<any> {
  const prompt = `Analyze this construction drawing (Shell-Set S2.1, First Floor Framing Plan).

Focus on the LEFT side of the plan where floor joists are shown.

Extract:
1. Floor joist specification (look for "14\" TJI 560" or similar with "@ 16\" OC")
2. Sill plate specification (look for "2x14 (PT)")
3. Section reference markers (circles with triangles like "3/S3.0", "4/S3.0")

Return JSON:
{
  "joist_spec": "specification found",
  "sill_spec": "specification found",
  "section_refs": ["3/S3.0", "4/S3.0"]
}`;

  // Use the analyzer's method - we'll need to adapt it
  const imageData = fs.readFileSync(imagePath);
  const base64Image = imageData.toString('base64');
  
  // Direct Ollama call for custom prompt
  const Ollama = require('ollama').Ollama;
  const ollama = new Ollama({ host: 'http://localhost:11434' });
  
  const response = await ollama.generate({
    model: 'glm-ocr',
    prompt: prompt,
    images: [base64Image],
    options: { temperature: 0.1 }
  });
  
  try {
    const jsonMatch = response.response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('Failed to parse response:', e);
  }
  
  return { joist_spec: 'NOT FOUND', sill_spec: 'NOT FOUND', section_refs: [] };
}

async function extractFromStructuralCalc(analyzer: OllamaVisionAnalyzer, imagePath: string): Promise<any> {
  const prompt = `Analyze this structural calculation floor plan (page 5).

Look for floor joist designations in the LEFT area of the plan.

Extract:
1. Joist designation code (look for "D1 @ 16\" OC" or similar along span arrows)
2. Load values at that location (numbers like "1050 LB", "607 LB", etc.)

Return JSON:
{
  "designation": "D1 @ 16\\" OC",
  "loads": ["1050 LB", "607 LB"]
}`;

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
    const jsonMatch = response.response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('Failed to parse response:', e);
  }
  
  return { designation: 'NOT FOUND', loads: [] };
}

async function extractFromForteWeb(analyzer: OllamaVisionAnalyzer, imagePath: string): Promise<any> {
  const prompt = `Analyze this ForteWEB Member Report (page 109).

Extract:
1. Member reference (look for "S2.1, D3" or similar at top)
2. Member specification (look for "2 x 10 HF No.2 @ 16\" OC" or similar)
3. Status (PASSED or FAILED in green/red)

Return JSON:
{
  "reference": "S2.1, D3",
  "definition": "2 x 10 HF No.2 @ 16\\" OC",
  "status": "PASSED"
}`;

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
    const jsonMatch = response.response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('Failed to parse response:', e);
  }
  
  return { reference: 'NOT FOUND', definition: 'NOT FOUND', status: 'UNKNOWN' };
}

function detectConflict(shellSpec: string, fortewebDef: string): { detected: boolean; issue: string } {
  // Simple conflict detection: TJI vs dimensional lumber
  const hasTJI = shellSpec.toLowerCase().includes('tji');
  const has2x = fortewebDef.toLowerCase().includes('2 x') || fortewebDef.toLowerCase().includes('2x');
  
  if (hasTJI && has2x) {
    return {
      detected: true,
      issue: `Shell-Set specifies engineered joist (${shellSpec}) but ForteWEB shows dimensional lumber (${fortewebDef})`
    };
  }
  
  return {
    detected: false,
    issue: ''
  };
}

async function main() {
  console.log('🦕 Tracer Bullet Demo: D1 Member Extraction\n');
  
  const analyzer = new OllamaVisionAnalyzer();
  
  // Image paths (already extracted)
  const shellSetImage = '/tmp/shell-set-page-33-33.png';
  const structuralCalcImage = '/tmp/structural-page-5-hires-005.png';
  const fortewebImage = '/tmp/structural-page-109-109.png';
  
  // Check images exist
  if (!fs.existsSync(shellSetImage)) {
    console.error('❌ Shell-Set image not found. Run: pdftoppm -png -f 33 -l 33 source/Shell-Set.pdf /tmp/shell-set-page-33');
    process.exit(1);
  }
  
  console.log('📄 Step 1: Extracting from Shell-Set S2.1 (page 33)...');
  const shellData = await extractFromShellSet(analyzer, shellSetImage);
  console.log('✓ Shell-Set data:', JSON.stringify(shellData, null, 2));
  
  console.log('\n📄 Step 2: Extracting from Structural Calculations (page 5)...');
  const structuralData = await extractFromStructuralCalc(analyzer, structuralCalcImage);
  console.log('✓ Structural data:', JSON.stringify(structuralData, null, 2));
  
  console.log('\n📄 Step 3: Extracting from ForteWEB Report (page 109)...');
  const fortewebData = await extractFromForteWeb(analyzer, fortewebImage);
  console.log('✓ ForteWEB data:', JSON.stringify(fortewebData, null, 2));
  
  console.log('\n🔍 Step 4: Detecting conflicts...');
  const conflict = detectConflict(
    shellData.joist_spec || '',
    fortewebData.definition || ''
  );
  
  // Assemble final result
  const result: MemberInfo = {
    member: 'D1',
    shell_set: {
      sheet: 'S2.1',
      page: 33,
      spec: shellData.joist_spec || 'NOT FOUND',
      location: { x: 150, y: 800 } // Approximate location
    },
    structural_calc: {
      page: 5,
      designation: structuralData.designation || 'NOT FOUND',
      loads: structuralData.loads || []
    },
    forteweb: {
      page: 109,
      definition: fortewebData.definition || 'NOT FOUND',
      status: fortewebData.status || 'UNKNOWN'
    },
    detail_refs: shellData.section_refs || [],
    conflict: conflict
  };
  
  console.log('\n' + '='.repeat(80));
  console.log('🎯 TRACER BULLET RESULT');
  console.log('='.repeat(80));
  console.log(JSON.stringify(result, null, 2));
  
  if (conflict.detected) {
    console.log('\n⚠️  CONFLICT DETECTED:', conflict.issue);
  } else {
    console.log('\n✅ No conflicts detected');
  }
  
  // Save to file
  const outputPath = path.join(process.cwd(), 'tracer-bullet-result.json');
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log(`\n💾 Result saved to: ${outputPath}`);
}

main().catch(console.error);
