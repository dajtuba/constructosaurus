# ClaudeHopper Refactoring Plan for 2025-2026

## Executive Summary

### Current Issues Identified

- Limited/no search results for structural documents
- Outdated embedding models (nomic-embed-text)
- Basic LanceDB implementation without modern optimizations
- Image extraction relies on Poppler (pdfimages) without vision-language capabilities
- No multimodal understanding of CAD drawings

### Modernization Goals

- Achieve 90%+ retrieval accuracy for construction-specific queries
- Sub-100ms query latency
- Native CAD/drawing understanding using vision-language models
- Production-grade vector database optimization

---

## Phase 1: Modern Embedding Architecture

### 1.1 Replace Embedding Models

**Current:** `nomic-embed-text` (outdated, general-purpose)

**Recommended Upgrade Path:**

#### Primary Text Embeddings

**Option A: Voyage AI voyage-3-large**

- MTEB leader (outperforms OpenAI by 9.74%)
- 32K token context (vs 8K OpenAI)
- 1024 dimensions (vs 3072 OpenAI = 3x less storage)
- $0.06/M tokens (2.2x cheaper than OpenAI)
- Best for: Production deployment

**Option B: Cohere embed-v4**

- Highest MTEB score (65.2) as of Nov 2025
- Optimized for search/retrieval
- Supports int8 and binary quantization (99% cost reduction)
- 100+ languages
- Best for: Multilingual projects

**Option C: Open-Source - E5-Mistral or BGE-M3**

- E5-Mistral: Mistral-7B based, excellent for specialized domains
- BGE-M3: Hybrid dense/sparse retrieval, long documents
- Best for: Cost-sensitive, self-hosted deployments

### 1.2 Add Multimodal Vision-Language Embeddings

**Critical Addition for Construction Drawings:**

```typescript
// New: Multimodal embeddings for CAD/drawing understanding
const visionModels = {
    primary: "CadVLM", // NEW: CAD-specific vision-language model
    fallback: "CLIP ViT-L/14", // General image-text alignment
    specialized: "SigLIP 2", // High-precision text-image alignment
};
```

**Why this matters for construction:**

- Current system only extracts images, doesn't understand them
- CadVLM can understand parametric CAD sketches, geometries
- Can answer: "Find all foundation details with anchor bolt embedment > 12 inches"
- Can match: sketch similarity, dimensional analysis, component recognition

---

## Phase 2: Vector Database Optimization

### 2.1 Upgrade LanceDB Configuration

**Current limitations:**

```typescript
// Basic implementation, no optimization
await db.createTable(tableName, data);
```

**Modern implementation:**

```typescript
// Production-grade LanceDB with hybrid search
import { connect } from "vectordb";

const db = await connect({
    uri: dbPath,
    storageOptions: {
        // Enable S3/cloud storage for large datasets
        object_store: "s3",
        aws_region: "us-west-2",
    },
});

const table = await db.createTable({
    name: "construction_docs",
    data: chunks,
    mode: "overwrite",
    // CRITICAL: Add indexing for faster search
    index: {
        type: "IVF_PQ", // Inverted File with Product Quantization
        num_partitions: 256,
        num_sub_vectors: 96,
    },
});

// Enable hybrid search (vector + BM25)
await table.createScalarIndex("metadata.drawingType");
await table.createScalarIndex("metadata.discipline");
await table.createFtsIndex("text"); // Full-text search index
```

### 2.2 Implement Query Optimization

**Add HyDE (Hypothetical Document Embeddings):**

```typescript
async function hydeQuery(userQuery: string) {
    // Generate hypothetical ideal answer
    const hypotheticalDoc = await llm.generate({
        prompt: `Given this construction question: "${userQuery}"
    Generate an ideal technical answer that would appear in construction documents.`,
    });

    // Embed hypothetical doc instead of raw query
    const embedding = await embedModel.embed(hypotheticalDoc);

    return await vectorSearch(embedding);
}
```

**Add Reranking:**

