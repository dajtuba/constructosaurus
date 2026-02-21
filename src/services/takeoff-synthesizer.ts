import { SearchResult } from "../types";

export interface MaterialTakeoff {
  material: string;
  specification?: string;
  quantity?: number;
  unit?: string;
  area?: number;
  dimensions?: string[];
  sources: string[];
  installation?: string;
  category?: string;
  weight?: number;
}

// Steel W-shape weights (lb/ft)
const STEEL_WEIGHTS: Record<string, number> = {
  'W18x106': 106, 'W18x97': 97, 'W18x86': 86, 'W18x76': 76,
  'W16x100': 100, 'W16x89': 89, 'W16x77': 77, 'W16x67': 67,
  'W14x90': 90, 'W14x82': 82, 'W14x74': 74, 'W14x68': 68,
  'W12x65': 65, 'W12x58': 58, 'W12x53': 53, 'W12x50': 50,
  'W10x100': 100, 'W10x88': 88, 'W10x77': 77, 'W10x68': 68,
  'W10x54': 54, 'W10x49': 49, 'W10x45': 45, 'W10x39': 39,
  'W8x67': 67, 'W8x58': 58, 'W8x48': 48, 'W8x40': 40,
};

export class TakeoffSynthesizer {
  synthesize(results: SearchResult[]): MaterialTakeoff[] {
    const takeoffs = new Map<string, MaterialTakeoff>();
    
    for (const result of results) {
      // Extract structural steel members
      this.extractSteelMembers(result, takeoffs);
      
      // Extract general materials
      const materials = this.extractMaterials(result.text);
      
      for (const material of materials) {
        const key = material.toLowerCase();
        
        if (!takeoffs.has(key)) {
          takeoffs.set(key, {
            material,
            sources: [],
            dimensions: [],
            category: this.categorize(material)
          });
        }
        
        const takeoff = takeoffs.get(key)!;
        
        if (!takeoff.sources.includes(result.drawingNumber)) {
          takeoff.sources.push(result.drawingNumber);
        }
        
        if (result.drawingType === 'Schedule' || result.text.includes('ASSEMBL')) {
          const spec = this.extractSpecification(result.text, material);
          if (spec && !takeoff.specification) {
            takeoff.specification = spec;
          }
        }
        
        if (result.dimensions && result.dimensions.length > 0) {
          result.dimensions.slice(0, 3).forEach(d => {
            if (!takeoff.dimensions!.includes(d.original)) {
              takeoff.dimensions!.push(d.original);
            }
          });
        }
        
        if (result.calculatedAreas && result.calculatedAreas.length > 0) {
          const largest = result.calculatedAreas.reduce((max, a) => 
            a.squareFeet > (max?.squareFeet || 0) ? a : max
          );
          if (!takeoff.area || largest.squareFeet > takeoff.area) {
            takeoff.area = largest.squareFeet;
            takeoff.unit = 'sq ft';
          }
        }
        
        if (result.drawingType === 'Detail') {
          const install = this.extractInstallation(result.text);
          if (install && !takeoff.installation) {
            takeoff.installation = install;
          }
        }
      }
    }
    
    return Array.from(takeoffs.values());
  }
  
