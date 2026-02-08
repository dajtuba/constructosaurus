import { Conflict, ConflictType, DocumentHierarchy, DocumentRelationship } from '../types';

export class CorrelationService {
  private relationships: DocumentRelationship[] = [];
  private conflicts: Conflict[] = [];

  /**
   * Track material across documents
   */
  trackMaterialAcrossDocuments(materialName: string, documents: Array<{ id: string; quantity: number; spec: string }>): Conflict[] {
    const conflicts: Conflict[] = [];
    
    // Check for quantity mismatches
    const quantities = documents.map(d => d.quantity);
    const uniqueQuantities = [...new Set(quantities)];
    
    if (uniqueQuantities.length > 1) {
      conflicts.push({
        type: ConflictType.QUANTITY_MISMATCH,
        documents: documents.map(d => d.id),
        description: `${materialName} has different quantities: ${uniqueQuantities.join(', ')}`,
        priority: 2
      });
    }
    
    // Check for specification differences
    const specs = documents.map(d => d.spec);
    const uniqueSpecs = [...new Set(specs)];
    
    if (uniqueSpecs.length > 1) {
      conflicts.push({
        type: ConflictType.SPECIFICATION_DIFFERENCE,
        documents: documents.map(d => d.id),
        description: `${materialName} has different specifications: ${uniqueSpecs.join(', ')}`,
        priority: 1
      });
    }
    
    this.conflicts.push(...conflicts);
    return conflicts;
  }

  /**
   * Detect conflicts between documents
   */
  detectConflicts(): Conflict[] {
    return this.conflicts;
  }

  /**
   * Resolve conflict with audit trail
   */
  resolveConflict(conflictIndex: number, resolution: string): void {
    if (conflictIndex < this.conflicts.length) {
      this.conflicts[conflictIndex].resolution = resolution;
    }
  }

  /**
   * Get effective value based on document hierarchy
   */
  getEffectiveValue(values: Array<{ docId: string; hierarchy: DocumentHierarchy; value: any }>): any {
    // Sort by hierarchy (lower number = higher priority)
    values.sort((a, b) => a.hierarchy - b.hierarchy);
    return values[0]?.value;
  }

  /**
   * Add document relationship
   */
  addRelationship(relationship: DocumentRelationship): void {
    this.relationships.push(relationship);
  }

  /**
   * Get relationships for document
   */
  getRelationships(docId: string): DocumentRelationship[] {
    return this.relationships.filter(
      r => r.fromDocId === docId || r.toDocId === docId
    );
  }
}