```typescript
// Two-stage retrieval
const candidates = await vectorSearch(query, { limit: 50 });
const reranked = await cohere.rerank({
    query,
    documents: candidates,
    top_n: 10,
});
```

---

## Phase 3: Construction-Specific Processing Pipeline

### 3.1 Enhanced PDF Processing

**Current:** Basic poppler extraction

**New: Multi-stage processing:**

```typescript
class ConstructionDocumentProcessor {
    async process(pdfPath: string) {
        // Stage 1: Classify document type using vision model
        const docType = await this.classifyDocument(pdfPath);

        // Stage 2: Extract based on type
        if (docType === "CAD_DRAWING") {
            return await this.processCADDrawing(pdfPath);
        } else if (docType === "SPECIFICATION") {
            return await this.processSpecification(pdfPath);
        } else if (docType === "CALCULATIONS") {
            return await this.processCalculations(pdfPath);
        }
    }

    async processCADDrawing(pdfPath: string) {
        // Extract images at high resolution
        const pages = await this.extractPages(pdfPath, { dpi: 300 });

        // Use CadVLM to understand each drawing
        const analyses = await Promise.all(
            pages.map(async (page) => {
                return await this.cadVLM.analyze({
                    image: page.image,
                    tasks: [
                        "identify_components",
                        "extract_dimensions",
                        "detect_symbols",
                        "read_notes",
                        "classify_view_type", // plan, elevation, section, detail
                    ],
                });
            }),
        );

        // Create multimodal embeddings
        const embeddings = await this.createMultimodalEmbeddings(analyses);

        return {
            pages,
            analyses,
            embeddings,
            metadata: this.extractMetadata(analyses),
        };
    }
}
```

### 3.2 Intelligent Chunking for Construction Docs

**Current:** Fixed-size chunking

**New: Semantic chunking:**

```typescript
class ConstructionChunker {
    async chunk(document: Document) {
        if (document.type === "DRAWING") {
            // Don't chunk drawings - keep as whole pages
            return this.chunkBySheet(document);
        } else if (document.type === "SPECIFICATION") {
            // Chunk by section/subsection
            return this.chunkBySection(document);
        } else if (document.type === "CALCULATIONS") {
            // Chunk by calculation topic
            return this.chunkByCalculation(document);
        }
    }

    async chunkBySection(spec: Specification) {
        // Use LLM to identify section boundaries
        const sections = await this.identifySections(spec.text);

        return sections.map((section) => ({
            text: section.content,
            metadata: {
                section: section.number,
                title: section.title,
                parent_sections: section.hierarchy,
            },
            // Keep related subsections together
            context_window: this.expandContext(section, 1), // ±1 section
        }));
    }
}
```

---

## Phase 4: Metadata Extraction Enhancement

### 4.1 AI-Powered Metadata Extraction

**Current:** Basic pattern matching

**New: LLM-based extraction:**

```typescript
interface ConstructionMetadata {
    project: string;
    phase: string; // DD, CD, Construction, etc.
    discipline: string[]; // Structural, Architectural, MEP, Civil
    drawingType: string[]; // Plan, Elevation, Section, Detail
    drawingNumber: string;
    revision: string;
    date: Date;

    // NEW: AI-extracted metadata
    buildingComponents: string[]; // foundation, framing, roof
    materials: string[]; // concrete, steel, wood
    systems: string[]; // HVAC, electrical, plumbing
    specifications: SpecReference[];
    dimensions: DimensionInfo[];
    loadCases: LoadCase[]; // for structural
    seismicZone?: string;
    buildingCode: string[];
}

async function extractMetadata(document: ProcessedDocument) {
    const prompt = `Analyze this construction document and extract:
  - Project name and location
  - Drawing number and title
  - Discipline and document type
  - Key building components shown
  - Materials specified
  - Referenced standards (ACI, AISC, IBC, etc.)
  - Seismic design category if structural
  
  Document content: ${document.text}
  Document images: ${document.imageDescriptions}`;

    const metadata = await llm.generate({
        prompt,
        response_format: ConstructionMetadata,
    });

    return metadata;
}
```

