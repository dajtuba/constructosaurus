# Constructosaurus Architecture Overview

## Purpose

Constructosaurus is a TypeScript-based construction document processing system that extracts structured data from PDF construction documents (drawings, specifications, schedules) to generate material takeoffs and enable intelligent querying.

## Key Components

### 1. Extraction Layer (`src/extraction/`)
- **materials-extractor.ts**: Extracts material specifications from documents
- **schedule-parser.ts**: Parses tabular schedule data
- **table-extractor.ts**: Extracts tables from PDFs
- **structural-table-parser.ts**: Specialized parser for structural schedules

### 2. Processing Layer (`src/processing/`)
- **document-processor.ts**: Orchestrates document processing pipeline
- **sheet-processor.ts**: Processes individual sheets/pages
- **intelligent-processor.ts**: Advanced processing with AI/ML
- **schedule-parser.ts**: Processes schedule data

### 3. Storage Layer (`src/storage/`)
- **schedule-store.ts**: LanceDB-based vector storage for schedules
- Uses LanceDB for efficient vector similarity search
- Stores processed documents, schedules, and extracted data

### 4. Services Layer (`src/services/`)
- **schedule-query-service.ts**: Query interface for schedule data
- **quantity-calculator.ts**: Calculates material quantities
- Business logic and API services

### 5. Vision Layer (`src/vision/`)
- **cad-vision-processor.ts**: Computer vision for CAD drawings
- **drawing-vision-analyzer.ts**: Analyzes drawing content
- **ollama-vision-analyzer.ts**: LLM-based vision analysis
- **pdf-image-converter.ts**: Converts PDFs to images for vision processing

### 6. Supporting Components
- **classification/**: Document type classification
- **search/**: Hybrid search engine with reranking
- **embeddings/**: Text embedding generation
- **cache/**: Query result caching
- **mcp/**: Model Context Protocol tools

## Technology Stack

- **Language**: TypeScript
- **Vector Database**: LanceDB
- **Vision/LLM**: Ollama, Claude (via Anthropic API)
- **PDF Processing**: pdf-parse, pdf-lib
- **Build**: TypeScript compiler

## Data Flow

1. **Ingestion**: PDF documents loaded via `document-processor`
2. **Classification**: Documents classified by type (drawing, spec, schedule)
3. **Extraction**: Relevant data extracted based on document type
4. **Processing**: Extracted data processed and structured
5. **Storage**: Processed data stored in LanceDB with embeddings
6. **Query**: Users query via search/query services

## Architecture Principles

- **Modular**: Clear separation of concerns across layers
- **Extensible**: Easy to add new extractors and processors
- **Type-Safe**: Full TypeScript typing throughout
- **Vector-First**: Leverages vector embeddings for semantic search
- **AI-Powered**: Uses LLMs for intelligent extraction and analysis
