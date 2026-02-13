/// <reference path="./cv.d.ts" />
import type { GridParameters, CellAnalysis } from "./types";

/**
 * 高精度格子分析器 V2
 *
 * 使用多特征融合判断每个格子是否有拼豆：
 * 1. 亮度对比度（中心暗、环亮）
 * 2. 颜色饱和度（彩色拼豆有高饱和度）
 * 3. 边缘密度（拼豆有圆形边缘）
 */
export class GridAnalyzerV2 {
  private contrastThreshold: number;
  private saturationThreshold: number;

  constructor(options?: { contrastThreshold?: number; saturationThreshold?: number }) {
    this.contrastThreshold = options?.contrastThreshold ?? 6;
    this.saturationThreshold = options?.saturationThreshold ?? 30;
  }

  /**
   * 分析整个网格
   */
  analyzeGrid(gray: cv.Mat, color: cv.Mat, grid: GridParameters): CellAnalysis[] {
    const grayData = gray.data;
    const grayCols = gray.cols;
    const grayRows = gray.rows;

    // 转换到HSV获取饱和度
    const hsv = new cv.Mat();
    let hsvData: Uint8Array | null = null;
    try {
      cv.cvtColor(color, hsv, cv.COLOR_RGBA2RGB);
      const rgb = hsv.clone();
      cv.cvtColor(rgb, hsv, cv.COLOR_RGB2HSV);
      rgb.delete();
      hsvData = hsv.data;
    } catch {
      console.warn("[GridAnalyzerV2] HSV转换失败，仅使用亮度判断");
    }

    const radius = grid.spacingX / 2;

    // 先分析所有格子
    const allAnalysis: Array<CellAnalysis & { features: CellFeatures }> = [];

    for (let row = 0; row < grid.rows; row++) {
      for (let col = 0; col < grid.cols; col++) {
        const centerX = grid.originX + col * grid.spacingX;
        const centerY = grid.originY + row * grid.spacingY;

        // 边界检查
        if (
          centerX - radius < 0 ||
          centerX + radius >= grayCols ||
          centerY - radius < 0 ||
          centerY + radius >= grayRows
        ) {
          continue;
        }

        const features = this.extractFeatures(
          grayData,
          hsvData,
          grayCols,
          grayRows,
          centerX,
          centerY,
          radius
        );

        allAnalysis.push({
          row,
          col,
          centerX,
          centerY,
          isOccupied: false, // 稍后计算
          confidence: 0,
          centerMean: features.centerMean,
          ringMean: features.ringMean,
          contrast: features.contrast,
          features,
        });
      }
    }

    // 使用自适应阈值判断占用
    const result = this.classifyWithAdaptiveThreshold(allAnalysis);

    // 后处理：去除孤立的噪点
    const cleaned = this.postProcess(result, grid.rows, grid.cols);

    hsv.delete();
    return cleaned;
  }

