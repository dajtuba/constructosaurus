export type QueryIntent = 'quantity_takeoff' | 'specifications' | 'details' | 'dimensions' | 'general';

export class QueryIntentDetector {
  private intentPatterns = {
    quantity_takeoff: /\b(materials?|quantities?|takeoff|how much|how many|supply|order|count)\b/i,
    specifications: /\b(spec|specification|type|grade|model|manufacturer|product)\b/i,
    details: /\b(detail|connection|fastener|installation|method|how to)\b/i,
    dimensions: /\b(dimension|size|area|length|width|height|square feet|sq ft)\b/i
  };

  detect(query: string): QueryIntent {
    for (const [intent, pattern] of Object.entries(this.intentPatterns)) {
      if (pattern.test(query)) {
        return intent as QueryIntent;
      }
    }
    return 'general';
  }

  getBoostFactors(intent: QueryIntent): Record<string, number> {
    const boosts: Record<QueryIntent, Record<string, number>> = {
      quantity_takeoff: {
        'Plan': 1.5,
        'Schedule': 1.3,
        'Detail': 0.8,
        'Specification': 0.9,
        'Section': 0.7
      },
      specifications: {
        'Schedule': 1.5,
        'Specification': 1.4,
        'Plan': 0.9,
        'Detail': 1.0,
        'Section': 0.8
      },
      details: {
        'Detail': 1.5,
        'Section': 1.2,
        'Plan': 0.8,
        'Schedule': 0.7,
        'Specification': 0.9
      },
      dimensions: {
        'Plan': 1.5,
        'Section': 1.2,
        'Detail': 0.9,
        'Schedule': 0.6,
        'Specification': 0.5
      },
      general: {
        'Plan': 1.0,
        'Schedule': 1.0,
        'Detail': 1.0,
        'Specification': 1.0,
        'Section': 1.0
      }
    };

    return boosts[intent];
  }
}
