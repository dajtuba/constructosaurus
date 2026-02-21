import { CrossReference, SearchResult } from "../types";

export interface DocumentConflict {
  type: 'size_mismatch' | 'quantity_mismatch' | 'specification_difference' | 'dimension_conflict';
  element: string;
  documents: Array<{ sheet: string; value: string }>;
  severity: 'high' | 'medium' | 'low';
}

export class CrossReferenceDetector {
  private patterns = [
    { regex: /SEE\s+(SCH-\d+|[A-Z]\d+)/gi, type: 'sheet' as const },
    { regex: /\b(SCH-\d+)\b/gi, type: 'schedule' as const },
    { regex: /\b([A-Z]\d{3})\b/g, type: 'sheet' as const },
    { regex: /\b(WD-\d+|MT-\d+|FN-\d+)\b/gi, type: 'material' as const },
    { regex: /PER\s+(STRUCT|ARCHITECTURAL|MECH)/gi, type: 'structural' as const },
    { regex: /SEE\s+DETAIL\s+(\d+)/gi, type: 'detail' as const }
  ];

  detect(text: string): CrossReference[] {
    const refs: CrossReference[] = [];
    const seen = new Set<string>();
    
    for (const pattern of this.patterns) {
      const matches = text.matchAll(pattern.regex);
      
      for (const match of matches) {
        const reference = match[1] || match[0];
        const refKey = `${pattern.type}:${reference.toUpperCase()}`;
        
        if (seen.has(refKey)) continue;
        seen.add(refKey);
        
        const start = Math.max(0, match.index! - 30);
        const end = Math.min(text.length, match.index! + match[0].length + 30);
        
        refs.push({
          type: pattern.type,
          reference: reference.toUpperCase(),
          context: text.substring(start, end).trim()
        });
      }
    }
    
    return refs.slice(0, 5);
  }

  /** Detect conflicts between search results from different documents */
  detectConflicts(results: SearchResult[]): DocumentConflict[] {
    const conflicts: DocumentConflict[] = [];
    
    // Group steel member callouts by member mark across documents
    const membersByDoc = new Map<string, Map<string, string>>();
    const steelPattern = /\b(W\d+x\d+|HSS\d+x\d+x\d+\/?\.?\d*)\b/gi;
    
    for (const result of results) {
      const sheet = result.drawingNumber || result.id;
      for (const match of result.text.matchAll(steelPattern)) {
        const member = match[0].toUpperCase();
        // Look for a mark near this member (e.g., "B1: W18x106")
        const ctx = result.text.substring(
          Math.max(0, match.index! - 20), match.index!
        );
        const markMatch = ctx.match(/\b([BC]\d+)\s*[:=]?\s*$/i);
        if (markMatch) {
          const mark = markMatch[1].toUpperCase();
          if (!membersByDoc.has(mark)) membersByDoc.set(mark, new Map());
          membersByDoc.get(mark)!.set(sheet, member);
        }
      }
    }
    
    // Check for size mismatches on same mark
    for (const [mark, docs] of membersByDoc) {
      const sizes = new Set(docs.values());
      if (sizes.size > 1) {
        conflicts.push({
          type: 'size_mismatch',
          element: mark,
          documents: Array.from(docs.entries()).map(([sheet, value]) => ({ sheet, value })),
          severity: 'high'
        });
      }
    }
    
    // Check for dimension conflicts on same grid reference
    const dimsByGrid = new Map<string, Map<string, string>>();
    const gridDimPattern = /(?:GRID|grid)\s+([A-Z0-9]+(?:\s*[-–]\s*[A-Z0-9]+)?)\s*[:=]?\s*(\d+[''][-\s]*\d*[""]?)/gi;
    
    for (const result of results) {
      const sheet = result.drawingNumber || result.id;
      for (const match of result.text.matchAll(gridDimPattern)) {
        const grid = match[1].toUpperCase();
        const dim = match[2];
        if (!dimsByGrid.has(grid)) dimsByGrid.set(grid, new Map());
        dimsByGrid.get(grid)!.set(sheet, dim);
      }
    }
    
    for (const [grid, docs] of dimsByGrid) {
      const dims = new Set(docs.values());
      if (dims.size > 1) {
        conflicts.push({
          type: 'dimension_conflict',
          element: `Grid ${grid}`,
          documents: Array.from(docs.entries()).map(([sheet, value]) => ({ sheet, value })),
          severity: 'medium'
        });
      }
    }
    
    return conflicts;
  }
}
