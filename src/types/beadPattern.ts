import type { PixelColor } from "../utils/pixelArt";
import type { ColorMode } from "../context/PixelArtContext";
import type { SelectedColors } from "../context/PixelArtContext";

/** 本地保存的拼豆图纸一条记录（仅原始数据，便于再次编辑） */
export interface SavedBeadPattern {
  id: string;
  name: string;
  /** 创建时间戳 */
  createdAt: number;
  /** 最后修改时间戳 */
  updatedAt: number;
  /** 像素格颜色数据，可编辑 */
  pixelData: PixelColor[][];
  pixelWidth: number;
  pixelHeight: number;
  cellSize: number;
  colorMode: ColorMode;
  excludeEdge: boolean;
  showText: boolean;
  showReferenceLines: boolean;
  /** 保存时使用的色板选择，用于恢复编辑时的色号 */
  selectedColors: SelectedColors;
}

/** 保存时入参，不含 id 与时间戳（由存储层生成） */
export interface SaveBeadPatternInput {
  name: string;
  pixelData: PixelColor[][];
  pixelWidth: number;
  pixelHeight: number;
  cellSize: number;
  colorMode: ColorMode;
  excludeEdge: boolean;
  showText: boolean;
  showReferenceLines: boolean;
  selectedColors: SelectedColors;
}
