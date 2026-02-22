export interface CrossReference {
  source_sheet: string;
  reference: string;
  target_sheet: string;
  found: boolean;
  details?: any;
}

export class CrossReferenceValidator {
  private extractedData: Map<string, any> = new Map();

  addSheetData(sheetName: string, data: any) {
    this.extractedData.set(sheetName, data);
  }

  validateCrossReferences(): CrossReference[] {
    const results: CrossReference[] = [];
    
    // Check all cross-references from all sheets
    for (const [sheetName, sheetData] of this.extractedData) {
      const references = this.extractReferences(sheetData);
      
      for (const ref of references) {
        const validation = this.validateReference(sheetName, ref);
        results.push(validation);
      }
    }
    
    return results;
  }

  private extractReferences(sheetData: any): string[] {
    const refs: string[] = [];
    
    // Extract from cross_references array
    if (sheetData.cross_references) {
      refs.push(...sheetData.cross_references);
    }
    
    // Extract from nested data structures
    if (sheetData.data) {
      this.extractReferencesRecursive(sheetData.data, refs);
    }
    
    return [...new Set(refs)]; // Remove duplicates
  }

  private extractReferencesRecursive(obj: any, refs: string[]): void {
    if (Array.isArray(obj)) {
      obj.forEach(item => this.extractReferencesRecursive(item, refs));
    } else if (typeof obj === 'object' && obj !== null) {
      // Look for section references in any field
      Object.values(obj).forEach(value => {
        if (typeof value === 'string' && this.isSectionReference(value)) {
          refs.push(value);
        } else if (Array.isArray(value)) {
          value.forEach(item => {
            if (typeof item === 'string' && this.isSectionReference(item)) {
              refs.push(item);
            }
          });
        } else if (typeof value === 'object' && value !== null) {
          this.extractReferencesRecursive(value, refs);
        }
      });
    }
  }

  private isSectionReference(text: string): boolean {
    // Match patterns like: 3/S3.0, 4/S3.0, 5/S3.0, A/S2.1, etc.
    return /^\d+\/S\d+\.\d+$/.test(text) || /^[A-Z]\/S\d+\.\d+$/.test(text);
  }

  private validateReference(sourceSheet: string, reference: string): CrossReference {
    // Parse reference to get target sheet
    const targetSheet = this.parseTargetSheet(reference);
    
    if (!targetSheet) {
      return {
        source_sheet: sourceSheet,
        reference,
        target_sheet: 'unknown',
        found: false
      };
    }

    // Check if target sheet exists in our data
    const targetData = this.extractedData.get(targetSheet);
    if (!targetData) {
      return {
        source_sheet: sourceSheet,
        reference,
        target_sheet: targetSheet,
        found: false
      };
    }

    // For details sheet, check if the specific detail exists
    if (targetSheet === 'S3.0') {
      const detailNumber = this.parseDetailNumber(reference);
      const found = this.findDetailInSheet(targetData, detailNumber);
      
      return {
        source_sheet: sourceSheet,
        reference,
        target_sheet: targetSheet,
        found: found !== null,
        details: found
      };
    }

    // For other sheets, just verify sheet exists
    return {
      source_sheet: sourceSheet,
      reference,
      target_sheet: targetSheet,
      found: true
    };
  }

  private parseTargetSheet(reference: string): string | null {
    if (typeof reference !== 'string') {
      return null;
    }
    const match = reference.match(/\/([^\/]+)$/);
    return match ? match[1] : null;
  }

  private parseDetailNumber(reference: string): string | null {
    if (typeof reference !== 'string') {
      return null;
    }
    const match = reference.match(/^(\d+|[A-Z])\//);
    return match ? match[1] : null;
  }

  private findDetailInSheet(sheetData: any, detailNumber: string | null): any {
    if (!detailNumber || !sheetData.data || !sheetData.data.details) {
      return null;
    }

    return sheetData.data.details.find((detail: any) => 
      detail.number === detailNumber || detail.id === detailNumber
    );
  }

  getBrokenReferences(): CrossReference[] {
    return this.validateCrossReferences().filter(ref => !ref.found);
  }

  getValidReferences(): CrossReference[] {
    return this.validateCrossReferences().filter(ref => ref.found);
  }
}