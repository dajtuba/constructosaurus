import { CohereClient } from "cohere-ai";

export class RerankingService {
  private cohere: CohereClient;

  constructor(apiKey: string) {
    this.cohere = new CohereClient({ token: apiKey });
  }

  async rerank(params: {
    query: string;
    documents: Array<{ text: string; id: string }>;
    topN: number;
  }) {
    const response = await this.cohere.rerank({
      model: "rerank-english-v3.0",
      query: params.query,
      documents: params.documents.map(d => d.text),
      topN: params.topN,
      returnDocuments: true,
    });

    return response.results.map((r) => ({
      ...params.documents[r.index],
      score: r.relevanceScore,
    }));
  }
}
