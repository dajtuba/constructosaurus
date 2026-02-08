export class EmbeddingService {
  private model: string;
  private ollamaUrl: string;

  constructor(model: string = "nomic-embed-text", ollamaUrl: string = "http://localhost:11434") {
    this.model = model;
    this.ollamaUrl = ollamaUrl;
  }

  async embedText(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    
    for (const text of texts) {
      const embedding = await this.embedSingle(text);
      embeddings.push(embedding);
    }
    
    return embeddings;
  }

  async embedQuery(query: string): Promise<number[]> {
    return this.embedSingle(query);
  }

  private async embedSingle(text: string): Promise<number[]> {
    const maxRetries = 3;
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(`${this.ollamaUrl}/api/embeddings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: this.model, prompt: text }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          // Don't retry on context length errors
          if (errorText.includes("exceeds the context length")) {
            throw new Error(`Ollama API error: ${response.statusText} - ${errorText}`);
          }
          console.error(`Ollama error response: ${errorText}`);
          throw new Error(`Ollama API error: ${response.statusText} - ${errorText}`);
        }

        const data: any = await response.json();
        return data.embedding;
      } catch (error: any) {
        // Don't retry context length errors
        if (error.message.includes("exceeds the context length")) {
          throw error;
        }
        if (i === maxRetries - 1) throw error;
        console.log(`  ⚠️  Embedding retry ${i + 1}/${maxRetries}: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    throw new Error("Failed after retries");
  }
}
