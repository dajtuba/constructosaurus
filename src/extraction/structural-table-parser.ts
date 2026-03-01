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

  private getCell(row: string[], index?: number): string | undefined {
    if (index === undefined || index < 0 || index >= row.length) return undefined;
    return row[index]?.trim();
  }
}
