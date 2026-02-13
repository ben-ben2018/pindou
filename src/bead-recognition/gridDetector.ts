/// <reference path="./cv.d.ts" />
import type { GridDetectorConfig, GridParameters } from "./types";

const DEFAULT_CONFIG: GridDetectorConfig = {
  minSpacing: 12,
  maxSpacing: 50,
  originSearchStep: 2,
};

/**
 * 网格参数检测器
 * 利用拼豆板的规则网格结构，通过自相关分析检测网格间距和原点
 */
export class GridDetector {
  private config: GridDetectorConfig;

  constructor(config: Partial<GridDetectorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 主入口：从灰度图检测网格参数
   */
  detect(gray: cv.Mat): GridParameters {
    const { cols, rows } = gray;

    // 1. 检测间距（使用自相关）
    const spacingX = this.detectSpacingByProjection(gray, "horizontal");
    const spacingY = this.detectSpacingByProjection(gray, "vertical");

    // 使用平均间距（拼豆板通常是正方形网格）
    const spacing = (spacingX + spacingY) / 2;

    console.log("[GridDetector] 检测到间距:", { spacingX, spacingY, avgSpacing: spacing });

    // 2. 检测原点
    const origin = this.detectOrigin(gray, spacing);
    console.log("[GridDetector] 检测到原点:", origin);

    // 3. 计算行列数
    const gridCols = Math.floor((cols - origin.x) / spacing);
    const gridRows = Math.floor((rows - origin.y) / spacing);

    // 4. 计算置信度（基于间距检测的一致性）
    const spacingDiff = Math.abs(spacingX - spacingY) / spacing;
    const confidence = Math.max(0, 1 - spacingDiff * 2);

    return {
      spacingX: spacing,
      spacingY: spacing,
      originX: origin.x,
      originY: origin.y,
      rows: gridRows,
      cols: gridCols,
      confidence,
    };
  }

  /**
   * 使用投影自相关检测间距
   * @param direction "horizontal" 检测列间距，"vertical" 检测行间距
   */
  private detectSpacingByProjection(
    gray: cv.Mat,
    direction: "horizontal" | "vertical"
  ): number {
    const data = gray.data;
    const cols = gray.cols;
    const rows = gray.rows;

    // 计算投影
    const projLength = direction === "horizontal" ? cols : rows;
    const projection = new Float32Array(projLength);

    if (direction === "horizontal") {
      // 列投影：每列求和
      for (let x = 0; x < cols; x++) {
        let sum = 0;
        for (let y = 0; y < rows; y++) {
          sum += data[y * cols + x] ?? 0;
        }
        projection[x] = sum;
      }
    } else {
      // 行投影：每行求和
      for (let y = 0; y < rows; y++) {
        let sum = 0;
        for (let x = 0; x < cols; x++) {
          sum += data[y * cols + x] ?? 0;
        }
        projection[y] = sum;
      }
    }

    // 归一化投影
    const mean =
      projection.reduce((a, b) => a + b, 0) / projection.length;
    for (let i = 0; i < projection.length; i++) {
      projection[i] -= mean;
    }

    // 计算自相关
    const autocorr = this.computeAutocorrelation(projection);

    // 在指定范围内找第一个显著峰值
    const spacing = this.findFirstPeak(
      autocorr,
      this.config.minSpacing,
      this.config.maxSpacing
    );

    return spacing;
  }

  /**
   * 计算自相关
   */
  private computeAutocorrelation(signal: Float32Array): Float32Array {
    const n = signal.length;
    const maxLag = Math.min(n, this.config.maxSpacing * 2);
    const autocorr = new Float32Array(maxLag);

    for (let lag = 0; lag < maxLag; lag++) {
      let sum = 0;
      for (let i = 0; i < n - lag; i++) {
        sum += signal[i] * signal[i + lag];
      }
      autocorr[lag] = sum;
    }

    // 归一化（除以 lag=0 的值）
    const norm = autocorr[0] || 1;
    for (let i = 0; i < maxLag; i++) {
      autocorr[i] /= norm;
    }

    return autocorr;
  }

  /**
   * 在自相关结果中找第一个峰值
   */
  private findFirstPeak(
    autocorr: Float32Array,
    minLag: number,
    maxLag: number
  ): number {
    const searchMax = Math.min(maxLag, autocorr.length - 2);
    let bestLag = (minLag + maxLag) / 2; // 默认值
    let bestValue = 0;

    // 先找全局最大峰
    for (let lag = minLag; lag <= searchMax; lag++) {
      const prev = autocorr[lag - 1] ?? 0;
      const curr = autocorr[lag] ?? 0;
      const next = autocorr[lag + 1] ?? 0;

      // 是否是局部最大值
      if (curr > prev && curr > next && curr > bestValue) {
        bestValue = curr;
        bestLag = lag;
      }
    }

    // 如果没找到明显峰值，尝试用梯度方法
    if (bestValue < 0.1) {
      return this.findSpacingByGradient(autocorr, minLag, maxLag);
    }

    return bestLag;
  }

  /**
   * 备用方法：使用梯度变化检测间距
   */
  private findSpacingByGradient(
    autocorr: Float32Array,
    minLag: number,
    maxLag: number
  ): number {
    const searchMax = Math.min(maxLag, autocorr.length - 2);

    // 找从下降转为上升的点（谷底之后的上升）
    for (let lag = minLag; lag <= searchMax - 1; lag++) {
      const prev = autocorr[lag - 1] ?? 0;
      const curr = autocorr[lag] ?? 0;
      const next = autocorr[lag + 1] ?? 0;

      // 谷底检测
      if (curr < prev && curr < next) {
        // 从谷底开始找下一个峰
        for (let lag2 = lag + 1; lag2 <= searchMax; lag2++) {
          const p = autocorr[lag2 - 1] ?? 0;
          const c = autocorr[lag2] ?? 0;
          const n = autocorr[lag2 + 1] ?? 0;
          if (c > p && c > n) {
            return lag2;
          }
        }
      }
    }

    // 最后的备用：返回范围中点
    return (minLag + maxLag) / 2;
  }

  /**
   * 检测网格原点（使第一个格子中心位于 (originX, originY)）
   */
  private detectOrigin(
    gray: cv.Mat,
    spacing: number
  ): { x: number; y: number } {
    const data = gray.data;
    const cols = gray.cols;
    const rows = gray.rows;
    const step = this.config.originSearchStep;
    const radius = spacing * 0.45;

    let bestOrigin = { x: spacing / 2, y: spacing / 2 };
    let bestScore = -Infinity;

    // 在一个网格周期内搜索最佳原点
    for (let oy = radius; oy < spacing; oy += step) {
      for (let ox = radius; ox < spacing; ox += step) {
        let totalScore = 0;
        let count = 0;

        // 计算该原点下所有格子的对比度总分
        for (let gy = oy; gy < rows - radius; gy += spacing) {
          for (let gx = ox; gx < cols - radius; gx += spacing) {
            const contrast = this.computeLocalContrast(
              data,
              cols,
              rows,
              Math.round(gx),
              Math.round(gy),
              radius
            );
            totalScore += Math.abs(contrast); // 使用绝对值，因为有豆和空位都有特征
            count++;
          }
        }

        const avgScore = count > 0 ? totalScore / count : 0;
        if (avgScore > bestScore) {
          bestScore = avgScore;
          bestOrigin = { x: ox, y: oy };
        }
      }
    }

    return bestOrigin;
  }

  /**
   * 计算局部对比度（环形区域亮度 - 中心区域亮度）
   */
  private computeLocalContrast(
    data: Uint8Array,
    cols: number,
    rows: number,
    cx: number,
    cy: number,
    radius: number
  ): number {
    const innerR = radius * 0.4;
    const ringR1 = radius * 0.5;
    const ringR2 = radius * 0.95;

    let centerSum = 0;
    let centerN = 0;
    let ringSum = 0;
    let ringN = 0;

    const r = Math.ceil(radius);
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || x >= cols || y < 0 || y >= rows) continue;

        const d = Math.sqrt(dx * dx + dy * dy);
        const val = data[y * cols + x] ?? 0;

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

    return ringMean - centerMean;
  }
}
