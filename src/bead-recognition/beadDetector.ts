/// <reference path="./cv.d.ts" />
import type {
  BeadPosition,
  GridParameters,
  CellAnalysis,
} from "./types";
import { GridDetectorV2 } from "./gridDetectorV2";
import { GridAnalyzerV2 } from "./gridAnalyzerV2";

/**
 * 新版调试信息
 */
export interface BeadDetectorDebug {
  method: "grid";
  imageWidth: number;
  imageHeight: number;
  gridParams?: GridParameters;
  totalCells: number;
  occupiedCells: number;
  emptyCells: number;
  avgContrast: number;
  avgOccupiedContrast: number;
}

/**
 * 拼豆检测器 V2
 *
 * 两阶段高精度检测：
 * 1. GridDetectorV2：使用多种方法（Hough圆+对比度+饱和度）找候选点，推断网格参数
 * 2. GridAnalyzerV2：多特征融合判断每个格子是否有拼豆
 */
export class BeadDetector {
  private gridDetector: GridDetectorV2;
  private gridAnalyzer: GridAnalyzerV2;
  private lastDebug: BeadDetectorDebug | null = null;
  private lastGridParams: GridParameters | null = null;
  private lastCellAnalysis: CellAnalysis[] | null = null;

  constructor() {
    this.gridDetector = new GridDetectorV2();
    this.gridAnalyzer = new GridAnalyzerV2();
  }

  getLastDebug(): BeadDetectorDebug | null {
    return this.lastDebug;
  }

  getGridParameters(): GridParameters | null {
    return this.lastGridParams;
  }

  getCellAnalysis(): CellAnalysis[] | null {
    return this.lastCellAnalysis;
  }

  /**
   * 从 ImageData 检测拼豆位置
   */
  async detect(imageData: ImageData): Promise<BeadPosition[]> {
    this.lastDebug = null;
    this.lastGridParams = null;
    this.lastCellAnalysis = null;

    if (typeof cv === "undefined") {
      throw new Error("OpenCV.js 未加载");
    }

    const src = cv.matFromImageData(imageData);
    const gray = new cv.Mat();

    try {
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

      const startTime = performance.now();

      // 第一阶段：检测网格参数（使用彩色图像辅助）
      console.log("[BeadDetector] 开始网格检测...");
      const gridParams = this.gridDetector.detect(gray, src);
      this.lastGridParams = gridParams;

      console.log("[BeadDetector] 网格参数:", {
        spacing: gridParams.spacingX.toFixed(1),
        origin: `(${gridParams.originX.toFixed(1)}, ${gridParams.originY.toFixed(1)})`,
        size: `${gridParams.rows}x${gridParams.cols}`,
        confidence: gridParams.confidence.toFixed(2),
      });

      // 第二阶段：分析每个格子（使用灰度+彩色）
      console.log("[BeadDetector] 开始格子分析...");
      const cellAnalysis = this.gridAnalyzer.analyzeGrid(gray, src, gridParams);
      this.lastCellAnalysis = cellAnalysis;

      // 统计
      const occupiedCells = cellAnalysis.filter(c => c.isOccupied);
      const stats = GridAnalyzerV2.getStats(cellAnalysis);

      const elapsedMs = performance.now() - startTime;
      console.log("[BeadDetector] 检测完成:", {
        totalCells: cellAnalysis.length,
        occupied: occupiedCells.length,
        empty: stats.empty,
        avgContrast: stats.avgContrast.toFixed(1),
        avgOccupiedContrast: stats.avgOccupiedContrast.toFixed(1),
        elapsedMs: elapsedMs.toFixed(0),
      });

      // 保存调试信息
      this.lastDebug = {
        method: "grid",
        imageWidth: imageData.width,
        imageHeight: imageData.height,
        gridParams,
        totalCells: cellAnalysis.length,
        occupiedCells: occupiedCells.length,
        emptyCells: stats.empty,
        avgContrast: stats.avgContrast,
        avgOccupiedContrast: stats.avgOccupiedContrast,
      };

      // 转换为 BeadPosition 格式
      const radius = gridParams.spacingX / 2;
      return occupiedCells.map(cell => ({
        x: cell.centerX,
        y: cell.centerY,
        radius,
        confidence: cell.confidence,
      }));
    } finally {
      src.delete();
      gray.delete();
    }
  }

  /**
   * 获取格子的网格坐标
   */
  getOccupiedGridCoordinates(): Array<{
    row: number;
    col: number;
    centerX: number;
    centerY: number;
    confidence: number;
  }> {
    if (!this.lastCellAnalysis) return [];

    return this.lastCellAnalysis
      .filter(c => c.isOccupied)
      .map(c => ({
        row: c.row,
        col: c.col,
        centerX: c.centerX,
        centerY: c.centerY,
        confidence: c.confidence,
      }));
  }
}