  /**
   * 提取格子的多种特征
   */
  private extractFeatures(
    grayData: Uint8Array,
    hsvData: Uint8Array | null,
    cols: number,
    rows: number,
    cx: number,
    cy: number,
    radius: number
  ): CellFeatures {
    const icx = Math.round(cx);
    const icy = Math.round(cy);

    // 亮度特征
    const innerR = radius * 0.35;
    const ringR1 = radius * 0.45;
    const ringR2 = radius * 0.9;

    let centerSum = 0, centerN = 0;
    let ringSum = 0, ringN = 0;
    let saturationSum = 0, satN = 0;
    let edgeCount = 0;

    const r = Math.ceil(radius);
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const x = icx + dx;
        const y = icy + dy;
        if (x < 0 || x >= cols || y < 0 || y >= rows) continue;

        const d = Math.sqrt(dx * dx + dy * dy);
        const grayVal = grayData[y * cols + x] ?? 0;

        if (d <= innerR) {
          centerSum += grayVal;
          centerN++;
        } else if (d >= ringR1 && d <= ringR2) {
          ringSum += grayVal;
          ringN++;

          // 边缘检测（简单梯度）
          if (x > 0 && x < cols - 1 && y > 0 && y < rows - 1) {
            const gx = Math.abs(
              (grayData[y * cols + x + 1] ?? 0) - (grayData[y * cols + x - 1] ?? 0)
            );
            const gy = Math.abs(
              (grayData[(y + 1) * cols + x] ?? 0) - (grayData[(y - 1) * cols + x] ?? 0)
            );
            if (gx + gy > 30) edgeCount++;
          }
        }

        // 饱和度（HSV的S通道）
        if (hsvData && d >= ringR1 && d <= ringR2) {
          const idx = (y * cols + x) * 3;
          saturationSum += hsvData[idx + 1] ?? 0;
          satN++;
        }
      }
    }

    const centerMean = centerN > 0 ? centerSum / centerN : 128;
    const ringMean = ringN > 0 ? ringSum / ringN : 128;
    const contrast = ringMean - centerMean;
    const saturation = satN > 0 ? saturationSum / satN : 0;
    const edgeDensity = ringN > 0 ? edgeCount / ringN : 0;

    return {
      centerMean,
      ringMean,
      contrast,
      saturation,
      edgeDensity,
    };
  }

  /**
   * 使用自适应阈值分类
   */
  private classifyWithAdaptiveThreshold(
    cells: Array<CellAnalysis & { features: CellFeatures }>
  ): CellAnalysis[] {
    if (cells.length === 0) return [];

    // 计算特征统计
    const contrasts = cells.map(c => c.features.contrast);
    const saturations = cells.map(c => c.features.saturation);

    // 使用Otsu方法找最佳阈值
    const contrastThreshold = this.findOtsuThreshold(contrasts) || this.contrastThreshold;
    const satThreshold = this.findOtsuThreshold(saturations) || this.saturationThreshold;

    // 计算对比度的标准差，用于动态调整阈值
    const avgContrast = contrasts.reduce((a, b) => a + b, 0) / contrasts.length;
    const contrastStd = Math.sqrt(
      contrasts.reduce((sum, c) => sum + (c - avgContrast) ** 2, 0) / contrasts.length
    );

    // 使用更高的阈值来减少误检
    const effectiveContrastThreshold = Math.max(
      contrastThreshold,
      avgContrast + contrastStd * 0.5
    );

    console.log(`[GridAnalyzerV2] 自适应阈值: contrast=${effectiveContrastThreshold.toFixed(1)} (otsu=${contrastThreshold.toFixed(1)}, avg=${avgContrast.toFixed(1)}, std=${contrastStd.toFixed(1)}), saturation=${satThreshold.toFixed(1)}`);

    return cells.map(cell => {
      const f = cell.features;

      // 多特征融合判断
      // 1. 对比度得分（最重要）- 使用更严格的阈值
      const contrastScore = Math.max(0, Math.min(1, f.contrast / (effectiveContrastThreshold * 1.5)));

      // 2. 饱和度得分（彩色拼豆）
      const satScore = Math.max(0, Math.min(1, f.saturation / (satThreshold * 1.5)));

      // 3. 边缘得分
      const edgeScore = Math.min(1, f.edgeDensity * 8);

      // 综合得分（对比度权重最高）
      const score = contrastScore * 0.6 + satScore * 0.25 + edgeScore * 0.15;

      // 判断是否有拼豆 - 使用更严格的条件
      // 必须满足：对比度足够高，或者对比度中等但饱和度高
      const isOccupied = (
        f.contrast > effectiveContrastThreshold ||
        (f.contrast > effectiveContrastThreshold * 0.6 && f.saturation > satThreshold * 0.8)
      );

      return {
        row: cell.row,
        col: cell.col,
        centerX: cell.centerX,
        centerY: cell.centerY,
        isOccupied,
        confidence: score,
        centerMean: f.centerMean,
        ringMean: f.ringMean,
        contrast: f.contrast,
      };
    });
  }

  /**
   * 简化的Otsu阈值查找
   */
  private findOtsuThreshold(values: number[]): number {
    if (values.length === 0) return 0;

    const min = Math.min(...values);
    const max = Math.max(...values);
    if (max - min < 1) return (min + max) / 2;

    // 创建直方图
    const bins = 50;
    const hist = new Array(bins).fill(0);
    for (const v of values) {
      const bin = Math.min(bins - 1, Math.floor((v - min) / (max - min) * bins));
      hist[bin]++;
    }

    // 找最大类间方差
    let bestThreshold = (min + max) / 2;
    let maxVariance = 0;

    const total = values.length;
    let sum = 0;
    for (let i = 0; i < bins; i++) {
      sum += (min + (i + 0.5) * (max - min) / bins) * hist[i];
    }

    let sumB = 0;
    let wB = 0;

    for (let i = 0; i < bins; i++) {
      wB += hist[i];
      if (wB === 0) continue;

      const wF = total - wB;
      if (wF === 0) break;

      sumB += (min + (i + 0.5) * (max - min) / bins) * hist[i];
      const mB = sumB / wB;
      const mF = (sum - sumB) / wF;

      const variance = wB * wF * (mB - mF) * (mB - mF);
      if (variance > maxVariance) {
        maxVariance = variance;
        bestThreshold = min + (i + 1) * (max - min) / bins;
      }
    }

    return bestThreshold;
  }

  /**
   * 后处理：去除孤立噪点，填充小空洞
   */
  private postProcess(cells: CellAnalysis[], _rows: number, _cols: number): CellAnalysis[] {
    // 创建网格映射
    const grid = new Map<string, CellAnalysis>();
    for (const cell of cells) {
      grid.set(`${cell.row},${cell.col}`, cell);
    }

    // 检查邻居
    const getNeighborCount = (row: number, col: number): number => {
      let count = 0;
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const neighbor = grid.get(`${row + dr},${col + dc}`);
        if (neighbor?.isOccupied) count++;
      }
      return count;
    };

    // 检查8邻域
    const get8NeighborCount = (row: number, col: number): number => {
      let count = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const neighbor = grid.get(`${row + dr},${col + dc}`);
          if (neighbor?.isOccupied) count++;
        }
      }
      return count;
    };

    // 第一遍：严格去除孤立噪点
    for (const cell of cells) {
      if (cell.isOccupied) {
        const neighbors4 = getNeighborCount(cell.row, cell.col);
        const neighbors8 = get8NeighborCount(cell.row, cell.col);

        // 如果4邻域完全没有拼豆，且8邻域少于2个，肯定是噪点
        if (neighbors4 === 0 && neighbors8 < 2) {
          cell.isOccupied = false;
          cell.confidence = 0;
        }
        // 如果4邻域只有1个拼豆，且置信度低，也可能是噪点
        else if (neighbors4 <= 1 && cell.confidence < 0.4) {
          cell.isOccupied = false;
          cell.confidence = 0;
        }
      }
    }

    // 第二遍：填充被完全包围的空洞
    for (const cell of cells) {
      if (!cell.isOccupied) {
        const neighbors4 = getNeighborCount(cell.row, cell.col);
        // 如果被4个拼豆完全包围，且对比度为正，填充
        if (neighbors4 === 4 && cell.contrast > 3) {
          cell.isOccupied = true;
          cell.confidence = 0.5;
        }
      }
    }

    return cells;
  }

  /**
   * 获取统计信息
   */
  static getStats(cells: CellAnalysis[]): {
    total: number;
    occupied: number;
    empty: number;
    avgContrast: number;
    avgOccupiedContrast: number;
  } {
    const occupied = cells.filter(c => c.isOccupied);
    const avgContrast = cells.length > 0
      ? cells.reduce((sum, c) => sum + c.contrast, 0) / cells.length
      : 0;
    const avgOccupiedContrast = occupied.length > 0
      ? occupied.reduce((sum, c) => sum + c.contrast, 0) / occupied.length
      : 0;

    return {
      total: cells.length,
      occupied: occupied.length,
      empty: cells.length - occupied.length,
      avgContrast,
      avgOccupiedContrast,
    };
  }
}

interface CellFeatures {
  centerMean: number;
  ringMean: number;
  contrast: number;
  saturation: number;
  edgeDensity: number;
}
