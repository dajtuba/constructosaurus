import * as fs from 'fs';
import { Ollama } from 'ollama';

async function extractInventory() {
  const imageData = fs.readFileSync('/tmp/shell-set-page-33-33.png');
  const base64Image = imageData.toString('base64');
  
  const ollama = new Ollama({ host: 'http://localhost:11434' });
  
  const prompt = `You are a construction estimator analyzing a floor framing plan.

Count and list every framing member specification visible on this plan:

FLOOR JOISTS:
- Find text like "14\" TJI 560 @ 16\" OC" or "2x10 @ 16\" OC"
- Count how many bays use each specification
- Estimate linear feet needed

BEAMS:
- Find text like "5 1/8\" x 18\" GLB" or "3 1/2\" x 14\" LVL"  
- Count quantity of each size
- Note span lengths

SILL PLATES:
- Find perimeter framing like "2x14 PT"
- Estimate linear feet around perimeter

Return as a material takeoff list with quantities.`;

  console.log('🔍 Extracting material takeoff...\n');
  
  const response = await ollama.generate({
    model: 'glm-ocr',
    prompt: prompt,
    images: [base64Image],
    options: { temperature: 0.1 }
  });
  
  console.log('📋 MATERIAL TAKEOFF:\n');
  console.log(response.response);
  
  fs.writeFileSync('material-takeoff.md', `# Material Takeoff - First Floor Framing (S2.1)

**Source:** Shell-Set.pdf, Page 33
**Extracted:** ${new Date().toISOString()}

---

${response.response}
`);
  console.log('\n✅ Saved to: material-takeoff.md');
}

extractInventory().catch(console.error);
