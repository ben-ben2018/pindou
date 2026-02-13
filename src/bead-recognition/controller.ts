/// <reference path="./cv.d.ts" />
import type { BeadData, RecognitionResult } from "./types";
import { ImageInput } from "./imageInput";
import { BeadDetector } from "./beadDetector";
import { PerspectiveCorrection } from "./perspectiveCorrection";
import { CoordinateMapper } from "./coordinateMapper";
import { ColorRecognizer } from "./colorRecognizer";
import type { ColorDatabase } from "./colorDatabase";

/**
 * 拼豆识别主控制器：串联图像输入、检测、透视、坐标映射、颜色识别
 */
export class BeadRecognitionController {
  private input: ImageInput;
  private detector: BeadDetector;
  private perspective: PerspectiveCorrection;
  private mapper: CoordinateMapper;
  private colorRecognizer: ColorRecognizer;
  private progressCallback?: (progress: number, stage: string) => void;

  constructor() {
    this.input = new ImageInput();
    this.detector = new BeadDetector();
    this.perspective = new PerspectiveCorrection();
    this.mapper = new CoordinateMapper();
    this.colorRecognizer = new ColorRecognizer();
  }

  onProgress(callback: (progress: number, stage: string) => void): void {
    this.progressCallback = callback;
  }

  private report(progress: number, stage: string): void {
    this.progressCallback?.(progress, stage);
  }

  /**
   * 主流程：从文件识别拼豆，返回 JSON 化结果
   */
  async recognize(
    file: File,
    colorDatabase: ColorDatabase
  ): Promise<RecognitionResult> {
    const errors: string[] = [];
    const startTime = performance.now();
    let imageData: ImageData | null = null;
    let width = 0;
    let height = 0;

    try {
      this.report(5, "加载图片");
      const loaded = await this.input.loadAndPreprocess(file);
      imageData = loaded.imageData;
      width = loaded.width;
      height = loaded.height;
      this.input.setProgressCallback((p, s) => this.report(p * 0.2, s));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "图片加载失败";
      errors.push(msg);
      return this.failResult(errors, startTime);
    }

    if (typeof cv === "undefined") {
      errors.push("OpenCV.js 未加载");
      return this.failResult(errors, startTime);
    }

    let mat: cv.Mat | null = null;
    try {
      this.report(25, "检测拼豆");
      mat = cv.matFromImageData(imageData);
      if (!mat) {
        errors.push("无法创建图像矩阵");
        return this.failResult(errors, startTime);
      }
      const beads = await this.detector.detect(imageData);
      const detDebug = this.detector.getLastDebug();
      if (beads.length === 0) {
        errors.push("未检测到拼豆，请检查图片质量与光照");
        const debugResult = this.failResult(errors, startTime);
        if (detDebug) {
          const cfg = this.detector.getConfig();
          debugResult.debug = {
            imageWidth: width,
            imageHeight: height,
            houghMatRows: detDebug.houghMatRows,
            houghMatCols: detDebug.houghMatCols,
            houghDataLength: detDebug.houghDataLength,
            rawCirclesParsed: detDebug.rawCirclesParsed,
            afterRefinement: detDebug.afterRefinement,
            afterFilter: detDebug.afterFilter,
            params: {
              minRadius: cfg.minRadius,
              maxRadius: cfg.maxRadius,
              minDistance: cfg.minDistance,
              param1: cfg.cannyThreshold,
              param2: cfg.accumulatorThreshold,
            },
            gridSpacing: 0,
          };
        }
        return debugResult;
      }

      this.report(45, "估算网格");
      const gridSpacing = this.perspective.estimateGridSpacing(beads);
      const gridCoords = this.mapper.mapToGrid(beads, gridSpacing);

      this.report(55, "识别颜色");
      const total = gridCoords.length;
      const beadsData: BeadData[] = [];
      for (let i = 0; i < total; i++) {
        const gc = gridCoords[i];
        const recognized = this.colorRecognizer.recognize(mat, gc.bead, colorDatabase);
        beadsData.push({
          row: gc.row,
          col: gc.col,
          color: recognized.hex,
          colorName: recognized.beadColorName,
          confidence: recognized.confidence,
          pixelX: gc.pixelX,
          pixelY: gc.pixelY,
        });
        this.report(55 + Math.floor((40 * (i + 1)) / total), `颜色 ${i + 1}/${total}`);
      }

      const minRow = beadsData.length > 0 ? Math.min(...beadsData.map((b) => b.row)) : 0;
      const minCol = beadsData.length > 0 ? Math.min(...beadsData.map((b) => b.col)) : 0;
      beadsData.forEach((b) => {
        b.row -= minRow;
        b.col -= minCol;
      });
      const rows = beadsData.length > 0 ? Math.max(...beadsData.map((b) => b.row)) + 1 : 0;
      const cols = beadsData.length > 0 ? Math.max(...beadsData.map((b) => b.col)) + 1 : 0;
      const processingTime = (performance.now() - startTime) / 1000;

      this.report(100, "完成");
      const res: RecognitionResult = {
        success: true,
        beads: beadsData,
        metadata: {
          imageWidth: width,
          imageHeight: height,
          gridRows: rows,
          gridCols: cols,
          totalBeads: beadsData.length,
          processingTime,
        },
        errors,
      };
      if (detDebug) {
        const cfg = this.detector.getConfig();
        res.debug = {
          imageWidth: width,
          imageHeight: height,
          houghMatRows: detDebug.houghMatRows,
          houghMatCols: detDebug.houghMatCols,
          houghDataLength: detDebug.houghDataLength,
          rawCirclesParsed: detDebug.rawCirclesParsed,
          afterRefinement: detDebug.afterRefinement,
          afterFilter: detDebug.afterFilter,
          params: {
            minRadius: cfg.minRadius,
            maxRadius: cfg.maxRadius,
            minDistance: cfg.minDistance,
            param1: cfg.cannyThreshold,
            param2: cfg.accumulatorThreshold,
          },
          gridSpacing,
        };
      }
      return res;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(msg);
      return this.failResult(errors, startTime);
    } finally {
      mat?.delete();
    }
  }

  private failResult(errors: string[], startTime: number): RecognitionResult {
    return {
      success: false,
      beads: [],
      metadata: {
        imageWidth: 0,
        imageHeight: 0,
        gridRows: 0,
        gridCols: 0,
        totalBeads: 0,
        processingTime: (performance.now() - startTime) / 1000,
      },
      errors,
    };
  }
}
