/// <reference path="./cv.d.ts" />
import type { BeadPosition, Circle, DetectionConfig } from "./types";

const DEFAULT_CONFIG: DetectionConfig = {
  minRadius: 8,
  maxRadius: 25,
  minDistance: 20,
  cannyThreshold: 100,
  accumulatorThreshold: 18,
};

export interface BeadDetectorDebug {
  houghMatRows: number;
  houghMatCols: number;
  houghDataLength: number;
  rawCirclesParsed: number;
  afterRefinement: number;
  afterFilter: number;
}

/**
 * 拼豆检测：Hough 圆检测 + 亚像素精修 + 误检过滤
 * 依赖全局 cv（OpenCV.js）
 */
export class BeadDetector {
  private config: DetectionConfig;
  private lastDebug: BeadDetectorDebug | null = null;

  constructor(config: Partial<DetectionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  getLastDebug(): BeadDetectorDebug | null {
    return this.lastDebug;
  }

  getConfig(): DetectionConfig {
    return { ...this.config };
  }

  /**
   * 从 ImageData 检测所有拼豆位置；若首次检测过少会尝试放宽 param2 再检一次
   */
  async detect(imageData: ImageData): Promise<BeadPosition[]> {
    this.lastDebug = null;
    if (typeof cv === "undefined") {
      throw new Error("OpenCV.js 未加载");
    }
    const src = cv.matFromImageData(imageData);
    const gray = new cv.Mat();
    try {
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
      this.lastDebug = {
        houghMatRows: 0,
        houghMatCols: 0,
        houghDataLength: 0,
        rawCirclesParsed: 0,
        afterRefinement: 0,
        afterFilter: 0,
      };
      let circles = this.detectHoughCircles(gray);
      this.lastDebug.rawCirclesParsed = circles.length;
      if (circles.length > 0 && circles.length < 15) {
        const savedParam2 = this.config.accumulatorThreshold;
        this.config.accumulatorThreshold = Math.min(12, savedParam2 - 6);
        const retry = this.detectHoughCircles(gray);
        this.config.accumulatorThreshold = savedParam2;
        if (retry.length > circles.length) {
          if (typeof console !== "undefined") {
            console.log("[BeadDetector] 使用放宽 param2 的复检结果", retry.length, "颗");
          }
          circles = retry;
          this.lastDebug.rawCirclesParsed = circles.length;
        }
      }
      if (circles.length === 0) {
        return [];
      }
      const refined = this.subpixelRefinement(circles, gray);
      this.lastDebug.afterRefinement = refined.length;
      const filtered = this.filterFalsePositives(refined, gray);
      this.lastDebug.afterFilter = filtered.length;
      return filtered.map((c) => ({
        x: c.x,
        y: c.y,
        radius: c.radius,
        confidence: c.confidence ?? 0.9,
      }));
    } finally {
      src.delete();
      gray.delete();
    }
  }

  /**
   * Hough 圆检测（兼容 OpenCV 多种输出布局：Nx3 或 1xN）
   */
  private detectHoughCircles(gray: cv.Mat): Circle[] {
    const circlesMat = new cv.Mat();
    try {
      cv.HoughCircles(
        gray,
        circlesMat,
        cv.HOUGH_GRADIENT,
        1,
        this.config.minDistance,
        this.config.cannyThreshold,
        this.config.accumulatorThreshold,
        this.config.minRadius,
        this.config.maxRadius
      );
      const circles: Circle[] = [];
      const data = circlesMat.data32F;
      const rows = circlesMat.rows;
      const cols = circlesMat.cols;
      const dataLen = data ? data.length : 0;
      if (!data || dataLen < 3) {
        if (typeof console !== "undefined") {
          console.warn("[BeadDetector] HoughCircles: no data or length<3", { rows, cols, dataLen });
        }
        return circles;
      }
      const n = Math.floor(dataLen / 3);
      if (this.lastDebug) {
        this.lastDebug.houghMatRows = rows;
        this.lastDebug.houghMatCols = cols;
        this.lastDebug.houghDataLength = dataLen;
      }
      if (typeof console !== "undefined") {
        console.log("[BeadDetector] HoughCircles 输出", {
          rows,
          cols,
          dataLength: dataLen,
          circlesToTry: n,
          params: {
            minRadius: this.config.minRadius,
            maxRadius: this.config.maxRadius,
            minDistance: this.config.minDistance,
            param1: this.config.cannyThreshold,
            param2: this.config.accumulatorThreshold,
          },
        });
      }
      for (let i = 0; i < n; i++) {
        const x = data[i * 3];
        const y = data[i * 3 + 1];
        const r = data[i * 3 + 2];
        if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(r) && r >= this.config.minRadius) {
          circles.push({ x, y, radius: r, confidence: 0.85 });
        }
      }
      if (typeof console !== "undefined") {
        console.log("[BeadDetector] 解析出的圆数量", circles.length, "前3个:", circles.slice(0, 3));
      }
      return circles;
    } finally {
      circlesMat.delete();
    }
  }

  /**
   * 亚像素精度优化（cornerSubPix 用于圆心）；失败则返回原圆列表
   */
  private subpixelRefinement(circles: Circle[], gray: cv.Mat): Circle[] {
    if (circles.length === 0) return circles;
    try {
      const pts = new Float32Array(circles.length * 2);
      circles.forEach((c, i) => {
        pts[i * 2] = c.x;
        pts[i * 2 + 1] = c.y;
      });
      const ptsMat = cv.matFromArray(circles.length, 1, cv.CV_32FC2, Array.from(pts));
      const termCrit = {
        type: cv.TERM_CRITERIA_EPS + cv.TERM_CRITERIA_MAX_ITER,
        maxCount: 10,
        epsilon: 0.01,
      };
      cv.cornerSubPix(gray, ptsMat, { width: 5, height: 5 }, { width: -1, height: -1 }, termCrit);
      const refined: Circle[] = [];
      const data = ptsMat.data32F;
      if (!data) return circles;
      for (let i = 0; i < circles.length; i++) {
        refined.push({
          x: data[i * 2],
          y: data[i * 2 + 1],
          radius: circles[i].radius,
          confidence: circles[i].confidence,
        });
      }
      ptsMat.delete();
      return refined;
    } catch {
      return circles;
    }
  }

  /**
   * 过滤明显误检：半径异常、重叠过多
   */
  private filterFalsePositives(circles: Circle[], _gray: cv.Mat): Circle[] {
    const minR = this.config.minRadius;
    const maxR = this.config.maxRadius;
    const minDist = this.config.minDistance;
    const ok: Circle[] = [];
    for (const c of circles) {
      if (c.radius < minR || c.radius > maxR) continue;
      let tooClose = false;
      for (const o of ok) {
        const d = Math.hypot(c.x - o.x, c.y - o.y);
        if (d < minDist) {
          tooClose = true;
          break;
        }
      }
      if (!tooClose) ok.push(c);
    }
    return ok;
  }
}
