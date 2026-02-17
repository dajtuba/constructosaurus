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
      
      // Generate embeddings for each sheet (in batches to avoid overloading Ollama)
      console.log(`  🔄 Generating embeddings for ${rawSheets.length} sheets...`);
      for (let i = 0; i < rawSheets.length; i++) {
        const sheet = rawSheets[i];
        if (i % 10 === 0) {
          console.log(`    Progress: ${i}/${rawSheets.length}`);
        }
        // Start with 2000 chars, reduce if needed
        let textToEmbed = sheet.text.substring(0, 2000);
        let embedding: number[];
        
        try {
          embedding = await this.embedService.embedQuery(textToEmbed);
        } catch (error: any) {
          if (error.message.includes("exceeds the context length")) {
            // Try with 1000 chars
            console.log(`    ⚠️  Sheet ${i + 1} too long, retrying with 1000 chars...`);
            textToEmbed = sheet.text.substring(0, 1000);
            try {
              embedding = await this.embedService.embedQuery(textToEmbed);
            } catch (error2: any) {
              if (error2.message.includes("exceeds the context length")) {
                // Last resort: 500 chars
                console.log(`    ⚠️  Sheet ${i + 1} still too long, using 500 chars...`);
                textToEmbed = sheet.text.substring(0, 500);
                embedding = await this.embedService.embedQuery(textToEmbed);
              } else {
                throw error2;
              }
            }
          } else {
            throw error;
          }
        }
        
        // Small delay to avoid overloading Ollama
        if (i < rawSheets.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        sheets.push({
          id: this.generateId(pdfPath, sheet.pageNumber),
          pageNumber: sheet.pageNumber,
          text: sheet.text,
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
        let textToEmbed = sheet.text.substring(0, 2000);
        let embedding: number[];
        
        try {
          embedding = await this.embedService.embedQuery(textToEmbed);
        } catch (error: any) {
          if (error.message.includes("exceeds the context length")) {
            console.log(`    ⚠️  Section ${i + 1} too long, retrying with 1000 chars...`);
            textToEmbed = sheet.text.substring(0, 1000);
            try {
              embedding = await this.embedService.embedQuery(textToEmbed);
            } catch (error2: any) {
              if (error2.message.includes("exceeds the context length")) {
                console.log(`    ⚠️  Section ${i + 1} still too long, using 500 chars...`);
                textToEmbed = sheet.text.substring(0, 500);
                embedding = await this.embedService.embedQuery(textToEmbed);
              } else {
                throw error2;
              }
            }
          } else {
            throw error;
          }
        }
        
        if (i < rawSheets.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        sheets.push({
          id: this.generateId(pdfPath, sheet.pageNumber),
          pageNumber: sheet.pageNumber,
          text: sheet.text,
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
      
      try {
        for (let i = 0; i < pagesToAnalyzeCount; i++) {
          const pageNum = pagesToAnalyze[i];
          console.log(`    Analyzing page ${pageNum} (${i + 1}/${pagesToAnalyzeCount})...`);
          const imagePath = await this.imageConverter.convertPageToImage(
            pdfPath,
            pageNum,
            imageDir
          );
          
          const visionResult = await this.visionAnalyzer.analyzeDrawingPage(imagePath, pageNum);
          
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
