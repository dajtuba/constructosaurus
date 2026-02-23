import { MultiPassExtractor, MultiPassResult } from './multi-pass-extractor.js';
import { MultiModelAnalyzer, MultiModelResult } from './multi-model-analyzer.js';
import { VisionAnalysisResult } from './ollama-vision-analyzer.js';

export interface EnsembleResult {
  final_result: VisionAnalysisResult;
  confidence: number;
  accuracy_estimate: number;
  processing_time: number;
  method_used: 'single' | 'multi-pass' | 'multi-model' | 'full-ensemble';
  performance_metrics: {
    single_model_time?: number;
    multi_pass_time?: number;
    multi_model_time?: number;
    ensemble_time?: number;
    speed_penalty: number;
    accuracy_gain: number;
  };
  cost_analysis: {
    processing_cost: 'low' | 'medium' | 'high';
    disk_usage: string;
    recommended_for: string[];
  };
}

export class EnsembleExtractor {
  private multiPass: MultiPassExtractor;
  private multiModel: MultiModelAnalyzer;

  constructor(ollamaUrl: string = "http://localhost:11434") {
    this.multiPass = new MultiPassExtractor(ollamaUrl);
    this.multiModel = new MultiModelAnalyzer(ollamaUrl);
  }

  async extractWithEnsemble(
    imagePath: string,
    pageNumber: number,
    discipline?: string,
    targetAccuracy: number = 0.90
  ): Promise<EnsembleResult> {
    const startTime = Date.now();
    
    // Step 1: Try single model first (baseline)
    console.log('🔍 Phase 1: Single model baseline...');
    const singleStart = Date.now();
    const singleResult = await this.getSingleModelBaseline(imagePath, pageNumber, discipline);
    const singleTime = Date.now() - singleStart;
    
    // If single model confidence is high enough, use it
    if (singleResult.confidence >= targetAccuracy) {
      return this.buildResult(singleResult.result, singleResult.confidence, 'single', {
        single_model_time: singleTime,
        speed_penalty: 1.0,
        accuracy_gain: 0
      }, Date.now() - startTime);
    }

    // Step 2: Try multi-pass if single model isn't confident enough
    console.log('🔄 Phase 2: Multi-pass extraction...');
    const multiPassStart = Date.now();
    const multiPassResult = await this.multiPass.extractWithConsensus(imagePath, pageNumber, discipline);
    const multiPassTime = Date.now() - multiPassStart;
    
    if (multiPassResult.confidence >= targetAccuracy) {
      return this.buildResult(multiPassResult.consensus, multiPassResult.confidence, 'multi-pass', {
        single_model_time: singleTime,
        multi_pass_time: multiPassTime,
        speed_penalty: multiPassTime / singleTime,
        accuracy_gain: multiPassResult.confidence - singleResult.confidence
      }, Date.now() - startTime);
    }

    // Step 3: Try multi-model if multi-pass isn't confident enough
    console.log('🤖 Phase 3: Multi-model analysis...');
    const multiModelStart = Date.now();
    const availableModels = await this.multiModel.ensureModelsAvailable();
    
    if (availableModels.length < 2) {
      console.log('⚠️  Insufficient models for multi-model analysis, using multi-pass result');
      return this.buildResult(multiPassResult.consensus, multiPassResult.confidence, 'multi-pass', {
        single_model_time: singleTime,
        multi_pass_time: multiPassTime,
        speed_penalty: multiPassTime / singleTime,
        accuracy_gain: multiPassResult.confidence - singleResult.confidence
      }, Date.now() - startTime);
    }

    const multiModelResult = await this.multiModel.analyzeWithMultipleModels(imagePath, pageNumber, discipline);
    const multiModelTime = Date.now() - multiModelStart;
    
    if (multiModelResult.confidence >= targetAccuracy) {
      return this.buildResult(multiModelResult.consensus, multiModelResult.confidence, 'multi-model', {
        single_model_time: singleTime,
        multi_pass_time: multiPassTime,
        multi_model_time: multiModelTime,
        speed_penalty: (multiPassTime + multiModelTime) / singleTime,
        accuracy_gain: multiModelResult.confidence - singleResult.confidence
      }, Date.now() - startTime);
    }

    // Step 4: Full ensemble - combine multi-pass and multi-model
    console.log('🎯 Phase 4: Full ensemble combination...');
    const ensembleStart = Date.now();
    const ensembleResult = this.combineResults(multiPassResult, multiModelResult);
    const ensembleTime = Date.now() - ensembleStart;
    
    return this.buildResult(ensembleResult.result, ensembleResult.confidence, 'full-ensemble', {
      single_model_time: singleTime,
      multi_pass_time: multiPassTime,
      multi_model_time: multiModelTime,
      ensemble_time: ensembleTime,
      speed_penalty: (multiPassTime + multiModelTime + ensembleTime) / singleTime,
      accuracy_gain: ensembleResult.confidence - singleResult.confidence
    }, Date.now() - startTime);
  }

