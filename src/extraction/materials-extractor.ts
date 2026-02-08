import { ContextExtractionService } from '../services/context-extraction-service';
import { MaterialContext } from '../types';

export interface MaterialItem {
  name: string;
  quantity?: number;
  unit?: string;
  specification?: string;
  location?: string;
  drawingRef?: string;
  category?: string;
  context?: MaterialContext;
}

export interface SupplyListItem {
  material: string;
  totalQuantity: number;
  unit: string;
  locations: string[];
  drawingRefs: string[];
  notes: string[];
}

export class MaterialsExtractor {
  /**
   * Extract materials from text chunks using LLM
   * This will be called by MCP tools with Claude Desktop providing the AI
   */
  extractMaterialsPrompt(text: string, context?: string): string {
    return `Extract construction materials from this text. Return ONLY a JSON array of materials.

Context: ${context || "Construction document"}

Text:
${text}

Return format:
[
  {
    "name": "Material name",
    "quantity": 10,
    "unit": "sheets|linear feet|cubic yards|each|lbs",
    "specification": "Size, grade, or spec",
    "location": "Where used",
    "category": "Concrete|Steel|Wood|Masonry|Finishes|MEP"
  }
]

Return ONLY the JSON array, no explanation.`;
  }

  /**
   * Parse materials from LLM response and extract context
   */
  parseMaterialsResponse(response: string, sourceText?: string): MaterialItem[] {
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return [];
      }
      const materials = JSON.parse(jsonMatch[0]);
      
      // Extract context if source text provided
      if (sourceText) {
        const contextService = new ContextExtractionService();
        const context = contextService.extractContext(sourceText);
        
        // Add context to each material
        return materials.map((m: MaterialItem) => ({
          ...m,
          context
        }));
      }
      
      return materials;
    } catch (error) {
      console.error("Failed to parse materials response:", error);
      return [];
    }
  }

  /**
   * Aggregate materials into supply list
   */
  aggregateMaterials(materials: MaterialItem[]): SupplyListItem[] {
    const grouped = new Map<string, SupplyListItem>();

    for (const item of materials) {
      const key = `${item.name}-${item.unit || "each"}`;
      
      if (!grouped.has(key)) {
        grouped.set(key, {
          material: item.name,
          totalQuantity: 0,
          unit: item.unit || "each",
          locations: [],
          drawingRefs: [],
          notes: [],
        });
      }

      const supply = grouped.get(key)!;
      supply.totalQuantity += item.quantity || 0;
      
      if (item.location && !supply.locations.includes(item.location)) {
        supply.locations.push(item.location);
      }
      
      if (item.drawingRef && !supply.drawingRefs.includes(item.drawingRef)) {
        supply.drawingRefs.push(item.drawingRef);
      }
      
      if (item.specification) {
        supply.notes.push(item.specification);
      }
    }

    return Array.from(grouped.values()).sort((a, b) => 
      a.material.localeCompare(b.material)
    );
  }

  /**
   * Format supply list for display
   */
  formatSupplyList(items: SupplyListItem[]): string {
    let output = "# Supply List\n\n";
    
    const byCategory = new Map<string, SupplyListItem[]>();
    
    for (const item of items) {
      // Simple category detection
      const category = this.detectCategory(item.material);
      if (!byCategory.has(category)) {
        byCategory.set(category, []);
      }
      byCategory.get(category)!.push(item);
    }

    for (const [category, categoryItems] of byCategory) {
      output += `## ${category}\n\n`;
      for (const item of categoryItems) {
        output += `- **${item.material}**: ${item.totalQuantity} ${item.unit}\n`;
        if (item.locations.length > 0) {
          output += `  - Locations: ${item.locations.join(", ")}\n`;
        }
        if (item.drawingRefs.length > 0) {
          output += `  - Drawings: ${item.drawingRefs.join(", ")}\n`;
        }
        if (item.notes.length > 0) {
          output += `  - Notes: ${item.notes[0]}\n`;
        }
      }
      output += "\n";
    }

    return output;
  }

  private detectCategory(material: string): string {
    const lower = material.toLowerCase();
    if (lower.includes("concrete") || lower.includes("cement")) return "Concrete";
    if (lower.includes("steel") || lower.includes("rebar") || lower.includes("metal")) return "Steel";
    if (lower.includes("wood") || lower.includes("lumber") || lower.includes("plywood")) return "Wood";
    if (lower.includes("brick") || lower.includes("block") || lower.includes("masonry")) return "Masonry";
    if (lower.includes("paint") || lower.includes("finish") || lower.includes("tile")) return "Finishes";
    if (lower.includes("pipe") || lower.includes("wire") || lower.includes("duct")) return "MEP";
    return "Other";
  }
}
