import { OllamaVisionAnalyzer, VisionAnalysisResult } from './ollama-vision-analyzer.js';
import { Ollama } from 'ollama';
import * as fs from 'fs';

export interface ModelConfig {
  name: string;
  weight: number;
  temperature: number;
  description: string;
}

export interface MultiModelResult {
  consensus: VisionAnalysisResult;
  confidence: number;
  model_results: Record<string, {
    result: VisionAnalysisResult;
    confidence: number;
    processing_time: number;
  }>;
  performance_metrics: {
    total_time: number;
    fastest_model: string;
    most_confident: string;
  };
}

export class MultiModelAnalyzer {
  private ollama: Ollama;
  private models: ModelConfig[] = [
    { name: 'glm-ocr', weight: 1.0, temperature: 0.3, description: 'Fast OCR model' },
    { name: 'llama3.2-vision:11b', weight: 1.5, temperature: 0.2, description: 'Large reasoning model' },
    { name: 'qwen2-vl:7b', weight: 1.2, temperature: 0.25, description: 'Document specialist' }
  ];

  constructor(ollamaUrl: string = "http://localhost:11434") {
    this.ollama = new Ollama({ host: ollamaUrl });
  }

  async analyzeWithMultipleModels(
    imagePath: string,
    pageNumber: number,
    discipline?: string
  ): Promise<MultiModelResult> {
    const startTime = Date.now();
    const modelResults: Record<string, any> = {};
    const availableModels = await this.getAvailableModels();

    // Run analysis with each available model
    for (const modelConfig of this.models) {
      if (!availableModels.includes(modelConfig.name)) {
        console.log(`⚠️  Model ${modelConfig.name} not available, skipping`);
        continue;
      }

      const modelStart = Date.now();
      try {
        const analyzer = new OllamaVisionAnalyzer("http://localhost:11434", modelConfig.name);
        const result = await analyzer.analyzeDrawingPage(imagePath, pageNumber, discipline);
        const processingTime = Date.now() - modelStart;
        
        modelResults[modelConfig.name] = {
          result,
          confidence: this.calculateModelConfidence(result, modelConfig),
          processing_time: processingTime
        };

        console.log(`✓ ${modelConfig.name}: ${processingTime}ms`);
      } catch (error) {
        console.log(`✗ ${modelConfig.name}: ${error}`);
        modelResults[modelConfig.name] = {
          result: { schedules: [], dimensions: [], itemCounts: [] },
          confidence: 0,
          processing_time: Date.now() - modelStart
        };
      }
    }

    const totalTime = Date.now() - startTime;

    // Calculate weighted consensus
    const consensus = this.calculateWeightedConsensus(modelResults);
    const overallConfidence = this.calculateOverallConfidence(modelResults);

    // Performance metrics
    const performanceMetrics = this.calculatePerformanceMetrics(modelResults, totalTime);

    return {
      consensus,
      confidence: overallConfidence,
      model_results: modelResults,
      performance_metrics: performanceMetrics
    };
  }

  private async getAvailableModels(): Promise<string[]> {
    try {
      const models = await this.ollama.list();
      return models.models.map(m => m.name);
    } catch {
      return ['glm-ocr']; // Fallback to default
    }
  }

  private calculateModelConfidence(result: VisionAnalysisResult, config: ModelConfig): number {
    let confidence = 0.5; // Base confidence

    // Boost confidence based on data found
    if (result.beams && result.beams.length > 0) confidence += 0.1;
    if (result.joists && result.joists.length > 0) confidence += 0.1;
    if (result.schedules && result.schedules.length > 0) confidence += 0.1;
    if (result.dimensions && result.dimensions.length > 0) confidence += 0.1;

    // Model-specific adjustments
    if (config.name.includes('llama3.2-vision:11b')) confidence += 0.1; // Larger model bonus
    if (config.name.includes('qwen2-vl')) confidence += 0.05; // Document specialist bonus

    return Math.min(0.95, confidence);
  }

