#!/usr/bin/env node

/**
 * Test joist mark extraction improvement
 */

import { OllamaVisionAnalyzer } from './src/vision/ollama-vision-analyzer';

async function testJoistMarkExtraction() {
  console.log('🧪 Testing joist mark extraction...\n');
  
  const analyzer = new OllamaVisionAnalyzer();
  
  // Test the private extractJoistMark method via reflection
  const extractJoistMark = (analyzer as any).extractJoistMark.bind(analyzer);
  
  const testCases = [
    // Invalid mark (current issue)
    { mark: '14" TJI 560', spec: '@ 16" OC', expected: 'J1' },
    
    // Valid designation already
    { mark: 'D1', spec: '14" TJI 560 @ 16" OC', expected: 'D1' },
    
    // Zone in spec
    { mark: 'TJI 560', spec: 'D2 @ 16" OC', expected: 'D2' },
    
    // Area designation
    { mark: '11 7/8" TJI 360', spec: 'AREA 3 @ 16" OC', expected: 'D3' },
    
    // Zone designation
    { mark: 'TJI', spec: 'ZONE B @ 16" OC', expected: 'D2' },
    
    // No designation found
    { mark: '2x10', spec: '@ 16" OC', expected: 'J1' }
  ];
  
  console.log('Test Cases:');
  testCases.forEach((test, index) => {
    const result = extractJoistMark(test, index);
    const status = result === test.expected ? '✅' : '❌';
    console.log(`${status} Input: "${test.mark}" → Expected: "${test.expected}" → Got: "${result}"`);
  });
  
  console.log('\n🎯 Testing confidence improvement...');
  
  // Test confidence calculation for improved marks
  const calculateConfidence = (analyzer as any).calculateConfidence.bind(analyzer);
  
  const beforeConfidence = calculateConfidence('14" TJI 560', '@ 16" OC', undefined, 0);
  const afterConfidence = calculateConfidence('D1', '@ 16" OC', undefined, 0);
  
  console.log(`Before fix: mark="14\\" TJI 560" → confidence=${beforeConfidence}`);
  console.log(`After fix:  mark="D1" → confidence=${afterConfidence}`);
  console.log(`Improvement: +${(afterConfidence - beforeConfidence).toFixed(2)} confidence`);
  
  if (afterConfidence > beforeConfidence) {
    console.log('✅ Confidence improved as expected');
  } else {
    console.log('❌ Confidence not improved');
  }
}

testJoistMarkExtraction().catch(console.error);