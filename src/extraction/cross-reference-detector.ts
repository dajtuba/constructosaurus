import { CrossReference } from "../types";

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
        
        // Deduplicate - only keep first occurrence
        if (seen.has(refKey)) continue;
        seen.add(refKey);
        
        // Limit context to reduce bloat
        const start = Math.max(0, match.index! - 30);
        const end = Math.min(text.length, match.index! + match[0].length + 30);
        
        refs.push({
          type: pattern.type,
          reference: reference.toUpperCase(),
          context: text.substring(start, end).trim()
        });
      }
    }
    
    // Limit to 5 most relevant cross-references
    return refs.slice(0, 5);
  }
}