### 4.2 Construction-Specific Taxonomy

```typescript
const CONSTRUCTION_TAXONOMY = {
    disciplines: [
        "Structural",
        "Architectural",
        "Civil",
        "Mechanical",
        "Electrical",
        "Plumbing",
        "Fire Protection",
        "Landscape",
    ],
    drawingTypes: {
        architectural: [
            "Floor Plan",
            "Elevation",
            "Section",
            "Detail",
            "3D View",
        ],
        structural: ["Framing Plan", "Foundation Plan", "Details", "Schedules"],
        civil: ["Site Plan", "Grading Plan", "Utility Plan", "Profile"],
    },
    components: {
        structural: [
            "Foundation",
            "Footing",
            "Pier",
            "Column",
            "Beam",
            "Slab",
            "Wall",
            "Roof",
            "Connection",
            "Anchor Bolt",
        ],
        materials: ["Concrete", "Steel", "Wood", "Masonry", "CMU"],
    },
};
```

---

## Phase 5: Search Interface Improvements

### 5.1 Hybrid Search Implementation

```typescript
async function hybridSearch(params: {
    query: string;
    filters?: MetadataFilters;
    top_k?: number;
}) {
    // 1. Vector search for semantic similarity
    const vectorResults = await db
        .table("documents")
        .search(await embed(params.query))
        .filter(buildFilterExpression(params.filters))
        .limit(params.top_k * 2) // Over-retrieve for reranking
        .execute();

    // 2. BM25 full-text search for exact matches
    const ftsResults = await db
        .table("documents")
        .search(params.query, { type: "fts" })
        .filter(buildFilterExpression(params.filters))
        .limit(params.top_k * 2)
        .execute();

    // 3. Fusion (RRF - Reciprocal Rank Fusion)
    const fused = reciprocalRankFusion(vectorResults, ftsResults);

    // 4. Rerank using Cohere
    const reranked = await reranker.rerank({
        query: params.query,
        documents: fused.slice(0, 50),
        top_n: params.top_k,
    });

    return reranked;
}
```

### 5.2 Image Search Enhancement

```typescript
async function advancedImageSearch(description: string, filters?: Filters) {
    // 1. Generate image embedding from text description
    const textEmbedding = await clipModel.encodeText(description);

    // 2. Search image embeddings
    const imageResults = await db
        .table("drawing_images")
        .search(textEmbedding)
        .filter(filters)
        .limit(20)
        .execute();

    // 3. Use CadVLM to verify matches
    const verified = await Promise.all(
        imageResults.map(async (result) => {
            const analysis = await cadVLM.analyze({
                image: result.image,
                query: description,
            });

            return {
                ...result,
                confidence: analysis.relevance_score,
                explanation: analysis.reasoning,
            };
        }),
    );

    return verified.filter((v) => v.confidence > 0.7);
}
```

---

## Phase 6: Performance Optimization

### 6.1 Quantization for Cost Reduction

```typescript
// Reduce storage by 99% with minimal accuracy loss
const table = await db.createTable({
    name: "documents",
    data: chunks,
    embedding_options: {
        quantization: "int8", // or "binary"
        // Matryoshka Representation Learning
        dimensions: [1024, 512, 256, 128], // Adaptive sizing
    },
});
```

### 6.2 Caching Strategy

```typescript
class QueryCache {
    private cache = new LRU({ max: 1000 });

    async search(query: string, filters: Filters) {
        const cacheKey = this.buildKey(query, filters);

        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        const results = await this.executeSearch(query, filters);
        this.cache.set(cacheKey, results);

        return results;
    }
}
```

---

## Phase 7: Monitoring and Evaluation

### 7.1 Add Benchmarking Suite

