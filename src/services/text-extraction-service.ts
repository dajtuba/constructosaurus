import { TextQuantity, CalloutAnnotation } from '../types';

export class TextExtractionService {
  /**
   * Extract quantities from specification text
   * This would use Claude/LLM in production
   */
  extractFromSpecText(text: string): TextQuantity[] {
    const quantities: TextQuantity[] = [];
    
    // Pattern: "use X material throughout"
    const throughoutPattern = /use\s+([^,\.]+)\s+throughout/gi;
    let match;
    while ((match = throughoutPattern.exec(text)) !== null) {
      quantities.push({
        material: match[1].trim(),
        quantity: 1,
        unit: 'specification',
        context: match[0],
        confidence: 0.8,
        source: 'spec_text'
      });
    }
    
    return quantities;
  }

  /**
   * Extract quantities from callout annotations
   * Pattern: (12) #4 rebar @ 12" o.c.
   */
  extractFromCallouts(text: string, pageNumber: number): CalloutAnnotation[] {
    const callouts: CalloutAnnotation[] = [];
    
    // Pattern: (qty) material @ spacing
    const calloutPattern = /\((\d+)\)\s+([^@]+)@\s*([^,\.]+)/gi;
    let match;
    while ((match = calloutPattern.exec(text)) !== null) {
      const quantity: TextQuantity = {
        material: match[2].trim(),
        quantity: parseInt(match[1]),
        unit: 'each',
        context: match[0],
        confidence: 0.9,
        source: 'callout'
      };
      
      callouts.push({
        text: match[0],
        pageNumber,
        extractedQuantity: quantity
      });
    }
    
    return callouts;
  }

  /**
   * Extract from general notes
   */
  extractFromGeneralNotes(notes: string): TextQuantity[] {
    const quantities: TextQuantity[] = [];
    
    // Pattern: "provide X material"
    const providePattern = /provide\s+(\d+)\s+([^,\.]+)/gi;
    let match;
    while ((match = providePattern.exec(notes)) !== null) {
      quantities.push({
        material: match[2].trim(),
        quantity: parseInt(match[1]),
        unit: 'each',
        context: match[0],
        confidence: 0.7,
        source: 'general_notes'
      });
    }
    
    return quantities;
  }

  /**
   * Parse quantity pattern
   * Pattern: X material @ Y spacing
   */
  parseQuantityPattern(text: string): TextQuantity | null {
    const pattern = /(\d+)\s+([^@]+)@\s*([^,\.]+)/i;
    const match = text.match(pattern);
    
    if (!match) return null;
    
    return {
      material: match[2].trim(),
      quantity: parseInt(match[1]),
      unit: 'each',
      context: match[0],
      confidence: 0.85,
      source: 'pattern'
    };
  }
}
