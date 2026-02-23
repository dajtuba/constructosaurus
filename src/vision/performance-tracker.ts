import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface PerformanceMetrics {
  accuracy_metrics: {
    confidence_score: number;
    estimated_accuracy: number;
    method_used: string;
    agreement_score?: number;
  };
  performance_metrics: {
    processing_time: number;
    speed_penalty: number;
    memory_usage?: number;
    disk_usage: string;
  };
  cost_metrics: {
    processing_cost: 'low' | 'medium' | 'high';
    recommended_use_cases: string[];
    cost_per_page: string;
  };
  quality_indicators: {
    beams_found: number;
    joists_found: number;
    schedules_found: number;
    dimensions_found: number;
    completeness_score: number;
  };
}

export interface CacheEntry {
  image_hash: string;
  result: any;
  confidence: number;
  method: string;
  timestamp: number;
  processing_time: number;
  metrics: PerformanceMetrics;
}

export class PerformanceTracker {
  private cacheDir: string;
  private metricsFile: string;
  private sessionMetrics: PerformanceMetrics[] = [];

  constructor(cacheDir: string = 'data/vision-cache') {
    this.cacheDir = cacheDir;
    this.metricsFile = path.join(cacheDir, 'performance-metrics.json');
    this.ensureCacheDir();
  }

