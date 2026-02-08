import * as fs from 'fs';
import pdf from 'pdf-parse';

export interface TableCell {
  text: string;
  x: number;
  y: number;
}

export interface ExtractedTable {
  page: number;
  rows: string[][];
  bbox?: { x: number; y: number; width: number; height: number };
  method: string;
}

export class TableExtractor {
  async extractTables(pdfPath: string): Promise<ExtractedTable[]> {
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdf(dataBuffer);
    
    const tables: ExtractedTable[] = [];
    
    // Simple heuristic: look for text patterns that indicate tables
    // Split by pages and look for aligned text
    const pages = data.text.split('\f'); // Form feed separates pages
    
    for (let i = 0; i < pages.length; i++) {
      const pageText = pages[i];
      const pageTables = this.detectTablesInText(pageText, i + 1);
      tables.push(...pageTables);
    }
    
    return tables;
  }

  private detectTablesInText(text: string, pageNum: number): ExtractedTable[] {
    const lines = text.split('\n').filter(l => l.trim());
    const tables: ExtractedTable[] = [];
    
    let currentTable: string[][] = [];
    let inTable = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Detect table start: line with multiple columns separated by spaces
      const cells = line.split(/\s{2,}/).filter(c => c.trim());
      
      if (cells.length >= 2) {
        // Likely a table row
        if (!inTable) {
          inTable = true;
          currentTable = [];
        }
        currentTable.push(cells);
      } else {
        // End of table
        if (inTable && currentTable.length >= 2) {
          tables.push({
            page: pageNum,
            rows: currentTable,
            method: 'text-pattern'
          });
        }
        inTable = false;
        currentTable = [];
      }
    }
    
    // Catch table at end of page
    if (inTable && currentTable.length >= 2) {
      tables.push({
        page: pageNum,
        rows: currentTable,
        method: 'text-pattern'
      });
    }
    
    return tables;
  }

  classifyTableType(table: ExtractedTable): string {
    if (table.rows.length < 2) return 'unknown';
    
    const headers = table.rows[0].map(h => h.toLowerCase());
    const headerText = headers.join(' ');
    
    // Footing schedule
    if (headerText.includes('mark') && 
        (headerText.includes('footing') || headerText.includes('width') || headerText.includes('depth'))) {
      return 'footing_schedule';
    }
    
    // Rebar schedule
    if (headerText.includes('bar') && headerText.includes('size')) {
      return 'rebar_schedule';
    }
    
    // Door schedule
    if (headerText.includes('door')) {
      return 'door_schedule';
    }
    
    // Window schedule
    if (headerText.includes('window')) {
      return 'window_schedule';
    }
    
    // Room finish schedule
    if (headerText.includes('room') && 
        (headerText.includes('floor') || headerText.includes('wall') || headerText.includes('ceiling'))) {
      return 'room_finish_schedule';
    }
    
    return 'general_schedule';
  }
}
