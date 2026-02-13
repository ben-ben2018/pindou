/// <reference path="./cv.d.ts" />
import type {
  GridAnalyzerConfig,
  GridParameters,
  CellAnalysis,
} from "./types";

const DEFAULT_CONFIG: GridAnalyzerConfig = {
  innerRadiusRatio: 0.35,
  ringInnerRatio: 0.5,
  ringOuterRatio: 0.9,
  contrastThreshold: 8,
};

/**
 * 网格分析器
 * 分析每个网格位置是否有拼豆（基于环形-中心对比度）
 */
export class GridAnalyzer {
  private config: GridAnalyzerConfig;

  constructor(config: Partial<GridAnalyzerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 分析整个网格，返回所有格子的分析结果
   */
  analyzeGrid(gray: cv.Mat, grid: GridParameters): CellAnalysis[] {
    const results: CellAnalysis[] = [];
    const data = gray.data;
    const cols = gray.cols;
    const rows = gray.rows;
    const radius = (grid.spacingX + grid.spacingY) / 4; // 间距的一半作为采样半径

    for (let row = 0; row < grid.rows; row++) {
      for (let col = 0; col < grid.cols; col++) {
        const centerX = grid.originX + col * grid.spacingX;
        const centerY = grid.originY + row * grid.spacingY;

        // 边界检查
        if (
          centerX - radius < 0 ||
          centerX + radius >= cols ||
          centerY - radius < 0 ||
          centerY + radius >= rows
        ) {
          continue;
        }

        const analysis = this.analyzeCell(
          data,
          cols,
          rows,
          centerX,
          centerY,
          radius,
          row,
          col
        );
        results.push(analysis);
      }
    }

    return results;
  }

  /**
   * 分析单个格子
   */
  private analyzeCell(
    data: Uint8Array,
    imageCols: number,
    imageRows: number,
    centerX: number,
    centerY: number,
    radius: number,
    row: number,
    col: number
  ): CellAnalysis {
    const cx = Math.round(centerX);
    const cy = Math.round(centerY);

    // 计算各区域的亮度
    const innerR = radius * this.config.innerRadiusRatio;
    const ringR1 = radius * this.config.ringInnerRatio;
    const ringR2 = radius * this.config.ringOuterRatio;

    let centerSum = 0;
    let centerN = 0;
    let ringSum = 0;
    let ringN = 0;

    const r = Math.ceil(radius);
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || x >= imageCols || y < 0 || y >= imageRows) continue;

        const d = Math.sqrt(dx * dx + dy * dy);
        const val = data[y * imageCols + x] ?? 0;

        if (d <= innerR) {
          centerSum += val;
          centerN++;
        } else if (d >= ringR1 && d <= ringR2) {
          ringSum += val;
          ringN++;
        }
      }
    }

    const centerMean = centerN > 0 ? centerSum / centerN : 128;
    const ringMean = ringN > 0 ? ringSum / ringN : 128;
    const contrast = ringMean - centerMean;

    // 判断是否有拼豆
    // 有拼豆的特征：外环亮（彩色塑料），中心暗（孔洞露出底板）
    // 空位的特征：整体均匀灰色，对比度低
    const isOccupied = contrast > this.config.contrastThreshold;

    // 计算置信度
    const confidence = this.computeConfidence(contrast, isOccupied);

    return {
      row,
      col,
      centerX,
      centerY,
      isOccupied,
      confidence,
      centerMean,
      ringMean,
      contrast,
    };
  }

  /**
   * 计算占用判断的置信度
   */
  private computeConfidence(contrast: number, isOccupied: boolean): number {
    const threshold = this.config.contrastThreshold;

    if (isOccupied) {
      // 有拼豆：对比度越高置信度越高
      // contrast 在 threshold~30 范围内映射到 0.5~1.0
      const normalized = Math.min(1, (contrast - threshold) / 22);
      return 0.5 + normalized * 0.5;
    } else {
      // 空位：对比度越低置信度越高
      // contrast 在 0~threshold 范围内，越接近 0 置信度越高
      const normalized = Math.max(0, 1 - contrast / threshold);
      return 0.5 + normalized * 0.5;
    }
  }

  /**
   * 获取分析统计信息
   */
  static getStats(cells: CellAnalysis[]): {
    total: number;
    occupied: number;
    empty: number;
    avgContrast: number;
    avgOccupiedContrast: number;
  } {
    const occupied = cells.filter((c) => c.isOccupied);
    const empty = cells.filter((c) => !c.isOccupied);

    const avgContrast =
      cells.length > 0
        ? cells.reduce((sum, c) => sum + c.contrast, 0) / cells.length
        : 0;

    const avgOccupiedContrast =
      occupied.length > 0
        ? occupied.reduce((sum, c) => sum + c.contrast, 0) / occupied.length
        : 0;

    return {
      total: cells.length,
      occupied: occupied.length,
      empty: empty.length,
      avgContrast,
      avgOccupiedContrast,
    };
  }
}
