import { SearchResult } from "../types";

export class ResultDeduplicator {
  deduplicate(results: SearchResult[], minScore: number = 300): SearchResult[] {
    // Filter by confidence score
    const filtered = results.filter(r => r.score >= minScore);
    
    // Remove duplicates based on semantic similarity
    const unique: SearchResult[] = [];
    
    for (const result of filtered) {
      const isDuplicate = unique.some(existing => 
        this.areSemanticallyDuplicate(existing, result)
      );
      
      if (!isDuplicate) {
        unique.push(result);
      }
    }
    
    return unique;
  }
  
  private areSemanticallyDuplicate(a: SearchResult, b: SearchResult): boolean {
    // Same drawing = check text similarity
    if (a.drawingNumber === b.drawingNumber) {
      return this.textSimilarity(a.text, b.text) > 0.8;
    }
    
    // Different drawings = check if content is identical (copy/paste across sheets)
    if (a.text === b.text) {
      return true;
    }
    
    // Check if one is a substring of the other (nested content)
    if (a.text.includes(b.text) || b.text.includes(a.text)) {
      return true;
    }
    
    return false;
  }
  
  private textSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }
}
