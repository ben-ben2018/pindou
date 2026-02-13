/// <reference path="./cv.d.ts" />
import type { BeadPosition, CorrectedImage, Point2D } from "./types";

/**
 * 透视校正：检测四角、计算变换矩阵；失败时使用原图（正交）
 */
export class PerspectiveCorrection {
  /**
   * 尝试检测四角点；失败返回 null，调用方使用原图
   */
  detectCornerPoints(_image: cv.Mat): Point2D[] | null {
    return null;
  }

  /**
   * 计算透视变换矩阵
   */
  computeHomography(
    _srcCorners: Point2D[],
    _dstSize: { width: number; height: number }
  ): cv.Mat {
    return new cv.Mat();
  }

  /**
   * 应用透视变换；若无法检测角点则返回原图与单位变换
   */
  correct(image: cv.Mat): CorrectedImage {
    const corners = this.detectCornerPoints(image);
    if (!corners || corners.length < 4) {
      const identity = cv.matFromArray(3, 3, cv.CV_32F, [1, 0, 0, 0, 1, 0, 0, 0, 1]);
      return { image: image.clone(), transform: identity };
    }
    const dstSize = { width: image.cols, height: image.rows };
    const H = this.computeHomography(corners, dstSize);
    const dst = new cv.Mat();
    cv.warpPerspective(image, dst, H, dstSize, cv.INTER_LINEAR);
    return { image: dst, transform: H };
  }

  /**
   * 根据拼豆位置估算网格间距（最近邻距离的中位数 ≈ 孔距，不再乘 0.6 避免间距偏小导致大量空洞）
   */
  estimateGridSpacing(beads: BeadPosition[]): number {
    if (beads.length < 2) return 20;
    const distances: number[] = [];
    for (let i = 0; i < beads.length; i++) {
      let minD = Infinity;
      for (let j = 0; j < beads.length; j++) {
        if (i === j) continue;
        const d = Math.hypot(beads[i].x - beads[j].x, beads[i].y - beads[j].y);
        if (d < minD) minD = d;
      }
      if (Number.isFinite(minD)) distances.push(minD);
    }
    if (distances.length === 0) return 20;
    distances.sort((a, b) => a - b);
    const mid = Math.floor(distances.length / 2);
    const median = distances.length % 2
      ? distances[mid]
      : (distances[mid - 1] + distances[mid]) / 2;
    return Math.max(8, Math.min(40, median * 0.96));
  }
}
