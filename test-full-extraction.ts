import * as fs from 'fs';
import { Ollama } from 'ollama';

async function extractFullFraming(imagePath: string) {
  const imageData = fs.readFileSync(imagePath);
  const base64Image = imageData.toString('base64');
  
  const ollama = new Ollama({ host: 'http://localhost:11434' });
  
  const prompt = `You are analyzing a construction drawing: First Floor Framing Plan.

IGNORE the notes section at the top. Focus on the FLOOR PLAN itself.

Extract ALL text callouts visible ON THE PLAN DRAWING:

FLOOR JOISTS (look for patterns like "14\" TJI 560 @ 16\" OC" or "2x10 @ 16\" OC"):
- List every joist specification you see
- Include spacing (@ 16" OC, @ 12" OC, etc.)

BEAMS (look for GLB, LVL, or dimensional lumber like "5 1/8\" x 18\" GLB"):
- List every beam callout
- Include material type

SILL PLATES (look for "2x14 PT" or similar around perimeter):
- List all sill plate specifications

SECTION MARKERS (circles with numbers/letters like "3/S3.0"):
- List all section reference markers

DIMENSIONS (span lengths, spacing):
- List key dimensions you see

SHEARWALLS (SW1, SW2, etc.):
- List any shearwall callouts

Format as a structured list with actual values from the drawing.`;

  console.log('🔍 Extracting full floor framing from S2.1...\n');
  
  const response = await ollama.generate({
    model: 'glm-ocr',
    prompt: prompt,
    images: [base64Image],
    options: { temperature: 0.1 }
  });
  
  // Save to markdown
  const markdown = `# First Floor Framing Plan (S2.1) - Full Extraction

**Source:** Shell-Set.pdf, Page 33  
**Sheet:** S2.1 - First Floor Framing Plan (Foundation Walls)  
**Date Extracted:** ${new Date().toISOString()}

---

## Vision Model Output

${response.response}

---

## Notes

This extraction was performed using Ollama's glm-ocr vision model with a comprehensive 
extraction prompt. The model analyzed the construction drawing and extracted all visible 
framing specifications, dimensions, and references.

**Model:** glm-ocr  
**Temperature:** 0.1  
**Image:** /tmp/shell-set-page-33-33.png
`;

  fs.writeFileSync('first-floor-framing-extraction.md', markdown);
  console.log('✅ Saved to: first-floor-framing-extraction.md');
  console.log('\n' + markdown);
}

extractFullFraming('/tmp/shell-set-page-33-33.png').catch(console.error);
