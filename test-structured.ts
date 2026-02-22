import * as fs from 'fs';
import { Ollama } from 'ollama';

async function testStructuredExtraction(imagePath: string) {
  const imageData = fs.readFileSync(imagePath);
  const base64Image = imageData.toString('base64');
  
  const ollama = new Ollama({ host: 'http://localhost:11434' });
  
  const prompt = `Analyze this ForteWEB Member Report.

Extract these specific fields:
1. Member reference (top of page, format like "S2.1, D3")
2. Member specification (format like "2 x 10 HF No.2 @ 16\" OC")
3. Status (look for "Passed" or "Failed" in the Design Results table)

Return ONLY this JSON structure with actual values:
{
  "reference": "S2.1, D3",
  "specification": "2 x 10 HF No.2 @ 16\\" OC",
  "status": "PASSED"
}`;

  console.log('🔍 Testing structured extraction...\n');
  
  const response = await ollama.generate({
    model: 'glm-ocr',
    prompt: prompt,
    images: [base64Image],
    options: { temperature: 0.1 }
  });
  
  console.log('📄 RAW OUTPUT:');
  console.log(response.response);
  console.log('\n' + '='.repeat(80));
  
  // Try to parse JSON
  try {
    const jsonMatch = response.response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log('✅ PARSED JSON:');
      console.log(JSON.stringify(parsed, null, 2));
    } else {
      console.log('❌ No JSON found in response');
    }
  } catch (e) {
    console.log('❌ Failed to parse JSON:', e);
  }
}

testStructuredExtraction('/tmp/structural-page-109-109.png').catch(console.error);
