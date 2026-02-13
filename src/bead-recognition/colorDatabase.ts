import type { BeadColor, ColorMatch } from "./types";
import { deltaE2000, hexToRgb, rgbToLab } from "./colorUtils";

/**
 * 颜色数据库：从色卡构建 BeadColor[]，支持最近邻查找
 * 可选 KD 树加速（此处用线性搜索 + 缓存，满足 Phase 1）
 */
export class ColorDatabase {
  private colors: BeadColor[] = [];
  private labCache: Map<string, [number, number, number]> = new Map();

  /**
   * 从色卡列表构建数据库（name/code 用 name，hex 需含 #）
   */
  loadFromColorCards(
    cards: Array<{ name: string; hex: string; brand?: string }>
  ): void {
    this.colors = cards.map((c) => {
      const hex = c.hex.startsWith("#") ? c.hex : "#" + c.hex;
      const rgb = hexToRgb(hex);
      const lab = rgbToLab(rgb);
      return {
        name: c.name,
        code: c.name,
        rgb: [rgb[0], rgb[1], rgb[2]],
        lab: [lab[0], lab[1], lab[2]],
      };
    });
    this.labCache.clear();
  }

  /**
   * 查找与给定 LAB 最接近的色卡颜色
   */
  findClosestColor(lab: number[]): ColorMatch | null {
    if (this.colors.length === 0) return null;
    let best: BeadColor = this.colors[0];
    let bestDe = deltaE2000(
      [lab[0], lab[1], lab[2]],
      [best.lab[0], best.lab[1], best.lab[2]]
    );
    for (let i = 1; i < this.colors.length; i++) {
      const c = this.colors[i];
      const de = deltaE2000(
        [lab[0], lab[1], lab[2]],
        [c.lab[0], c.lab[1], c.lab[2]]
      );
      if (de < bestDe) {
        bestDe = de;
        best = c;
      }
    }
    const confidence = bestDe < 2 ? 1 : Math.max(0, 1 - (bestDe - 2) / 15);
    return {
      beadColor: best,
      confidence,
      deltaE: bestDe,
    };
  }

  /**
   * 批量查找（顺序调用 findClosestColor）
   */
  findClosestColors(labs: number[][]): ColorMatch[] {
    return labs.map((lab) => this.findClosestColor(lab)).filter((m): m is ColorMatch => m !== null);
  }

  getColors(): BeadColor[] {
    return [...this.colors];
  }
}
