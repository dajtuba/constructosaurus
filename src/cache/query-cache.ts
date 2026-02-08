import { LRUCache } from "lru-cache";
import { SearchParams, SearchResult } from "../types";

export class QueryCache {
  private cache: LRUCache<string, SearchResult[]>;

  constructor(maxSize: number = 1000, ttl: number = 3600000) {
    this.cache = new LRUCache({
      max: maxSize,
      ttl,
    });
  }

  buildKey(params: SearchParams): string {
    return JSON.stringify({
      query: params.query,
      discipline: params.discipline,
      drawingType: params.drawingType,
      project: params.project,
      top_k: params.top_k,
    });
  }

  get(params: SearchParams): SearchResult[] | undefined {
    const key = this.buildKey(params);
    return this.cache.get(key);
  }

  set(params: SearchParams, results: SearchResult[]): void {
    const key = this.buildKey(params);
    this.cache.set(key, results);
  }

  clear(): void {
    this.cache.clear();
  }
}
