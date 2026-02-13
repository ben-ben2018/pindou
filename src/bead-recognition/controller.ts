/// <reference path="./cv.d.ts" />
import type { BeadData, RecognitionResult, DetectionDebugInfo } from "./types";
import { ImageInput } from "./imageInput";
import { BeadDetector } from "./beadDetector";
import { ColorRecognizer } from "./colorRecognizer";
import type { ColorDatabase } from "./colorDatabase";

/**
 * 拼豆识别主控制器
 * 使用基于网格检测的新方法，串联图像输入、网格检测、颜色识别
 */
export class BeadRecognitionController {
  private input: ImageInput;
  private detector: BeadDetector;
  private colorRecognizer: ColorRecognizer;
  private progressCallback?: (progress: number, stage: string) => void;

  constructor() {
    this.input = new ImageInput();
    this.detector = new BeadDetector();
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
      this.report(25, "检测网格与拼豆");
      mat = cv.matFromImageData(imageData);
      if (!mat) {
        errors.push("无法创建图像矩阵");
        return this.failResult(errors, startTime);
      }

      // 使用基于网格的检测
      const beads = await this.detector.detect(imageData);
      const detDebug = this.detector.getLastDebug();
      const gridParams = this.detector.getGridParameters();

      if (beads.length === 0) {
        errors.push("未检测到拼豆，请检查图片质量与光照");
        const debugResult = this.failResult(errors, startTime);
        debugResult.debug = this.buildDebugInfo(detDebug, gridParams, width, height, 0);
        return debugResult;
      }

      this.report(45, "获取网格坐标");

      // 直接从 detector 获取网格坐标（不再需要 CoordinateMapper）
      const gridCoords = this.detector.getOccupiedGridCoordinates();

      this.report(55, "识别颜色");
      const total = gridCoords.length;
      const beadsData: BeadData[] = [];

      for (let i = 0; i < total; i++) {
        const gc = gridCoords[i];
        // 使用 beads 中对应的位置信息
        const beadPos = beads[i];

        const recognized = this.colorRecognizer.recognize(mat, beadPos, colorDatabase);
        beadsData.push({
          row: gc.row,
          col: gc.col,
          color: recognized.hex,
          colorName: recognized.beadColorName,
          confidence: recognized.confidence,
          pixelX: gc.centerX,
          pixelY: gc.centerY,
        });

        if (i % 100 === 0 || i === total - 1) {
          this.report(55 + Math.floor((40 * (i + 1)) / total), `颜色 ${i + 1}/${total}`);
        }
      }

      // 网格检测已经从 0 开始，不需要再调整
      const rows = gridParams ? gridParams.rows : (beadsData.length > 0 ? Math.max(...beadsData.map((b) => b.row)) + 1 : 0);
      const cols = gridParams ? gridParams.cols : (beadsData.length > 0 ? Math.max(...beadsData.map((b) => b.col)) + 1 : 0);
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

      res.debug = this.buildDebugInfo(detDebug, gridParams, width, height, gridParams?.spacingX ?? 0);
      return res;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(msg);
      return this.failResult(errors, startTime);
    } finally {
      mat?.delete();
    }
  }

  /**
   * 构建调试信息（兼容旧格式）
   */
  private buildDebugInfo(
    detDebug: ReturnType<BeadDetector["getLastDebug"]>,
    gridParams: ReturnType<BeadDetector["getGridParameters"]>,
    width: number,
    height: number,
    gridSpacing: number
  ): DetectionDebugInfo {
    return {
      imageWidth: width,
      imageHeight: height,
      // 基于网格的检测不使用 Hough，设为 0
      houghMatRows: 0,
      houghMatCols: 0,
      houghDataLength: 0,
      rawCirclesParsed: detDebug?.totalCells ?? 0,
      afterRingFilter: detDebug?.occupiedCells ?? 0,
      afterRefinement: detDebug?.occupiedCells ?? 0,
      afterFilter: detDebug?.occupiedCells ?? 0,
      params: {
        minRadius: gridParams ? Math.round(gridParams.spacingX * 0.4) : 8,
        maxRadius: gridParams ? Math.round(gridParams.spacingX * 0.5) : 25,
        minDistance: gridParams ? Math.round(gridParams.spacingX) : 18,
        param1: 0, // 不再使用 Canny
        param2: detDebug?.avgContrast ?? 0, // 使用平均对比度代替
      },
      gridSpacing,
      // 扩展的网格信息（新字段）
      ...( gridParams && {
        gridInfo: {
          method: "grid" as const,
          spacingX: gridParams.spacingX,
          spacingY: gridParams.spacingY,
          originX: gridParams.originX,
          originY: gridParams.originY,
          rows: gridParams.rows,
          cols: gridParams.cols,
          confidence: gridParams.confidence,
          totalCells: detDebug?.totalCells ?? 0,
          occupiedCells: detDebug?.occupiedCells ?? 0,
          emptyCells: detDebug?.emptyCells ?? 0,
          avgContrast: detDebug?.avgContrast ?? 0,
          avgOccupiedContrast: detDebug?.avgOccupiedContrast ?? 0,
        },
      }),
    };
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
