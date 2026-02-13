/// <reference path="./cv.d.ts" />
import type { BeadPosition, ColorConfig, RecognizedColor } from "./types";
import { rgbToHex, rgbToLab } from "./colorUtils";
import type { ColorDatabase } from "./colorDatabase";
import type { ClusterResult } from "./types";

const DEFAULT_CONFIG: ColorConfig = {
  kClusters: 3,
  maxIterations: 50,
  epsilon: 0.001,
};

/**
 * 颜色识别器
 * 从图像 ROI 提取主色，K-means 聚类后与色卡匹配
 * 增强版：使用环形 ROI，排除中心孔洞区域
 */
export class ColorRecognizer {
  private config: ColorConfig;

  constructor(config: Partial<ColorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 识别单颗拼豆颜色
   */
  recognize(
    image: cv.Mat,
    bead: BeadPosition,
    database: ColorDatabase
  ): RecognizedColor {
    // 使用环形 ROI 提取颜色（排除中心孔洞）
    const ringPixels = this.extractRingPixels(image, bead);

    let best: ClusterResult | null = null;
    try {
      if (ringPixels.length === 0) {
        // 如果环形提取失败，回退到矩形 ROI
        const roi = this.extractROI(image, bead);
        try {
          for (let attempt = 0; attempt < 5; attempt++) {
            const result = this.kmeansCluster(roi, this.config.kClusters);
            if (!best || result.clusterSize > best.clusterSize) {
              best = result;
            }
          }
        } finally {
          roi.delete();
        }
      } else {
        // 使用环形像素进行聚类
        for (let attempt = 0; attempt < 5; attempt++) {
          const result = this.kmeansClusterFromPixels(ringPixels, this.config.kClusters);
          if (!best || result.clusterSize > best.clusterSize) {
            best = result;
          }
        }
      }
    } catch (e) {
      console.warn("[ColorRecognizer] 聚类失败:", e);
    }

    const lab = best
      ? best.dominantLab
      : ([50, 0, 0] as [number, number, number]);
    const rgb = best
      ? best.dominantRgb
      : ([128, 128, 128] as [number, number, number]);
    const match = database.findClosestColor(lab);
    const hex = rgbToHex(rgb[0], rgb[1], rgb[2]);

    if (!match) {
      return {
        hex,
        rgb,
        lab,
        beadColorName: "未知",
        beadColorCode: "",
        confidence: 0,
        deltaE: 999,
      };
    }
    return {
      hex,
      rgb,
      lab,
      beadColorName: match.beadColor.name,
      beadColorCode: match.beadColor.code,
      confidence: match.confidence,
      deltaE: match.deltaE,
    };
  }

  /**
   * 提取环形区域的像素（排除中心孔洞）
   * 返回 RGB 像素数组
   */
  private extractRingPixels(
    image: cv.Mat,
    bead: BeadPosition
  ): Array<[number, number, number]> {
    const pixels: Array<[number, number, number]> = [];
    const r = Math.max(1, Math.floor(bead.radius));
    const cx = Math.round(bead.x);
    const cy = Math.round(bead.y);

    // 环形参数：内半径排除孔洞，外半径取拼豆边缘
    const innerR = r * 0.4;  // 内孔半径
    const outerR = r * 0.95; // 外边缘

    const data = image.data;
    if (!data) return pixels;

    const cols = image.cols;
    const rows = image.rows;
    // 假设输入为 RGBA 格式（4 通道）
    const channels = 4;

    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const x = cx + dx;
        const y = cy + dy;

        if (x < 0 || x >= cols || y < 0 || y >= rows) continue;

        const d = Math.sqrt(dx * dx + dy * dy);

        // 只取环形区域内的像素
        if (d >= innerR && d <= outerR) {
          const idx = (y * cols + x) * channels;
          const r = data[idx] ?? 0;
          const g = data[idx + 1] ?? 0;
          const b = data[idx + 2] ?? 0;
          pixels.push([r, g, b]);
        }
      }
    }

