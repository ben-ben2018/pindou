/// <reference path="./cv.d.ts" />
import type { BeadPosition, Circle, DetectionConfig } from "./types";

const DEFAULT_CONFIG: DetectionConfig = {
  minRadius: 8,
  maxRadius: 25,
  minDistance: 20,
  cannyThreshold: 100,
  accumulatorThreshold: 30,
};

/**
 * 拼豆检测：Hough 圆检测 + 亚像素精修 + 误检过滤
 * 依赖全局 cv（OpenCV.js）
 */
export class BeadDetector {
  private config: DetectionConfig;

  constructor(config: Partial<DetectionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 从 ImageData 检测所有拼豆位置
   */
  async detect(imageData: ImageData): Promise<BeadPosition[]> {
    if (typeof cv === "undefined") {
      throw new Error("OpenCV.js 未加载");
    }
    const src = cv.matFromImageData(imageData);
    const gray = new cv.Mat();
    try {
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
      const circles = this.detectHoughCircles(gray);
      if (circles.length === 0) {
        return [];
      }
      const refined = this.subpixelRefinement(circles, gray);
      const filtered = this.filterFalsePositives(refined, gray);
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
   * Hough 圆检测
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
      if (!data) return circles;
      const n = circlesMat.rows > 0 ? circlesMat.rows : Math.floor(circlesMat.cols / 3);
      for (let i = 0; i < n; i++) {
        const x = data[i * 3];
        const y = data[i * 3 + 1];
        const r = data[i * 3 + 2];
        if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(r) && r >= this.config.minRadius) {
          circles.push({ x, y, radius: r, confidence: 0.85 });
        }
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
