#!/usr/bin/env ts-node

/**
 * Dimension Extractor - Uses vision to find actual dimension strings on plans
 * Phase 1 improvement: Stop guessing 24' spans, extract real dimensions
 */

import * as fs from 'fs';
import { Ollama } from 'ollama';
import { ConstructionPrompts } from '../vision/construction-prompts';

export interface ExtractedDimension {
  value: string;           // "24'-6""
  inches: number;          // 294
  location: string;        // "main span"
  element: string;         // "joist span"
  gridReference?: string;  // "A to B"
  confidence: number;      // 0.0-1.0
}

export interface DimensionExtractionResult {
  sheet: string;
  dimensions: ExtractedDimension[];
  spans: ExtractedDimension[];      // Filtered for structural spans
  spacings: ExtractedDimension[];   // Filtered for member spacing
  extracted_at: string;
}

export class DimensionExtractor {
  private ollama: Ollama;

  constructor(ollamaUrl: string = 'http://localhost:11434') {
    this.ollama = new Ollama({ host: ollamaUrl });
  }

  /**
   * Extract all dimensions from a construction drawing
   */
  async extractDimensions(imagePath: string, sheet: string): Promise<DimensionExtractionResult> {
    console.log(`📏 Extracting dimensions from ${sheet}...`);

    const imageData = fs.readFileSync(imagePath);
    const base64Image = imageData.toString('base64');

    const response = await this.ollama.generate({
      model: 'glm-ocr',
      prompt: ConstructionPrompts.getDimensionExtractionPrompt(),
      images: [base64Image],
      options: { temperature: 0.1 }
    });

    const rawDimensions = this.parseVisionResponse(response.response);
    const processedDimensions = rawDimensions.map(dim => this.processDimension(dim));

    // Filter dimensions by type
    const spans = processedDimensions.filter(d => this.isSpanDimension(d));
    const spacings = processedDimensions.filter(d => this.isSpacingDimension(d));

    return {
      sheet,
      dimensions: processedDimensions,
      spans,
      spacings,
      extracted_at: new Date().toISOString()
    };
  }

  /**
   * Get the main structural span for quantity calculations
   */
  getMainSpan(result: DimensionExtractionResult): number {
    // Look for typical structural spans (16'-0" to 32'-0")
    const structuralSpans = result.spans.filter(d => 
      d.inches >= 192 && d.inches <= 384 && // 16' to 32'
      (d.location.includes('span') || 
       d.location.includes('bay') || 
       d.element.includes('span') ||
       d.gridReference)
    );

    if (structuralSpans.length > 0) {
      // Return the most common span or the largest
      const spanCounts = new Map<number, number>();
      structuralSpans.forEach(s => {
        const count = spanCounts.get(s.inches) || 0;
        spanCounts.set(s.inches, count + 1);
      });

      // Find most common span
      let maxCount = 0;
      let commonSpan = 0;
      spanCounts.forEach((count, span) => {
        if (count > maxCount) {
          maxCount = count;
          commonSpan = span;
        }
      });

      return commonSpan;
    }

    // Fallback: return largest span found
    if (result.dimensions.length > 0) {
      const largest = result.dimensions.reduce((max, d) => 
        d.inches > max.inches ? d : max
      );
      return largest.inches;
    }

    // Last resort: default span
    console.warn('⚠️  No dimensions found, using default 24\' span');
    return 288; // 24'
  }

  private parseVisionResponse(text: string): any[] {
    try {
      // Find JSON in response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('No JSON found in dimension response');
        return [];
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.dimensions || [];
    } catch (error) {
      console.error('Failed to parse dimension response:', error);
      console.error('Raw response:', text.substring(0, 200));
      
      // Fallback: extract dimensions from text using regex
      return this.extractDimensionsFromText(text);
    }
  }

