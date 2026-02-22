import * as fs from 'fs';
import { Ollama } from 'ollama';

async function spatialExtraction() {
  const imageData = fs.readFileSync('/tmp/shell-set-page-33-33.png');
  const base64Image = imageData.toString('base64');
  
  const ollama = new Ollama({ host: 'http://localhost:11434' });
  
  const prompt = `Describe this floor framing plan drawing spatially.

Start from the LEFT side of the plan and work RIGHT.
Start from the TOP and work DOWN.

For each area, list:
- What framing members you see (joists, beams, plates)
- Any text callouts or specifications
- Any circled numbers or section markers
- Any dimensions

Example format:
LEFT SIDE:
- Floor joists running [direction]
- Callout text: "[exact text]"
- Section marker: [number/letter]

CENTER:
- [describe what you see]

RIGHT SIDE:
- [describe what you see]`;

  const response = await ollama.generate({
    model: 'glm-ocr',
    prompt: prompt,
    images: [base64Image],
    options: { temperature: 0.1 }
  });
  
  console.log(response.response);
}

spatialExtraction().catch(console.error);
