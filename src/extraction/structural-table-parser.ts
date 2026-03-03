import { ExtractedTable } from './table-extractor';

export interface StructuralMember {
  span?: string;
  status?: 'Passed' | 'Failed';
  ratio?: string;
  size?: string;
  material?: string;
  type?: string;
}

export interface BeamScheduleEntry {
  mark: string;
  size: string;
  length?: string;
  gridStart?: string;
  gridEnd?: string;
  camber?: string;
  connectionLeft?: string;
  connectionRight?: string;
  quantity: number;
  location?: string;
  elevation?: string;
}

export interface LoadCapacity {
  dimension?: string;
  capacity?: number;
  height?: string;
  material?: string;
}

export interface PierSchedule {
  mark?: string;
  diameter?: string;
  depth?: string;
  rebarVertical?: string;
  rebarSpiral?: string;
  concreteStrength?: string;
  gridLocation?: string;
  topElevation?: string;
}

export interface DetailReference {
  detailNumber: string;
  sheetReference: string;
  gridLocation?: string;
  confidence: number;
}

export interface LoadTableEntry {
  memberMark: string;
  size: string;
  span: string;
  loadCapacity: string;
  designCriteria: string;
  confidence: number;
}

export class StructuralTableParser {
  parseVerificationTable(table: ExtractedTable): StructuralMember[] {
    const members: StructuralMember[] = [];
    
    for (const row of table.rows) {
      const rowText = row.join(' ');
      
      // Look for Passed/Failed status
      const passedMatch = rowText.match(/Passed/i);
      const failedMatch = rowText.match(/Failed/i);
      
      if (passedMatch || failedMatch) {
        const member: StructuralMember = {
          status: passedMatch ? 'Passed' : 'Failed'
        };
        
        // Extract span (e.g., "12'-0\"")
        const spanMatch = rowText.match(/(\d+'-\d+")/);
        if (spanMatch) member.span = spanMatch[1];
        
        // Extract ratio (e.g., "72% ΔTₗₐₜ")
        const ratioMatch = rowText.match(/(\d+%[^)]*)/);
        if (ratioMatch) member.ratio = ratioMatch[1];
        
        // Extract size (e.g., "3 1/2\" x 5 1/4\"")
        const sizeMatch = rowText.match(/(\d+\s*\d*\/?\d*"\s*x\s*\d+\s*\d*\/?\d*")/);
        if (sizeMatch) member.size = sizeMatch[1];
        
        // Extract material
        if (rowText.includes('Parallam')) member.material = 'Parallam PSL';
        else if (rowText.includes('LVL')) member.material = 'LVL';
        else if (rowText.includes('Glulam')) member.material = 'Glulam';
        else if (rowText.includes('Doug-Fir')) member.material = 'Douglas Fir';
        else if (rowText.includes('Hem-Fir')) member.material = 'Hem-Fir';
        
        members.push(member);
      }
    }
    
    return members;
  }

  parseLoadCapacityTable(table: ExtractedTable): LoadCapacity[] {
    const capacities: LoadCapacity[] = [];
    
    for (const row of table.rows) {
      const rowText = row.join(' ');
      
      // Look for height specifications
      const heightMatch = rowText.match(/(\d+'-\d+")/);
      
      if (heightMatch) {
        const capacity: LoadCapacity = {
          height: heightMatch[1]
        };
        
        // Extract dimension (first number)
        const dimMatch = rowText.match(/^(\d+\.?\d*)/);
        if (dimMatch) capacity.dimension = dimMatch[1];
        
        // Extract capacity (second number)
        const capMatch = rowText.match(/^\d+\.?\d*\s+(\d+\.?\d*)/);
        if (capMatch) capacity.capacity = parseFloat(capMatch[1]);
        
        // Extract material
        if (rowText.includes('Hem-Fir')) capacity.material = 'Hem-Fir';
        else if (rowText.includes('Doug-Fir')) capacity.material = 'Douglas Fir';
        
        capacities.push(capacity);
      }
    }
    
    return capacities;
  }

  parsePierSchedule(table: ExtractedTable): PierSchedule[] {
    const piers: PierSchedule[] = [];
    
    for (const row of table.rows) {
      const rowText = row.join(' ');
      
      // Look for pier marks (P1, P2, etc.)
      const markMatch = rowText.match(/\b(P\d+)\b/);
      
      if (markMatch) {
        const pier: PierSchedule = {
          mark: markMatch[1]
        };
        
        // Extract diameter (e.g., "18\"")
        const diameterMatch = rowText.match(/(\d+)"(?!\s*x)/);
        if (diameterMatch) pier.diameter = diameterMatch[1] + '"';
        
        // Extract depth (e.g., "8'-0\"")
        const depthMatch = rowText.match(/(\d+'-\d+")/);
        if (depthMatch) pier.depth = depthMatch[1];
        
        // Extract vertical rebar (e.g., "6-#6")
        const rebarVertMatch = rowText.match(/(\d+-#\d+)/);
        if (rebarVertMatch) pier.rebarVertical = rebarVertMatch[1];
        
        // Extract spiral rebar (e.g., "#3 @ 4\" pitch")
        const rebarSpiralMatch = rowText.match(/(#\d+\s*@\s*\d+"\s*pitch)/i);
        if (rebarSpiralMatch) pier.rebarSpiral = rebarSpiralMatch[1];
        
        // Extract concrete strength (e.g., "4000 psi")
        const concreteMatch = rowText.match(/(\d+\s*psi)/i);
        if (concreteMatch) pier.concreteStrength = concreteMatch[1];
        
        // Extract grid location (e.g., "A/1")
        const gridMatch = rowText.match(/\b([A-Z]\/\d+)\b/);
        if (gridMatch) pier.gridLocation = gridMatch[1];
        
        // Extract top elevation (e.g., "+0'-6\"")
        const elevMatch = rowText.match(/([+-]\d+'-\d+")/);
        if (elevMatch) pier.topElevation = elevMatch[1];
        
        piers.push(pier);
      }
    }
    
    return piers;
  }

  parseLoadTable(table: ExtractedTable): LoadTableEntry[] {
    if (table.rows.length < 2) return [];
    
    const headers = this.normalizeHeaders(table.rows[0]);
    const columnMap = this.mapHeaders(headers, {
      memberMark: ['mark', 'member', 'designation', 'id'],
      size: ['size', 'section', 'dimension'],
      span: ['span', 'length', 'distance'],
      loadCapacity: ['load', 'capacity', 'allowable', 'max'],
      designCriteria: ['criteria', 'code', 'standard', 'basis']
    });
    
    const entries: LoadTableEntry[] = [];
    
    for (let i = 1; i < table.rows.length; i++) {
      const row = table.rows[i];
      const rowText = row.join(' ');
      
      // Skip empty or header-like rows
      if (!rowText.trim() || rowText.toLowerCase().includes('member')) continue;
      
      const memberMark = this.getCell(row, columnMap.memberMark) || this.extractMemberMark(rowText);
      const size = this.getCell(row, columnMap.size) || this.extractSize(rowText);
      const span = this.getCell(row, columnMap.span) || this.extractSpan(rowText);
      const loadCapacity = this.getCell(row, columnMap.loadCapacity) || this.extractLoadCapacity(rowText);
      const designCriteria = this.getCell(row, columnMap.designCriteria) || this.extractDesignCriteria(rowText);
      
      if (memberMark || size) {
        const confidence = this.calculateConfidence(memberMark, size, span, loadCapacity, designCriteria);
        
        entries.push({
          memberMark: memberMark || '',
          size: size || '',
          span: span || '',
          loadCapacity: loadCapacity || '',
          designCriteria: designCriteria || '',
          confidence
        });
      }
    }
    
    return entries;
  }

  private extractMemberMark(text: string): string {
    const match = text.match(/\b([A-Z]\d+|D\d+|B\d+|J\d+)\b/);
    return match ? match[1] : '';
  }

  private extractSize(text: string): string {
    const match = text.match(/(\d+\s*\d*\/?\d*"\s*x\s*\d+\s*\d*\/?\d*"|TJI\s*\d+|\d+\s*x\s*\d+)/);
    return match ? match[1] : '';
  }

  private extractSpan(text: string): string {
    const match = text.match(/(\d+'-\d+"|@\s*\d+"\s*OC)/);
    return match ? match[1] : '';
  }

  private extractLoadCapacity(text: string): string {
    const match = text.match(/(\d+\.?\d*\s*(psf|plf|lbs|kips))/i);
    return match ? match[1] : '';
  }

  private extractDesignCriteria(text: string): string {
    const match = text.match(/(IBC|NDS|AISC|ACI|L\/\d+)/i);
    return match ? match[1] : '';
  }

  private calculateConfidence(memberMark: string, size: string, span: string, loadCapacity: string, designCriteria: string): number {
    let score = 0;
    if (memberMark) score += 0.3;
    if (size) score += 0.3;
    if (span) score += 0.2;
    if (loadCapacity) score += 0.15;
    if (designCriteria) score += 0.05;
    return Math.round(score * 100) / 100;
  }

  parseBeamSchedule(table: ExtractedTable): BeamScheduleEntry[] {
    if (table.rows.length < 2) return [];
    
    const headers = this.normalizeHeaders(table.rows[0]);
    const columnMap = this.mapHeaders(headers, {
      mark: ['mark', 'beam', 'id', 'designation'],
      size: ['size', 'section', 'shape', 'member'],
      length: ['length', 'span', 'len'],
      gridStart: ['grid_start', 'start_grid', 'from_grid', 'start'],
      gridEnd: ['grid_end', 'end_grid', 'to_grid', 'end'],
      camber: ['camber', 'camb'],
      connectionLeft: ['conn_left', 'left_conn', 'connection_left', 'left'],
      connectionRight: ['conn_right', 'right_conn', 'connection_right', 'right'],
      quantity: ['qty', 'quantity', 'count', 'no'],
      location: ['location', 'grid', 'gridline', 'bay'],
      elevation: ['elevation', 'elev', 'level']
    });
    
    const entries: BeamScheduleEntry[] = [];
    
    for (let i = 1; i < table.rows.length; i++) {
      const row = table.rows[i];
      const mark = this.getCell(row, columnMap.mark);
      const size = this.getCell(row, columnMap.size);
      if (!mark && !size) continue;
      
      entries.push({
        mark: mark || size || '',
        size: size || mark || '',
        length: this.getCell(row, columnMap.length),
        gridStart: this.getCell(row, columnMap.gridStart),
        gridEnd: this.getCell(row, columnMap.gridEnd),
        camber: this.getCell(row, columnMap.camber),
        connectionLeft: this.getCell(row, columnMap.connectionLeft),
        connectionRight: this.getCell(row, columnMap.connectionRight),
        quantity: parseInt(this.getCell(row, columnMap.quantity) || '1') || 1,
        location: this.getCell(row, columnMap.location),
        elevation: this.getCell(row, columnMap.elevation)
      });
    }
    
    return entries;
  }

  classifyStructuralTable(table: ExtractedTable): string {
    const text = table.rows.map(r => r.join(' ')).join(' ').toLowerCase();
    
    if (text.includes('passed') || text.includes('failed')) {
      return 'verification_table';
    }
    if (text.includes('height') && (text.includes('hem-fir') || text.includes('doug-fir'))) {
      return 'load_capacity_table';
    }
    if ((text.includes('forteweb') || text.includes('engineered lumber')) && 
        (text.includes('load') || text.includes('capacity'))) {
      return 'forteweb_load_table';
    }
    if (text.includes('load') || text.includes('psf') || text.includes('plf')) {
      return 'load_table';
    }
    if (text.includes('beam') || text.includes('joist')) {
      return 'member_table';
    }
    
    return 'calculation_table';
  }

  private normalizeHeaders(headers: string[]): string[] {
    return headers.map(h => 
      h.toLowerCase()
        .trim()
        .replace(/[^a-z0-9]/g, '_')
    );
  }

  private mapHeaders(
    headers: string[], 
    mapping: Record<string, string[]>
  ): Record<string, number> {
    const result: Record<string, number> = {};
    
    for (const [key, variations] of Object.entries(mapping)) {
      for (let i = 0; i < headers.length; i++) {
        if (variations.some(v => headers[i].includes(v))) {
          result[key] = i;
          break;
        }
      }
    }
    
    return result;
  }

  parseDetailReferences(text: string): DetailReference[] {
    const references: DetailReference[] = [];
    
    // Primary pattern: (\d+)/(S\d+\.\d+)
    const primaryPattern = /(\d+)\/(S\d+\.\d+)/g;
    
    // Alternative patterns for variations
    const patterns = [
      /(\d+)\/(S\d+\.\d+)/g,           // 1/S2.2, 3/S3.0
      /(\d+)\/([A-Z]\d+\.\d+)/g,       // 1/A2.1, 2/E3.0  
      /(\d+)\s*\/\s*(S\d+\.\d+)/g,     // 1 / S2.2 (with spaces)
      /(\d+)-([A-Z]\d+\.\d+)/g,        // 1-S2.2 (dash separator)
      /Detail\s*(\d+)\s*\/\s*(S\d+\.\d+)/gi, // Detail 1/S2.2
      /(\d+)\s*@\s*(S\d+\.\d+)/g       // 1@S2.2
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const detailNumber = match[1];
        const sheetReference = match[2];
        
        // Calculate confidence based on pattern match quality
        let confidence = 0.8; // Base confidence
        
        // Higher confidence for standard pattern
        if (pattern === primaryPattern) {
          confidence = 0.95;
        }
        
        // Check for grid location context around the match
        const contextStart = Math.max(0, match.index - 20);
        const contextEnd = Math.min(text.length, match.index + match[0].length + 20);
        const context = text.substring(contextStart, contextEnd);
        
        // Look for grid references near the detail callout
        const gridMatch = context.match(/(?:at\s+|@\s*)?([A-Z]\d*\/\d+|[A-Z]\d*-[A-Z]\d*|\b[A-Z]\d*\b)/);
        const gridLocation = gridMatch ? gridMatch[1] : undefined;
        
        // Boost confidence if grid location found
        if (gridLocation) {
          confidence = Math.min(0.98, confidence + 0.1);
        }
        
        // Avoid duplicates
        const exists = references.some(ref => 
          ref.detailNumber === detailNumber && 
          ref.sheetReference === sheetReference
        );
        
        if (!exists) {
          references.push({
            detailNumber,
            sheetReference,
            gridLocation,
            confidence: Math.round(confidence * 100) / 100
          });
        }
      }
    }
    
    return references.sort((a, b) => b.confidence - a.confidence);
  }

  private getCell(row: string[], index?: number): string | undefined {
    if (index === undefined || index < 0 || index >= row.length) return undefined;
    return row[index]?.trim();
  }
}