    return pixels;
  }

  /**
   * 从像素数组进行 K-means 聚类
   */
  private kmeansClusterFromPixels(
    pixels: Array<[number, number, number]>,
    k: number
  ): ClusterResult {
    if (pixels.length === 0) return this.fallbackCluster();

    const n = pixels.length;
    const samples = new cv.Mat(n, 1, cv.CV_32FC3);
    const labels = new cv.Mat(n, 1, cv.CV_32SC1);
    const centers = new cv.Mat(k, 1, cv.CV_32FC3);

    try {
      const samplesData = samples.data32F;
      if (!samplesData) return this.fallbackCluster();

      // 填充样本数据（OpenCV 使用 BGR）
      for (let i = 0; i < n; i++) {
        const [r, g, b] = pixels[i];
        samplesData[i * 3] = b;     // B
        samplesData[i * 3 + 1] = g; // G
        samplesData[i * 3 + 2] = r; // R
      }

      const criteria = {
        type: cv.TERM_CRITERIA_EPS + cv.TERM_CRITERIA_MAX_ITER,
        maxCount: this.config.maxIterations,
        epsilon: this.config.epsilon,
      };

      cv.kmeans(
        samples,
        Math.min(k, n),
        labels,
        criteria,
        3,
        cv.KMEANS_PP_CENTERS,
        centers
      );

      const labelsData = labels.data32S;
      const centersData = centers.data32F;
      if (!labelsData || !centersData) return this.fallbackCluster();

      // 统计每个簇的大小
      const counts: number[] = [];
      for (let i = 0; i < k; i++) counts[i] = 0;
      for (let i = 0; i < n; i++) {
        const l = labelsData[i] ?? 0;
        if (l >= 0 && l < k) counts[l]++;
      }

      // 找最大簇
      let maxIdx = 0;
      for (let i = 1; i < k; i++) {
        if (counts[i] > counts[maxIdx]) maxIdx = i;
      }

      // 提取簇中心颜色（BGR → RGB）
      const bVal = centersData[maxIdx * 3] ?? 128;
      const gVal = centersData[maxIdx * 3 + 1] ?? 128;
      const rVal = centersData[maxIdx * 3 + 2] ?? 128;

      const rgb: [number, number, number] = [
        Math.round(Math.max(0, Math.min(255, rVal))),
        Math.round(Math.max(0, Math.min(255, gVal))),
        Math.round(Math.max(0, Math.min(255, bVal))),
      ];
      const lab = rgbToLab(rgb);

      return {
        dominantRgb: rgb,
        dominantLab: lab,
        clusterSize: counts[maxIdx] ?? 0,
      };
    } catch {
      return this.fallbackCluster();
    } finally {
      samples.delete();
      labels.delete();
      centers.delete();
    }
  }

  /**
   * 提取拼豆矩形区域（后备方法）
   */
  extractROI(image: cv.Mat, bead: BeadPosition): cv.Mat {
    const r = Math.max(1, Math.floor(bead.radius));
    const x0 = Math.max(0, Math.floor(bead.x - r));
    const y0 = Math.max(0, Math.floor(bead.y - r));
    const w = Math.min(image.cols - x0, 2 * r);
    const h = Math.min(image.rows - y0, 2 * r);
    try {
      const rect = new cv.Rect(x0, y0, w, h);
      return image.roi(rect);
    } catch {
      const roi = new cv.Mat(h, w, cv.CV_8UC4);
      const src = image.data;
      const dst = roi.data;
      if (!src || !dst) return roi;
      const ch = 4;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const si = ((y0 + y) * image.cols + (x0 + x)) * ch;
          const di = (y * w + x) * ch;
          dst[di] = src[si] ?? 0;
          dst[di + 1] = src[si + 1] ?? 0;
          dst[di + 2] = src[si + 2] ?? 0;
          dst[di + 3] = src[si + 3] ?? 255;
        }
      }
      return roi;
    }
  }

  /**
   * K-means 聚类取最大簇的中心作为主色（OpenCV 使用 BGR）
   * 后备方法，用于矩形 ROI
   */
  private kmeansCluster(roi: cv.Mat, k: number): ClusterResult {
    const rows = roi.rows * roi.cols;
    const ptr = roi.data;
    if (!ptr || rows === 0) return this.fallbackCluster();
    const ch = 4;
    const samples = new cv.Mat(rows, 1, cv.CV_32FC3);
    const labels = new cv.Mat(rows, 1, cv.CV_32SC1);
    const centers = new cv.Mat(k, 1, cv.CV_32FC3);
    try {
      const samplesData = samples.data32F;
      if (!samplesData) return this.fallbackCluster();
      for (let i = 0; i < rows; i++) {
        const off = i * ch;
        const r = ptr[off] ?? 0;
        const g = ptr[off + 1] ?? 0;
        const b = ptr[off + 2] ?? 0;
        samplesData[i * 3] = b;
        samplesData[i * 3 + 1] = g;
        samplesData[i * 3 + 2] = r;
      }
      const criteria = {
        type: cv.TERM_CRITERIA_EPS + cv.TERM_CRITERIA_MAX_ITER,
        maxCount: this.config.maxIterations,
        epsilon: this.config.epsilon,
      };
      cv.kmeans(
        samples,
        Math.min(k, rows),
        labels,
        criteria,
        3,
        cv.KMEANS_PP_CENTERS,
        centers
      );
      const labelsData = labels.data32S;
      const centersData = centers.data32F;
      if (!labelsData || !centersData) return this.fallbackCluster();
      const counts: number[] = [];
      for (let i = 0; i < k; i++) counts[i] = 0;
      for (let i = 0; i < rows; i++) {
        const l = labelsData[i] ?? 0;
        if (l >= 0 && l < k) counts[l]++;
      }
      let maxIdx = 0;
      for (let i = 1; i < k; i++) {
        if (counts[i] > counts[maxIdx]) maxIdx = i;
      }
      const bVal = centersData[maxIdx * 3] ?? 128;
      const gVal = centersData[maxIdx * 3 + 1] ?? 128;
      const rVal = centersData[maxIdx * 3 + 2] ?? 128;
      const rgb: [number, number, number] = [
        Math.round(Math.max(0, Math.min(255, rVal))),
        Math.round(Math.max(0, Math.min(255, gVal))),
        Math.round(Math.max(0, Math.min(255, bVal))),
      ];
      const lab = rgbToLab(rgb);
      return {
        dominantRgb: rgb,
        dominantLab: lab,
        clusterSize: counts[maxIdx] ?? 0,
      };
    } catch {
      return this.fallbackCluster();
    } finally {
      samples.delete();
      labels.delete();
      centers.delete();
    }
  }

  private fallbackCluster(): ClusterResult {
    return {
      dominantRgb: [128, 128, 128],
      dominantLab: [50, 0, 0],
      clusterSize: 0,
    };
  }
}
