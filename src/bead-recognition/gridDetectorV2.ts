/// <reference path="./cv.d.ts" />
import type { GridParameters } from "./types";

/**
 * 高精度网格检测器 V2
 *
 * 两阶段检测：
 * 1. 粗检测：使用多种方法找到可能的拼豆位置
 * 2. 精检测：基于检测结果构建精确网格
 */
export class GridDetectorV2 {
  /**
   * 主检测方法
   */
  detect(gray: cv.Mat, color: cv.Mat): GridParameters {
    const startTime = performance.now();

    // 第一阶段：粗检测 - 找到所有可能的拼豆
    const candidates = this.detectCandidates(gray, color);
    console.log(`[GridDetectorV2] 粗检测找到 ${candidates.length} 个候选点`);

    if (candidates.length < 50) {
      // 候选点太少，回退到基于投影的方法
      console.warn("[GridDetectorV2] 候选点太少，使用备用方法");
      return this.detectByProjection(gray);
    }

    // 第二阶段：从候选点推断网格参数
    const spacing = this.estimateSpacingFromCandidates(candidates);
    console.log(`[GridDetectorV2] 估算间距: ${spacing.toFixed(1)}px`);

    // 计算有效区域边界（基于候选点分布）
    const bounds = this.computeBounds(candidates, spacing);
    console.log(`[GridDetectorV2] 有效区域:`, bounds);

    // 计算网格原点和尺寸
    const origin = this.computeOrigin(candidates, spacing, bounds);
    const rows = Math.round((bounds.maxY - origin.y) / spacing) + 1;
    const cols = Math.round((bounds.maxX - origin.x) / spacing) + 1;

    const elapsedMs = performance.now() - startTime;
    console.log(`[GridDetectorV2] 完成: ${rows}x${cols} 网格, 耗时 ${elapsedMs.toFixed(0)}ms`);

    return {
      spacingX: spacing,
      spacingY: spacing,
      originX: origin.x,
      originY: origin.y,
      rows,
      cols,
      confidence: Math.min(1, candidates.length / (rows * cols * 0.5)),
    };
  }

  /**
   * 粗检测：使用多种方法找到可能的拼豆位置
   */
  private detectCandidates(gray: cv.Mat, color: cv.Mat): Array<{ x: number; y: number; score: number }> {
    const candidates: Array<{ x: number; y: number; score: number }> = [];

    // 方法1：Hough圆检测
    const houghCandidates = this.detectByHoughCircles(gray);
    candidates.push(...houghCandidates);

    // 方法2：高对比度区域检测（拼豆中心是孔洞，周围是彩色）
    const contrastCandidates = this.detectByContrast(gray);
    candidates.push(...contrastCandidates);

    // 方法3：颜色饱和度检测（彩色拼豆有高饱和度）
    const saturationCandidates = this.detectBySaturation(color);
    candidates.push(...saturationCandidates);

    // 合并相近的候选点
    return this.mergeCandidates(candidates, 8);
  }

  /**
   * Hough圆检测
   */
  private detectByHoughCircles(gray: cv.Mat): Array<{ x: number; y: number; score: number }> {
    const candidates: Array<{ x: number; y: number; score: number }> = [];
    const circlesMat = new cv.Mat();

    try {
      // 使用多组参数尝试检测
      const params = [
        { minDist: 15, param1: 100, param2: 25, minR: 6, maxR: 20 },
        { minDist: 12, param1: 80, param2: 20, minR: 5, maxR: 18 },
        { minDist: 18, param1: 120, param2: 30, minR: 8, maxR: 25 },
      ];

      for (const p of params) {
        cv.HoughCircles(
          gray,
          circlesMat,
          cv.HOUGH_GRADIENT,
          1,
          p.minDist,
          p.param1,
          p.param2,
          p.minR,
          p.maxR
        );

        const data = circlesMat.data32F;
        if (data) {
          const n = Math.floor(data.length / 3);
          for (let i = 0; i < n; i++) {
            const x = data[i * 3];
            const y = data[i * 3 + 1];
            if (Number.isFinite(x) && Number.isFinite(y)) {
              candidates.push({ x, y, score: 1.0 });
            }
          }
        }
      }
    } finally {
      circlesMat.delete();
    }

    return candidates;
  }

