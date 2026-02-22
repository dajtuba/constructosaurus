import * as fs from 'fs';
import { Ollama } from 'ollama';

async function testVision(imagePath: string) {
  const imageData = fs.readFileSync(imagePath);
  const base64Image = imageData.toString('base64');
  
  const ollama = new Ollama({ host: 'http://localhost:11434' });
  
  const prompt = `Analyze this construction drawing in complete detail.

Extract EVERYTHING you can see:
- All text labels, callouts, dimensions
- Member specifications (joists, beams, plates)
- Section reference markers (circles with numbers/letters)
- Grid lines and spacing
- Any schedules or tables

Be thorough and specific. List actual values, not generic descriptions.`;

  console.log('🔍 Analyzing image with full extraction prompt...\n');
  
  const response = await ollama.generate({
    model: 'glm-ocr',
    prompt: prompt,
    images: [base64Image],
    options: { temperature: 0.1 }
  });
  
  console.log('📄 RAW VISION MODEL OUTPUT:');
  console.log('='.repeat(80));
  console.log(response.response);
  console.log('='.repeat(80));
}

const imagePath = process.argv[2] || '/tmp/shell-set-page-33-33.png';
testVision(imagePath).catch(console.error);
