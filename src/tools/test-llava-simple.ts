import { Ollama } from "ollama";
import * as fs from "fs";
import * as path from "path";

async function testSimple() {
  console.log("🧪 Simple LLaVA Test - What do you see?\n");

  const ollama = new Ollama({ host: "http://localhost:11434" });
  const imagePath = path.join(__dirname, "../../data/test-ollama-vision/page-1-01.png");
  
  const imageData = fs.readFileSync(imagePath);
  const base64Image = imageData.toString('base64');

  console.log("Asking: 'Describe what you see in this image in detail.'\n");

  const response = await ollama.generate({
    model: "llava:13b",
    prompt: "Describe what you see in this image in detail. What text, numbers, tables, or drawings are visible?",
    images: [base64Image],
  });

  console.log("RESPONSE:");
  console.log("=".repeat(65));
  console.log(response.response);
  console.log("=".repeat(65));
}

testSimple().catch(console.error);
