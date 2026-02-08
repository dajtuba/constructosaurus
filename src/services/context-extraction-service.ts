import { Phase, Location, ConditionalRule, MaterialContext } from '../types';

export class ContextExtractionService {
  /**
   * Extract phase from text
   */
  extractPhase(text: string): Phase | undefined {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('foundation') || lowerText.includes('footing')) {
      return Phase.FOUNDATION;
    }
    if (lowerText.includes('framing') || lowerText.includes('frame')) {
      return Phase.FRAMING;
    }
    if (lowerText.includes('mep') || lowerText.includes('mechanical') || 
        lowerText.includes('electrical') || lowerText.includes('plumbing')) {
      return Phase.MEP;
    }
    if (lowerText.includes('finish') || lowerText.includes('paint') || 
        lowerText.includes('drywall')) {
      return Phase.FINISHES;
    }
    if (lowerText.includes('sitework') || lowerText.includes('site work') || 
        lowerText.includes('grading')) {
      return Phase.SITEWORK;
    }
    
    return undefined;
  }

  /**
   * Extract location from text
   */
  extractLocation(text: string): Location {
    const location: Location = {};
    
    // Extract grid reference (e.g., A-1, B-3)
    const gridMatch = text.match(/\b([A-Z])-?(\d+)\b/);
    if (gridMatch) {
      location.gridRef = `${gridMatch[1]}-${gridMatch[2]}`;
    }
    
    // Extract floor (e.g., 1st Floor, Level 2)
    const floorMatch = text.match(/(\d+)(?:st|nd|rd|th)?\s*(?:floor|level)/i);
    if (floorMatch) {
      location.floor = floorMatch[1];
    }
    
    // Extract room number (e.g., Room 101, 202)
    const roomMatch = text.match(/(?:room\s*)?(\d{3,4})\b/i);
    if (roomMatch) {
      location.room = roomMatch[1];
    }
    
    // Extract zone (e.g., North wing, Building A, Zone 1)
    const zoneMatch = text.match(/(north|south|east|west)\s*(?:wing|zone)|building\s*([A-Z])|zone\s*(\d+)/i);
    if (zoneMatch) {
      location.zone = zoneMatch[0];
    }
    
    return location;
  }

  /**
   * Extract conditional rules from text
   */
  extractConditionals(text: string): ConditionalRule[] {
    const conditionals: ConditionalRule[] = [];
    
    // Match patterns like "if X", "when Y", "where Z"
    const patterns = [
      /if\s+([^,\.]+)/gi,
      /when\s+([^,\.]+)/gi,
      /where\s+([^,\.]+)/gi
    ];
    
    for (const pattern of patterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        conditionals.push({
          condition: match[1].trim(),
          applies: true
        });
      }
    }
    
    return conditionals;
  }

  /**
   * Extract sequencing information from text
   */
  extractSequencing(text: string): string | undefined {
    const lowerText = text.toLowerCase();
    
    // Match patterns like "after X", "before Y", "concurrent with Z"
    const sequenceMatch = text.match(/(after|before|concurrent\s+with|prior\s+to)\s+([^,\.]+)/i);
    if (sequenceMatch) {
      return sequenceMatch[0].trim();
    }
    
    return undefined;
  }

  /**
   * Extract complete material context from text
   */
  extractContext(text: string): MaterialContext {
    return {
      phase: this.extractPhase(text),
      location: this.extractLocation(text),
      conditionals: this.extractConditionals(text),
      sequencing: this.extractSequencing(text)
    };
  }
}
