export interface Table {
  type: "door_schedule" | "window_schedule" | "finish_schedule" | "equipment_list" | "general";
  headers: string[];
  rows: string[][];
  source: string;
  pageNumber?: number;
}

export class ScheduleParser {
  detectTables(text: string): Table[] {
    const tables: Table[] = [];
    
    // Detect door schedules
    if (/door\s+schedule/i.test(text)) {
      const table = this.parseDoorSchedule(text);
      if (table) tables.push(table);
    }
    
    // Detect window schedules
    if (/window\s+schedule/i.test(text)) {
      const table = this.parseWindowSchedule(text);
      if (table) tables.push(table);
    }
    
    // Detect finish schedules
    if (/finish\s+schedule|room\s+finish/i.test(text)) {
      const table = this.parseFinishSchedule(text);
      if (table) tables.push(table);
    }
    
    return tables;
  }

  private parseDoorSchedule(text: string): Table | null {
    // Simple table detection - look for common patterns
    const lines = text.split('\n');
    const headerIdx = lines.findIndex(line => 
      /mark|type|size|material|hardware/i.test(line)
    );
    
    if (headerIdx === -1) return null;
    
    const headers = lines[headerIdx].split(/\s{2,}|\t/).filter(h => h.trim());
    const rows: string[][] = [];
    
    for (let i = headerIdx + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.length < 10) break;
      
      const cells = line.split(/\s{2,}|\t/).filter(c => c.trim());
      if (cells.length >= 2) {
        rows.push(cells);
      }
    }
    
    return rows.length > 0 ? {
      type: "door_schedule",
      headers,
      rows,
      source: "",
    } : null;
  }

  private parseWindowSchedule(text: string): Table | null {
    const lines = text.split('\n');
    const headerIdx = lines.findIndex(line => 
      /mark|type|size|glazing/i.test(line)
    );
    
    if (headerIdx === -1) return null;
    
    const headers = lines[headerIdx].split(/\s{2,}|\t/).filter(h => h.trim());
    const rows: string[][] = [];
    
    for (let i = headerIdx + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.length < 10) break;
      
      const cells = line.split(/\s{2,}|\t/).filter(c => c.trim());
      if (cells.length >= 2) {
        rows.push(cells);
      }
    }
    
    return rows.length > 0 ? {
      type: "window_schedule",
      headers,
      rows,
      source: "",
    } : null;
  }

  private parseFinishSchedule(text: string): Table | null {
    const lines = text.split('\n');
    const headerIdx = lines.findIndex(line => 
      /room|floor|wall|ceiling|base/i.test(line)
    );
    
    if (headerIdx === -1) return null;
    
    const headers = lines[headerIdx].split(/\s{2,}|\t/).filter(h => h.trim());
    const rows: string[][] = [];
    
    for (let i = headerIdx + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.length < 10) break;
      
      const cells = line.split(/\s{2,}|\t/).filter(c => c.trim());
      if (cells.length >= 2) {
        rows.push(cells);
      }
    }
    
    return rows.length > 0 ? {
      type: "finish_schedule",
      headers,
      rows,
      source: "",
    } : null;
  }
}
