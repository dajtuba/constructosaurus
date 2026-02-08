import { ExtractedTable } from './table-extractor';

export interface StructuralMember {
  span?: string;
  status?: 'Passed' | 'Failed';
  ratio?: string;
  size?: string;
  material?: string;
  type?: string;
}

export interface LoadCapacity {
  dimension?: string;
  capacity?: number;
  height?: string;
  material?: string;
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
}
