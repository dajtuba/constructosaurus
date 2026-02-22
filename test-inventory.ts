import * as fs from 'fs';
import { Ollama } from 'ollama';

async function extractInventory() {
  const imageData = fs.readFileSync('/tmp/shell-set-page-33-33.png');
  const base64Image = imageData.toString('base64');
  
  const ollama = new Ollama({ host: 'http://localhost:11434' });
  
  const prompt = `Give me the framing inventory needed for this floor plan.

List all materials with quantities:
- Floor joists (size, spacing, quantity)
- Beams (size, type, quantity)
- Sill plates (size, linear feet)
- Posts/columns (size, quantity)
- Hardware (connectors, hangers)

Format as a material takeoff list.`;

  console.log('🔍 Extracting framing inventory...\n');
  
  const response = await ollama.generate({
    model: 'glm-ocr',
    prompt: prompt,
    images: [base64Image],
    options: { temperature: 0.1 }
  });
  
  console.log('📋 FRAMING INVENTORY:\n');
  console.log(response.response);
  
  // Save to file
  fs.writeFileSync('framing-inventory.md', `# Framing Inventory - First Floor Plan (S2.1)

**Extracted:** ${new Date().toISOString()}

${response.response}
`);
  console.log('\n✅ Saved to: framing-inventory.md');
}

extractInventory().catch(console.error);
