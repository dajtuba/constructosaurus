#!/usr/bin/env node

/**
 * Test script for ct-bgp.3 MCP database tier tools
 * Tests the 5 new fast database query tools
 */

import { spawn } from 'child_process';
import { join } from 'path';

const MCP_SERVER_PATH = join(__dirname, '../../dist/index.js');

interface MCPRequest {
  jsonrpc: string;
  id: number;
  method: string;
  params?: any;
}

interface MCPResponse {
  jsonrpc: string;
  id: number;
  result?: any;
  error?: any;
}

async function callMCPTool(request: MCPRequest): Promise<MCPResponse> {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [MCP_SERVER_PATH], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd()
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`MCP server exited with code ${code}: ${stderr}`));
        return;
      }

      try {
        const response = JSON.parse(stdout.trim());
        resolve(response);
      } catch (error) {
        reject(new Error(`Failed to parse MCP response: ${stdout}`));
      }
    });

    child.stdin.write(JSON.stringify(request) + '\n');
    child.stdin.end();
  });
}

async function testTool(name: string, args: any = {}) {
  console.log(`\n🧪 Testing ${name}...`);
  
  const start = Date.now();
  
  try {
    const response = await callMCPTool({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name, arguments: args }
    });

    const duration = Date.now() - start;
    
    if (response.error) {
      console.log(`❌ Error: ${response.error.message}`);
      return false;
    }

    const result = JSON.parse(response.result.content[0].text);
    console.log(`✅ Success (${duration}ms)`);
    console.log(`📊 Result:`, JSON.stringify(result, null, 2));
    
    // Check if response time is under 100ms for fast queries
    if (duration > 100) {
      console.log(`⚠️  Warning: Response time ${duration}ms > 100ms target`);
    }
    
    return true;
  } catch (error) {
    const duration = Date.now() - start;
    console.log(`❌ Failed (${duration}ms): ${error}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Testing ct-bgp.3 MCP Database Tier Tools');
  console.log('Target: Fast queries (10-100ms) with structured JSON responses');
  
  const tests = [
    { name: 'query_member', args: { designation: 'D1' } },
    { name: 'get_material_takeoff', args: { sheet: 'S2.1' } },
    { name: 'find_conflicts', args: {} },
    { name: 'find_conflicts', args: { severity: 'critical' } },
    { name: 'list_sheets', args: {} },
    { name: 'list_sheets', args: { discipline: 'Structural' } },
    { name: 'search_documents', args: { text: 'construction' } },
    { name: 'search_documents', args: { text: 'beam', limit: 5 } },
  ];

  let passed = 0;
  let total = tests.length;

  for (const test of tests) {
    const success = await testTool(test.name, test.args);
    if (success) passed++;
  }

  console.log(`\n📈 Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All MCP database tier tools working correctly!');
    console.log('✅ ct-bgp.3 implementation complete');
  } else {
    console.log('❌ Some tests failed - check implementation');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}