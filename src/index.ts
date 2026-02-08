import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { EmbeddingService } from "./embeddings/embedding-service";
import { HybridSearchEngine } from "./search/hybrid-search-engine";
import { RerankingService } from "./search/reranking-service";
import { ConstructionDocumentProcessor } from "./processing/document-processor";
import { MaterialsExtractor } from "./extraction/materials-extractor";
import { QueryCache } from "./cache/query-cache";
import { ScheduleStore } from "./storage/schedule-store";
import { ScheduleQueryService } from "./services/schedule-query-service";
import * as path from "path";

// No dotenv needed - env vars come from MCP config

class ConstructosaurusServer {
  private server: Server;
  private embedService: EmbeddingService;
  private searchEngine: HybridSearchEngine;
  private rerankService?: RerankingService;
  private docProcessor: ConstructionDocumentProcessor;
  private materialsExtractor: MaterialsExtractor;
  private cache: QueryCache;
  private scheduleQueryService?: ScheduleQueryService;

  constructor() {
    this.server = new Server(
      {
        name: "constructosaurus",
        version: "2.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    const anthropicKey = process.env.ANTHROPIC_API_KEY!;
    const cohereKey = process.env.COHERE_API_KEY;
    const dbPath = process.env.DATABASE_PATH || "./data/lancedb";
    const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";
    const embedModel = process.env.EMBED_MODEL || "mxbai-embed-large";

    this.embedService = new EmbeddingService(embedModel, ollamaUrl);
    this.docProcessor = new ConstructionDocumentProcessor(anthropicKey);
    this.materialsExtractor = new MaterialsExtractor();
    
    // Initialize schedule query service
    const scheduleStorePath = path.join(path.dirname(dbPath), "schedules");
    try {
      const scheduleStore = new ScheduleStore(scheduleStorePath);
      this.scheduleQueryService = new ScheduleQueryService(scheduleStore);
    } catch (error) {
      console.error("Failed to initialize schedule query service:", error);
    }
    
    if (cohereKey && process.env.ENABLE_RERANKING === "true") {
      this.rerankService = new RerankingService(cohereKey);
    }

    this.searchEngine = new HybridSearchEngine(
      dbPath,
      this.embedService,
      this.rerankService
    );

    this.cache = new QueryCache(
      parseInt(process.env.CACHE_MAX_SIZE || "1000"),
      parseInt(process.env.CACHE_TTL_SECONDS || "3600") * 1000
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "search_construction_docs",
          description: "Search construction documents using hybrid vector and keyword search. Returns relevant document chunks with full context.",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Search query for construction documents",
              },
              discipline: {
                type: "string",
                description: "Filter by discipline (Structural, Architectural, Civil, Mechanical, Electrical, Plumbing)",
              },
              drawingType: {
                type: "string",
                description: "Filter by drawing type (Plan, Elevation, Section, Detail, Schedule)",
              },
              project: {
                type: "string",
                description: "Filter by project name",
              },
              top_k: {
                type: "number",
                description: "Number of results to return (default: 10)",
              },
            },
            required: ["query"],
          },
        },
        {
          name: "extract_materials",
          description: "Extract construction materials from documents. Use when user asks about materials, quantities, or supply lists. Returns text prompt for Claude to analyze and extract structured material data.",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "What materials to extract (e.g., 'foundation materials', 'all structural steel')",
              },
              discipline: {
                type: "string",
                description: "Filter by discipline to narrow search",
              },
              drawingNumber: {
                type: "string",
                description: "Extract from specific drawing",
              },
              top_k: {
                type: "number",
                description: "Number of document chunks to analyze (default: 20)",
              },
            },
            required: ["query"],
          },
        },
        {
          name: "ingest_document",
          description: "Process and ingest a construction document (PDF) into the database",
          inputSchema: {
            type: "object",
            properties: {
              pdfPath: {
                type: "string",
                description: "Path to the PDF file to ingest",
              },
            },
            required: ["pdfPath"],
          },
        },
        {
          name: "analyze_drawing",
          description: "Analyze a construction drawing image using vision AI",
          inputSchema: {
            type: "object",
            properties: {
              imagePath: {
                type: "string",
                description: "Path to the drawing image file",
              },
              query: {
                type: "string",
                description: "Optional specific question about the drawing",
              },
            },
            required: ["imagePath"],
          },
        },
        {
          name: "query_schedules",
          description: "Query construction schedules (footing, door, window, etc.) extracted from drawings. Search by mark (e.g., 'F1'), schedule type, or get all schedules.",
          inputSchema: {
            type: "object",
            properties: {
              mark: {
                type: "string",
                description: "Schedule mark/ID to find (e.g., 'F1', 'D101', 'W3')",
              },
              scheduleType: {
                type: "string",
                description: "Type of schedule: footing_schedule, door_schedule, window_schedule, rebar_schedule, room_finish_schedule",
              },
              documentId: {
                type: "string",
                description: "Document ID to filter by",
              },
            },
          },
        },
        {
          name: "get_schedule_stats",
          description: "Get statistics about extracted schedules including total count and breakdown by type.",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "search_construction_docs":
            return await this.handleSearch(args);
          case "extract_materials":
            return await this.handleExtractMaterials(args);
          case "ingest_document":
            return await this.handleIngest(args);
          case "analyze_drawing":
            return await this.handleAnalyze(args);
          case "query_schedules":
            return await this.handleQuerySchedules(args);
          case "get_schedule_stats":
            return await this.handleScheduleStats(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    });
  }

  private async handleExtractMaterials(args: any) {
    // Search for relevant chunks
    const results = await this.searchEngine.search({
      query: args.query,
      discipline: args.discipline,
      top_k: args.top_k || 20,
    });

    if (results.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "No relevant documents found for materials extraction.",
          },
        ],
      };
    }

    // Combine text from results
    const combinedText = results
      .map(r => `[${r.drawingNumber}] ${r.text}`)
      .join("\n\n---\n\n")
      .substring(0, 15000); // Limit to avoid token overflow

    // Generate extraction prompt
    const prompt = this.materialsExtractor.extractMaterialsPrompt(
      combinedText,
      `Analyzing ${results.length} document chunks from ${results[0].project || "construction project"}`
    );

    return {
      content: [
        {
          type: "text",
          text: prompt,
        },
      ],
    };
  }

  private async handleSearch(args: any) {
    const searchParams = {
      query: args.query,
      filters: {
        discipline: args.discipline,
        drawingType: args.drawingType,
        project: args.project,
      },
      top_k: args.top_k || 10,
    };

    // Check cache
    const cached = this.cache.get(searchParams);
    if (cached) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ results: cached, cached: true }, null, 2),
          },
        ],
      };
    }

    const results = await this.searchEngine.search(searchParams);
    this.cache.set(searchParams, results);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ results, cached: false }, null, 2),
        },
      ],
    };
  }

  private async handleIngest(args: any) {
    const documents = await this.docProcessor.process(args.pdfPath);
    
    // Embed documents
    const texts = documents.map(d => d.text);
    const embeddings = await this.embedService.embedText(texts);
    
    const docsWithEmbeddings = documents.map((doc, idx) => ({
      ...doc,
      vector: embeddings[idx],
    }));

    await this.searchEngine.addDocuments(docsWithEmbeddings);

    return {
      content: [
        {
          type: "text",
          text: `Successfully ingested ${documents.length} document(s) from ${args.pdfPath}`,
        },
      ],
    };
  }

  private async handleAnalyze(args: any) {
    const analysis = await this.docProcessor["cadVision"].analyzeDrawing(
      args.imagePath,
      args.query
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(analysis, null, 2),
        },
      ],
    };
  }

  private async handleQuerySchedules(args: any) {
    if (!this.scheduleQueryService) {
      return {
        content: [
          {
            type: "text",
            text: "Schedule query service not available. Schedules may not have been extracted yet.",
          },
        ],
      };
    }

    const result = this.scheduleQueryService.querySchedules({
      mark: args.mark,
      scheduleType: args.scheduleType,
      documentId: args.documentId
    });

    if (!result.found) {
      return {
        content: [
          {
            type: "text",
            text: result.message || "No schedules found matching criteria.",
          },
        ],
      };
    }

    let output = "";

    if (args.mark && result.entry) {
      output += `# Schedule Entry: ${result.entry.mark}\n\n`;
      output += `**Type:** ${result.schedule?.scheduleType}\n`;
      output += `**Page:** ${result.schedule?.pageNumber}\n\n`;
      output += `## Data\n\`\`\`json\n${JSON.stringify(result.entry.data, null, 2)}\n\`\`\`\n`;
    } else if (args.scheduleType && result.entries) {
      output += `# ${args.scheduleType}\n\n`;
      output += `Found ${result.totalEntries} entries in ${result.count} schedule(s)\n\n`;
      
      result.entries.slice(0, 10).forEach((entry: any) => {
        output += `## ${entry.mark} (Page ${entry.pageNumber})\n`;
        output += `\`\`\`json\n${JSON.stringify(entry.data, null, 2)}\n\`\`\`\n\n`;
      });

      if (result.totalEntries > 10) {
        output += `\n_Showing first 10 of ${result.totalEntries} entries_\n`;
      }
    } else {
      output += `# All Schedules\n\n`;
      output += `Found ${result.count} schedules\n\n`;
      output += `## Statistics\n`;
      output += `\`\`\`json\n${JSON.stringify(result.stats, null, 2)}\n\`\`\`\n`;
    }

    return {
      content: [
        {
          type: "text",
          text: output,
        },
      ],
    };
  }

  private async handleScheduleStats(args: any) {
    if (!this.scheduleQueryService) {
      return {
        content: [
          {
            type: "text",
            text: "Schedule query service not available.",
          },
        ],
      };
    }

    const stats = this.scheduleQueryService.getStats();

    let output = "# Schedule Statistics\n\n";
    output += `**Total Schedules:** ${stats.totalSchedules}\n`;
    output += `**Total Entries:** ${stats.totalEntries}\n\n`;
    output += `## By Type\n`;
    
    Object.entries(stats.byType).forEach(([type, count]) => {
      output += `- ${type}: ${count}\n`;
    });

    return {
      content: [
        {
          type: "text",
          text: output,
        },
      ],
    };
  }

  async run() {
    await this.searchEngine.initialize();
    
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.error("Constructosaurus MCP Server running on stdio");
  }
}

const server = new ConstructosaurusServer();
server.run().catch(console.error);
