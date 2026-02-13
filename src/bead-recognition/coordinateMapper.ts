/// <reference path="./cv.d.ts" />
import type { BeadPosition, GridCoordinate, Point2D } from "./types";

/**
 * 坐标映射：像素坐标 → 网格坐标，对齐与去重；以检测区域左上为原点，减少空洞
 */
export class CoordinateMapper {
  /**
   * 将像素坐标的拼豆映射到网格，并去重；使用左上角为原点使网格紧凑
   */
  mapToGrid(beads: BeadPosition[], gridSpacing: number): GridCoordinate[] {
    if (beads.length === 0) return [];
    const minX = Math.min(...beads.map((b) => b.x));
    const minY = Math.min(...beads.map((b) => b.y));
    const aligned = this.alignToGrid(
      beads.map((b) => ({ x: b.x, y: b.y, bead: b })),
      gridSpacing,
      { originX: minX, originY: minY }
    );
    const result: GridCoordinate[] = [];
    aligned.forEach((bead, key) => {
      const [col, row] = key.split(",").map(Number);
      result.push({
        row,
        col,
        pixelX: bead.x,
        pixelY: bead.y,
        bead,
      });
    });
    return result.sort((a, b) => (a.row !== b.row ? a.row - b.row : a.col - b.col));
  }

  /**
   * 若存在透视变换矩阵，将像素坐标反变换后再做网格映射（本实现由 PerspectiveCorrection 产出已校正图，此处仅做网格对齐）
   */
  transformCoordinates(pixelCoords: Point2D[], homography: cv.Mat): Point2D[] {
    if (pixelCoords.length === 0) return [];
    const src = new cv.Mat(pixelCoords.length, 1, cv.CV_32FC2);
    const dst = new cv.Mat(pixelCoords.length, 1, cv.CV_32FC2);
    try {
      const srcData = src.data32F;
      if (!srcData) return pixelCoords;
      pixelCoords.forEach((p, i) => {
        srcData[i * 2] = p.x;
        srcData[i * 2 + 1] = p.y;
      });
      cv.perspectiveTransform(src, dst, homography);
      const dstData = dst.data32F;
      if (!dstData) return pixelCoords;
      return pixelCoords.map((_, i) => ({ x: dstData[i * 2], y: dstData[i * 2 + 1] }));
    } finally {
      src.delete();
      dst.delete();
    }
  }

  /**
   * 对齐到网格并去重（同一格取第一个）；可选原点使 (0,0) 对应左上角
   */
  alignToGrid(
    coords: Array<{ x: number; y: number; bead: BeadPosition }>,
    spacing: number,
    origin?: { originX: number; originY: number }
  ): Map<string, BeadPosition> {
    const map = new Map<string, BeadPosition>();
    const ox = origin?.originX ?? 0;
    const oy = origin?.originY ?? 0;
    for (const { x, y, bead } of coords) {
      const col = Math.round((x - ox) / spacing);
      const row = Math.round((y - oy) / spacing);
      const key = `${col},${row}`;
      if (!map.has(key)) {
        map.set(key, { ...bead, x, y });
      }
    }
    return map;
  }
}