  /**
   * 基于局部对比度检测（拼豆特征：中心暗，周围亮）
   */
  private detectByContrast(gray: cv.Mat): Array<{ x: number; y: number; score: number }> {
    const candidates: Array<{ x: number; y: number; score: number }> = [];
    const data = gray.data;
    const cols = gray.cols;
    const rows = gray.rows;

    // 使用滑动窗口检测高对比度区域
    const windowSize = 12;
    const step = 6;

    for (let y = windowSize; y < rows - windowSize; y += step) {
      for (let x = windowSize; x < cols - windowSize; x += step) {
        const contrast = this.computeRingContrast(data, cols, rows, x, y, windowSize * 0.4, windowSize * 0.8);

        // 高对比度（中心暗，环亮）表示可能是拼豆
        if (contrast > 15) {
          candidates.push({ x, y, score: Math.min(1, contrast / 50) });
        }
      }
    }

    return candidates;
  }

  /**
   * 基于颜色饱和度检测（彩色拼豆有高饱和度）
   */
  private detectBySaturation(color: cv.Mat): Array<{ x: number; y: number; score: number }> {
    const candidates: Array<{ x: number; y: number; score: number }> = [];

    // 转换到HSV空间
    const hsv = new cv.Mat();
    try {
      cv.cvtColor(color, hsv, cv.COLOR_RGBA2RGB);
      const rgb = hsv.clone();
      cv.cvtColor(rgb, hsv, cv.COLOR_RGB2HSV);
      rgb.delete();

      const data = hsv.data;
      const cols = hsv.cols;
      const rows = hsv.rows;

      // 检测高饱和度区域
      const windowSize = 10;
      const step = 8;

      for (let y = windowSize; y < rows - windowSize; y += step) {
        for (let x = windowSize; x < cols - windowSize; x += step) {
          let satSum = 0;
          let count = 0;

          for (let dy = -3; dy <= 3; dy++) {
            for (let dx = -3; dx <= 3; dx++) {
              const idx = ((y + dy) * cols + (x + dx)) * 3;
              satSum += data[idx + 1] ?? 0; // S通道
              count++;
            }
          }

          const avgSat = satSum / count;
          if (avgSat > 50) { // 高饱和度
            candidates.push({ x, y, score: Math.min(1, avgSat / 150) });
          }
        }
      }
    } finally {
      hsv.delete();
    }

    return candidates;
  }

