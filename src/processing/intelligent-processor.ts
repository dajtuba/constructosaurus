import { DocumentClassifier } from "../classification/document-classifier";
import { SheetProcessor } from "./sheet-processor";
import { ScheduleParser } from "./schedule-parser";
import { EmbeddingService } from "../embeddings/embedding-service";
import { TableExtractor } from "../extraction/table-extractor";
import { ScheduleParser as NewScheduleParser } from "../extraction/schedule-parser";
import { StructuralTableParser } from "../extraction/structural-table-parser";
import { DrawingVisionAnalyzer } from "../vision/drawing-vision-analyzer";
import { OllamaVisionAnalyzer } from "../vision/ollama-vision-analyzer";
import { PDFImageConverter } from "../vision/pdf-image-converter";
import { ScheduleStore } from "../storage/schedule-store";
import { Sheet, Schedule } from "../types";
import * as crypto from "crypto";
import * as path from "path";
import * as fs from "fs";

interface ProgressState {
  file: string;
  completedPages: number[];
  lastUpdated: string;
}

export interface ProcessingResult {
  classification: any;
  sheets: Sheet[];
  schedules: Schedule[];
  extractedTables?: number;
  parsedSchedules?: number;
  structuralMembers?: number;
  visionSchedules?: number;
  visionItemCounts?: number;
}

export class IntelligentDocumentProcessor {
  private classifier: DocumentClassifier;
  private sheetProcessor: SheetProcessor;
  private scheduleParser: ScheduleParser;
  private embedService: EmbeddingService;
  private tableExtractor: TableExtractor;
  private newScheduleParser: NewScheduleParser;
  private structuralParser: StructuralTableParser;
  private visionAnalyzer?: DrawingVisionAnalyzer | OllamaVisionAnalyzer;
  private imageConverter: PDFImageConverter;
  private scheduleStore: ScheduleStore;
  private enableVision: boolean;
  private progressDir: string;

  constructor(
    embedService: EmbeddingService, 
    scheduleStorePath: string,
    visionConfig?: { type: 'anthropic', apiKey: string } | { type: 'ollama', url?: string, model?: string },
    ollamaModel: string = "phi4"
  ) {
    this.classifier = new DocumentClassifier(ollamaModel);
    this.sheetProcessor = new SheetProcessor();
    this.scheduleParser = new ScheduleParser();
    this.embedService = embedService;
    this.tableExtractor = new TableExtractor();
    this.newScheduleParser = new NewScheduleParser();
    this.structuralParser = new StructuralTableParser();
    this.imageConverter = new PDFImageConverter();
    this.scheduleStore = new ScheduleStore(scheduleStorePath);
    this.progressDir = path.join(path.dirname(scheduleStorePath), 'progress');
    if (!fs.existsSync(this.progressDir)) {
      fs.mkdirSync(this.progressDir, { recursive: true });
    }
    
    // Enable vision based on config
    this.enableVision = !!visionConfig;
    if (visionConfig) {
      if (visionConfig.type === 'anthropic') {
        this.visionAnalyzer = new DrawingVisionAnalyzer(visionConfig.apiKey);
      } else {
        this.visionAnalyzer = new OllamaVisionAnalyzer(
          visionConfig.url || "http://localhost:11434",
          visionConfig.model || "llava:13b"
        );
      }
    }
  }

  private progressFile(pdfPath: string): string {
    const name = path.basename(pdfPath, '.pdf').replace(/[^a-zA-Z0-9]/g, '_');
    return path.join(this.progressDir, `${name}.json`);
  }

  private loadProgress(pdfPath: string): Set<number> {
    const file = this.progressFile(pdfPath);
    if (fs.existsSync(file)) {
      const state: ProgressState = JSON.parse(fs.readFileSync(file, 'utf-8'));
      return new Set(state.completedPages);
    }
    return new Set();
  }

  private saveProgress(pdfPath: string, completedPages: Set<number>): void {
    const state: ProgressState = {
      file: path.basename(pdfPath),
      completedPages: Array.from(completedPages).sort((a, b) => a - b),
      lastUpdated: new Date().toISOString()
    };
    fs.writeFileSync(this.progressFile(pdfPath), JSON.stringify(state, null, 2));
  }

