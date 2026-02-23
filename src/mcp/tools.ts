import { HybridSearchEngine } from "../search/hybrid-search-engine";
import { MaterialsExtractor } from "../extraction/materials-extractor";
import { ScheduleQueryService } from "../services/schedule-query-service";
import { QuantityCalculator } from "../services/quantity-calculator";
import { VisionMCPTools } from "./vision-tools";
import { HybridMCPTools } from "./hybrid-tools";

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
}

export const MCP_TOOLS: MCPTool[] = [
  {
    name: "count_items",
    description: "⚡ REQUIRED for 'how many' questions. Returns counts instantly from schedules without searching. Examples: 'how many beams', 'count doors', 'list windows'. For steel beams, searches for W-shapes (W18x106, W10x100, etc.) in structural schedules. DO NOT use search_construction_docs for counting - it will blow up the context window.",
    inputSchema: {
      type: "object",
      properties: {
        item: {
          type: "string",
          description: "What to count: 'steel beams', 'doors', 'windows', 'footings', etc.",
        },
        discipline: {
          type: "string",
          description: "Optional filter: Structural, Architectural, etc.",
        },
      },
      required: ["item"],
    },
  },
  {
    name: "search_construction_docs",
    description: "⚠️ NEVER use for 'how many' questions - use count_items instead. Use ONLY for: specifications, installation details, dimensions, materials. For structural queries, automatically searches framing plans (S2.1, S2.2). Returns document excerpts with metadata.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query (e.g., 'foundation details', 'steel connections', 'beam specifications')",
        },
        discipline: {
          type: "string",
          description: "Filter by discipline: Structural, Architectural, Mechanical, Electrical, Civil, Plumbing",
        },
        drawingType: {
          type: "string",
          description: "Filter by drawing type: Plan, Elevation, Section, Detail, Schedule, Specification",
        },
        project: {
          type: "string",
          description: "Filter by project name",
        },
        top_k: {
          type: "number",
          description: "Number of results to return (default: 2, max: 10)",
        },
        synthesize: {
          type: "boolean",
          description: "Return synthesized material takeoff instead of raw chunks (default: false)",
        },
        summary: {
          type: "boolean",
          description: "Return summary only (drawing numbers + scores, no text) for quick overview. Use this first, then get_result_details for specific drawings (default: false)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_result_details",
    description: "Get full details for a specific drawing by number. Use after summary search to drill down into S2.1 (First Floor Framing), S2.2 (Roof Framing), or other specific drawings. This retrieves the complete content including beam schedules and quantities.",
    inputSchema: {
      type: "object",
      properties: {
        drawingNumber: {
          type: "string",
          description: "Drawing number to get details for (e.g., 'A101', 'S2.1', 'S2.2')",
        },
        query: {
          type: "string",
          description: "Original search query for context (e.g., 'steel beams')",
        },
      },
      required: ["drawingNumber", "query"],
    },
  },
  {
    name: "extract_materials",
    description: "Extract materials list from construction documents. Use this when user asks about materials, quantities, or supply lists. Returns structured material data that can be aggregated.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "What materials to extract (e.g., 'foundation materials', 'all structural materials')",
        },
        discipline: {
          type: "string",
          description: "Filter by discipline to narrow search",
        },
        drawingNumber: {
          type: "string",
          description: "Extract from specific drawing number",
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
    name: "compile_supply_list",
    description: "Compile aggregated supply list from extracted materials. Use after extract_materials to get totals grouped by material type. Returns formatted supply list ready for ordering.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "What to include in supply list (e.g., 'all materials', 'structural only')",
        },
        discipline: {
          type: "string",
          description: "Filter by discipline",
        },
        groupBy: {
          type: "string",
          description: "Group by: material (default), category, location",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "analyze_document",
    description: "Get high-level analysis of a construction document including project info, disciplines, drawing types, and document structure. Use this to understand what's in the document set.",
    inputSchema: {
      type: "object",
      properties: {
        project: {
          type: "string",
          description: "Project name to analyze (optional, analyzes all if omitted)",
        },
      },
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
    name: "generate_supply_list",
    description: "Generate a complete supply list with quantities, waste factors, and material aggregation from all extracted schedules. Returns concrete, rebar, lumber, doors, windows with calculated quantities.",
    inputSchema: {
      type: "object",
      properties: {
        documentId: {
          type: "string",
          description: "Optional document ID to generate supply list for specific document only",
        },
      },
    },
  },
  {
    name: "analyze_zone",
    description: "🔍 VISION TIER: Analyze specific zone of a drawing sheet using live vision analysis. Use for targeted extraction from specific areas of drawings.",
    inputSchema: {
      type: "object",
      properties: {
        sheet: {
          type: "string",
          description: "Sheet identifier (e.g., 'S2.1', 'S3.0')",
        },
        zone: {
          type: "string",
          enum: ["left", "center", "right", "top", "bottom"],
          description: "Zone to analyze",
        },
        query: {
          type: "string",
          description: "What to look for in the zone (e.g., 'joist specifications', 'beam callouts')",
        },
      },
      required: ["sheet", "zone", "query"],
    },
  },
  {
    name: "analyze_drawing",
    description: "🔍 VISION TIER: Analyze entire drawing sheet using live vision analysis. Use for comprehensive extraction from full drawings.",
    inputSchema: {
      type: "object",
      properties: {
        sheet: {
          type: "string",
          description: "Sheet identifier (e.g., 'S2.1', 'S3.0')",
        },
        query: {
          type: "string",
          description: "What to analyze (e.g., 'all structural members', 'framing layout')",
        },
      },
      required: ["sheet", "query"],
    },
  },
  {
    name: "extract_callout",
    description: "🔍 VISION TIER: Extract specific callout text from drawing at given location using live vision analysis.",
    inputSchema: {
      type: "object",
      properties: {
        sheet: {
          type: "string",
          description: "Sheet identifier (e.g., 'S2.1', 'S3.0')",
        },
        location: {
          type: "string",
          description: "Location description (e.g., 'left bay', 'grid A-B', 'center beam')",
        },
      },
      required: ["sheet", "location"],
    },
  },
  {
    name: "verify_spec",
    description: "🔍 VISION TIER: Verify specification against actual drawing using live vision analysis. Returns match/mismatch with confidence.",
    inputSchema: {
      type: "object",
      properties: {
        sheet: {
          type: "string",
          description: "Sheet identifier (e.g., 'S2.1', 'S3.0')",
        },
        location: {
          type: "string",
          description: "Location to verify (e.g., 'left bay', 'grid A-B')",
        },
        expected: {
          type: "string",
          description: "Expected specification (e.g., '14\" TJI 560 @ 16\" OC')",
        },
      },
      required: ["sheet", "location", "expected"],
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
];

/**
 * Tool execution handlers
 * These will be called by the MCP server with Claude Desktop providing the AI
 */
export class MCPToolHandlers {
  private visionTools: VisionMCPTools;
  private hybridTools: HybridMCPTools;

  constructor(
    private searchEngine: HybridSearchEngine,
    private materialsExtractor: MaterialsExtractor,
    private scheduleQueryService?: ScheduleQueryService,
    private quantityCalculator?: QuantityCalculator
  ) {
    this.visionTools = new VisionMCPTools();
    this.hybridTools = new HybridMCPTools("data/lancedb");
  }

  async countItems(params: any): Promise<string> {
    // TRACER BULLET: Go straight to schedules, skip search entirely
    if (!this.scheduleQueryService) {
      return "Schedule data not available. Run: npm run process source data/lancedb";
    }
    
    // Get all schedules
    const allSchedules = this.scheduleQueryService.querySchedules({});
    
    if (!allSchedules.entries || allSchedules.entries.length === 0) {
      return `No schedules found. The documents may not have been processed with schedule extraction enabled.`;
    }
    
    // Filter by item type
    const itemLower = params.item.toLowerCase();
    const matches = allSchedules.entries.filter((entry: any) => {
      const entryText = JSON.stringify(entry.data).toLowerCase();
      const markText = entry.mark?.toLowerCase() || '';
      return entryText.includes(itemLower) || markText.includes(itemLower);
    });
    
    if (matches.length === 0) {
      // Try broader search in schedule types
      const stats: any = allSchedules.stats;
      const scheduleTypes = stats?.byType || {};
      const relevantTypes = Object.keys(scheduleTypes).filter(t => 
        t.toLowerCase().includes(itemLower.split(' ')[0])
      );
      
      if (relevantTypes.length > 0) {
        return `No exact matches for "${params.item}". Found ${relevantTypes.length} related schedule type(s): ${relevantTypes.join(', ')}. Try searching for the schedule type directly.`;
      }
      
      return `No ${params.item} found in schedules. Available schedule types: ${Object.keys(scheduleTypes).join(', ')}`;
    }
    
    // Extract just the marks
    const marks = matches.map((e: any) => e.mark).filter(Boolean);
    
    return `**Count:** ${marks.length} ${params.item}\n**Items:** ${marks.join(', ')}`;
  }

  async searchConstructionDocs(params: any): Promise<string> {
    const results = await this.searchEngine.search({
      query: params.query,
      discipline: params.discipline,
      drawingType: params.drawingType,
      project: params.project,
      top_k: params.top_k || 2,
    });

    // Summary mode - just drawing numbers and scores
    if (params.summary) {
      let output = `Found ${results.length} results for "${params.query}":\n\n`;
      results.forEach((r, i) => {
        output += `${i + 1}. ${r.drawingNumber} (${r.drawingType}) - Score: ${r.score.toFixed(1)}\n`;
      });
      output += `\nUse get_result_details with a drawing number to see full content.`;
      return this.truncateResponse(output);
    }

    // Synthesized takeoff mode
    if (params.synthesize) {
      const takeoff = this.searchEngine.synthesizeTakeoff(results);
      
      if (takeoff.length === 0) {
        return "No materials found in search results.";
      }
      
      // Structured JSON output
      const structured = takeoff.map(item => ({
        material: item.material,
        specification: item.specification?.substring(0, 200) || null,
        quantity: item.area || null,
        unit: item.unit || null,
        dimensions: item.dimensions?.slice(0, 3) || [],
        installation: item.installation?.substring(0, 150) || null,
        sources: item.sources.slice(0, 3)
      }));
      
      return this.truncateResponse(JSON.stringify({ materials: structured }, null, 2));
    }

    // Standard search mode with enhancements
    let output = `Found ${results.length} results for "${params.query}":\n\n`;
    
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      output += `${i + 1}. ${r.drawingNumber} (${r.discipline} - ${r.drawingType})\n`;
      
      // Extract key numbers/specs without surrounding text
      const keyInfo = this.extractKeyInfo(r.text);
      if (keyInfo.length > 0) {
        output += `   Key Info: ${keyInfo.join(' | ')}\n`;
      }
      
      // Truncate text to 300 chars
      const text = r.text.length > 300 ? r.text.substring(0, 300) + "..." : r.text;
      output += `   ${text}\n`;
      
      if (r.dimensions && r.dimensions.length > 0) {
        output += `   📏 ${r.dimensions.slice(0, 2).map(d => d.original).join(', ')}\n`;
      }
      
      if (r.calculatedAreas && r.calculatedAreas.length > 0) {
        output += `   📐 ${r.calculatedAreas[0].squareFeet.toFixed(0)} sq ft\n`;
      }
      
      if (r.crossReferences && r.crossReferences.length > 0) {
        output += `   🔗 ${r.crossReferences[0].reference}\n`;
      }
      
      output += `   Score: ${r.score.toFixed(3)}\n\n`;
    }

    return this.truncateResponse(output);
  }
  
  private truncateResponse(text: string, maxChars: number = 4000): string {
    if (text.length <= maxChars) return text;
    
    const truncated = text.substring(0, maxChars);
    const lastNewline = truncated.lastIndexOf('\n');
    
    return truncated.substring(0, lastNewline > 0 ? lastNewline : maxChars) + 
           `\n\n[Response truncated at ${maxChars} chars. Use summary=true or reduce top_k for smaller responses.]`;
  }
  
  private extractKeyInfo(text: string): string[] {
    const info: string[] = [];
    
    // Extract dimensions
    const dims = text.match(/\d+'-\d+"/g);
    if (dims) info.push(...dims.slice(0, 2));
    
    // Extract quantities
    const qty = text.match(/QTY:\s*\d+|(\d+)\s*EA/gi);
    if (qty) info.push(...qty.slice(0, 2));
    
    // Extract material specs
    const specs = text.match(/\b(R-\d+|#\d+|PSI\s*\d+|\d+"\s*O\.?C\.?)\b/gi);
    if (specs) info.push(...specs.slice(0, 2));
    
    return info;
  }

  async getResultDetails(params: any): Promise<string> {
    const results = await this.searchEngine.search({
      query: params.query,
      top_k: 20,
    });
    
    const match = results.find(r => r.drawingNumber === params.drawingNumber);
    
    if (!match) {
      return `Drawing ${params.drawingNumber} not found in search results.`;
    }
    
    let output = `# ${match.drawingNumber} (${match.discipline} - ${match.drawingType})\n\n`;
    output += `**Full Content:**\n${match.text}\n\n`;
    
    if (match.dimensions && match.dimensions.length > 0) {
      output += `**Dimensions:**\n`;
      match.dimensions.forEach(d => {
        output += `- ${d.original} = ${d.feet}'-${d.inches}"\n`;
      });
      output += '\n';
    }
    
    if (match.calculatedAreas && match.calculatedAreas.length > 0) {
      output += `**Calculated Areas:**\n`;
      match.calculatedAreas.forEach(a => {
        output += `- ${a.length.original} × ${a.width.original} = ${a.squareFeet.toFixed(1)} sq ft\n`;
      });
      output += '\n';
    }
    
    if (match.crossReferences && match.crossReferences.length > 0) {
      output += `**Cross-References:**\n`;
      match.crossReferences.forEach(ref => {
        output += `- ${ref.reference} (${ref.type})\n`;
        if (ref.resolvedContent) {
          output += `  → ${ref.resolvedContent.text.substring(0, 200)}...\n`;
        }
      });
    }
    
    return this.truncateResponse(output);
  }

  async extractMaterials(params: any): Promise<string> {
    // Step 1: Search for relevant chunks
    const results = await this.searchEngine.search({
      query: params.query,
      discipline: params.discipline,
      top_k: params.top_k || 20,
    });

    if (results.length === 0) {
      return "No relevant documents found for materials extraction.";
    }

    // Step 2: Generate extraction prompt for Claude
    const context = `Extracting materials from ${results.length} document chunks`;
    const combinedText = results.map(r => r.text).join("\n\n---\n\n");
    
    const prompt = this.materialsExtractor.extractMaterialsPrompt(
      combinedText.substring(0, 10000), // Limit to avoid token overflow
      context
    );

    // Return prompt for Claude Desktop to process
    return `MATERIALS_EXTRACTION_PROMPT:
${prompt}

After Claude responds with the JSON, I will parse and format the results.`;
  }

  async compileSupplyList(params: any): Promise<string> {
    // This will aggregate materials from previous extractions
    // For now, return instructions for the user
    return `To compile a supply list:
1. First use extract_materials to get materials from relevant documents
2. I will aggregate the results and provide a formatted supply list

Example workflow:
- extract_materials with query: "all structural materials"
- extract_materials with query: "foundation materials"  
- compile_supply_list will combine and total everything

Would you like me to extract materials first?`;
  }

  async analyzeDocument(params: any): Promise<string> {
    // Get all unique documents from the database
    const allResults = await this.searchEngine.search({
      query: "construction",
      top_k: 100,
    });

    const projects = new Set<string>();
    const disciplines = new Set<string>();
    const drawingTypes = new Set<string>();

    for (const r of allResults) {
      if (r.project) projects.add(r.project);
      if (r.discipline) disciplines.add(r.discipline);
      if (r.drawingType) drawingTypes.add(r.drawingType);
    }

    let output = "# Document Analysis\n\n";
    output += `## Projects\n${Array.from(projects).join(", ")}\n\n`;
    output += `## Disciplines\n${Array.from(disciplines).join(", ")}\n\n`;
    output += `## Drawing Types\n${Array.from(drawingTypes).join(", ")}\n\n`;
    output += `## Total Sheets\n${allResults.length}\n`;

    return output;
  }

  async querySchedules(params: any): Promise<string> {
    if (!this.scheduleQueryService) {
      return "Schedule query service not available. Schedules may not have been extracted yet.";
    }

    const result = this.scheduleQueryService.querySchedules({
      mark: params.mark,
      scheduleType: params.scheduleType,
      documentId: params.documentId
    });

    if (!result.found) {
      return result.message || "No schedules found matching criteria.";
    }

    let output = "";

    if (params.mark && result.entry) {
      output += `# Schedule Entry: ${result.entry.mark}\n\n`;
      output += `**Type:** ${result.schedule?.scheduleType}\n`;
      output += `**Page:** ${result.schedule?.pageNumber}\n\n`;
      output += `## Data\n\`\`\`json\n${JSON.stringify(result.entry.data, null, 2)}\n\`\`\`\n`;
    } else if (params.scheduleType && result.entries) {
      output += `# ${params.scheduleType}\n\n`;
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

    return output;
  }

  async getScheduleStats(params: any): Promise<string> {
    if (!this.scheduleQueryService) {
      return "Schedule query service not available.";
    }

    const stats = this.scheduleQueryService.getStats();

    let output = "# Schedule Statistics\n\n";
    output += `**Total Schedules:** ${stats.totalSchedules}\n`;
    output += `**Total Entries:** ${stats.totalEntries}\n\n`;
    output += `## By Type\n`;
    
    Object.entries(stats.byType).forEach(([type, count]) => {
      output += `- ${type}: ${count}\n`;
    });

    return output;
  }

  async generateSupplyList(params: any): Promise<string> {
    return "Supply list generation not yet implemented for new architecture.";
  }

  // Vision Tier Tool Handlers
  async analyzeZone(params: any): Promise<string> {
    const result = await this.visionTools.analyzeZone(params.sheet, params.zone, params.query);
    
    if (!result.success) {
      return `❌ Vision analysis failed: ${result.error}`;
    }

    let output = `🔍 **Zone Analysis: ${params.sheet} (${params.zone})**\n\n`;
    output += `**Query:** ${params.query}\n`;
    output += `**Confidence:** ${(result.confidence! * 100).toFixed(0)}%\n\n`;

    const data = result.data;
    if (data.beams?.length > 0) {
      output += `**Beams Found:** ${data.beams.length}\n`;
      data.beams.slice(0, 5).forEach((b: any) => {
        output += `- ${b.mark || 'Unknown'} ${b.gridLocation ? `at ${b.gridLocation}` : ''}\n`;
      });
    }

    if (data.joists?.length > 0) {
      output += `**Joists Found:** ${data.joists.length}\n`;
      data.joists.slice(0, 3).forEach((j: any) => {
        output += `- ${j.mark || 'Unknown'} ${j.spacing ? `@ ${j.spacing}` : ''}\n`;
      });
    }

    return output;
  }

  async analyzeDrawing(params: any): Promise<string> {
    const result = await this.visionTools.analyzeDrawing(params.sheet, params.query);
    
    if (!result.success) {
      return `❌ Vision analysis failed: ${result.error}`;
    }

    let output = `🔍 **Drawing Analysis: ${params.sheet}**\n\n`;
    output += `**Query:** ${params.query}\n`;
    output += `**Confidence:** ${(result.confidence! * 100).toFixed(0)}%\n\n`;

    const data = result.data;
    
    // Summary counts
    const counts = {
      beams: data.beams?.length || 0,
      columns: data.columns?.length || 0,
      joists: data.joists?.length || 0,
      schedules: data.schedules?.length || 0
    };

    output += `**Elements Found:**\n`;
    Object.entries(counts).forEach(([type, count]) => {
      if (count > 0) output += `- ${type}: ${count}\n`;
    });

    return output;
  }

  async extractCallout(params: any): Promise<string> {
    const result = await this.visionTools.extractCallout(params.sheet, params.location);
    
    if (!result.success) {
      return `❌ Callout extraction failed: ${result.error}`;
    }

    let output = `🔍 **Callout Extraction: ${params.sheet}**\n\n`;
    output += `**Location:** ${params.location}\n`;
    output += `**Confidence:** ${(result.confidence! * 100).toFixed(0)}%\n\n`;

    const data = result.data;
    if (data.beams?.length > 0) {
      output += `**Beams at Location:**\n`;
      data.beams.forEach((b: any) => {
        output += `- ${b.mark || 'Unknown'}\n`;
      });
    }

    if (data.joists?.length > 0) {
      output += `**Joists at Location:**\n`;
      data.joists.forEach((j: any) => {
        output += `- ${j.mark || 'Unknown'}\n`;
      });
    }

    if (data.columns?.length > 0) {
      output += `**Columns at Location:**\n`;
      data.columns.forEach((c: any) => {
        output += `- ${c.mark || 'Unknown'}\n`;
      });
    }

    return output || "No callouts found at specified location.";
  }

  async verifySpec(params: any): Promise<string> {
    const result = await this.visionTools.verifySpec(params.sheet, params.location, params.expected);
    
    if (!result.success) {
      return `❌ Spec verification failed: ${result.error}`;
    }

    const data = result.data;
    const match = data.matches ? "✅ MATCH" : "❌ MISMATCH";
    
    let output = `🔍 **Spec Verification: ${params.sheet}**\n\n`;
    output += `**Location:** ${params.location}\n`;
    output += `**Expected:** ${params.expected}\n`;
    output += `**Actual:** ${data.actual || 'Not found'}\n`;
    output += `**Result:** ${match}\n`;
    output += `**Confidence:** ${(result.confidence! * 100).toFixed(0)}%\n`;

    return output;
  }

  async getMemberVerified(params: any): Promise<string> {
    const result = await this.hybridTools.getMemberVerified(params.designation);
    
    let output = `🔄 **Member Verification: ${params.designation}**\n\n`;
    
    if (!result.db_data) {
      return `❌ Member ${params.designation} not found in database`;
    }

    output += `**Database Data:**\n`;
    output += `- Sheet: ${result.db_data.shell_set?.sheet || 'Unknown'}\n`;
    output += `- Spec: ${result.db_data.shell_set?.spec || 'Unknown'}\n`;
    output += `- Conflict: ${result.db_data.conflict ? '⚠️ Yes' : '✅ No'}\n\n`;

    output += `**Vision Verification:**\n`;
    output += `- Status: ${result.verified ? '✅ VERIFIED' : '❌ DISCREPANCY'}\n`;
    
    if (result.discrepancies.length > 0) {
      output += `- Issues: ${result.discrepancies.join(', ')}\n`;
    }

    return output;
  }

  async getInventoryVerified(params: any): Promise<string> {
    const result = await this.hybridTools.getInventoryVerified(params.sheet);
    
    let output = `🔄 **Inventory Verification: ${params.sheet}**\n\n`;
    
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

    return output;
  }

  async findConflictsVerified(params: any): Promise<string> {
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

    return output;
  }
}