  private extractDimensionsFromText(text: string): any[] {
    const dimensions: any[] = [];
    
    // Regex patterns for different dimension formats
    const patterns = [
      /(\d+)'-(\d+)"/g,           // 24'-6"
      /(\d+)'-0"/g,               // 24'-0"
      /(\d+)'/g,                  // 24'
      /(\d+)"/g,                  // 18"
      /(\d+\.?\d*)\s*mm/g,        // 400mm
      /(\d+\.?\d*)\s*ft/g         // 24.5ft
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        dimensions.push({
          value: match[0],
          location: 'extracted_from_text',
          element: 'dimension',
          gridReference: ''
        });
      }
    });

    return dimensions;
  }

  private processDimension(rawDim: any): ExtractedDimension {
    const inches = this.parseToInches(rawDim.value);
    const confidence = this.calculateConfidence(rawDim.value, rawDim.location);

    return {
      value: rawDim.value,
      inches,
      location: rawDim.location || 'unknown',
      element: rawDim.element || 'dimension',
      gridReference: rawDim.gridReference,
      confidence
    };
  }

  private parseToInches(value: string): number {
    if (typeof value === 'number') return value;

    // Handle feet-inches (24'-6")
    const feetInches = value.match(/(\d+)'-(\d+)"/);
    if (feetInches) {
      return parseInt(feetInches[1]) * 12 + parseInt(feetInches[2]);
    }

    // Handle feet only (24')
    const feetOnly = value.match(/(\d+)'/);
    if (feetOnly) {
      return parseInt(feetOnly[1]) * 12;
    }

    // Handle inches only (18")
    const inchesOnly = value.match(/(\d+)"/);
    if (inchesOnly) {
      return parseInt(inchesOnly[1]);
    }

    // Handle metric (400mm)
    const metric = value.match(/(\d+\.?\d*)\s*mm/);
    if (metric) {
      return Math.round(parseFloat(metric[1]) / 25.4); // mm to inches
    }

    // Handle decimal feet (24.5)
    const decimal = parseFloat(value);
    if (!isNaN(decimal)) {
      return decimal > 50 ? decimal : decimal * 12; // assume feet if > 50
    }

    return 0;
  }

  private calculateConfidence(value: string, location: string): number {
    let confidence = 0.5; // base confidence

    // Higher confidence for proper dimension format
    if (value.match(/\d+'-\d+"/)) confidence += 0.3;
    if (value.match(/\d+'/)) confidence += 0.2;
    if (value.match(/\d+"/)) confidence += 0.1;

    // Higher confidence for structural locations
    if (location.includes('span')) confidence += 0.2;
    if (location.includes('bay')) confidence += 0.2;
    if (location.includes('grid')) confidence += 0.1;
    if (location.includes('joist')) confidence += 0.1;
    if (location.includes('beam')) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  private isSpanDimension(dim: ExtractedDimension): boolean {
    // Structural spans are typically 16' to 32'
    if (dim.inches < 192 || dim.inches > 384) return false;

    const indicators = [
      'span', 'bay', 'grid', 'beam', 'joist', 
      'column', 'structural', 'framing'
    ];

    return indicators.some(indicator => 
      dim.location.toLowerCase().includes(indicator) ||
      dim.element.toLowerCase().includes(indicator)
    );
  }

  private isSpacingDimension(dim: ExtractedDimension): boolean {
    // Spacing dimensions are typically 12" to 24"
    if (dim.inches < 12 || dim.inches > 24) return false;

    const indicators = [
      'spacing', 'oc', 'center', 'joist', 'stud'
    ];

    return indicators.some(indicator => 
      dim.location.toLowerCase().includes(indicator) ||
      dim.element.toLowerCase().includes(indicator)
    );
  }
}

// CLI usage
async function main() {
  if (process.argv.length < 4) {
    console.log('Usage: ts-node dimension-extractor.ts <image-path> <sheet-name>');
    console.log('Example: ts-node dimension-extractor.ts /tmp/shell-set-page-33.png S2.1');
    process.exit(1);
  }

  const imagePath = process.argv[2];
  const sheet = process.argv[3];

  if (!fs.existsSync(imagePath)) {
    console.error(`❌ Image not found: ${imagePath}`);
    process.exit(1);
  }

  const extractor = new DimensionExtractor();
  const result = await extractor.extractDimensions(imagePath, sheet);

  console.log('\n' + '='.repeat(60));
  console.log('📏 DIMENSION EXTRACTION RESULTS');
  console.log('='.repeat(60));
  
  console.log(`\n📄 Sheet: ${result.sheet}`);
  console.log(`📊 Total dimensions: ${result.dimensions.length}`);
  console.log(`🏗️  Structural spans: ${result.spans.length}`);
  console.log(`📐 Spacing dimensions: ${result.spacings.length}`);

  if (result.spans.length > 0) {
    console.log('\n🎯 STRUCTURAL SPANS:');
    result.spans.forEach(span => {
      console.log(`  ${span.value} (${span.inches}") - ${span.location} [${(span.confidence * 100).toFixed(0)}%]`);
    });

    const mainSpan = extractor.getMainSpan(result);
    console.log(`\n📏 Main span for calculations: ${Math.floor(mainSpan / 12)}'-${mainSpan % 12}" (${mainSpan}")`);
  }

  if (result.spacings.length > 0) {
    console.log('\n📐 SPACING DIMENSIONS:');
    result.spacings.forEach(spacing => {
      console.log(`  ${spacing.value} (${spacing.inches}") - ${spacing.location} [${(spacing.confidence * 100).toFixed(0)}%]`);
    });
  }

  // Save results
  const outputPath = `dimension-extraction-${sheet.toLowerCase().replace('.', '')}.json`;
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log(`\n💾 Results saved to: ${outputPath}`);
}

if (require.main === module) {
  main().catch(console.error);
}