  private calculateWeightedConsensus(modelResults: Record<string, any>): VisionAnalysisResult {
    const consensus: VisionAnalysisResult = { schedules: [], dimensions: [], itemCounts: [] };
    
    // Weighted voting for beams
    const beamVotes = new Map<string, number>();
    const beamData = new Map<string, any>();
    
    Object.entries(modelResults).forEach(([modelName, data]) => {
      const weight = this.models.find(m => m.name === modelName)?.weight || 1.0;
      const confidence = data.confidence;
      const effectiveWeight = weight * confidence;
      
      data.result.beams?.forEach((beam: any) => {
        const key = beam.mark || '';
        if (key) {
          beamVotes.set(key, (beamVotes.get(key) || 0) + effectiveWeight);
          beamData.set(key, beam);
        }
      });
    });

    // Select beams with highest weighted votes
    consensus.beams = [];
    beamVotes.forEach((votes, mark) => {
      if (votes >= 1.0) { // Threshold for inclusion
        const beam = beamData.get(mark);
        if (beam) consensus.beams!.push(beam);
      }
    });

    // Weighted voting for joists
    const joistVotes = new Map<string, number>();
    const joistData = new Map<string, any>();
    
    Object.entries(modelResults).forEach(([modelName, data]) => {
      const weight = this.models.find(m => m.name === modelName)?.weight || 1.0;
      const confidence = data.confidence;
      const effectiveWeight = weight * confidence;
      
      data.result.joists?.forEach((joist: any) => {
        const key = joist.mark || '';
        if (key) {
          joistVotes.set(key, (joistVotes.get(key) || 0) + effectiveWeight);
          joistData.set(key, joist);
        }
      });
    });

    consensus.joists = [];
    joistVotes.forEach((votes, mark) => {
      if (votes >= 1.0) {
        const joist = joistData.get(mark);
        if (joist) consensus.joists!.push(joist);
      }
    });

    // Use best model's schedules and dimensions
    const bestModel = this.getBestModel(modelResults);
    if (bestModel) {
      consensus.schedules = bestModel.result.schedules || [];
      consensus.dimensions = bestModel.result.dimensions || [];
      consensus.itemCounts = bestModel.result.itemCounts || [];
    }

    return consensus;
  }

  private calculateOverallConfidence(modelResults: Record<string, any>): number {
    const confidences = Object.values(modelResults).map((r: any) => r.confidence);
    if (confidences.length === 0) return 0;

    // Weighted average of confidences
    let totalWeight = 0;
    let weightedSum = 0;

    Object.entries(modelResults).forEach(([modelName, data]) => {
      const weight = this.models.find(m => m.name === modelName)?.weight || 1.0;
      totalWeight += weight;
      weightedSum += data.confidence * weight;
    });

    const baseConfidence = totalWeight > 0 ? weightedSum / totalWeight : 0;
    
    // Bonus for multiple models agreeing
    const agreementBonus = confidences.length > 1 ? 0.1 : 0;
    
    return Math.min(0.95, baseConfidence + agreementBonus);
  }

  private getBestModel(modelResults: Record<string, any>): any {
    let bestModel = null;
    let bestScore = 0;

    Object.entries(modelResults).forEach(([modelName, data]) => {
      const weight = this.models.find(m => m.name === modelName)?.weight || 1.0;
      const score = data.confidence * weight;
      
      if (score > bestScore) {
        bestScore = score;
        bestModel = data;
      }
    });

    return bestModel;
  }

  private calculatePerformanceMetrics(modelResults: Record<string, any>, totalTime: number) {
    let fastestModel = '';
    let fastestTime = Infinity;
    let mostConfident = '';
    let highestConfidence = 0;

    Object.entries(modelResults).forEach(([modelName, data]) => {
      if (data.processing_time < fastestTime) {
        fastestTime = data.processing_time;
        fastestModel = modelName;
      }
      
      if (data.confidence > highestConfidence) {
        highestConfidence = data.confidence;
        mostConfident = modelName;
      }
    });

    return {
      total_time: totalTime,
      fastest_model: fastestModel,
      most_confident: mostConfident
    };
  }

  async downloadModel(modelName: string): Promise<boolean> {
    try {
      console.log(`📥 Downloading ${modelName}...`);
      await this.ollama.pull({ model: modelName });
      console.log(`✓ ${modelName} downloaded successfully`);
      return true;
    } catch (error) {
      console.log(`✗ Failed to download ${modelName}: ${error}`);
      return false;
    }
  }

  async ensureModelsAvailable(): Promise<string[]> {
    const available = await this.getAvailableModels();
    const missing = this.models.filter(m => !available.includes(m.name));
    
    if (missing.length > 0) {
      console.log(`📋 Missing models: ${missing.map(m => m.name).join(', ')}`);
      console.log(`💾 Total download size: ~11GB`);
      console.log(`⏱️  Download time: ~10-20 minutes`);
      
      // Don't auto-download, just report
      return available.filter(name => this.models.some(m => m.name === name));
    }
    
    return available.filter(name => this.models.some(m => m.name === name));
  }
}