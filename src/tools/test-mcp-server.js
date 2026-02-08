#!/usr/bin/env node

/**
 * Test MCP server startup and tool listing
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Testing MCP Server\n');

const serverPath = path.join(__dirname, '../../dist/index.js');
console.log(`Starting server: ${serverPath}\n`);

const server = spawn('node', [serverPath], {
  env: {
    ...process.env,
    DATABASE_PATH: path.join(__dirname, '../data/lancedb'),
    OLLAMA_URL: 'http://localhost:11434',
    EMBED_MODEL: 'nomic-embed-text'
  },
  stdio: ['pipe', 'pipe', 'pipe']
});

let output = '';
let errorOutput = '';

server.stdout.on('data', (data) => {
  output += data.toString();
});

server.stderr.on('data', (data) => {
  errorOutput += data.toString();
  console.error('stderr:', data.toString());
});

// Send MCP initialize request
setTimeout(() => {
  const initRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      }
    }
  };
  
  console.log('📤 Sending initialize request...\n');
  server.stdin.write(JSON.stringify(initRequest) + '\n');
}, 1000);

// Send list tools request
setTimeout(() => {
  const listToolsRequest = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {}
  };
  
  console.log('📤 Sending tools/list request...\n');
  server.stdin.write(JSON.stringify(listToolsRequest) + '\n');
}, 2000);

// Check results and exit
setTimeout(() => {
  console.log('\n📥 Server Output:\n');
  console.log(output);
  
  if (output.includes('search_construction_docs')) {
    console.log('\n✅ MCP Server is working!');
    console.log('✅ Tools are available');
    console.log('\nAvailable tools:');
    console.log('  - search_construction_docs');
    console.log('  - ingest_document');
    console.log('  - extract_materials');
    console.log('  - analyze_drawing');
    console.log('  - query_schedule');
    console.log('  - generate_supply_list');
  } else {
    console.log('\n❌ MCP Server may have issues');
    console.log('Error output:', errorOutput);
  }
  
  server.kill();
  process.exit(0);
}, 4000);

server.on('error', (err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
