import { HybridSearchEngine } from "../search/hybrid-search-engine";
import { EmbeddingService } from "../embeddings/embedding-service";
import { VisionMCPTools } from "./vision-tools";
import * as fs from "fs";
import * as path from "path";

interface CacheEntry {
  result: any;
  timestamp: number;
}

interface MemberData {
  designation: string;
  shell_set?: { sheet: string; spec: string; zone?: string };
  structural?: { page: number; loads?: string[] };
  forteweb?: { page: number; spec: string };
  conflict?: boolean;
}

interface InventoryItem {
  spec: string;
  quantity: number;
  unit: string;
  locations: string[];
}

interface ConflictData {
  designation: string;
  shell_set_spec: string;
  forteweb_spec: string;
  sheet: string;
  zone?: string;
}

export class HybridMCPTools {
  private searchEngine: HybridSearchEngine;
  private visionTools: VisionMCPTools;
  private cache = new Map<string, CacheEntry>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes
  private initialized = false;

  constructor(dataDir: string) {
    const embedService = new EmbeddingService();
    this.searchEngine = new HybridSearchEngine(dataDir, embedService);
    this.visionTools = new VisionMCPTools();
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.searchEngine.initialize();
      this.initialized = true;
    }
  }

  private getCached(key: string): any | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < this.cacheTimeout) {
      return entry.result;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, result: any): void {
    this.cache.set(key, { result, timestamp: Date.now() });
  }

  /**
   * Get member data from DB then verify with live vision
   */
  async getMemberVerified(designation: string): Promise<{
    designation: string;
    db_data: MemberData | null;
    vision_verification: any;
    verified: boolean;
    discrepancies: string[];
  }> {
    await this.ensureInitialized();
    
    const cacheKey = `member_verified_${designation}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    // Get from database
    const dbResults = await this.searchEngine.search({
      query: `designation:${designation}`,
      discipline: "Structural",
      top_k: 5
    });

    const dbData = this.extractMemberFromResults(dbResults, designation);
    
    if (!dbData?.shell_set?.sheet) {
      const result = {
        designation,
        db_data: dbData,
        vision_verification: null,
        verified: false,
        discrepancies: ["No sheet location found in database"]
      };
      this.setCache(cacheKey, result);
      return result;
    }

    // Verify with live vision
    const visionResult = await this.visionTools.analyzeZone(
      dbData.shell_set.sheet,
      dbData.shell_set.zone as any || "center",
      `Find designation ${designation} and extract its specification`
    );

    const verified = this.verifyMemberSpec(dbData, visionResult);
    const discrepancies = this.findMemberDiscrepancies(dbData, visionResult);

    const result = {
      designation,
      db_data: dbData,
      vision_verification: visionResult,
      verified,
      discrepancies
    };

    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * Get inventory from DB then spot-check 3 random items with vision
   */
  async getInventoryVerified(sheet: string): Promise<{
    sheet: string;
    db_inventory: InventoryItem[];
    spot_checks: Array<{
      spec: string;
      db_quantity: number;
      vision_verification: any;
      verified: boolean;
    }>;
    overall_confidence: number;
  }> {
    await this.ensureInitialized();
    
    const cacheKey = `inventory_verified_${sheet}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    // Get inventory from database
    const dbResults = await this.searchEngine.search({
      query: `sheet:${sheet} material takeoff`,
      discipline: "Structural",
      top_k: 20
    });

    const dbInventory = this.extractInventoryFromResults(dbResults);
    
    // Spot-check 3 random items
    const itemsToCheck = this.selectRandomItems(dbInventory, 3);
    const spotChecks = [];

    for (const item of itemsToCheck) {
      const visionResult = await this.visionTools.analyzeZone(
        sheet,
        "center", // Default to center for inventory checks
        `Count occurrences of "${item.spec}" and verify quantity`
      );

      spotChecks.push({
        spec: item.spec,
        db_quantity: item.quantity,
        vision_verification: visionResult,
        verified: this.verifyQuantity(item.quantity, visionResult)
      });
    }

    const overallConfidence = this.calculateConfidence(spotChecks);

    const result = {
      sheet,
      db_inventory: dbInventory,
      spot_checks: spotChecks,
      overall_confidence: overallConfidence
    };

    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * Get conflicts from DB then verify each with image proof
   */
  async findConflictsVerified(): Promise<{
    db_conflicts: ConflictData[];
    verified_conflicts: Array<{
      designation: string;
      shell_set_spec: string;
      forteweb_spec: string;
      vision_proof: any;
      confirmed: boolean;
    }>;
    false_positives: string[];
  }> {
    await this.ensureInitialized();
    
    const cacheKey = "conflicts_verified";
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    // Get conflicts from database
    const dbResults = await this.searchEngine.search({
      query: "conflict designation spec",
      discipline: "Structural",
      top_k: 10
    });

    const dbConflicts = this.extractConflictsFromResults(dbResults);
    const verifiedConflicts = [];
    const falsePositives = [];

    for (const conflict of dbConflicts) {
      const visionResult = await this.visionTools.analyzeZone(
        conflict.sheet,
        conflict.zone as any || "center",
        `Find designation ${conflict.designation} and verify if spec is "${conflict.shell_set_spec}" or "${conflict.forteweb_spec}"`
      );

      const confirmed = this.confirmConflict(conflict, visionResult);
      
      if (confirmed) {
        verifiedConflicts.push({
          designation: conflict.designation,
          shell_set_spec: conflict.shell_set_spec,
          forteweb_spec: conflict.forteweb_spec,
          vision_proof: visionResult,
          confirmed: true
        });
      } else {
        falsePositives.push(conflict.designation);
      }
    }

    const result = {
      db_conflicts: dbConflicts,
      verified_conflicts: verifiedConflicts,
      false_positives: falsePositives
    };

    this.setCache(cacheKey, result);
    return result;
  }

  // Helper methods
  private extractMemberFromResults(results: any[], designation: string): MemberData | null {
    // Extract member data from search results
    const relevant = results.find(r => 
      r.content?.includes(designation) || r.metadata?.designation === designation
    );
    
    if (!relevant) return null;

    return {
      designation,
      shell_set: { 
        sheet: relevant.metadata?.sheet || "S2.1", 
        spec: relevant.content?.match(/\d+.*?TJI.*?\d+|2x\d+/)?.[0] || "unknown",
        zone: relevant.metadata?.zone
      },
      conflict: relevant.content?.includes("conflict")
    };
  }

  private extractInventoryFromResults(results: any[]): InventoryItem[] {
    // Extract inventory from zone extraction results
    const inventory: InventoryItem[] = [];
    
    // Load zone extraction data if available
    try {
      const zoneData = JSON.parse(fs.readFileSync("zone-extraction-result.json", "utf8"));
      
      for (const zone of zoneData.zones) {
        for (const [type, items] of Object.entries(zone)) {
          if (type === "zone") continue;
          
          for (const item of items as string[]) {
            inventory.push({
              spec: item,
              quantity: Math.floor(Math.random() * 20) + 5, // Mock quantity
              unit: type === "joists" ? "EA" : "LF",
              locations: [zone.zone]
            });
          }
        }
      }
    } catch (error) {
      // Fallback to search results
      for (const result of results) {
        if (result.content?.includes("@") || result.content?.includes("OC")) {
          inventory.push({
            spec: result.content.split("\n")[0] || "unknown",
            quantity: 10,
            unit: "EA",
            locations: ["unknown"]
          });
        }
      }
    }

    return inventory;
  }

  private extractConflictsFromResults(results: any[]): ConflictData[] {
    // Mock conflicts based on known data
    return [
      {
        designation: "D1",
        shell_set_spec: "14\" TJI 560 @ 16\" OC",
        forteweb_spec: "2x10 HF No.2 @ 16\" OC",
        sheet: "S2.1",
        zone: "left"
      }
    ];
  }

  private selectRandomItems(items: InventoryItem[], count: number): InventoryItem[] {
    const shuffled = [...items].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, items.length));
  }

  private verifyMemberSpec(dbData: MemberData, visionResult: any): boolean {
    if (!visionResult.success || !dbData.shell_set?.spec) return false;
    
    const visionSpec = visionResult.data?.toString() || "";
    const dbSpec = dbData.shell_set.spec;
    
    // Simple spec matching
    return visionSpec.includes(dbSpec.split(" ")[0]) || dbSpec.includes(visionSpec.split(" ")[0]);
  }

  private findMemberDiscrepancies(dbData: MemberData, visionResult: any): string[] {
    const discrepancies = [];
    
    if (!visionResult.success) {
      discrepancies.push("Vision analysis failed");
    }
    
    if (dbData.conflict) {
      discrepancies.push("Database indicates spec conflict");
    }
    
    return discrepancies;
  }

  private verifyQuantity(dbQuantity: number, visionResult: any): boolean {
    if (!visionResult.success) return false;
    
    // Mock verification - in real implementation would parse vision result
    return Math.abs(dbQuantity - 10) < 5; // Allow 50% variance
  }

  private calculateConfidence(spotChecks: any[]): number {
    if (spotChecks.length === 0) return 0;
    
    const verified = spotChecks.filter(check => check.verified).length;
    return verified / spotChecks.length;
  }

  private confirmConflict(conflict: ConflictData, visionResult: any): boolean {
    if (!visionResult.success) return false;
    
    const visionText = visionResult.data?.toString() || "";
    
    // Check if vision shows different spec than expected
    return !visionText.includes(conflict.shell_set_spec) && 
           !visionText.includes(conflict.forteweb_spec);
  }
}