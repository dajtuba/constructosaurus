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
import { HybridMCPTools } from "./mcp/hybrid-tools";
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
  private hybridTools: HybridMCPTools;

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

    this.hybridTools = new HybridMCPTools(dbPath);

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
              sheetNumbers: {
                type: "array",
                items: { type: "string" },
                description: "Filter by specific sheet numbers (e.g., ['S2.1', 'S3.0'])",
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
        {
          name: "detect_conflicts",
          description: "Detect conflicts between construction documents. Finds size mismatches (e.g., beam marked W18x106 on one sheet but W18x96 on another) and dimension conflicts across drawings.",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Search query to find documents to check for conflicts (e.g., 'structural steel beams')",
              },
              discipline: {
                type: "string",
                description: "Filter by discipline",
              },
              top_k: {
                type: "number",
                description: "Number of documents to compare (default: 20)",
              },
            },
            required: ["query"],
          },
        },
        {
          name: "query_member",
          description: "⚡ Fast database query for member designation (D1, D2, etc.). Returns pre-processed member data with shell-set, structural calc, and ForteWEB info plus conflicts in 10-100ms.",
          inputSchema: {
            type: "object",
            properties: {
              designation: {
                type: "string",
                description: "Member designation (e.g., 'D1', 'D2', 'D3')",
              },
            },
            required: ["designation"],
          },
        },
        {
          name: "get_material_takeoff",
          description: "⚡ Fast database query for material takeoff by sheet. Returns pre-calculated quantities and specs in 10-100ms.",
          inputSchema: {
            type: "object",
            properties: {
              sheet: {
                type: "string",
                description: "Sheet number (e.g., 'S2.1', 'S2.2')",
              },
            },
            required: ["sheet"],
          },
        },
        {
          name: "find_conflicts",
          description: "⚡ Fast database query for pre-computed conflicts. Returns known spec mismatches and conflicts in 10-100ms.",
          inputSchema: {
            type: "object",
            properties: {
              sheet: {
                type: "string",
                description: "Optional sheet filter (e.g., 'S2.1')",
              },
              severity: {
                type: "string",
                description: "Optional severity filter: 'critical', 'warning', 'info'",
              },
            },
          },
        },
        {
          name: "list_sheets",
          description: "⚡ Fast database query for all sheets in document set. Returns sheet metadata in 10-100ms.",
          inputSchema: {
            type: "object",
            properties: {
              discipline: {
                type: "string",
                description: "Optional discipline filter (Structural, Architectural, etc.)",
              },
            },
          },
        },
        {
          name: "search_documents",
          description: "⚡ Fast semantic search across all documents. Returns relevant chunks with embeddings in 10-100ms.",
          inputSchema: {
            type: "object",
            properties: {
              text: {
                type: "string",
                description: "Search text query",
              },
              limit: {
                type: "number",
                description: "Max results (default: 10)",
              },
            },
            required: ["text"],
          },
        },
        {
          name: "get_member_verified",
          description: "🔄 HYBRID: Get member data from database then verify with live vision analysis. Combines speed of DB lookup with accuracy of vision verification. Caches results for 5 minutes.",
          inputSchema: {
            type: "object",
            properties: {
              designation: {
                type: "string",
                description: "Member designation (e.g., 'D1', 'D2', 'B1')",
              },
            },
            required: ["designation"],
          },
        },
        {
          name: "get_inventory_verified",
          description: "🔄 HYBRID: Get material inventory from database then spot-check 3 random items with vision analysis. Provides confidence score for inventory accuracy.",
          inputSchema: {
            type: "object",
            properties: {
              sheet: {
                type: "string",
                description: "Sheet name (e.g., 'S2.1', 'S2.2')",
              },
            },
            required: ["sheet"],
          },
        },
        {
          name: "find_conflicts_verified",
          description: "🔄 HYBRID: Find specification conflicts from database then verify each with image proof. Eliminates false positives by checking actual drawings.",
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
          case "detect_conflicts":
            return await this.handleDetectConflicts(args);
          case "query_member":
            return await this.handleQueryMember(args);
          case "get_material_takeoff":
            return await this.handleGetMaterialTakeoff(args);
          case "find_conflicts":
            return await this.handleFindConflicts(args);
          case "list_sheets":
            return await this.handleListSheets(args);
          case "search_documents":
            return await this.handleSearchDocuments(args);
          case "get_member_verified":
            return await this.handleGetMemberVerified(args);
          case "get_inventory_verified":
            return await this.handleGetInventoryVerified(args);
          case "find_conflicts_verified":
            return await this.handleFindConflictsVerified(args);
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
      discipline: args.discipline,
      drawingType: args.drawingType,
      project: args.project,
      sheetNumbers: args.sheetNumbers,
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

    // Build agent-friendly structured output
    const output: any = {
      query: args.query,
      resultCount: results.length,
      results: results.map(r => {
        const structured: any = {
          sheetNumber: r.sheetNumber || r.drawingNumber,
          pageNumber: r.pageNumber,
          discipline: r.discipline,
          drawingType: r.drawingType,
          text: r.text,
          score: r.score,
        };
        
        // Include extracted dimensions if present
        if (r.dimensions && r.dimensions.length > 0) {
          structured.dimensions = r.dimensions;
        }
        
        // Include cross-references if present
        if (r.crossReferences && r.crossReferences.length > 0) {
          structured.crossReferences = r.crossReferences.map(cr => ({
            type: cr.type,
            reference: cr.reference,
          }));
        }
        
        return structured;
      }),
    };

    // Auto-attach related schedule entries for pages in results
    if (this.scheduleQueryService) {
      const pages = new Set(results.map(r => r.pageNumber).filter(Boolean));
      const relatedSchedules: any[] = [];
      
      const allSchedules = this.scheduleQueryService.querySchedules({});
      if (allSchedules.schedules) {
        for (const sched of allSchedules.schedules) {
          if (pages.has(sched.pageNumber)) {
            const entries = this.scheduleQueryService.querySchedules({ scheduleType: sched.scheduleType });
            if (entries.entries) {
              const pageEntries = entries.entries.filter((e: any) => e.pageNumber === sched.pageNumber);
              if (pageEntries.length > 0) {
                relatedSchedules.push({
                  type: sched.scheduleType,
                  page: sched.pageNumber,
                  method: sched.extractionMethod,
                  entries: pageEntries.map((e: any) => ({ mark: e.mark, ...e.data })),
                });
              }
            }
          }
        }
      }
      
      if (relatedSchedules.length > 0) {
        output.relatedSchedules = relatedSchedules;
      }
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(output, null, 2),
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

  private async handleDetectConflicts(args: any) {
    const results = await this.searchEngine.search({
      query: args.query,
      discipline: args.discipline,
      top_k: args.top_k || 20,
    });

    const conflicts = this.searchEngine.detectConflicts(results);

    if (conflicts.length === 0) {
      return {
        content: [{
          type: "text",
          text: `No conflicts detected across ${results.length} documents for "${args.query}".`,
        }],
      };
    }

    let output = `# Document Conflicts Detected\n\nFound ${conflicts.length} conflict(s) across ${results.length} documents:\n\n`;
    
    for (const conflict of conflicts) {
      output += `## ${conflict.severity.toUpperCase()}: ${conflict.type.replace(/_/g, ' ')} - ${conflict.element}\n`;
      for (const doc of conflict.documents) {
        output += `- **${doc.sheet}**: ${doc.value}\n`;
      }
      output += '\n';
    }

    return {
      content: [{ type: "text", text: output }],
    };
  }

  private async handleQueryMember(args: any) {
    // Fast database query for member designation
    const results = await this.searchEngine.search({
      query: args.designation,
      top_k: 5,
    });

    const memberData = results.filter(r => 
      r.text.includes(args.designation) || 
      r.drawingNumber?.includes(args.designation)
    );

    if (memberData.length === 0) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            designation: args.designation,
            found: false,
            message: `Member ${args.designation} not found in database`
          }, null, 2),
        }],
      };
    }

    const member = {
      designation: args.designation,
      found: true,
      shell_set: memberData.find(r => r.discipline === "Structural")?.text || null,
      structural_calc: memberData.find(r => r.drawingType === "Calculation")?.text || null,
      forteweb: memberData.find(r => r.text.includes("ForteWEB"))?.text || null,
      sheets: memberData.map(r => r.drawingNumber).filter(Boolean),
      conflicts: memberData.length > 1 ? "Multiple specs found" : null,
    };

    return {
      content: [{
        type: "text",
        text: JSON.stringify(member, null, 2),
      }],
    };
  }

  private async handleGetMaterialTakeoff(args: any) {
    // Fast query for material takeoff by sheet
    const results = await this.searchEngine.search({
      query: `sheet ${args.sheet} materials quantities`,
      sheetNumbers: [args.sheet],
      top_k: 20,
    });

    const materials: any[] = [];
    const quantities: any[] = [];

    for (const result of results) {
      // Extract material specs from text
      const materialMatches = result.text.match(/\d+['"]\s*[A-Z]+\s*\d+|TJI\s*\d+|\d+x\d+|GLB|LVL/gi);
      const quantityMatches = result.text.match(/\d+\s*EA|\d+\s*LF|@\s*\d+['"]\s*OC/gi);
      
      if (materialMatches) {
        materials.push(...materialMatches.map(m => ({
          spec: m,
          sheet: args.sheet,
          source: result.drawingNumber,
        })));
      }
      
      if (quantityMatches) {
        quantities.push(...quantityMatches.map(q => ({
          quantity: q,
          sheet: args.sheet,
          source: result.drawingNumber,
        })));
      }
    }

    const takeoff = {
      sheet: args.sheet,
      found: materials.length > 0 || quantities.length > 0,
      materials: materials.slice(0, 20), // Limit results
      quantities: quantities.slice(0, 20),
      total_items: materials.length + quantities.length,
      sources: [...new Set(results.map(r => r.drawingNumber))],
    };

    return {
      content: [{
        type: "text",
        text: JSON.stringify(takeoff, null, 2),
      }],
    };
  }

  private async handleFindConflicts(args: any) {
    // Fast query for pre-computed conflicts
    let query = "conflict mismatch different";
    if (args.sheet) {
      query += ` sheet ${args.sheet}`;
    }

    const results = await this.searchEngine.search({
      query,
      sheetNumbers: args.sheet ? [args.sheet] : undefined,
      top_k: 10,
    });

    const conflicts = this.searchEngine.detectConflicts(results);
    
    const filteredConflicts = args.severity 
      ? conflicts.filter(c => c.severity === args.severity)
      : conflicts;

    const conflictData = {
      found: filteredConflicts.length > 0,
      count: filteredConflicts.length,
      sheet_filter: args.sheet || null,
      severity_filter: args.severity || null,
      conflicts: filteredConflicts.map(c => ({
        type: c.type,
        element: c.element,
        severity: c.severity,
        documents: c.documents.map(d => ({
          sheet: d.sheet,
          value: d.value,
        })),
      })),
    };

    return {
      content: [{
        type: "text",
        text: JSON.stringify(conflictData, null, 2),
      }],
    };
  }

  private async handleListSheets(args: any) {
    // Fast query for all sheets
    const results = await this.searchEngine.search({
      query: "sheet drawing",
      discipline: args.discipline,
      top_k: 100,
    });

    const sheets = new Map();
    
    for (const result of results) {
      const key = result.drawingNumber || result.sheetNumber;
      if (key && !sheets.has(key)) {
        sheets.set(key, {
          sheet: key,
          discipline: result.discipline,
          drawingType: result.drawingType,
          pageNumber: result.pageNumber,
          project: result.project,
        });
      }
    }

    const sheetList = {
      found: sheets.size > 0,
      count: sheets.size,
      discipline_filter: args.discipline || null,
      sheets: Array.from(sheets.values()).sort((a, b) => 
        (a.sheet || '').localeCompare(b.sheet || '')
      ),
    };

    return {
      content: [{
        type: "text",
        text: JSON.stringify(sheetList, null, 2),
      }],
    };
  }

  private async handleSearchDocuments(args: any) {
    // Fast semantic search
    const results = await this.searchEngine.search({
      query: args.text,
      top_k: args.limit || 10,
    });

    const searchResults = {
      query: args.text,
      found: results.length > 0,
      count: results.length,
      limit: args.limit || 10,
      results: results.map(r => ({
        id: r.id,
        sheet: r.drawingNumber || r.sheetNumber,
        discipline: r.discipline,
        drawingType: r.drawingType,
        text: r.text.substring(0, 500), // Truncate for fast response
        score: r.score,
      })),
    };

    return {
      content: [{
        type: "text",
        text: JSON.stringify(searchResults, null, 2),
      }],
    };
  }

  private async handleGetMemberVerified(args: any) {
    const result = await this.hybridTools.getMemberVerified(args.designation);
    
    let output = `🔄 **Member Verification: ${args.designation}**\n\n`;
    
    if (!result.db_data) {
      output += `❌ Member ${args.designation} not found in database`;
    } else {
      output += `**Database Data:**\n`;
      output += `- Sheet: ${result.db_data.shell_set?.sheet || 'Unknown'}\n`;
      output += `- Spec: ${result.db_data.shell_set?.spec || 'Unknown'}\n`;
      output += `- Conflict: ${result.db_data.conflict ? '⚠️ Yes' : '✅ No'}\n\n`;

      output += `**Vision Verification:**\n`;
      output += `- Status: ${result.verified ? '✅ VERIFIED' : '❌ DISCREPANCY'}\n`;
      
      if (result.discrepancies.length > 0) {
        output += `- Issues: ${result.discrepancies.join(', ')}\n`;
      }
    }

    return {
      content: [{
        type: "text",
        text: output,
      }],
    };
  }

  private async handleGetInventoryVerified(args: any) {
    const result = await this.hybridTools.getInventoryVerified(args.sheet);
    
    let output = `🔄 **Inventory Verification: ${args.sheet}**\n\n`;
    
    output += `**Database Inventory:** ${result.db_inventory.length} items\n`;
    result.db_inventory.slice(0, 5).forEach(item => {
      output += `- ${item.quantity} ${item.unit} ${item.spec}\n`;
    });

    output += `\n**Spot Checks:** ${result.spot_checks.length} items verified\n`;
    result.spot_checks.forEach(check => {
      const status = check.verified ? '✅' : '❌';
      output += `${status} ${check.spec}: DB=${check.db_quantity}\n`;
    });

    output += `\n**Overall Confidence:** ${(result.overall_confidence * 100).toFixed(0)}%\n`;

    return {
      content: [{
        type: "text",
        text: output,
      }],
    };
  }

  private async handleFindConflictsVerified(args: any) {
    const result = await this.hybridTools.findConflictsVerified();
    
    let output = `🔄 **Conflicts Verification**\n\n`;
    
    output += `**Database Conflicts:** ${result.db_conflicts.length}\n`;
    output += `**Vision Verified:** ${result.verified_conflicts.length}\n`;
    output += `**False Positives:** ${result.false_positives.length}\n\n`;

    if (result.verified_conflicts.length > 0) {
      output += `**Confirmed Conflicts:**\n`;
      result.verified_conflicts.forEach(conflict => {
        output += `- ${conflict.designation}: "${conflict.shell_set_spec}" vs "${conflict.forteweb_spec}"\n`;
      });
    }

    if (result.false_positives.length > 0) {
      output += `\n**False Positives:** ${result.false_positives.join(', ')}\n`;
    }

    return {
      content: [{
        type: "text",
        text: output,
      }],
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
