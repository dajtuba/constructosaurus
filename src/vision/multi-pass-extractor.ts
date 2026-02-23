import { OllamaVisionAnalyzer, VisionAnalysisResult } from './ollama-vision-analyzer.js';

export interface MultiPassResult {
  consensus: VisionAnalysisResult;
  confidence: number;
  individual_results: {
    direct: VisionAnalysisResult;
    multiple_choice: VisionAnalysisResult;
    verification: VisionAnalysisResult;
  };
  agreement_score: number;
}

export class MultiPassExtractor {
  private analyzer: OllamaVisionAnalyzer;

  constructor(ollamaUrl: string = "http://localhost:11434", model: string = "glm-ocr") {
    this.analyzer = new OllamaVisionAnalyzer(ollamaUrl, model);
  }

  async extractWithConsensus(
    imagePath: string,
    pageNumber: number,
    discipline?: string
  ): Promise<MultiPassResult> {
    // Pass 1: Direct extraction
    const directResult = await this.analyzer.analyzeDrawingPage(imagePath, pageNumber, discipline);

    // Pass 2: Multiple choice verification
    const mcResult = await this.extractMultipleChoice(imagePath, pageNumber, directResult);

    // Pass 3: Yes/No verification
    const verificationResult = await this.extractVerification(imagePath, pageNumber, directResult);

    // Find consensus
    const consensus = this.findConsensus([directResult, mcResult, verificationResult]);
    const agreementScore = this.calculateAgreement([directResult, mcResult, verificationResult]);
    
    return {
      consensus,
      confidence: Math.min(0.95, 0.6 + (agreementScore * 0.35)), // 60-95% based on agreement
      individual_results: {
        direct: directResult,
        multiple_choice: mcResult,
        verification: verificationResult
      },
      agreement_score: agreementScore
    };
  }

  private async extractMultipleChoice(
    imagePath: string,
    pageNumber: number,
    directResult: VisionAnalysisResult
  ): Promise<VisionAnalysisResult> {
    // Build multiple choice questions from direct result
    const choices = this.buildChoices(directResult);
    
    const prompt = `You are analyzing a construction drawing. Answer these multiple choice questions:

${choices.map((q, i) => `${i + 1}. ${q.question}\n   ${q.options.map((opt, j) => `${String.fromCharCode(65 + j)}) ${opt}`).join('\n   ')}`).join('\n\n')}

Return ONLY valid JSON with your answers:
{
  "answers": [{"question": 1, "choice": "A", "value": "selected_value"}]
}`;

    const response = await this.analyzer['ollama'].generate({
      model: this.analyzer['model'],
      prompt,
      images: [require('fs').readFileSync(imagePath).toString('base64')],
      options: { temperature: 0.1 }
    });

    return this.parseMultipleChoiceResponse(response.response, choices, pageNumber);
  }

  private async extractVerification(
    imagePath: string,
    pageNumber: number,
    directResult: VisionAnalysisResult
  ): Promise<VisionAnalysisResult> {
    const verifications = this.buildVerifications(directResult);
    
    const prompt = `You are analyzing a construction drawing. Answer YES or NO to each question:

${verifications.map((v, i) => `${i + 1}. ${v.question}`).join('\n')}

Return ONLY valid JSON:
{
  "verifications": [{"question": 1, "answer": "YES", "item": "verified_item"}]
}`;

    const response = await this.analyzer['ollama'].generate({
      model: this.analyzer['model'],
      prompt,
      images: [require('fs').readFileSync(imagePath).toString('base64')],
      options: { temperature: 0.1 }
    });

    return this.parseVerificationResponse(response.response, verifications, pageNumber);
  }

  private buildChoices(result: VisionAnalysisResult): Array<{question: string, options: string[], type: string}> {
    const choices = [];

    // Beam choices
    if (result.beams && result.beams.length > 0) {
      const beam = result.beams[0];
      choices.push({
        question: "What is the primary beam specification?",
        options: [beam.mark || "Unknown", "W18x106", "W12x65", "5 1/8 x 18 GLB"],
        type: "beam"
      });
    }

    // Joist choices
    if (result.joists && result.joists.length > 0) {
      const joist = result.joists[0];
      choices.push({
        question: "What is the joist specification and spacing?",
        options: [joist.mark || "Unknown", "14\" TJI 560 @ 16\" OC", "11 7/8\" TJI 360 @ 19.2\" OC", "2x10 @ 16\" OC"],
        type: "joist"
      });
    }

    return choices;
  }