  async processDocument(pdfPath: string): Promise<ProcessingResult> {
    console.log(`\n📄 Processing: ${pdfPath}`);
    
    // Stage 1: Classify document
    console.log("  🔍 Classifying document...");
    const classification = await this.classifier.classifyDocument(pdfPath);
    console.log(`  ✅ Type: ${classification.type}, Discipline: ${classification.discipline}`);

    // Stage 2: Process based on type
    let sheets: Sheet[] = [];
    
    if (classification.type.includes("drawing")) {
      console.log(`  📋 Processing ${classification.pageCount} drawing sheets...`);
      const rawSheets = await this.sheetProcessor.processDrawing(pdfPath, classification);
      
      console.log(`  🔄 Generating embeddings for ${rawSheets.length} sheets...`);
      for (let i = 0; i < rawSheets.length; i++) {
        const sheet = rawSheets[i];
        if (i % 10 === 0) {
          console.log(`    Progress: ${i}/${rawSheets.length}`);
        }
        
        // Chunk long text into ~400 char segments with overlap
        const chunks = this.chunkText(sheet.text, 400, 50);
        
        for (let c = 0; c < chunks.length; c++) {
          const embedding = await this.embedService.embedQuery(chunks[c]);
          
          sheets.push({
            id: this.generateId(pdfPath, sheet.pageNumber, c > 0 ? `chunk-${c}` : undefined),
            pageNumber: sheet.pageNumber,
            text: c === 0 ? sheet.text : chunks[c], // First chunk stores full text for retrieval
            metadata: {
              source: sheet.metadata.source,
              project: sheet.metadata.project || "Unknown",
              discipline: sheet.metadata.discipline || "General",
              drawingNumber: sheet.metadata.drawingNumber || "",
              drawingType: sheet.metadata.drawingType || "General",
              materials: sheet.metadata.materials || "",
              components: sheet.metadata.components || "",
            },
            vector: embedding,
          });
          
          if (c < chunks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        }
        
        if (chunks.length > 1) {
          console.log(`    Sheet ${i + 1}: ${sheet.text.length} chars → ${chunks.length} chunks`);
        }
        
        if (i < rawSheets.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } else if (classification.type === "specification") {
      console.log(`  📖 Processing specification sections...`);
      const rawSheets = await this.sheetProcessor.processSpecification(pdfPath, classification);
      
      console.log(`  🔄 Generating embeddings for ${rawSheets.length} sections...`);
      for (let i = 0; i < rawSheets.length; i++) {
        const sheet = rawSheets[i];
        if (i % 5 === 0) {
          console.log(`    Progress: ${i}/${rawSheets.length}`);
        }
        
        const chunks = this.chunkText(sheet.text, 400, 50);
        
        for (let c = 0; c < chunks.length; c++) {
          const embedding = await this.embedService.embedQuery(chunks[c]);
          
          sheets.push({
            id: this.generateId(pdfPath, sheet.pageNumber, c > 0 ? `chunk-${c}` : undefined),
            pageNumber: sheet.pageNumber,
            text: c === 0 ? sheet.text : chunks[c],
            metadata: {
              source: sheet.metadata.source,
              project: sheet.metadata.project || "Unknown",
              discipline: sheet.metadata.discipline || "General",
              drawingNumber: sheet.metadata.drawingNumber || "",
              drawingType: sheet.metadata.drawingType || "Specification",
              materials: sheet.metadata.materials || "",
              components: sheet.metadata.components || "",
            },
            vector: embedding,
          });
          
          if (c < chunks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        }
        
        if (i < rawSheets.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }

    // Stage 3: Detect and parse schedules (old method)
    console.log("  📊 Detecting schedules...");
    const schedules: Schedule[] = [];
    
    for (const sheet of sheets) {
      const tables = this.scheduleParser.detectTables(sheet.text);
      for (const table of tables) {
        schedules.push({
          id: this.generateId(pdfPath, sheet.pageNumber, table.type),
          ...table,
          source: pdfPath,
          pageNumber: sheet.pageNumber,
        });
      }
    }
    
    // Stage 4: Extract tables (new method)
    console.log("  📋 Extracting tables from PDF...");
    const extractedTables = await this.tableExtractor.extractTables(pdfPath);
    console.log(`  ✅ Found ${extractedTables.length} tables`);
    
    let parsedScheduleCount = 0;
    let structuralMemberCount = 0;
    const documentId = this.generateId(pdfPath, 0);
    
    for (const table of extractedTables) {
      const scheduleType = this.tableExtractor.classifyTableType(table);
      const structuralType = this.structuralParser.classifyStructuralTable(table);
      
      // Use structural type if it's more specific
      const finalType = structuralType !== 'calculation_table' ? structuralType : scheduleType;
      
      // Store schedule metadata with unique ID based on type
      const scheduleId = this.generateId(pdfPath, table.page, finalType);
      this.scheduleStore.addSchedule({
        id: scheduleId,
        documentId,
        scheduleType: finalType,
        pageNumber: table.page,
        extractionMethod: table.method,
        rowCount: table.rows.length,
        columnCount: table.rows[0]?.length || 0
      });
      
      // Parse construction schedules
      if (scheduleType === 'footing_schedule') {
        const entries = this.newScheduleParser.parseFootingSchedule(table);
        entries.forEach((entry, idx) => {
          this.scheduleStore.addEntry({
            id: `${scheduleId}-entry-${idx}`,
            scheduleId,
            mark: entry.mark,
            data: entry,
            rowNumber: idx + 1
          });
        });
        parsedScheduleCount += entries.length;
      } else if (scheduleType === 'door_schedule' || scheduleType === 'window_schedule') {
        const entries = this.newScheduleParser.parseDoorSchedule(table);
        entries.forEach((entry, idx) => {
          this.scheduleStore.addEntry({
            id: `${scheduleId}-entry-${idx}`,
            scheduleId,
            mark: entry.mark,
            data: entry.data,
            rowNumber: idx + 1
          });
        });
        parsedScheduleCount += entries.length;
      } else if (this.detectBeamSchedule(table)) {
        // Parse beam schedules (W-shapes, spans, etc.)
        const beams = this.parseBeamSchedule(table);
        beams.forEach((beam, idx) => {
          this.scheduleStore.addEntry({
            id: `${scheduleId}-beam-${idx}`,
            scheduleId,
            mark: beam.mark || `beam-${idx}`,
            data: beam,
            rowNumber: idx + 1
          });
        });
        parsedScheduleCount += beams.length;
      }
      
      // Parse structural tables
      if (structuralType === 'verification_table') {
        const members = this.structuralParser.parseVerificationTable(table);
        members.forEach((member, idx) => {
          this.scheduleStore.addEntry({
            id: `${scheduleId}-member-${idx}`,
            scheduleId,
            mark: member.span || `member-${idx}`,
            data: member,
            rowNumber: idx + 1
          });
        });
        structuralMemberCount += members.length;
      } else if (structuralType === 'load_capacity_table') {
        const capacities = this.structuralParser.parseLoadCapacityTable(table);
        capacities.forEach((capacity, idx) => {
          this.scheduleStore.addEntry({
            id: `${scheduleId}-capacity-${idx}`,
            scheduleId,
            mark: capacity.height || `capacity-${idx}`,
            data: capacity,
            rowNumber: idx + 1
          });
        });
        structuralMemberCount += capacities.length;
      }
    }
    
    // Stage 5: Vision analysis (if enabled)
    let visionScheduleCount = 0;
    let visionItemCountTotal = 0;
    
    if (this.enableVision && this.visionAnalyzer) {
      console.log("  👁️  Running vision analysis on structural sheets...");
      
      // Analyze structural sheets (plans + schedules)
      const pagesToAnalyze = sheets
        .filter(sheet => sheet.metadata.discipline === 'Structural')
        .map(sheet => sheet.pageNumber);
      
      console.log(`  📄 Found ${pagesToAnalyze.length} pages with schedules: ${pagesToAnalyze.join(', ')}`);
      const pagesToAnalyzeCount = pagesToAnalyze.length;
      const imageDir = path.join(path.dirname(pdfPath), '../data/vision-temp');
      const completedPages = this.loadProgress(pdfPath);
      const remaining = pagesToAnalyze.filter(p => !completedPages.has(p));
      
      if (completedPages.size > 0) {
        console.log(`  ⏩ Resuming: ${completedPages.size} pages done, ${remaining.length} remaining`);
      }
      
      try {
        for (let i = 0; i < remaining.length; i++) {
          const pageNum = remaining[i];
          console.log(`    Analyzing page ${pageNum} (${completedPages.size + i + 1}/${pagesToAnalyzeCount})...`);
          const imagePath = await this.imageConverter.convertPageToImage(
            pdfPath,
            pageNum,
            imageDir
          );
          
          const visionResult = await this.visionAnalyzer.analyzeDrawingPage(imagePath, pageNum, 'Structural');
          
          // Store vision-extracted beams
          if (visionResult.beams && visionResult.beams.length > 0) {
            const beamScheduleId = this.generateId(pdfPath, pageNum, 'vision-beams');
            this.scheduleStore.addSchedule({
              id: beamScheduleId,
              documentId,
              scheduleType: 'beam_callouts',
              pageNumber: pageNum,
              extractionMethod: 'vision',
              rowCount: visionResult.beams.length,
              columnCount: 3
            });
            
            visionResult.beams.forEach((beam, idx) => {
              this.scheduleStore.addEntry({
                id: `${beamScheduleId}-entry-${idx}`,
                scheduleId: beamScheduleId,
                mark: beam.mark,
                data: beam,
                rowNumber: idx + 1
              });
            });
            visionScheduleCount += visionResult.beams.length;
            
            // Augment sheet text with beam callouts for search
            const sheetIndex = sheets.findIndex(s => s.pageNumber === pageNum);
            if (sheetIndex !== -1) {
              const beamText = visionResult.beams
                .map(b => `BEAM: ${b.mark}${b.gridLocation ? ` at ${b.gridLocation}` : ''}${b.count ? ` (QTY: ${b.count})` : ''}`)
                .join('\n');
              sheets[sheetIndex].text += `\n\nVISION-EXTRACTED STRUCTURAL MEMBERS:\n${beamText}`;
            }
          }
          
          // Store vision-extracted columns
          if (visionResult.columns && visionResult.columns.length > 0) {
            const sheetIndex = sheets.findIndex(s => s.pageNumber === pageNum);
            if (sheetIndex !== -1) {
              const columnText = visionResult.columns
                .map(c => `COLUMN: ${c.mark}${c.gridLocation ? ` at ${c.gridLocation}` : ''}${c.height ? ` height ${c.height}` : ''}`)
                .join('\n');
              sheets[sheetIndex].text += `\n${columnText}`;
            }
          }
          
          // Augment with joists
          if (visionResult.joists && visionResult.joists.length > 0) {
            const sheetIndex = sheets.findIndex(s => s.pageNumber === pageNum);
            if (sheetIndex !== -1) {
              const joistText = visionResult.joists
                .map(j => `JOIST: ${j.mark}${j.spacing ? ` @ ${j.spacing}` : ''}${j.span ? ` span ${j.span}` : ''}${j.count ? ` (QTY: ${j.count})` : ''}`)
                .join('\n');
              sheets[sheetIndex].text += `\n${joistText}`;
            }
          }
          
          // Augment with foundation elements
          if (visionResult.foundation && visionResult.foundation.length > 0) {
            const sheetIndex = sheets.findIndex(s => s.pageNumber === pageNum);
            if (sheetIndex !== -1) {
              const foundText = visionResult.foundation
                .filter((f: any) => f.type)
                .map((f: any) => `FOUNDATION ${f.type.toUpperCase()}: ${f.size || ''}${f.rebar ? ` rebar: ${f.rebar}` : ''}${f.count ? ` (QTY: ${f.count})` : ''}`)
                .join('\n');
              sheets[sheetIndex].text += `\n${foundText}`;
            }
          }
          
          // Augment with connections
          if (visionResult.connections && visionResult.connections.length > 0) {
            const sheetIndex = sheets.findIndex(s => s.pageNumber === pageNum);
            if (sheetIndex !== -1) {
              const connText = visionResult.connections
                .map(c => `CONNECTION: ${c.type}${c.location ? ` at ${c.location}` : ''}${c.detail ? ` - ${c.detail}` : ''}`)
                .join('\n');
              sheets[sheetIndex].text += `\n${connText}`;
            }
          }
          
          // Re-embed sheet with all enriched text using chunking
          {
            const sheetIndex = sheets.findIndex(s => s.pageNumber === pageNum);
            if (sheetIndex !== -1) {
              const chunks = this.chunkText(sheets[sheetIndex].text, 400, 50);
              sheets[sheetIndex].vector = await this.embedService.embedQuery(chunks[0]);
              
              // Add extra chunks as additional searchable entries
              for (let c = 1; c < chunks.length; c++) {
                const existingChunkId = this.generateId(pdfPath, pageNum, `vision-chunk-${c}`);
                const existing = sheets.find(s => s.id === existingChunkId);
                if (!existing) {
                  sheets.push({
                    id: existingChunkId,
                    pageNumber: pageNum,
                    text: chunks[c],
                    metadata: { ...sheets[sheetIndex].metadata },
                    vector: await this.embedService.embedQuery(chunks[c]),
                  });
                }
              }
            }
          }
          
          // Store vision-extracted schedules
          for (const schedule of visionResult.schedules) {
            const scheduleId = this.generateId(pdfPath, pageNum, `vision-${schedule.scheduleType}`);
            
            this.scheduleStore.addSchedule({
              id: scheduleId,
              documentId,
              scheduleType: schedule.scheduleType,
              pageNumber: pageNum,
              extractionMethod: 'vision',
              rowCount: schedule.entries.length,
              columnCount: Object.keys(schedule.entries[0] || {}).length
            });
            
            schedule.entries.forEach((entry, idx) => {
              this.scheduleStore.addEntry({
                id: `${scheduleId}-entry-${idx}`,
                scheduleId,
                mark: entry.mark || `item-${idx}`,
                data: entry,
                rowNumber: idx + 1
              });
            });
            
            visionScheduleCount += schedule.entries.length;
          }
          
          // Store item counts
          visionItemCountTotal += visionResult.itemCounts.length;
          
          // Save progress after each page
          completedPages.add(pageNum);
          this.saveProgress(pdfPath, completedPages);
        }
        
        console.log(`  ✅ Vision extracted ${visionScheduleCount} schedule entries, ${visionItemCountTotal} item counts`);
      } catch (error) {
        console.error(`  ⚠️  Vision analysis failed: ${error}`);
      }
    }
    
    console.log(`  ✅ Processed ${sheets.length} sheets, ${schedules.length} old schedules, ${extractedTables.length} tables, ${parsedScheduleCount} schedule entries, ${structuralMemberCount} structural entries`);

    return {
      classification,
      sheets,
      schedules,
      extractedTables: extractedTables.length,
      parsedSchedules: parsedScheduleCount,
      structuralMembers: structuralMemberCount,
      visionSchedules: visionScheduleCount,
      visionItemCounts: visionItemCountTotal
    };
  }

  /** Split text into chunks that fit the embedding model's 512-token context window */
  private chunkText(text: string, maxChars: number = 400, overlap: number = 50): string[] {
    if (text.length <= maxChars) return [text];
    
    const chunks: string[] = [];
    let start = 0;
    
    while (start < text.length) {
      let end = start + maxChars;
      
      // Try to break at a newline or space
      if (end < text.length) {
        const newlineBreak = text.lastIndexOf('\n', end);
        const spaceBreak = text.lastIndexOf(' ', end);
        if (newlineBreak > start + maxChars / 2) end = newlineBreak + 1;
        else if (spaceBreak > start + maxChars / 2) end = spaceBreak + 1;
      }
      
      chunks.push(text.substring(start, end));
      start = end - overlap;
    }
    
    return chunks;
  }

  private generateId(source: string, page: number, suffix?: string): string {
    const base = `${source}-page${page}`;
    const str = suffix ? `${base}-${suffix}` : base;
    return crypto.createHash("md5").update(str).digest("hex");
  }

  private detectBeamSchedule(table: any): boolean {
    const text = table.rows.flat().join(' ').toUpperCase();
    return /W\d+X\d+|BEAM|SPAN|MEMBER/.test(text);
  }

  private parseBeamSchedule(table: any): any[] {
    const beams: any[] = [];
    const wShapeRegex = /W(\d+)X(\d+)/gi;
    
    for (const row of table.rows) {
      const rowText = row.join(' ');
      const matches = rowText.matchAll(wShapeRegex);
      
      for (const match of matches) {
        const size = match[0];
        const spanMatch = rowText.match(/(\d+[''][-\d]*)/);
        
        beams.push({
          size,
          depth: match[1],
          weight: match[2],
          span: spanMatch ? spanMatch[1] : null,
          rawText: rowText
        });
      }
    }
    
    return beams;
  }
}
