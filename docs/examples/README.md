# Constructosaurus Code Examples

## Basic Document Processing

### Ingest and Process a PDF

```typescript
import { DocumentProcessor } from '../src/processing/document-processor';
import { ScheduleStore } from '../src/storage/schedule-store';

async function ingestDocument(pdfPath: string) {
  const processor = new DocumentProcessor();
  const store = new ScheduleStore();
  
  // Process document
  const result = await processor.process(pdfPath);
  
  // Store schedules
  for (const schedule of result.schedules) {
    await store.add(schedule);
  }
  
  console.log(`Processed ${result.schedules.length} schedules`);
  return result;
}

// Usage
ingestDocument('./data/structural-drawings.pdf');
```

## Search and Retrieval

### Semantic Search

```typescript
import { HybridSearchEngine } from '../src/search/hybrid-search-engine';

async function searchDocuments(query: string) {
  const searchEngine = new HybridSearchEngine();
  
  const results = await searchEngine.search(query, {
    discipline: "Structural",
    top_k: 10
  });
  
  results.forEach(result => {
    console.log(`[${result.score.toFixed(2)}] ${result.drawingNumber}`);
    console.log(result.text);
    console.log('---');
  });
  
  return results;
}

// Usage
searchDocuments("foundation details");
```

### Filtered Search

```typescript
async function searchByDrawingType(query: string, drawingType: string) {
  const searchEngine = new HybridSearchEngine();
  
  const results = await searchEngine.search(query, {
    drawingType: drawingType,
    project: "Rogers House",
    top_k: 5
  });
  
  return results;
}

// Usage
searchByDrawingType("beam connections", "Detail");
```

## Material Extraction

### Extract Materials from Documents

```typescript
import { MaterialsExtractor } from '../src/extraction/materials-extractor';

async function extractMaterials(query: string) {
  const extractor = new MaterialsExtractor();
  
  const materials = await extractor.extract({
    query: query,
    discipline: "Structural",
    top_k: 20
  });
  
  materials.forEach(material => {
    console.log(`${material.name}: ${material.quantity} ${material.unit}`);
  });
  
  return materials;
}

// Usage
extractMaterials("all structural steel");
```

### Compile Supply List

```typescript
import { QuantityCalculator } from '../src/services/quantity-calculator';

async function compileSupplyList(materials: Material[]) {
  const calculator = new QuantityCalculator();
  
  // Group by material type
  const grouped = await calculator.aggregateByType(materials);
  
  // Calculate totals with waste factor
  const totals = grouped.map(item => ({
    ...item,
    totalWithWaste: calculator.estimateWaste(item.quantity, 10) // 10% waste
  }));
  
  console.log("Supply List:");
  totals.forEach(item => {
    console.log(`${item.name}: ${item.totalWithWaste} ${item.unit}`);
  });
  
  return totals;
}
```

## Schedule Queries

### Query Schedules

```typescript
import { ScheduleQueryService } from '../src/services/schedule-query-service';

async function querySchedules(query: string) {
  const queryService = new ScheduleQueryService();
  
  const schedules = await queryService.query({
    query: query,
    project: "Rogers House",
    top_k: 5
  });
  
  schedules.forEach(schedule => {
    console.log(`Schedule: ${schedule.type}`);
    console.log(`Headers: ${schedule.headers.join(', ')}`);
    console.log(`Rows: ${schedule.rows.length}`);
  });
  
  return schedules;
}

// Usage
querySchedules("beam schedule");
```

### Get Specific Schedule

```typescript
async function getScheduleById(scheduleId: string) {
  const queryService = new ScheduleQueryService();
  
  const schedule = await queryService.getScheduleById(scheduleId);
  
  // Print as table
  console.log(schedule.headers.join('\t'));
  schedule.rows.forEach(row => {
    console.log(row.join('\t'));
  });
  
  return schedule;
}
```

## Vision Processing

### Analyze Drawing with Vision