```typescript
class ConstructionRAGBenchmark {
    private testQueries = [
        {
            query: "Find foundation details with anchor bolts",
            expected_doc_types: ["structural_detail"],
            expected_disciplines: ["structural"],
            min_precision: 0.8,
        },
        {
            query: "What is the concrete strength for footings?",
            expected_content_keywords: ["PSI", "f'c", "concrete"],
            min_precision: 0.9,
        },
    ];

    async run() {
        const results = await Promise.all(
            this.testQueries.map((test) => this.evaluate(test)),
        );

        return this.generateReport(results);
    }
}
```

### 7.2 Add Observability

```typescript
import { trace } from "@opentelemetry/api";

async function tracedSearch(query: string) {
    const span = trace.getTracer("claudehopper").startSpan("search");

    try {
        span.setAttribute("query", query);

        const start = Date.now();
        const results = await search(query);

        span.setAttribute("latency_ms", Date.now() - start);
        span.setAttribute("num_results", results.length);

        return results;
    } finally {
        span.end();
    }
}
```

---

## Implementation Priority

### Phase 1 (Weeks 1-2): Quick Wins

1. ✅ Upgrade to Voyage AI or Cohere embeddings
2. ✅ Add hybrid search (vector + BM25)
3. ✅ Implement basic reranking

### Phase 2 (Weeks 3-4): Core Improvements

4. ✅ Integrate CadVLM or CLIP for image understanding
5. ✅ Implement intelligent chunking
6. ✅ Add construction-specific metadata extraction

### Phase 3 (Weeks 5-6): Optimization

7. ✅ Implement quantization
8. ✅ Add caching layer
9. ✅ Create benchmark suite

### Phase 4 (Weeks 7-8): Production Hardening

10. ✅ Add monitoring/observability
11. ✅ Performance tuning
12. ✅ Documentation

---

## Technology Stack Recommendations

```json
{
    "embedding": {
        "text": "voyage-3-large OR cohere-embed-v4",
        "vision": "CadVLM OR CLIP ViT-L/14",
        "fallback_opensource": "BGE-M3 OR E5-Mistral"
    },
    "vector_db": {
        "primary": "LanceDB 0.15+",
        "index_type": "IVF_PQ",
        "quantization": "int8"
    },
    "reranking": "cohere-rerank-v3",
    "llm": {
        "metadata_extraction": "claude-sonnet-4 OR gpt-4",
        "vision_analysis": "CadVLM OR claude-4-with-vision"
    },
    "pdf_processing": {
        "library": "pdf.js OR pypdf",
        "image_extraction": "pdf2image @ 300dpi",
        "ocr": "tesseract-ocr (fallback)"
    },
    "monitoring": {
        "tracing": "OpenTelemetry",
        "metrics": "Prometheus",
        "logging": "Winston"
    }
}
```

---

## Expected Improvements

| Metric                  | Current   | Target         | Improvement  |
| ----------------------- | --------- | -------------- | ------------ |
| Search Accuracy (Top-5) | ~56%      | >90%           | +60%         |
| Query Latency           | 200-500ms | <100ms         | 2-5x faster  |
| Storage Cost            | Baseline  | -75%           | Quantization |
| Image Understanding     | None      | High           | CAD-aware    |
| Multilingual Support    | Limited   | 100+ languages | Global       |

---

## Key Architectural Changes

### Current Architecture

```
PDF → poppler extraction → text chunks → nomic-embed-text → LanceDB → basic search
```

### New Architecture

```
PDF → Classification (Vision LLM)
    ├─ CAD Drawing → High-res extraction → CadVLM analysis → Multimodal embeddings
    ├─ Specification → Semantic chunking → Voyage/Cohere embeddings
    └─ Calculations → Topic chunking → Voyage/Cohere embeddings
         ↓
    LanceDB (IVF_PQ index, quantized, FTS enabled)
         ↓
    Hybrid Search (Vector + BM25) → RRF Fusion → Cohere Reranking → Results
```

---

## Migration Strategy

### 1. Parallel Development

- Keep existing system running
- Build new system alongside
- A/B test queries
- Gradual cutover

### 2. Data Migration

```bash
# Export existing embeddings
npm run export -- --format parquet

# Re-embed with new models
npm run reembed -- --model voyage-3-large

# Import to new database
npm run import -- --db-path /new/db --validate
```

