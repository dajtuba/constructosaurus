import { SearchResult } from "../types";

export class ResultDeduplicator {
  deduplicate(results: SearchResult[], minScore: number = 300): SearchResult[] {
    // Filter by confidence score
    const filtered = results.filter(r => r.score >= minScore);
    
    // Remove duplicates based on text similarity
    const unique: SearchResult[] = [];
    
    for (const result of filtered) {
      const isDuplicate = unique.some(existing => 
        this.isSimilar(existing.text, result.text) &&
        existing.drawingNumber === result.drawingNumber
      );
      
      if (!isDuplicate) {
        unique.push(result);
      }
    }
    
    return unique;
  }
  
  private isSimilar(text1: string, text2: string): boolean {
    // Simple similarity check - if 80% of words overlap
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size > 0.8;
  }
}