  private extractSteelMembers(result: SearchResult, takeoffs: Map<string, MaterialTakeoff>) {
    // Match W-shapes, HSS, pipes in text
    const steelPattern = /\b(W\d+x\d+|HSS\d+x\d+x\d+\/?\.?\d*|PIPE\s*\d+)\b/gi;
    const qtyPattern = /\(?\s*(?:QTY|qty|Qty)[:\s]*(\d+)\s*\)?/;
    const lengthPattern = /(\d+[''][-\s]*\d*[""]?)/;
    
    for (const match of result.text.matchAll(steelPattern)) {
      const member = match[0].toUpperCase();
      const key = `steel:${member}`;
      
      // Look for quantity and length near the match
      const context = result.text.substring(
        Math.max(0, match.index! - 50),
        Math.min(result.text.length, match.index! + match[0].length + 80)
      );
      
      const qtyMatch = context.match(qtyPattern);
      const lenMatch = context.match(lengthPattern);
      const qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;
      
      if (!takeoffs.has(key)) {
        const weightPerFt = STEEL_WEIGHTS[member] || this.estimateWeight(member);
        takeoffs.set(key, {
          material: member,
          category: 'Structural Steel',
          quantity: 0,
          unit: 'EA',
          sources: [],
          dimensions: [],
          weight: weightPerFt
        });
      }
      
      const t = takeoffs.get(key)!;
      t.quantity = (t.quantity || 0) + qty;
      if (!t.sources.includes(result.drawingNumber)) {
        t.sources.push(result.drawingNumber);
      }
      if (lenMatch && !t.dimensions!.includes(lenMatch[1])) {
        t.dimensions!.push(lenMatch[1]);
      }
    }
  }
  
  private estimateWeight(member: string): number {
    // Extract weight from W-shape designation (W18x106 -> 106 lb/ft)
    const wMatch = member.match(/W\d+x(\d+)/);
    if (wMatch) return parseInt(wMatch[1]);
    return 0;
  }
  
  private categorize(material: string): string {
    const lower = material.toLowerCase();
    if (/\b(w\d+|hss|steel|beam|column|joist)\b/.test(lower)) return 'Structural Steel';
    if (/\b(concrete|rebar|mesh|foundation|footing)\b/.test(lower)) return 'Concrete';
    if (/\b(lumber|plywood|osb|wood|stud|joist)\b/.test(lower)) return 'Wood';
    if (/\b(door|window|glass|hardware)\b/.test(lower)) return 'Openings';
    if (/\b(pipe|conduit|duct|wire)\b/.test(lower)) return 'MEP';
    if (/\b(paint|finish|tile|drywall)\b/.test(lower)) return 'Finishes';
    return 'General';
  }
  
  private extractMaterials(text: string): string[] {
    const materials: string[] = [];
    
    // Common construction materials - expanded list
    const materialKeywords = [
      'warmboard', 'plywood', 'osb', 'cedar', 'concrete', 'steel', 'lumber',
      'sheathing', 'decking', 'framing', 'drywall', 'gypsum', 'insulation',
      'rebar', 'wire mesh', 'anchor', 'bolt', 'beam', 'joist', 'stud',
      'siding', 'roofing', 'flashing', 'membrane', 'vapor barrier',
      'tile', 'grout', 'mortar', 'adhesive', 'sealant', 'caulk',
      'paint', 'primer', 'stain', 'finish', 'coating',
      'door', 'window', 'glass', 'hardware', 'hinge', 'lock',
      'pipe', 'conduit', 'wire', 'cable', 'duct', 'vent'
    ];
    
    const textLower = text.toLowerCase();
    
    for (const keyword of materialKeywords) {
      if (textLower.includes(keyword)) {
        // Extract the full material phrase (up to 3 words)
        const pattern = new RegExp(`\\b([\\w-]+\\s+){0,2}${keyword}[\\w-]*`, 'gi');
        const matches = text.matchAll(pattern);
        for (const match of matches) {
          const material = match[0].trim();
          if (material.length > 2 && !materials.includes(material)) {
            materials.push(material);
          }
        }
      }
    }
    
    return materials;
  }
  
  private extractSpecification(text: string, material: string): string | null {
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(material.toLowerCase())) {
        // Return this line and next 2 lines as spec
        return lines.slice(i, i + 3).join(' ').trim().substring(0, 200);
      }
    }
    return null;
  }
  
  private extractInstallation(text: string): string | null {
    const patterns = [
      /\b(fastener|screw|nail|bolt|lag)\b.*$/im,
      /\b(install|attach|connect)\b.*$/im
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[0].substring(0, 100);
      }
    }
    return null;
  }
}