### 3. Backwards Compatibility

- Maintain existing MCP interface
- Add new tools gradually
- Deprecate old tools over 3 months

---

## Risk Mitigation

### Technical Risks

1. **Embedding model availability**: Have fallback to open-source models
2. **Cost overruns**: Implement usage monitoring and caps
3. **Latency regression**: Benchmark before/after, use caching
4. **Data loss**: Maintain backups of original PDFs and databases

### Operational Risks

1. **Migration complexity**: Phase rollout, comprehensive testing
2. **User disruption**: Maintain compatibility layer
3. **Performance degradation**: Load testing, gradual rollout

---

## Success Metrics

### Week 4 Checkpoint

- [ ] New embedding models integrated
- [ ] Hybrid search functional
- [ ] 50% accuracy improvement on test queries

### Week 8 Checkpoint

- [ ] Vision models integrated
- [ ] Full metadata extraction working
- [ ] 80% accuracy improvement
- [ ] Sub-150ms latency

### Week 12 (Production)

- [ ] 90%+ accuracy on construction queries
- [ ] Sub-100ms latency
- [ ] Monitoring dashboards live
- [ ] Documentation complete

---

## Resources and References

### Key Technologies

- **LanceDB Documentation**: https://lancedb.github.io/lancedb/
- **Voyage AI**: https://www.voyageai.com/
- **Cohere Embeddings**: https://docs.cohere.com/docs/embeddings
- **CadVLM Paper**: https://arxiv.org/abs/2409.17457
- **Model Context Protocol**: https://modelcontextprotocol.io/

### Research Papers

1. "CadVLM: Bridging Language and Vision in CAD Generation" (2024)
2. "E5-Mistral: Contrastive Embeddings for Retrieval" (2024)
3. "BGE-M3: Hybrid Dense-Sparse Retrieval" (2025)
4. "HyDE: Hypothetical Document Embeddings" (2023)

### Benchmarks

- MTEB (Massive Text Embedding Benchmark)
- BEIR (Benchmark for Information Retrieval)
- Custom construction document benchmark (to be created)

---

## Development Environment Setup

### Prerequisites

```bash
# Node.js 18+
nvm install 18
nvm use 18

# TypeScript
npm install -g typescript ts-node

# Ollama (for local testing)
curl https://ollama.ai/install.sh | sh
ollama pull llama3.1:8b

# Python (for some utilities)
python3 -m venv venv
source venv/bin/activate
pip install pdf2image pypdf pytesseract
```

### Initial Setup

```bash
# Clone repository
git clone https://github.com/Arborist-ai/ClaudeHopper.git
cd ClaudeHopper

# Install dependencies
npm install

# Install new dependencies
npm install @voyageai/voyageai cohere-ai lru-cache
npm install @opentelemetry/api @opentelemetry/sdk-node

# Build
npm run build

# Run tests
npm test
```

---

## Appendix A: Detailed Code Examples

### A.1 Complete Embedding Service

```typescript
import { VoyageAIClient } from "@voyageai/voyageai";
import { CohereClient } from "cohere-ai";

export class EmbeddingService {
    private voyageClient: VoyageAIClient;
    private cohereClient: CohereClient;

    constructor(config: { voyageApiKey: string; cohereApiKey: string }) {
        this.voyageClient = new VoyageAIClient({ apiKey: config.voyageApiKey });
        this.cohereClient = new CohereClient({ apiKey: config.cohereApiKey });
    }

    async embedText(
        texts: string[],
        model: "voyage" | "cohere" = "voyage",
    ): Promise<number[][]> {
        if (model === "voyage") {
            const response = await this.voyageClient.embed({
                input: texts,
                model: "voyage-3-large",
                inputType: "document",
            });
            return response.embeddings;
        } else {
            const response = await this.cohereClient.embed({
                texts,
                model: "embed-v4",
                inputType: "search_document",
            });
            return response.embeddings;
        }
    }

    async embedQuery(
        query: string,
        model: "voyage" | "cohere" = "voyage",
    ): Promise<number[]> {
        if (model === "voyage") {
            const response = await this.voyageClient.embed({
                input: [query],
                model: "voyage-3-large",
                inputType: "query",
            });
            return response.embeddings[0];
        } else {
            const response = await this.cohereClient.embed({
                texts: [query],
                model: "embed-v4",
                inputType: "search_query",
            });
            return response.embeddings[0];
        }
    }
}
```

