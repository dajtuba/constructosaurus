import { connect, Connection, Table } from "vectordb";
import { EmbeddingService } from "../embeddings/embedding-service";
import { RerankingService } from "./reranking-service";
import { SearchParams, SearchResult } from "../types";

export class HybridSearchEngine {
  private db!: Connection;
  private table!: Table;
  private embedService: EmbeddingService;
  private rerankService?: RerankingService;

  constructor(
    private dbPath: string,
    embedService: EmbeddingService,
    rerankService?: RerankingService
  ) {
    this.embedService = embedService;
    this.rerankService = rerankService;
  }

  async initialize() {
    this.db = await connect(this.dbPath);
    try {
      this.table = await this.db.openTable("construction_docs");
    } catch {
      // Table doesn't exist yet
    }
  }

  async search(params: SearchParams): Promise<SearchResult[]> {
    const { query, discipline, drawingType, project, top_k = 10 } = params;

    const queryEmbedding = await this.embedService.embedQuery(query);

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

    if (this.rerankService && vectorResults.length > 0) {
      const reranked = await this.rerankService.rerank({
        query,
        documents: vectorResults.map((r: any) => ({
          text: r.text,
          id: r.id,
        })),
        topN: top_k,
      });

      return reranked.map((r: any) => {
        const original = vectorResults.find((vr: any) => vr.id === r.id);
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

    return vectorResults.slice(0, top_k).map((r: any) => ({
      id: r.id,
      text: r.text,
      project: r.project || "",
      discipline: r.discipline || "",
      drawingType: r.drawingType || "",
      drawingNumber: r.drawingNumber || "",
      score: r._distance,
    }));
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
}
