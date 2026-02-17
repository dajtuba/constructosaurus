import { HybridSearchEngine } from "../search/hybrid-search-engine";
import { MaterialsExtractor } from "../extraction/materials-extractor";
import { ScheduleQueryService } from "../services/schedule-query-service";
import { QuantityCalculator } from "../services/quantity-calculator";

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
    description: "Count specific items in construction documents (beams, doors, windows, etc.) without returning full content. Returns just the count and item list.",
    inputSchema: {
      type: "object",
      properties: {
        item: {
          type: "string",
          description: "What to count (e.g., 'steel beams', 'doors', 'windows', 'footings')",
        },
        discipline: {
          type: "string",
          description: "Filter by discipline: Structural, Architectural, etc.",
        },
      },
      required: ["item"],
    },
  },
  {
    name: "search_construction_docs",
    description: "Search construction documents with semantic search, automatic dimension extraction, cross-reference resolution, and smart ranking. Returns relevant chunks with dimensions, areas, and resolved references.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query (e.g., 'foundation details', 'steel connections')",
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
          description: "Return summary only (drawing numbers + scores, no text) for quick overview (default: false)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_result_details",
    description: "Get full details for a specific search result by drawing number. Use after summary search to drill down.",
    inputSchema: {
      type: "object",
      properties: {
        drawingNumber: {
          type: "string",
          description: "Drawing number to get details for (e.g., 'A101', 'S2.1')",
        },
        query: {
          type: "string",
          description: "Original search query for context",
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
];

/**
 * Tool execution handlers
 * These will be called by the MCP server with Claude Desktop providing the AI
 */
export class MCPToolHandlers {
  constructor(
    private searchEngine: HybridSearchEngine,
    private materialsExtractor: MaterialsExtractor,
    private scheduleQueryService?: ScheduleQueryService,
    private quantityCalculator?: QuantityCalculator
  ) {}

  async countItems(params: any): Promise<string> {
    // Search for the item
    const results = await this.searchEngine.search({
      query: params.item,
      discipline: params.discipline,
      top_k: 50, // Get more results for counting
    });
    
    // Extract item mentions and marks
    const items = new Set<string>();
    const pattern = new RegExp(`\\b([A-Z]+[-]?\\d+)\\b`, 'g');
    
    for (const result of results) {
      // Look for schedule marks or item IDs
      const matches = result.text.matchAll(pattern);
      for (const match of matches) {
        items.add(match[1]);
      }
      
      // Also check for quantity mentions
      const qtyMatch = result.text.match(/QTY[:\s]*(\d+)|(\d+)\s*EA/i);
      if (qtyMatch) {
        const qty = qtyMatch[1] || qtyMatch[2];
        items.add(`QTY:${qty}`);
      }
    }
    
    // Try to get from schedules if available
    let scheduleCount = 0;
    if (this.scheduleQueryService) {
      try {
        const scheduleResult = this.scheduleQueryService.querySchedules({});
        if (scheduleResult.entries) {
          scheduleCount = scheduleResult.entries.filter((e: any) => 
            e.data && JSON.stringify(e.data).toLowerCase().includes(params.item.toLowerCase())
          ).length;
        }
      } catch (e) {
        // Schedules not available
      }
    }
    
    const uniqueItems = Array.from(items).filter(i => !i.startsWith('QTY:'));
    const quantities = Array.from(items).filter(i => i.startsWith('QTY:'));
    
    let output = `# Count: ${params.item}\n\n`;
    
    if (scheduleCount > 0) {
      output += `**Schedule Entries:** ${scheduleCount}\n\n`;
    }
    
    if (uniqueItems.length > 0) {
      output += `**Unique Items Found:** ${uniqueItems.length}\n`;
      output += `${uniqueItems.slice(0, 20).join(', ')}\n\n`;
    }
    
    if (quantities.length > 0) {
      output += `**Quantities Mentioned:**\n`;
      quantities.forEach(q => output += `- ${q}\n`);
    }
    
    if (uniqueItems.length === 0 && scheduleCount === 0) {
      output += `No specific items found. Try searching for the item type in schedules.`;
    }
    
    return output;
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
    if (!this.quantityCalculator) {
      return "Quantity calculator not available.";
    }

    const supplyList = await this.quantityCalculator.generateSupplyList(params.documentId);

    if (supplyList.materials.length === 0) {
      return "No materials found. Process documents first with vision analysis enabled.";
    }

    let output = "# Supply List\n\n";
    output += `**Total Material Types:** ${supplyList.totalItems}\n`;
    output += `**Documents:** ${supplyList.documentSources.length}\n\n`;

    // Group by category
    const concrete = supplyList.materials.filter(m => m.material.startsWith('concrete_'));
    const rebar = supplyList.materials.filter(m => m.material.startsWith('rebar_'));
    const doors = supplyList.materials.filter(m => m.material.startsWith('door_'));
    const windows = supplyList.materials.filter(m => m.material.startsWith('window_'));
    const structural = supplyList.materials.filter(m => 
      m.material.includes('Parallam') || m.material.includes('Fir') || m.material.includes('PSL')
    );

    if (concrete.length > 0) {
      output += "## Concrete\n";
      concrete.forEach(m => {
        output += `- **${m.material}**: ${m.quantity.toFixed(2)} ${m.unit}\n`;
        output += `  - Waste factor: ${((m.wasteFactorApplied - 1) * 100).toFixed(0)}%\n`;
        output += `  - Sources: ${m.source.join(', ')}\n`;
      });
      output += "\n";
    }

    if (rebar.length > 0) {
      output += "## Rebar\n";
      rebar.forEach(m => {
        output += `- **${m.material}**: ${m.quantity.toFixed(0)} ${m.unit}\n`;
        output += `  - Waste factor: ${((m.wasteFactorApplied - 1) * 100).toFixed(0)}%\n`;
        output += `  - Sources: ${m.source.join(', ')}\n`;
      });
      output += "\n";
    }

    if (structural.length > 0) {
      output += "## Structural Lumber\n";
      structural.forEach(m => {
        output += `- **${m.material}**: ${m.quantity.toFixed(1)} ${m.unit}\n`;
        output += `  - Waste factor: ${((m.wasteFactorApplied - 1) * 100).toFixed(0)}%\n`;
        output += `  - Sources: ${m.source.join(', ')}\n`;
      });
      output += "\n";
    }

    if (doors.length > 0) {
      output += "## Doors\n";
      doors.forEach(m => {
        output += `- **${m.material}**: ${m.quantity.toFixed(0)} ${m.unit}\n`;
        output += `  - Waste factor: ${((m.wasteFactorApplied - 1) * 100).toFixed(0)}%\n`;
        output += `  - Sources: ${m.source.join(', ')}\n`;
      });
      output += "\n";
    }

    if (windows.length > 0) {
      output += "## Windows\n";
      windows.forEach(m => {
        output += `- **${m.material}**: ${m.quantity.toFixed(0)} ${m.unit}\n`;
        output += `  - Waste factor: ${((m.wasteFactorApplied - 1) * 100).toFixed(0)}%\n`;
        output += `  - Sources: ${m.source.join(', ')}\n`;
      });
      output += "\n";
    }

    return output;
  }
}