### A.2 Complete Hybrid Search Implementation

```typescript
import { connect, Table } from "vectordb";

export class HybridSearchEngine {
    private db: any;
    private table: Table;
    private embedService: EmbeddingService;
    private cohereClient: CohereClient;

    async search(params: { query: string; filters?: any; top_k?: number }) {
        const { query, filters, top_k = 10 } = params;

        // 1. Embed query
        const queryEmbedding = await this.embedService.embedQuery(query);

        // 2. Vector search
        let vectorQuery = this.table.search(queryEmbedding).limit(top_k * 5);

        if (filters) {
            vectorQuery = this.applyFilters(vectorQuery, filters);
        }

        const vectorResults = await vectorQuery.execute();

        // 3. Full-text search
        let ftsQuery = this.table
            .search(query, { type: "fts" })
            .limit(top_k * 5);

        if (filters) {
            ftsQuery = this.applyFilters(ftsQuery, filters);
        }

        const ftsResults = await ftsQuery.execute();

        // 4. Reciprocal Rank Fusion
        const fused = this.reciprocalRankFusion(vectorResults, ftsResults, {
            k: 60,
        });

        // 5. Rerank
        const reranked = await this.cohereClient.rerank({
            model: "rerank-v3.5",
            query,
            documents: fused.slice(0, 50).map((r) => r.text),
            topN: top_k,
            returnDocuments: true,
        });

        return reranked.results.map((r) => ({
            ...fused[r.index],
            score: r.relevanceScore,
        }));
    }

    private reciprocalRankFusion(
        results1: any[],
        results2: any[],
        options: { k: number } = { k: 60 },
    ) {
        const scores = new Map<string, number>();

        results1.forEach((doc, rank) => {
            const score = 1 / (options.k + rank + 1);
            scores.set(doc.id, (scores.get(doc.id) || 0) + score);
        });

        results2.forEach((doc, rank) => {
            const score = 1 / (options.k + rank + 1);
            scores.set(doc.id, (scores.get(doc.id) || 0) + score);
        });

        const combined = [...results1, ...results2];
        const unique = Array.from(
            new Map(combined.map((d) => [d.id, d])).values(),
        );

        return unique
            .map((doc) => ({ ...doc, fusionScore: scores.get(doc.id) || 0 }))
            .sort((a, b) => b.fusionScore - a.fusionScore);
    }

    private applyFilters(query: any, filters: any) {
        if (filters.discipline) {
            query = query.where(`discipline = '${filters.discipline}'`);
        }
        if (filters.drawingType) {
            query = query.where(`drawingType = '${filters.drawingType}'`);
        }
        if (filters.project) {
            query = query.where(`project = '${filters.project}'`);
        }
        return query;
    }
}
```

### A.3 CAD Vision Processing