  /**
   * 计算环形对比度
   */
  private computeRingContrast(
    data: Uint8Array,
    cols: number,
    rows: number,
    cx: number,
    cy: number,
    innerR: number,
    outerR: number
  ): number {
    let centerSum = 0, centerN = 0;
    let ringSum = 0, ringN = 0;

    const r = Math.ceil(outerR);
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
        } else if (d <= outerR) {
          ringSum += val;
          ringN++;
        }
      }
    }

    const centerMean = centerN > 0 ? centerSum / centerN : 128;
    const ringMean = ringN > 0 ? ringSum / ringN : 128;

    return ringMean - centerMean;
  }

  /**
   * 合并相近的候选点
   */
  private mergeCandidates(
    candidates: Array<{ x: number; y: number; score: number }>,
    minDist: number
  ): Array<{ x: number; y: number; score: number }> {
    if (candidates.length === 0) return [];

    // 按分数排序
    const sorted = [...candidates].sort((a, b) => b.score - a.score);
    const merged: Array<{ x: number; y: number; score: number }> = [];

    for (const c of sorted) {
      let tooClose = false;
      for (const m of merged) {
        const d = Math.hypot(c.x - m.x, c.y - m.y);
        if (d < minDist) {
          tooClose = true;
          break;
        }
      }
      if (!tooClose) {
        merged.push(c);
      }
    }

    return merged;
  }

  /**
   * 从候选点估算网格间距
   */
  private estimateSpacingFromCandidates(
    candidates: Array<{ x: number; y: number }>
  ): number {
    if (candidates.length < 2) return 20;

    // 计算每个点到最近邻的距离
    const nearestDistances: number[] = [];

    for (let i = 0; i < candidates.length; i++) {
      let minDist = Infinity;
      for (let j = 0; j < candidates.length; j++) {
        if (i === j) continue;
        const d = Math.hypot(
          candidates[i].x - candidates[j].x,
          candidates[i].y - candidates[j].y
        );
        if (d < minDist) minDist = d;
      }
      if (Number.isFinite(minDist) && minDist > 5) {
        nearestDistances.push(minDist);
      }
    }

    if (nearestDistances.length === 0) return 20;

    // 使用中位数作为间距估计（更鲁棒）
    nearestDistances.sort((a, b) => a - b);
    const mid = Math.floor(nearestDistances.length / 2);
    const median = nearestDistances.length % 2
      ? nearestDistances[mid]
      : (nearestDistances[mid - 1] + nearestDistances[mid]) / 2;

    return Math.max(10, Math.min(40, median));
  }

  /**
   * 计算有效区域边界（使用密度分析排除稀疏边缘）
   */
  private computeBounds(
    candidates: Array<{ x: number; y: number }>,
    spacing: number
  ): { minX: number; maxX: number; minY: number; maxY: number } {
    if (candidates.length === 0) {
      return { minX: 0, maxX: 100, minY: 0, maxY: 100 };
    }

    // 使用密度过滤：只保留周围有足够邻居的点
    const denseCandidates = candidates.filter(c => {
      let neighbors = 0;
      for (const other of candidates) {
        const d = Math.hypot(c.x - other.x, c.y - other.y);
        if (d > 0 && d < spacing * 1.8) neighbors++;
      }
      return neighbors >= 3; // 至少有3个近邻（更严格）
    });

    console.log(`[GridDetectorV2] 密度过滤: ${candidates.length} -> ${denseCandidates.length} 个点`);

    // 如果过滤后太少，放宽条件
    let points = denseCandidates;
    if (denseCandidates.length < candidates.length * 0.3) {
      points = candidates.filter(c => {
        let neighbors = 0;
        for (const other of candidates) {
          const d = Math.hypot(c.x - other.x, c.y - other.y);
          if (d > 0 && d < spacing * 2) neighbors++;
        }
        return neighbors >= 2;
      });
    }

    if (points.length < 10) {
      points = candidates;
    }

    // 使用百分位数而不是极值，排除离群点
    const xs = points.map(c => c.x).sort((a, b) => a - b);
    const ys = points.map(c => c.y).sort((a, b) => a - b);

    // 使用5%和95%百分位数
    const p5 = Math.floor(points.length * 0.03);
    const p95 = Math.floor(points.length * 0.97);

    const minX = xs[p5] ?? xs[0];
    const maxX = xs[p95] ?? xs[xs.length - 1];
    const minY = ys[p5] ?? ys[0];
    const maxY = ys[p95] ?? ys[ys.length - 1];

    // 适当留一点边距（半个间距）
    const margin = spacing * 0.3;
    return {
      minX: minX - margin,
      maxX: maxX + margin,
      minY: minY - margin,
      maxY: maxY + margin,
    };
  }

  /**
   * 计算网格原点
   */
  private computeOrigin(
    candidates: Array<{ x: number; y: number }>,
    spacing: number,
    bounds: { minX: number; maxX: number; minY: number; maxY: number }
  ): { x: number; y: number } {
    // 找到最靠近左上角的候选点
    let best = { x: bounds.minX, y: bounds.minY };
    let bestScore = Infinity;

    for (const c of candidates) {
      if (c.x < bounds.minX + spacing * 2 && c.y < bounds.minY + spacing * 2) {
        const score = c.x + c.y; // 距离左上角的曼哈顿距离
        if (score < bestScore) {
          bestScore = score;
          best = { x: c.x, y: c.y };
        }
      }
    }

    // 调整原点使其对齐网格
    return {
      x: best.x,
      y: best.y,
    };
  }

  /**
   * 备用方法：基于投影的间距检测
   */
  private detectByProjection(gray: cv.Mat): GridParameters {
    const cols = gray.cols;
    const rows = gray.rows;
    const data = gray.data;

    // 计算列投影
    const colProj = new Float32Array(cols);
    for (let x = 0; x < cols; x++) {
      let sum = 0;
      for (let y = 0; y < rows; y++) {
        sum += data[y * cols + x] ?? 0;
      }
      colProj[x] = sum;
    }

    // 归一化
    const mean = colProj.reduce((a, b) => a + b, 0) / cols;
    for (let i = 0; i < cols; i++) {
      colProj[i] -= mean;
    }

    // 自相关找周期
    const spacing = this.findPeriodByAutocorrelation(colProj, 12, 40);

    return {
      spacingX: spacing,
      spacingY: spacing,
      originX: spacing / 2,
      originY: spacing / 2,
      rows: Math.floor((rows - spacing) / spacing),
      cols: Math.floor((cols - spacing) / spacing),
      confidence: 0.5,
    };
  }

  /**
   * 自相关找周期
   */
  private findPeriodByAutocorrelation(
    signal: Float32Array,
    minPeriod: number,
    maxPeriod: number
  ): number {
    const n = signal.length;
    let bestLag = (minPeriod + maxPeriod) / 2;
    let bestValue = 0;

    for (let lag = minPeriod; lag <= Math.min(maxPeriod, n / 2); lag++) {
      let sum = 0;
      for (let i = 0; i < n - lag; i++) {
        sum += signal[i] * signal[i + lag];
      }

      // 找局部最大值
      if (sum > bestValue) {
        bestValue = sum;
        bestLag = lag;
      }
    }

    return bestLag;
  }
}
