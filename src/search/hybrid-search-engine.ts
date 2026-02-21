import { connect, Connection, Table } from "vectordb";
import { EmbeddingService } from "../embeddings/embedding-service";
import { RerankingService } from "./reranking-service";
import { SearchParams, SearchResult } from "../types";
import { DimensionExtractor } from "../extraction/dimension-extractor";
import { CrossReferenceDetector, DocumentConflict } from "../extraction/cross-reference-detector";
import { QueryIntentDetector } from "./query-intent-detector";
import { TakeoffSynthesizer, MaterialTakeoff } from "../services/takeoff-synthesizer";
import { ResultDeduplicator } from "./result-deduplicator";

export class HybridSearchEngine {
  private db!: Connection;
  private table!: Table;
  private embedService: EmbeddingService;
  private rerankService?: RerankingService;
  private dimensionExtractor: DimensionExtractor;
  private crossRefDetector: CrossReferenceDetector;
  private intentDetector: QueryIntentDetector;
  private takeoffSynthesizer: TakeoffSynthesizer;
  private deduplicator: ResultDeduplicator;

  constructor(
    private dbPath: string,
    embedService: EmbeddingService,
    rerankService?: RerankingService
  ) {
    this.embedService = embedService;
    this.rerankService = rerankService;
    this.dimensionExtractor = new DimensionExtractor();
    this.crossRefDetector = new CrossReferenceDetector();
    this.intentDetector = new QueryIntentDetector();
    this.takeoffSynthesizer = new TakeoffSynthesizer();
    this.deduplicator = new ResultDeduplicator();
  }

  async initialize() {
    this.db = await connect(this.dbPath);
    try {
      this.table = await this.db.openTable("construction_docs");
    } catch {
      // Table doesn't exist yet
    }
  }

  async search(params: SearchParams, resolveRefs: boolean = true): Promise<SearchResult[]> {
    const { query, discipline, drawingType, project, sheetNumbers, top_k = 10 } = params;

    // Detect query intent
    const intent = this.intentDetector.detect(query);
    const boostFactors = this.intentDetector.getBoostFactors(intent);
    
    // Expand query for better structural search
    const expandedQuery = this.intentDetector.expandQuery(query);

    const queryEmbedding = await this.embedService.embedQuery(expandedQuery);

    let vectorQuery = this.table.search(queryEmbedding).limit(top_k * 5);

    if (discipline) {
      vectorQuery = vectorQuery.filter(`discipline = '${discipline}'`);
    }
    if (drawingType) {
      vectorQuery = vectorQuery.filter(`\`drawingType\` = '${drawingType}'`);
    }
    if (project) {
      vectorQuery = vectorQuery.filter(`project = '${project}'`);
    }

    const vectorResults = await vectorQuery.execute();

    // Post-filter by sheet numbers if specified
    let filtered = vectorResults;
    if (sheetNumbers && sheetNumbers.length > 0) {
      const sheetSet = new Set(sheetNumbers.map(s => s.toUpperCase()));
      filtered = vectorResults.filter((r: any) => {
        const dn = (r.drawingNumber || '').toUpperCase();
        return sheetSet.has(dn) || sheetNumbers.some(s => dn.includes(s.toUpperCase()));
      });
      // Fall back to unfiltered if no matches
      if (filtered.length === 0) filtered = vectorResults;
    }

    if (this.rerankService && filtered.length > 0) {
      const reranked = await this.rerankService.rerank({
        query,
        documents: filtered.map((r: any) => ({
          text: r.text,
          id: r.id,
        })),
        topN: top_k,
      });

      return reranked.map((r: any) => {
        const original = filtered.find((vr: any) => vr.id === r.id);
        return {
          id: r.id,
          text: r.text,
          project: String(original?.project || ""),
          discipline: String(original?.discipline || ""),
          drawingType: String(original?.drawingType || ""),
          drawingNumber: String(original?.drawingNumber || ""),
          score: r.score,
        };
      });
    }

    // Apply intent-based boosting
    const boostedResults = filtered.map((r: any) => {
      const drawingType = r.drawingType || 'general';
      const boost = boostFactors[drawingType] || 1.0;
      return {
        ...r,
        _distance: r._distance / boost // Lower distance = better score
      };
    });

    // Sort by boosted score
    boostedResults.sort((a: any, b: any) => a._distance - b._distance);

    const results = boostedResults.slice(0, top_k).map((r: any) => ({
      id: r.id,
      text: r.text,
      project: r.project || "",
      discipline: r.discipline || "",
      drawingType: r.drawingType || "",
      drawingNumber: r.drawingNumber || "",
      score: r._distance,
      dimensions: this.dimensionExtractor.extractDimensions(r.text),
      calculatedAreas: this.dimensionExtractor.calculateAreas(r.text),
      crossReferences: this.crossRefDetector.detect(r.text)
    }));
    
    // Deduplicate and filter by confidence
    const deduplicated = this.deduplicator.deduplicate(results);
    
    // Don't auto-resolve cross-references - causes massive context bloat
    // Users can manually query specific references if needed
    
    return deduplicated;
  }

  async createTable(data: any[]) {
    this.table = await this.db.createTable("construction_docs", data);
  }

  async addDocuments(documents: any[]) {
    if (!this.table) {
      await this.createTable(documents);
    } else {
      await this.table.add(documents);
    }
  }
  
  synthesizeTakeoff(results: SearchResult[]): MaterialTakeoff[] {
    return this.takeoffSynthesizer.synthesize(results);
  }
  
  detectConflicts(results: SearchResult[]): DocumentConflict[] {
    return this.crossRefDetector.detectConflicts(results);
  }
}