  private buildVerifications(result: VisionAnalysisResult): Array<{question: string, item: any, type: string}> {
    const verifications: Array<{question: string, item: any, type: string}> = [];

    // Verify beams
    result.beams?.forEach(beam => {
      verifications.push({
        question: `Is "${beam.mark}" visible as a beam callout?`,
        item: beam,
        type: "beam"
      });
    });

    // Verify joists
    result.joists?.forEach(joist => {
      verifications.push({
        question: `Is "${joist.mark}" visible as a joist specification?`,
        item: joist,
        type: "joist"
      });
    });

    return verifications;
  }

  private parseMultipleChoiceResponse(text: string, choices: any[], pageNumber: number): VisionAnalysisResult {
    try {
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
      const result: VisionAnalysisResult = { schedules: [], dimensions: [], itemCounts: [] };

      parsed.answers?.forEach((answer: any) => {
        const choice = choices[answer.question - 1];
        if (!choice) return;

        const selectedOption = choice.options[answer.choice.charCodeAt(0) - 65];
        
        if (choice.type === 'beam') {
          result.beams = result.beams || [];
          result.beams.push({ mark: selectedOption });
        } else if (choice.type === 'joist') {
          result.joists = result.joists || [];
          result.joists.push({ mark: selectedOption });
        }
      });

      return result;
    } catch {
      return { schedules: [], dimensions: [], itemCounts: [] };
    }
  }

  private parseVerificationResponse(text: string, verifications: Array<{question: string, item: any, type: string}>, pageNumber: number): VisionAnalysisResult {
    try {
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
      const result: VisionAnalysisResult = { schedules: [], dimensions: [], itemCounts: [] };

      parsed.verifications?.forEach((verification: any) => {
        const item = verifications[verification.question - 1];
        if (!item || verification.answer !== "YES") return;

        if (item.type === 'beam') {
          result.beams = result.beams || [];
          result.beams.push(item.item);
        } else if (item.type === 'joist') {
          result.joists = result.joists || [];
          result.joists.push(item.item);
        }
      });

      return result;
    } catch {
      return { schedules: [], dimensions: [], itemCounts: [] };
    }
  }

  private findConsensus(results: VisionAnalysisResult[]): VisionAnalysisResult {
    const consensus: VisionAnalysisResult = { schedules: [], dimensions: [], itemCounts: [] };

    // Consensus for beams
    const allBeams = results.flatMap(r => r.beams || []);
    const beamCounts = new Map<string, number>();
    allBeams.forEach(beam => {
      const key = beam.mark || '';
      beamCounts.set(key, (beamCounts.get(key) || 0) + 1);
    });
    
    consensus.beams = [];
    beamCounts.forEach((count, mark) => {
      if (count >= 2 && mark) { // Majority agreement
        const beam = allBeams.find(b => b.mark === mark);
        if (beam) consensus.beams!.push(beam);
      }
    });

    // Consensus for joists
    const allJoists = results.flatMap(r => r.joists || []);
    const joistCounts = new Map<string, number>();
    allJoists.forEach(joist => {
      const key = joist.mark || '';
      joistCounts.set(key, (joistCounts.get(key) || 0) + 1);
    });
    
    consensus.joists = [];
    joistCounts.forEach((count, mark) => {
      if (count >= 2 && mark) {
        const joist = allJoists.find(j => j.mark === mark);
        if (joist) consensus.joists!.push(joist);
      }
    });

    // Take schedules from direct result (most comprehensive)
    consensus.schedules = results[0]?.schedules || [];
    consensus.dimensions = results[0]?.dimensions || [];
    consensus.itemCounts = results[0]?.itemCounts || [];

    return consensus;
  }

  private calculateAgreement(results: VisionAnalysisResult[]): number {
    let agreements = 0;
    let total = 0;

    // Check beam agreement
    const beamMarks = results.map(r => (r.beams || []).map(b => b.mark).sort());
    for (let i = 0; i < beamMarks.length - 1; i++) {
      for (let j = i + 1; j < beamMarks.length; j++) {
        total++;
        if (JSON.stringify(beamMarks[i]) === JSON.stringify(beamMarks[j])) {
          agreements++;
        }
      }
    }

    // Check joist agreement
    const joistMarks = results.map(r => (r.joists || []).map(j => j.mark).sort());
    for (let i = 0; i < joistMarks.length - 1; i++) {
      for (let j = i + 1; j < joistMarks.length; j++) {
        total++;
        if (JSON.stringify(joistMarks[i]) === JSON.stringify(joistMarks[j])) {
          agreements++;
        }
      }
    }

    return total > 0 ? agreements / total : 0;
  }
}