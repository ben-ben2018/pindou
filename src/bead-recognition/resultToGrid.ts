import type { RecognitionResult } from "./types";
import type { PixelColor } from "@/utils/pixelArt";

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace(/^#/, "");
  const n = parseInt(h, 16);
  return {
    r: (n >> 16) & 0xff,
    g: (n >> 8) & 0xff,
    b: n & 0xff,
  };
}

/**
 * 将识别结果转为与 BeadPattern / pixelArt 兼容的二维像素网格
 */
export function recognitionResultToPixelGrid(
  result: RecognitionResult
): { pixelData: PixelColor[][]; pixelWidth: number; pixelHeight: number } | null {
  if (!result.success || result.beads.length === 0) return null;
  const rows = result.metadata.gridRows;
  const cols = result.metadata.gridCols;
  const grid: PixelColor[][] = [];
  for (let r = 0; r < rows; r++) {
    grid[r] = [];
    for (let c = 0; c < cols; c++) {
      grid[r][c] = {
        r: 255,
        g: 255,
        b: 255,
        name: "",
        hex: "#ffffff",
      };
    }
  }
  for (const b of result.beads) {
    const rgb = hexToRgb(b.color);
    grid[b.row][b.col] = {
      ...rgb,
      name: b.colorName,
      hex: b.color,
    };
  }
  return {
    pixelData: grid,
    pixelWidth: cols,
    pixelHeight: rows,
  };
}