  private async getSingleModelBaseline(
    imagePath: string,
    pageNumber: number,
    discipline?: string
  ): Promise<{ result: VisionAnalysisResult; confidence: number }> {
    const { OllamaVisionAnalyzer } = await import('./ollama-vision-analyzer.js');
    const analyzer = new OllamaVisionAnalyzer();
    const result = await analyzer.analyzeDrawingPage(imagePath, pageNumber, discipline);
    
    // Estimate confidence based on data completeness
    let confidence = 0.6; // Base confidence
    if (result.beams && result.beams.length > 0) confidence += 0.1;
    if (result.joists && result.joists.length > 0) confidence += 0.1;
    if (result.schedules && result.schedules.length > 0) confidence += 0.1;
    if (result.dimensions && result.dimensions.length > 0) confidence += 0.05;
    
    return { result, confidence: Math.min(0.85, confidence) };
  }

  private combineResults(
    multiPassResult: MultiPassResult,
    multiModelResult: MultiModelResult
  ): { result: VisionAnalysisResult; confidence: number } {
    const combined: VisionAnalysisResult = { schedules: [], dimensions: [], itemCounts: [] };
    
    // Combine beams with weighted voting
    const beamVotes = new Map<string, { votes: number; data: any }>();
    
    // Multi-pass beams (weight by agreement score)
    multiPassResult.consensus.beams?.forEach(beam => {
      const key = beam.mark || '';
      if (key) {
        const weight = multiPassResult.agreement_score * 1.2; // Bonus for consensus
        beamVotes.set(key, {
          votes: (beamVotes.get(key)?.votes || 0) + weight,
          data: beam
        });
      }
    });
    
    // Multi-model beams (weight by confidence)
    multiModelResult.consensus.beams?.forEach(beam => {
      const key = beam.mark || '';
      if (key) {
        const weight = multiModelResult.confidence * 1.0;
        const existing = beamVotes.get(key);
        if (existing) {
          existing.votes += weight;
        } else {
          beamVotes.set(key, { votes: weight, data: beam });
        }
      }
    });
    
    // Select beams with highest votes
    combined.beams = [];
    beamVotes.forEach(({ votes, data }) => {
      if (votes >= 1.0) {
        combined.beams!.push(data);
      }
    });

    // Similar process for joists
    const joistVotes = new Map<string, { votes: number; data: any }>();
    
    multiPassResult.consensus.joists?.forEach(joist => {
      const key = joist.mark || '';
      if (key) {
        const weight = multiPassResult.agreement_score * 1.2;
        joistVotes.set(key, {
          votes: (joistVotes.get(key)?.votes || 0) + weight,
          data: joist
        });
      }
    });
    
    multiModelResult.consensus.joists?.forEach(joist => {
      const key = joist.mark || '';
      if (key) {
        const weight = multiModelResult.confidence * 1.0;
        const existing = joistVotes.get(key);
        if (existing) {
          existing.votes += weight;
        } else {
          joistVotes.set(key, { votes: weight, data: joist });
        }
      }
    });
    
    combined.joists = [];
    joistVotes.forEach(({ votes, data }) => {
      if (votes >= 1.0) {
        combined.joists!.push(data);
      }
    });

    // Use best source for schedules and dimensions
    if (multiModelResult.confidence > multiPassResult.confidence) {
      combined.schedules = multiModelResult.consensus.schedules;
      combined.dimensions = multiModelResult.consensus.dimensions;
      combined.itemCounts = multiModelResult.consensus.itemCounts;
    } else {
      combined.schedules = multiPassResult.consensus.schedules;
      combined.dimensions = multiPassResult.consensus.dimensions;
      combined.itemCounts = multiPassResult.consensus.itemCounts;
    }

    // Calculate combined confidence
    const combinedConfidence = Math.min(0.95, 
      (multiPassResult.confidence + multiModelResult.confidence) / 2 + 0.05 // Ensemble bonus
    );

    return { result: combined, confidence: combinedConfidence };
  }

