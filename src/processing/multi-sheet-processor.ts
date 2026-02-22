#!/usr/bin/env ts-node

import * as fs from 'fs';
import { execSync } from 'child_process';

interface SheetConfig {
  name: string;
  page: number;
  type: 'floor_framing' | 'roof_framing' | 'details' | 'schedules';
}

interface ExtractionResult {
  sheet: string;
  type: string;
  data: any;
  cross_references: string[];
}

const SHEET_CONFIGS: SheetConfig[] = [
  { name: 'S2.1', page: 33, type: 'floor_framing' },
  { name: 'S2.2', page: 34, type: 'roof_framing' },
  { name: 'S3.0', page: 35, type: 'details' },
  { name: 'S4.0', page: 36, type: 'schedules' }
];

export class MultiSheetProcessor {
  private ollama: any;

  constructor() {
    const Ollama = require('ollama').Ollama;
    this.ollama = new Ollama({ host: 'http://localhost:11434' });
  }

  async processAllSheets(): Promise<ExtractionResult[]> {
    const results: ExtractionResult[] = [];
    
    for (const config of SHEET_CONFIGS) {
      console.log(`\n📄 Processing ${config.name} (${config.type})...`);
      
      // Extract page if not exists
      const imagePath = await this.ensurePageImage(config.page);
      
      // Process with type-specific processor
      const processor = this.getProcessor(config.type);
      const result = await processor(imagePath, config);
      
      results.push(result);
    }
    
    return results;
  }

  private async ensurePageImage(page: number): Promise<string> {
    const imagePath = `/tmp/shell-set-page-${page}-${page}.png`;
    
    if (!fs.existsSync(imagePath)) {
      console.log(`  Extracting page ${page}...`);
      execSync(`pdftoppm -png -f ${page} -l ${page} source/Shell-Set.pdf /tmp/shell-set-page-${page}`);
    }
    
    return imagePath;
  }

  private getProcessor(type: string) {
    const processors = {
      floor_framing: this.processFloorFraming.bind(this),
      roof_framing: this.processRoofFraming.bind(this),
      details: this.processDetails.bind(this),
      schedules: this.processSchedules.bind(this)
    };
    
    return processors[type as keyof typeof processors];
  }

  // Zone-based extraction for framing plans
  private async processFloorFraming(imagePath: string, config: SheetConfig): Promise<ExtractionResult> {
    const zones = [
      { name: 'left', bounds: { x: 0, y: 0, w: 33, h: 100 } },
      { name: 'center', bounds: { x: 33, y: 0, w: 34, h: 100 } },
      { name: 'right', bounds: { x: 67, y: 0, w: 33, h: 100 } }
    ];

    const data: any = { zones: [] };
    const crossRefs: string[] = [];

    for (const zone of zones) {
      const zoneData = await this.extractZoneMembers(imagePath, zone);
      data.zones.push(zoneData);
      crossRefs.push(...zoneData.sections);
    }

    return {
      sheet: config.name,
      type: config.type,
      data,
      cross_references: [...new Set(crossRefs)]
    };
  }

  // Similar to floor framing but different member types
  private async processRoofFraming(imagePath: string, config: SheetConfig): Promise<ExtractionResult> {
    const prompt = `Extract roof framing members from this drawing.
Find: rafters, ridge beams, hip beams, ceiling joists, trusses.
Return JSON: {"rafters": [], "ridges": [], "hips": [], "ceiling_joists": [], "trusses": [], "sections": []}`;

    const response = await this.analyzeWithVision(imagePath, prompt);
    const data = this.parseJsonResponse(response) || { rafters: [], ridges: [], hips: [], ceiling_joists: [], trusses: [], sections: [] };

    return {
      sheet: config.name,
      type: config.type,
      data,
      cross_references: data.sections || []
    };
  }

  // Callout bubble extraction for details
  private async processDetails(imagePath: string, config: SheetConfig): Promise<ExtractionResult> {
    const prompt = `Extract detail callouts and section markers from this detail sheet.
Look for: circular bubbles with numbers/letters, section references like "3/S3.0", detail titles.
Return JSON: {"details": [{"number": "3", "title": "Beam Connection", "references": []}], "sections": []}`;

    const response = await this.analyzeWithVision(imagePath, prompt);
    const data = this.parseJsonResponse(response) || { details: [], sections: [] };

    return {
      sheet: config.name,
      type: config.type,
      data,
      cross_references: data.sections || []
    };
  }

  // Table extraction for schedules
  private async processSchedules(imagePath: string, config: SheetConfig): Promise<ExtractionResult> {
    const prompt = `Extract schedule tables from this sheet.
Look for: beam schedule, column schedule, footing schedule tables with headers and rows.
Return JSON: {"beam_schedule": [], "column_schedule": [], "footing_schedule": [], "sections": []}`;

    const response = await this.analyzeWithVision(imagePath, prompt);
    const data = this.parseJsonResponse(response) || { beam_schedule: [], column_schedule: [], footing_schedule: [], sections: [] };

    return {
      sheet: config.name,
      type: config.type,
      data,
      cross_references: data.sections || []
    };
  }

  private async extractZoneMembers(imagePath: string, zone: any) {
    const memberTypes = ['joists', 'beams', 'plates', 'columns', 'sections'];
    const result: any = { zone: zone.name };

    for (const type of memberTypes) {
      const prompt = this.buildZonePrompt(zone, type);
      const response = await this.analyzeWithVision(imagePath, prompt);
      result[type] = this.parseArrayResponse(response);
    }

    return result;
  }

  private buildZonePrompt(zone: any, memberType: string): string {
    const prompts = {
      joists: `Focus on the ${zone.name} third. Find joist specs: TJI, D1/D2/D3, spacing. JSON array: ["14 TJI 560 @ 16 OC"]`,
      beams: `Focus on the ${zone.name} third. Find beam specs: GLB, LVL, PSL. JSON array: ["5 1/8 x 18 GLB"]`,
      plates: `Focus on the ${zone.name} third. Find plate specs: 2x14, 2x12, PT. JSON array: ["2x14 PT"]`,
      columns: `Focus on the ${zone.name} third. Find column specs: 6x6, 4x4, PSL. JSON array: ["6x6 PT"]`,
      sections: `Focus on the ${zone.name} third. Find section markers: 3/S3.0, 4/S3.0. JSON array: ["3/S3.0"]`
    };
    return prompts[memberType as keyof typeof prompts] || '';
  }

  private async analyzeWithVision(imagePath: string, prompt: string): Promise<string> {
    const imageData = fs.readFileSync(imagePath);
    const base64Image = imageData.toString('base64');

    const response = await this.ollama.generate({
      model: 'glm-ocr',
      prompt,
      images: [base64Image],
      options: { temperature: 0.1 }
    });

    return response.response;
  }

  private parseJsonResponse(response: string): any {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0].replace(/'/g, '"'));
      }
    } catch (e) {
      console.warn('Failed to parse JSON response:', response.substring(0, 100));
    }
    return null;
  }

  private parseArrayResponse(response: string): string[] {
    try {
      const jsonMatch = response.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0].replace(/'/g, '"'));
      }
    } catch (e) {
      console.warn('Failed to parse array response:', response.substring(0, 100));
    }
    return [];
  }
}