```typescript
import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";

export class CadVisionProcessor {
    private anthropic: Anthropic;

    constructor(apiKey: string) {
        this.anthropic = new Anthropic({ apiKey });
    }

    async analyzeDrawing(imagePath: string, query?: string) {
        const imageData = fs.readFileSync(imagePath);
        const base64Image = imageData.toString("base64");

        const prompt = query
            ? `Analyze this construction drawing and answer: ${query}`
            : `Analyze this construction drawing and extract:
        1. Drawing type (plan, elevation, section, detail)
        2. Discipline (structural, architectural, civil, MEP)
        3. Key components visible
        4. Dimensions and measurements shown
        5. Material callouts
        6. Notes and annotations
        7. Reference to other drawings or specifications`;

        const response = await this.anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 2000,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "image",
                            source: {
                                type: "base64",
                                media_type: "image/png",
                                data: base64Image,
                            },
                        },
                        {
                            type: "text",
                            text: prompt,
                        },
                    ],
                },
            ],
        });

        return this.parseDrawingAnalysis(response.content[0].text);
    }

    private parseDrawingAnalysis(text: string) {
        // Parse structured output from Claude's analysis
        // This would extract specific fields based on the response format
        return {
            drawingType: this.extractField(text, "Drawing type"),
            discipline: this.extractField(text, "Discipline"),
            components: this.extractList(text, "Key components"),
            dimensions: this.extractDimensions(text),
            materials: this.extractList(text, "Material callouts"),
            notes: this.extractList(text, "Notes"),
            references: this.extractReferences(text),
        };
    }

    private extractField(text: string, fieldName: string): string {
        const regex = new RegExp(`${fieldName}:\\s*([^\n]+)`);
        const match = text.match(regex);
        return match ? match[1].trim() : "";
    }

    private extractList(text: string, sectionName: string): string[] {
        const regex = new RegExp(
            `${sectionName}:[^\n]*\n([\\s\\S]*?)(?=\n\n|\\d+\\.|$)`,
        );
        const match = text.match(regex);
        if (!match) return [];

        return match[1]
            .split("\n")
            .map((line) => line.replace(/^[-*•]\s*/, "").trim())
            .filter((line) => line.length > 0);
    }

    private extractDimensions(
        text: string,
    ): Array<{ value: string; unit: string }> {
        // Extract dimension patterns like "12'-6\"", "3.5m", "450mm"
        const patterns = [
            /(\d+(?:\.\d+)?)\s*(?:ft|')/gi,
            /(\d+(?:\.\d+)?)\s*(?:in|")/gi,
            /(\d+(?:\.\d+)?)\s*(?:m|mm|cm)/gi,
        ];

        const dimensions: Array<{ value: string; unit: string }> = [];

        patterns.forEach((pattern) => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                dimensions.push({
                    value: match[1],
                    unit: match[0].replace(match[1], "").trim(),
                });
            }
        });

        return dimensions;
    }

    private extractReferences(text: string): string[] {
        // Extract drawing references like "See Detail 3/A5.1" or "Ref: S-101"
        const pattern = /(?:See|Ref(?:erence)?)[:\s]+([A-Z0-9\-\/\.]+)/gi;
        const matches = [...text.matchAll(pattern)];
        return matches.map((m) => m[1]);
    }
}
```

---

## Appendix B: Migration Scripts

### B.1 Re-embedding Script

```typescript
import { EmbeddingService } from "./embedding-service";
import { connect } from "vectordb";
import * as fs from "fs";
import * as path from "path";

async function migrateEmbeddings() {
    const oldDb = await connect("/old/database/path");
    const newDb = await connect("/new/database/path");

    const embedService = new EmbeddingService({
        voyageApiKey: process.env.VOYAGE_API_KEY!,
        cohereApiKey: process.env.COHERE_API_KEY!,
    });

    // Read old catalog
    const oldCatalog = await oldDb.openTable("catalog");
    const oldDocs = await oldCatalog.search([0, 0, 0]).limit(10000).execute();

    console.log(`Migrating ${oldDocs.length} documents...`);

    // Batch process
    const batchSize = 100;
    for (let i = 0; i < oldDocs.length; i += batchSize) {
        const batch = oldDocs.slice(i, i + batchSize);

        console.log(`Processing batch ${i / batchSize + 1}...`);

        // Re-embed with new model
        const texts = batch.map((doc) => doc.text);
        const embeddings = await embedService.embedText(texts, "voyage");

        // Create new records with updated embeddings
        const newRecords = batch.map((doc, idx) => ({
            ...doc,
            vector: embeddings[idx],
            embedding_model: "voyage-3-large",
            migrated_at: new Date().toISOString(),
        }));

        // Insert into new database
        await newDb.createTable({
            name: "catalog",
            data: newRecords,
            mode: "append",
        });

        console.log(`Migrated ${i + batch.length} / ${oldDocs.length}`);
    }

    console.log("Migration complete!");
}

migrateEmbeddings().catch(console.error);
```