  private buildResult(
    result: VisionAnalysisResult,
    confidence: number,
    method: 'single' | 'multi-pass' | 'multi-model' | 'full-ensemble',
    metrics: any,
    totalTime: number
  ): EnsembleResult {
    // Estimate accuracy based on confidence and method
    const accuracyEstimate = this.estimateAccuracy(confidence, method);
    
    // Determine cost analysis
    const costAnalysis = this.analyzeCost(method, metrics.speed_penalty);
    
    return {
      final_result: result,
      confidence,
      accuracy_estimate: accuracyEstimate,
      processing_time: totalTime,
      method_used: method,
      performance_metrics: {
        ...metrics,
        accuracy_gain: metrics.accuracy_gain || 0
      },
      cost_analysis: costAnalysis
    };
  }

  private estimateAccuracy(confidence: number, method: string): number {
    // Conservative accuracy estimates based on method and confidence
    const methodMultiplier = {
      'single': 0.9,
      'multi-pass': 0.95,
      'multi-model': 0.95,
      'full-ensemble': 0.98
    };
    
    return Math.min(0.95, confidence * (methodMultiplier[method as keyof typeof methodMultiplier] || 0.9));
  }

  private analyzeCost(method: string, speedPenalty: number): {
    processing_cost: 'low' | 'medium' | 'high';
    disk_usage: string;
    recommended_for: string[];
  } {
    const analysis = {
      'single': {
        processing_cost: 'low' as const,
        disk_usage: '2.2GB (glm-ocr only)',
        recommended_for: ['Quick estimates', 'Preliminary analysis', 'High-volume processing']
      },
      'multi-pass': {
        processing_cost: 'medium' as const,
        disk_usage: '2.2GB (glm-ocr only)',
        recommended_for: ['Important projects', 'Quality verification', 'Moderate accuracy needs']
      },
      'multi-model': {
        processing_cost: 'high' as const,
        disk_usage: '11GB+ (multiple models)',
        recommended_for: ['Critical projects', 'Final estimates', 'High accuracy requirements']
      },
      'full-ensemble': {
        processing_cost: 'high' as const,
        disk_usage: '11GB+ (multiple models)',
        recommended_for: ['Mission-critical projects', 'Material ordering', 'Maximum accuracy needed']
      }
    };

    return analysis[method as keyof typeof analysis] || analysis.single;
  }

  // Utility method to check if high-accuracy methods are worth it
  async assessAccuracyNeed(
    imagePath: string,
    pageNumber: number,
    discipline?: string
  ): Promise<{
    recommended_method: string;
    reasoning: string;
    estimated_improvement: number;
    cost_justification: string;
  }> {
    // Quick single-model test
    const baseline = await this.getSingleModelBaseline(imagePath, pageNumber, discipline);
    
    if (baseline.confidence >= 0.85) {
      return {
        recommended_method: 'single',
        reasoning: 'Single model confidence is already high',
        estimated_improvement: 0,
        cost_justification: 'No additional processing needed'
      };
    }
    
    if (baseline.confidence >= 0.75) {
      return {
        recommended_method: 'multi-pass',
        reasoning: 'Multi-pass likely to reach target accuracy',
        estimated_improvement: 0.1,
        cost_justification: '3x slower but uses same model'
      };
    }
    
    return {
      recommended_method: 'full-ensemble',
      reasoning: 'Low baseline confidence requires maximum accuracy methods',
      estimated_improvement: 0.2,
      cost_justification: 'High cost justified by significant accuracy gain'
    };
  }
}