  private ensureCacheDir(): void {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  private getImageHash(imagePath: string): string {
    const imageData = fs.readFileSync(imagePath);
    return crypto.createHash('sha256').update(imageData).digest('hex').substring(0, 16);
  }

  async getCachedResult(imagePath: string, method: string): Promise<CacheEntry | null> {
    const imageHash = this.getImageHash(imagePath);
    const cacheFile = path.join(this.cacheDir, `${imageHash}-${method}.json`);
    
    if (fs.existsSync(cacheFile)) {
      try {
        const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
        
        // Check if cache is still valid (24 hours)
        const age = Date.now() - cached.timestamp;
        if (age < 24 * 60 * 60 * 1000) {
          console.log(`📋 Using cached result for ${method} (${Math.round(age / 1000 / 60)}min old)`);
          return cached;
        }
      } catch (error) {
        console.log(`⚠️  Invalid cache file: ${cacheFile}`);
      }
    }
    
    return null;
  }

  async cacheResult(
    imagePath: string,
    method: string,
    result: any,
    confidence: number,
    processingTime: number,
    metrics: PerformanceMetrics
  ): Promise<void> {
    const imageHash = this.getImageHash(imagePath);
    const cacheFile = path.join(this.cacheDir, `${imageHash}-${method}.json`);
    
    const cacheEntry: CacheEntry = {
      image_hash: imageHash,
      result,
      confidence,
      method,
      timestamp: Date.now(),
      processing_time: processingTime,
      metrics
    };
    
    fs.writeFileSync(cacheFile, JSON.stringify(cacheEntry, null, 2));
    console.log(`💾 Cached result for ${method} (${processingTime}ms)`);
  }

  calculateMetrics(
    result: any,
    confidence: number,
    method: string,
    processingTime: number,
    baselineTime?: number
  ): PerformanceMetrics {
    const speedPenalty = baselineTime ? processingTime / baselineTime : 1.0;
    
    // Quality indicators
    const beamsFound = result.beams?.length || 0;
    const joistsFound = result.joists?.length || 0;
    const schedulesFound = result.schedules?.length || 0;
    const dimensionsFound = result.dimensions?.length || 0;
    
    const completenessScore = Math.min(1.0, 
      (beamsFound * 0.3 + joistsFound * 0.3 + schedulesFound * 0.2 + dimensionsFound * 0.2) / 2
    );

    // Cost analysis
    const costMetrics = this.analyzeCostMetrics(method, speedPenalty);
    
    return {
      accuracy_metrics: {
        confidence_score: confidence,
        estimated_accuracy: this.estimateAccuracy(confidence, method),
        method_used: method
      },
      performance_metrics: {
        processing_time: processingTime,
        speed_penalty: speedPenalty,
        disk_usage: this.getDiskUsage(method)
      },
      cost_metrics: costMetrics,
      quality_indicators: {
        beams_found: beamsFound,
        joists_found: joistsFound,
        schedules_found: schedulesFound,
        dimensions_found: dimensionsFound,
        completeness_score: completenessScore
      }
    };
  }

  private estimateAccuracy(confidence: number, method: string): number {
    const methodAccuracy = {
      'single': 0.85,
      'multi-pass': 0.90,
      'multi-model': 0.92,
      'full-ensemble': 0.95
    };
    
    const baseAccuracy = methodAccuracy[method as keyof typeof methodAccuracy] || 0.80;
    return Math.min(0.95, confidence * baseAccuracy);
  }

  private analyzeCostMetrics(method: string, speedPenalty: number): {
    processing_cost: 'low' | 'medium' | 'high';
    recommended_use_cases: string[];
    cost_per_page: string;
  } {
    const costAnalysis = {
      'single': {
        processing_cost: 'low' as const,
        recommended_use_cases: ['Bulk processing', 'Quick estimates', 'Preliminary analysis'],
        cost_per_page: '$0.00 (local processing)'
      },
      'multi-pass': {
        processing_cost: 'medium' as const,
        recommended_use_cases: ['Quality verification', 'Important projects', 'Accuracy validation'],
        cost_per_page: '$0.00 (3x processing time)'
      },
      'multi-model': {
        processing_cost: 'high' as const,
        recommended_use_cases: ['Critical projects', 'Final estimates', 'High-stakes analysis'],
        cost_per_page: '$0.00 (requires 11GB+ models)'
      },
      'full-ensemble': {
        processing_cost: 'high' as const,
        recommended_use_cases: ['Mission-critical', 'Material ordering', 'Maximum accuracy'],
        cost_per_page: '$0.00 (highest processing time)'
      }
    };

    return costAnalysis[method as keyof typeof costAnalysis] || costAnalysis.single;
  }

  private getDiskUsage(method: string): string {
    const diskUsage = {
      'single': '2.2GB (glm-ocr)',
      'multi-pass': '2.2GB (glm-ocr)',
      'multi-model': '11GB+ (multiple models)',
      'full-ensemble': '11GB+ (multiple models)'
    };
    
    return diskUsage[method as keyof typeof diskUsage] || '2.2GB';
  }

  recordSessionMetrics(metrics: PerformanceMetrics): void {
    this.sessionMetrics.push(metrics);
  }

  generateReport(): {
    session_summary: any;
    recommendations: string[];
    accuracy_analysis: any;
    performance_analysis: any;
  } {
    if (this.sessionMetrics.length === 0) {
      return {
        session_summary: { message: 'No metrics recorded this session' },
        recommendations: ['Run some extractions to generate metrics'],
        accuracy_analysis: {},
        performance_analysis: {}
      };
    }

    const avgConfidence = this.sessionMetrics.reduce((sum, m) => sum + m.accuracy_metrics.confidence_score, 0) / this.sessionMetrics.length;
    const avgAccuracy = this.sessionMetrics.reduce((sum, m) => sum + m.accuracy_metrics.estimated_accuracy, 0) / this.sessionMetrics.length;
    const avgProcessingTime = this.sessionMetrics.reduce((sum, m) => sum + m.performance_metrics.processing_time, 0) / this.sessionMetrics.length;
    const avgCompleteness = this.sessionMetrics.reduce((sum, m) => sum + m.quality_indicators.completeness_score, 0) / this.sessionMetrics.length;

    const methodCounts = this.sessionMetrics.reduce((counts, m) => {
      counts[m.accuracy_metrics.method_used] = (counts[m.accuracy_metrics.method_used] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    const recommendations = this.generateRecommendations(avgConfidence, avgAccuracy, avgCompleteness);

    return {
      session_summary: {
        pages_processed: this.sessionMetrics.length,
        average_confidence: Math.round(avgConfidence * 100) / 100,
        average_accuracy: Math.round(avgAccuracy * 100) / 100,
        average_processing_time: Math.round(avgProcessingTime),
        average_completeness: Math.round(avgCompleteness * 100) / 100,
        methods_used: methodCounts
      },
      recommendations,
      accuracy_analysis: {
        confidence_distribution: this.getDistribution(this.sessionMetrics.map(m => m.accuracy_metrics.confidence_score)),
        accuracy_distribution: this.getDistribution(this.sessionMetrics.map(m => m.accuracy_metrics.estimated_accuracy)),
        quality_distribution: this.getDistribution(this.sessionMetrics.map(m => m.quality_indicators.completeness_score))
      },
      performance_analysis: {
        processing_time_distribution: this.getDistribution(this.sessionMetrics.map(m => m.performance_metrics.processing_time)),
        speed_penalty_distribution: this.getDistribution(this.sessionMetrics.map(m => m.performance_metrics.speed_penalty))
      }
    };
  }

  private getDistribution(values: number[]): { min: number; max: number; avg: number; median: number } {
    const sorted = values.sort((a, b) => a - b);
    return {
      min: sorted[0] || 0,
      max: sorted[sorted.length - 1] || 0,
      avg: values.reduce((sum, v) => sum + v, 0) / values.length || 0,
      median: sorted[Math.floor(sorted.length / 2)] || 0
    };
  }

  private generateRecommendations(avgConfidence: number, avgAccuracy: number, avgCompleteness: number): string[] {
    const recommendations = [];

    if (avgConfidence < 0.80) {
      recommendations.push('Consider using multi-pass or multi-model extraction for better confidence');
    }

    if (avgAccuracy < 0.85) {
      recommendations.push('Accuracy below target - consider ensemble methods for critical projects');
    }

    if (avgCompleteness < 0.60) {
      recommendations.push('Low completeness scores - check image quality and preprocessing');
    }

    if (avgConfidence >= 0.90 && avgAccuracy >= 0.90) {
      recommendations.push('Excellent performance - current method is working well');
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance is adequate - monitor for consistency');
    }

    return recommendations;
  }

  saveMetrics(): void {
    const report = this.generateReport();
    fs.writeFileSync(this.metricsFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      session_metrics: this.sessionMetrics,
      report
    }, null, 2));
    
    console.log(`📊 Performance metrics saved to ${this.metricsFile}`);
  }

  clearCache(): void {
    if (fs.existsSync(this.cacheDir)) {
      const files = fs.readdirSync(this.cacheDir);
      files.forEach(file => {
        if (file.endsWith('.json') && file !== 'performance-metrics.json') {
          fs.unlinkSync(path.join(this.cacheDir, file));
        }
      });
      console.log(`🗑️  Cleared ${files.length - 1} cache files`);
    }
  }
}