### B.2 Database Validation Script

```typescript
async function validateMigration() {
    const oldDb = await connect("/old/database/path");
    const newDb = await connect("/new/database/path");

    const oldCatalog = await oldDb.openTable("catalog");
    const newCatalog = await newDb.openTable("catalog");

    // Test queries
    const testQueries = [
        "foundation details with anchor bolts",
        "structural steel connections",
        "concrete strength requirements",
        "seismic design criteria",
    ];

    const results = [];

    for (const query of testQueries) {
        console.log(`\nTesting: "${query}"`);

        // Old system
        const oldResults = await oldCatalog
            .search(await embedOld(query))
            .limit(5)
            .execute();

        // New system
        const newResults = await newCatalog
            .search(await embedNew(query))
            .limit(5)
            .execute();

        console.log("Old system top result:", oldResults[0]?.metadata?.source);
        console.log("New system top result:", newResults[0]?.metadata?.source);

        results.push({
            query,
            oldTopResult: oldResults[0],
            newTopResult: newResults[0],
            improvement: calculateImprovement(oldResults, newResults),
        });
    }

    // Generate report
    console.log("\n=== Migration Validation Report ===");
    results.forEach((r) => {
        console.log(`Query: ${r.query}`);
        console.log(
            `Improvement: ${r.improvement > 0 ? "+" : ""}${r.improvement}%`,
        );
    });
}
```

---

## Appendix C: Configuration Templates

### C.1 Environment Variables

```bash
# .env.example

# API Keys
VOYAGE_API_KEY=your_voyage_api_key
COHERE_API_KEY=your_cohere_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
OPENAI_API_KEY=your_openai_api_key  # Optional, for fallback

# Database
DATABASE_PATH=/path/to/lancedb
DATABASE_BACKUP_PATH=/path/to/backups

# Processing
BATCH_SIZE=100
MAX_CONCURRENT_REQUESTS=10
PDF_DPI=300

# Search
DEFAULT_TOP_K=10
RERANK_TOP_N=50
FUSION_K=60

# Cache
CACHE_MAX_SIZE=1000
CACHE_TTL_SECONDS=3600

# Monitoring
ENABLE_TRACING=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318

# Feature Flags
ENABLE_VISION_MODELS=true
ENABLE_HYBRID_SEARCH=true
ENABLE_RERANKING=true
ENABLE_CACHING=true
```

### C.2 TypeScript Configuration

```json
{
    "compilerOptions": {
        "target": "ES2022",
        "module": "commonjs",
        "lib": ["ES2022"],
        "outDir": "./dist",
        "rootDir": "./src",
        "strict": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "forceConsistentCasingInFileNames": true,
        "moduleResolution": "node",
        "resolveJsonModule": true,
        "declaration": true,
        "declarationMap": true,
        "sourceMap": true,
        "types": ["node"]
    },
    "include": ["src/**/*"],
    "exclude": ["node_modules", "dist", "test"]
}
```

### C.3 Package.json Scripts

```json
{
    "scripts": {
        "build": "tsc",
        "dev": "ts-node src/index.ts",
        "start": "node dist/index.js",
        "test": "jest",
        "test:watch": "jest --watch",
        "lint": "eslint src/**/*.ts",
        "format": "prettier --write src/**/*.ts",

        "seed": "ts-node src/tools/seed.ts",
        "migrate": "ts-node src/tools/migrate.ts",
        "validate": "ts-node src/tools/validate.ts",
        "benchmark": "ts-node src/tools/benchmark.ts",

        "mcp:inspect": "npx @modelcontextprotocol/inspector dist/index.js",
        "mcp:test": "ts-node src/tools/test-mcp.ts"
    }
}
```

---

This completes the comprehensive ClaudeHopper refactoring plan. The document provides a complete roadmap from current state to production-ready, modern RAG system optimized for construction document analysis.
