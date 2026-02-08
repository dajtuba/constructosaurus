# Constructosaurus Processing Pipeline

## Overview

The Constructosaurus processing pipeline transforms raw PDF construction documents into structured, queryable data through a multi-stage process.

## Pipeline Stages

### Stage 1: Document Ingestion
**Input**: PDF file path  
**Output**: Raw document buffer and metadata  
**Components**: `document-processor.ts`

- Load PDF from filesystem
- Extract basic metadata (page count, file size)
- Prepare for classification

### Stage 2: Document Classification
**Input**: Raw document  
**Output**: Document type and discipline  
**Components**: `classification/document-classifier.ts`

- Classify document type: Drawing, Specification, Schedule
- Identify discipline: Structural, Architectural, Civil, MEP
- Route to appropriate processor

### Stage 3: Content Extraction
**Input**: Classified document  
**Output**: Extracted text, tables, and images  
**Components**: `extraction/*`

**For Schedules**:
- `table-extractor.ts`: Extract tables from PDF
- `schedule-parser.ts`: Parse table structure
- `structural-table-parser.ts`: Parse structural-specific formats

**For Drawings**:
- `pdf-image-converter.ts`: Convert pages to images
- `cad-vision-processor.ts`: Analyze CAD content
- `drawing-vision-analyzer.ts`: Extract annotations and callouts

**For Specifications**:
- `materials-extractor.ts`: Extract material specifications
- Text parsing for requirements and quantities

### Stage 4: Intelligent Processing
**Input**: Extracted raw data  
**Output**: Structured, enriched data  
**Components**: `processing/intelligent-processor.ts`

- Apply domain knowledge and rules
- Resolve ambiguities using LLM
- Extract quantities and relationships
- Link related items across documents

### Stage 5: Storage
**Input**: Processed structured data  
**Output**: Persisted data with embeddings  
**Components**: `storage/schedule-store.ts`, `embeddings/embedding-service.ts`

- Generate text embeddings for semantic search
- Store in LanceDB vector database
- Index for efficient retrieval
- Maintain relationships and metadata

### Stage 6: Query & Retrieval
**Input**: User query  
**Output**: Relevant results  
**Components**: `services/schedule-query-service.ts`, `search/hybrid-search-engine.ts`

- Parse user query
- Generate query embeddings
- Perform hybrid search (vector + keyword)
- Rerank results
- Return structured response

## Data Types Processed

- **Schedules**: Tabular data (beam schedules, column schedules, etc.)
- **Materials**: Material specifications and quantities
- **Dimensions**: Measurements and sizes
- **Drawings**: Visual content, annotations, callouts
- **Specifications**: Text-based requirements

## Error Handling

- Validation at each stage
- Graceful degradation for partial failures
- Logging and error reporting
- Retry logic for transient failures

## Performance Optimization

- Caching (`cache/query-cache.ts`) for repeated queries
- Batch processing for multiple documents
- Parallel processing where possible
- Incremental updates to vector store

## Monitoring & Observability

- Processing metrics (time, success rate)
- Data quality checks
- Extraction confidence scores
- Query performance tracking