```typescript
import { DrawingVisionAnalyzer } from '../src/vision/drawing-vision-analyzer';
import { PDFImageConverter } from '../src/vision/pdf-image-converter';

async function analyzeDrawing(pdfPath: string, pageNumber: number) {
  const converter = new PDFImageConverter();
  const analyzer = new DrawingVisionAnalyzer();
  
  // Convert PDF page to image
  const imagePath = await converter.convertPage(pdfPath, pageNumber);
  
  // Analyze with vision
  const analysis = await analyzer.analyze(imagePath);
  
  console.log("Drawing Analysis:");
  console.log(analysis);
  
  return analysis;
}

// Usage
analyzeDrawing('./data/structural-plan.pdf', 1);
```

## Advanced Usage

### Batch Processing

```typescript
import * as fs from 'fs';
import * as path from 'path';

async function batchProcess(directory: string) {
  const processor = new DocumentProcessor();
  const files = fs.readdirSync(directory)
    .filter(f => f.endsWith('.pdf'));
  
  const results = await Promise.all(
    files.map(file => processor.process(path.join(directory, file)))
  );
  
  console.log(`Processed ${results.length} documents`);
  return results;
}

// Usage
batchProcess('./data/drawings');
```

### Custom Extraction Pipeline

```typescript
import { TableExtractor } from '../src/extraction/table-extractor';
import { ScheduleParser } from '../src/extraction/schedule-parser';

async function customExtraction(pdfPath: string) {
  const tableExtractor = new TableExtractor();
  const scheduleParser = new ScheduleParser();
  
  // Extract tables
  const tables = await tableExtractor.extract(pdfPath);
  
  // Parse as schedules
  const schedules = [];
  for (const table of tables) {
    const schedule = await scheduleParser.parse(table);
    if (schedule) {
      schedules.push(schedule);
    }
  }
  
  console.log(`Extracted ${schedules.length} schedules`);
  return schedules;
}
```

### Caching for Performance

```typescript
import { QueryCache } from '../src/cache/query-cache';

const cache = new QueryCache();

async function cachedSearch(query: string) {
  const cacheKey = `search:${query}`;
  
  // Check cache
  const cached = cache.get(cacheKey);
  if (cached) {
    console.log("Cache hit!");
    return cached;
  }
  
  // Perform search
  const searchEngine = new HybridSearchEngine();
  const results = await searchEngine.search(query);
  
  // Cache results
  cache.set(cacheKey, results);
  
  return results;
}
```

## Error Handling

### Robust Processing

```typescript
async function robustProcess(pdfPath: string) {
  const processor = new DocumentProcessor();
  
  try {
    const result = await processor.process(pdfPath);
    return { success: true, data: result };
  } catch (error) {
    console.error(`Failed to process ${pdfPath}:`, error);
    return { success: false, error: error.message };
  }
}

// Process multiple with error handling
async function processWithRetry(files: string[]) {
  const results = [];
  
  for (const file of files) {
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      const result = await robustProcess(file);
      if (result.success) {
        results.push(result);
        break;
      }
      attempts++;
      console.log(`Retry ${attempts}/${maxAttempts} for ${file}`);
    }
  }
  
  return results;
}
```

## Testing Examples

### Unit Test Example

```typescript
async function testMaterialExtraction() {
  const extractor = new MaterialsExtractor();
  
  const materials = await extractor.extract({
    query: "test materials",
    top_k: 5
  });
  
  console.assert(Array.isArray(materials), "Should return array");
  console.assert(materials.length > 0, "Should extract materials");
  console.assert(materials[0].name, "Materials should have names");
  
  console.log("✓ Material extraction test passed");
}
```

### Integration Test Example

```typescript
async function testFullPipeline() {
  const testPdf = './data/test-doc.pdf';
  
  // Process
  const processor = new DocumentProcessor();
  const result = await processor.process(testPdf);
  
  // Store
  const store = new ScheduleStore();
  await store.add(result.schedules[0]);
  
  // Query
  const queryService = new ScheduleQueryService();
  const schedules = await queryService.query({
    query: "test",
    top_k: 1
  });
  
  console.assert(schedules.length > 0, "Should retrieve stored schedule");
  console.log("✓ Full pipeline test passed");
}
```
