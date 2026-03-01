// Quick test for grid location parsing
const { OllamaVisionAnalyzer } = require('./dist/src/vision/ollama-vision-analyzer.js');

const analyzer = new OllamaVisionAnalyzer();

// Test grid location patterns
const testCases = [
  "@ A/1",
  "at A/1", 
  "at grid B/2",
  "between A-B",
  "grid line A",
  "A to B",
  "column @ B/3",
  "beam @ C/2",
  "  @ D/4  ", // with spaces
  ""
];

console.log('Testing grid location parsing:');
testCases.forEach(test => {
  // Access the private method via reflection for testing
  const result = analyzer.parseGridLocation ? analyzer.parseGridLocation(test) : 'Method not accessible';
  console.log(`"${test}" -> "${result}"`);
});