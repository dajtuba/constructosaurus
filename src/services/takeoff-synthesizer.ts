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
}

export class TakeoffSynthesizer {
  synthesize(results: SearchResult[]): MaterialTakeoff[] {
    const takeoffs = new Map<string, MaterialTakeoff>();
    
    for (const result of results) {
      // Extract material mentions
      const materials = this.extractMaterials(result.text);
      
      for (const material of materials) {
        const key = material.toLowerCase();
        
        if (!takeoffs.has(key)) {
          takeoffs.set(key, {
            material,
            sources: [],
            dimensions: []
          });
        }
        
        const takeoff = takeoffs.get(key)!;
        
        // Add source
        if (!takeoff.sources.includes(result.drawingNumber)) {
          takeoff.sources.push(result.drawingNumber);
        }
        
        // Add specifications from schedules/assemblies
        if (result.drawingType === 'Schedule' || result.text.includes('ASSEMBL')) {
          const spec = this.extractSpecification(result.text, material);
          if (spec && !takeoff.specification) {
            takeoff.specification = spec;
          }
        }
        
        // Add dimensions from plans
        if (result.dimensions && result.dimensions.length > 0) {
          result.dimensions.slice(0, 3).forEach(d => {
            if (!takeoff.dimensions!.includes(d.original)) {
              takeoff.dimensions!.push(d.original);
            }
          });
        }
        
        // Add area from calculations
        if (result.calculatedAreas && result.calculatedAreas.length > 0) {
          const largest = result.calculatedAreas.reduce((max, a) => 
            a.squareFeet > (max?.squareFeet || 0) ? a : max
          );
          if (!takeoff.area || largest.squareFeet > takeoff.area) {
            takeoff.area = largest.squareFeet;
            takeoff.unit = 'sq ft';
          }
        }
        
        // Extract installation details
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
  
  private extractMaterials(text: string): string[] {
    const materials: string[] = [];
    const patterns = [
      /\b(warmboard[-\s]s)\b/gi,
      /\b(plywood)\b/gi,
      /\b(cedar)\b/gi,
      /\b(concrete)\b/gi,
      /\b(steel)\b/gi,
      /\b(lumber)\b/gi,
      /\b(sheathing)\b/gi,
      /\b(decking)\b/gi,
      /\b(framing)\b/gi
    ];
    
    for (const pattern of patterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const material = match[1];
        if (!materials.includes(material)) {
          materials.push(material);
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
