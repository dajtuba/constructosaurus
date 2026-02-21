import { ExtractedTable } from './table-extractor';

export interface Dimension {
  value: number;
  unit: string;
  feet?: number;
  inches?: number;
  original: string;
}

export interface FootingEntry {
  mark: string;
  width?: Dimension;
  depth?: Dimension;
  rebar_vertical?: string;
  rebar_horizontal?: string;
  concrete_strength?: number;
  notes?: string;
}

export interface BeamScheduleEntry {
  mark: string;
  size: string;
  length?: string;
  quantity: number;
  location?: string;
  elevation?: string;
  connection?: string;
}

export interface ColumnScheduleEntry {
  mark: string;
  size: string;
  height?: string;
  quantity: number;
  location?: string;
  basePlate?: string;
}

export interface ScheduleEntry {
  mark: string;
  data: Record<string, any>;
}

export class ScheduleParser {
  parseFootingSchedule(table: ExtractedTable): FootingEntry[] {
    if (table.rows.length < 2) return [];
    
    const headers = this.normalizeHeaders(table.rows[0]);
    const columnMap = this.mapHeaders(headers, {
      mark: ['mark', 'ftg', 'footing', 'id'],
      width: ['width', 'w'],
      depth: ['depth', 'd', 'thickness', 't'],
      rebar_vert: ['vert', 'vertical'],
      rebar_horiz: ['horiz', 'horizontal'],
      concrete: ['concrete', 'conc', 'fc', 'psi'],
      notes: ['notes', 'remarks', 'comments']
    });
    
    const entries: FootingEntry[] = [];
    
    for (let i = 1; i < table.rows.length; i++) {
      const row = table.rows[i];
      const entry = this.extractFootingEntry(row, columnMap);
      if (entry) entries.push(entry);
    }
    
    return entries;
  }

  parseDoorSchedule(table: ExtractedTable): ScheduleEntry[] {
    if (table.rows.length < 2) return [];
    
    const headers = this.normalizeHeaders(table.rows[0]);
    const entries: ScheduleEntry[] = [];
    
    for (let i = 1; i < table.rows.length; i++) {
      const row = table.rows[i];
      const entry: Record<string, any> = {};
      
      headers.forEach((header, idx) => {
        if (row[idx]) {
          entry[header] = row[idx];
        }
      });
      
      if (entry[headers[0]]) { // Has mark/id in first column
        entries.push({
          mark: entry[headers[0]],
          data: entry
        });
      }
    }
    
    return entries;
  }

  parseGenericSchedule(table: ExtractedTable): ScheduleEntry[] {
    return this.parseDoorSchedule(table); // Same logic
  }

  parseBeamSchedule(table: ExtractedTable): BeamScheduleEntry[] {
    if (table.rows.length < 2) return [];
    
    const headers = this.normalizeHeaders(table.rows[0]);
    const columnMap = this.mapHeaders(headers, {
      mark: ['mark', 'beam', 'id', 'designation'],
      size: ['size', 'section', 'shape', 'member'],
      length: ['length', 'span', 'len'],
      quantity: ['qty', 'quantity', 'count', 'no'],
      location: ['location', 'grid', 'gridline', 'bay'],
      elevation: ['elevation', 'elev', 'level'],
      connection: ['connection', 'conn', 'end']
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
        quantity: parseInt(this.getCell(row, columnMap.quantity) || '1') || 1,
        location: this.getCell(row, columnMap.location),
        elevation: this.getCell(row, columnMap.elevation),
        connection: this.getCell(row, columnMap.connection)
      });
    }
    
    return entries;
  }

  parseColumnSchedule(table: ExtractedTable): ColumnScheduleEntry[] {
    if (table.rows.length < 2) return [];
    
    const headers = this.normalizeHeaders(table.rows[0]);
    const columnMap = this.mapHeaders(headers, {
      mark: ['mark', 'column', 'col', 'id'],
      size: ['size', 'section', 'shape', 'member'],
      height: ['height', 'ht', 'length'],
      quantity: ['qty', 'quantity', 'count', 'no'],
      location: ['location', 'grid', 'gridline'],
      basePlate: ['base', 'plate', 'baseplate']
    });
    
    const entries: ColumnScheduleEntry[] = [];
    
    for (let i = 1; i < table.rows.length; i++) {
      const row = table.rows[i];
      const mark = this.getCell(row, columnMap.mark);
      const size = this.getCell(row, columnMap.size);
      if (!mark && !size) continue;
      
      entries.push({
        mark: mark || size || '',
        size: size || mark || '',
        height: this.getCell(row, columnMap.height),
        quantity: parseInt(this.getCell(row, columnMap.quantity) || '1') || 1,
        location: this.getCell(row, columnMap.location),
        basePlate: this.getCell(row, columnMap.basePlate)
      });
    }
    
    return entries;
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

  private extractFootingEntry(
    row: string[], 
    columnMap: Record<string, number>
  ): FootingEntry | null {
    const mark = this.getCell(row, columnMap.mark);
    if (!mark) return null;
    
    return {
      mark,
      width: this.parseDimension(this.getCell(row, columnMap.width)),
      depth: this.parseDimension(this.getCell(row, columnMap.depth)),
      rebar_vertical: this.getCell(row, columnMap.rebar_vert),
      rebar_horizontal: this.getCell(row, columnMap.rebar_horiz),
      concrete_strength: this.parseConcreteStrength(this.getCell(row, columnMap.concrete)),
      notes: this.getCell(row, columnMap.notes)
    };
  }

  private getCell(row: string[], index?: number): string | undefined {
    if (index === undefined || index < 0 || index >= row.length) return undefined;
    return row[index]?.trim();
  }

  parseDimension(dimStr?: string): Dimension | undefined {
    if (!dimStr) return undefined;
    
    // Feet-inches: 2'-4"
    let match = dimStr.match(/(\d+)'-(\d+)"/);
    if (match) {
      const feet = parseInt(match[1]);
      const inches = parseInt(match[2]);
      return {
        value: feet * 12 + inches,
        unit: 'inches',
        feet,
        inches,
        original: dimStr
      };
    }
    
    // Inches only: 16"
    match = dimStr.match(/(\d+)"/);
    if (match) {
      const inches = parseInt(match[1]);
      return {
        value: inches,
        unit: 'inches',
        feet: Math.floor(inches / 12),
        inches: inches % 12,
        original: dimStr
      };
    }
    
    // Decimal feet: 2.5'
    match = dimStr.match(/(\d+\.?\d*)'/);
    if (match) {
      const feet = parseFloat(match[1]);
      return {
        value: feet * 12,
        unit: 'inches',
        feet: Math.floor(feet),
        inches: Math.round((feet % 1) * 12),
        original: dimStr
      };
    }
    
    return undefined;
  }

  parseConcreteStrength(strengthStr?: string): number | undefined {
    if (!strengthStr) return undefined;
    
    const match = strengthStr.match(/(\d+)/);
    return match ? parseInt(match[1]) : undefined;
  }
}
