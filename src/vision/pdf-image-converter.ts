import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";

const execAsync = promisify(exec);

export class PDFImageConverter {
  async convertPageToImage(
    pdfPath: string,
    pageNumber: number,
    outputDir: string
  ): Promise<string> {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, `page-${pageNumber}`);

    try {
      // Try pdftoppm (most reliable)
      await execAsync(
        `pdftoppm -png -f ${pageNumber} -l ${pageNumber} -r 150 "${pdfPath}" "${outputPath}"`
      );
    } catch (error) {
      throw new Error(
        `Failed to convert PDF page ${pageNumber}. Install poppler-utils: brew install poppler`
      );
    }

    // Find the created image
    const files = fs.readdirSync(outputDir)
      .filter(f => f.startsWith(`page-${pageNumber}`) && f.endsWith('.png'));

    if (files.length === 0) {
      throw new Error(`No image created for page ${pageNumber}`);
    }

    return path.join(outputDir, files[0]);
  }

  async convertPagesToImages(
    pdfPath: string,
    pageNumbers: number[],
    outputDir: string
  ): Promise<Map<number, string>> {
    const results = new Map<number, string>();

    for (const pageNum of pageNumbers) {
      const imagePath = await this.convertPageToImage(pdfPath, pageNum, outputDir);
      results.set(pageNum, imagePath);
    }

    return results;
  }
}
