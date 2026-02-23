import sharp = require('sharp');
import * as fs from 'fs';
import * as path from 'path';

export interface ZoneBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PreprocessingOptions {
  normalize?: boolean;
  sharpen?: boolean;
  upscale?: number;
  contrast?: number;
  brightness?: number;
}

export class ImagePreprocessor {
  private tempDir: string;

  constructor(tempDir: string = 'data/vision-temp') {
    this.tempDir = tempDir;
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Preprocess image with contrast enhancement, sharpening, and upscaling
   */
  async preprocessImage(
    inputPath: string,
    options: PreprocessingOptions = {}
  ): Promise<string> {
    const {
      normalize = true,
      sharpen = true,
      upscale = 2,
      contrast = 1.2,
      brightness = 1.1
    } = options;

    const basename = path.basename(inputPath, path.extname(inputPath));
    const outputPath = path.join(this.tempDir, `${basename}_preprocessed.png`);

    let pipeline = sharp(inputPath);

    // Normalize to improve contrast
    if (normalize) {
      pipeline = pipeline.normalize();
    }

    // Adjust brightness and contrast
    pipeline = pipeline.modulate({
      brightness: brightness,
      saturation: 1.0
    }).linear(contrast, -(128 * contrast) + 128);

    // Upscale for better text recognition
    if (upscale > 1) {
      const metadata = await sharp(inputPath).metadata();
      if (metadata.width && metadata.height) {
        pipeline = pipeline.resize(
          Math.round(metadata.width * upscale),
          Math.round(metadata.height * upscale),
          { kernel: sharp.kernel.lanczos3 }
        );
      }
    }

    // Sharpen edges for better text clarity
    if (sharpen) {
      pipeline = pipeline.sharpen({
        sigma: 1.0,
        m1: 1.0,
        m2: 2.0
      });
    }

    await pipeline.png().toFile(outputPath);
    return outputPath;
  }

  /**
   * Crop image to specific zone for targeted analysis
   */
  async cropToZone(
    inputPath: string,
    zone: ZoneBounds,
    zoneName: string
  ): Promise<string> {
    const basename = path.basename(inputPath, path.extname(inputPath));
    const outputPath = path.join(this.tempDir, `${basename}_zone_${zoneName}.png`);

    await sharp(inputPath)
      .extract({
        left: zone.x,
        top: zone.y,
        width: zone.width,
        height: zone.height
      })
      .png()
      .toFile(outputPath);

    return outputPath;
  }

  /**
   * Get image dimensions
   */
  async getImageDimensions(imagePath: string): Promise<{ width: number; height: number }> {
    const metadata = await sharp(imagePath).metadata();
    return {
      width: metadata.width || 0,
      height: metadata.height || 0
    };
  }

  /**
   * Calculate zone bounds as percentages of image dimensions
   */
  async calculateZoneBounds(
    imagePath: string,
    zonePercentages: { x: number; y: number; width: number; height: number }
  ): Promise<ZoneBounds> {
    const { width, height } = await this.getImageDimensions(imagePath);
    
    return {
      x: Math.round(width * zonePercentages.x / 100),
      y: Math.round(height * zonePercentages.y / 100),
      width: Math.round(width * zonePercentages.width / 100),
      height: Math.round(height * zonePercentages.height / 100)
    };
  }

  /**
   * Clean up temporary files
   */
  cleanup(filePaths: string[]): void {
    for (const filePath of filePaths) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  }
}