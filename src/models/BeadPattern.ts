import { generatePixelArt } from "../utils/pixelArt";
import type { PixelColor } from "../utils/pixelArt";
import type { ColorCard } from "../utils/colorTable";
import type { ColorMode, SelectedColors } from "../context/PixelArtContext";

/** 导出时的配置：仅影响导出图片的展示，不影响原始数据 */
export interface BeadPatternExportConfig {
  /** 导出图上是否显示色号文字 */
  showText: boolean;
  /** 导出图上是否显示参考线（每5格加粗） */
  showReferenceLines: boolean;
}

/** 拼豆图纸的纯数据（用于构造与持久化） */
export interface BeadPatternData {
  pixelData: PixelColor[][];
  pixelWidth: number;
  pixelHeight: number;
  cellSize: number;
  colorMode: ColorMode;
  excludeEdge: boolean;
  selectedColors: SelectedColors;
}

function flattenSelectedColors(
  selectedColors: SelectedColors,
  colorTable: ColorCard[]
): ColorCard[] {
  const result: ColorCard[] = [];
  Object.keys(selectedColors).forEach((brand) => {
    const names = selectedColors[brand] || [];
    names.forEach((name) => {
      const card = colorTable.find((c) => c.brand === brand && c.name === name);
      if (card) result.push(card);
    });
  });
  return result;
}

/**
 * 拼豆图纸通用类：持有原始数据，提供按配置导出的方法。
 * 导出方法接受配置对象（显示色号文字、显示参考线），返回 canvas。
 */
export class BeadPattern implements BeadPatternData {
  readonly pixelData: PixelColor[][];
  readonly pixelWidth: number;
  readonly pixelHeight: number;
  readonly cellSize: number;
  readonly colorMode: ColorMode;
  readonly excludeEdge: boolean;
  readonly selectedColors: SelectedColors;

  constructor(data: BeadPatternData) {
    this.pixelData = data.pixelData;
    this.pixelWidth = data.pixelWidth;
    this.pixelHeight = data.pixelHeight;
    this.cellSize = data.cellSize;
    this.colorMode = data.colorMode;
    this.excludeEdge = data.excludeEdge;
    this.selectedColors = data.selectedColors;
  }

  /**
   * 按配置导出为 canvas（用于下载图片）。
   * @param config 显示色号文字、显示参考线
   * @param colorTable 完整色表，用于根据 selectedColors 取色
   */
  export(config: BeadPatternExportConfig, colorTable: ColorCard[]): HTMLCanvasElement {
    const useColors =
      flattenSelectedColors(this.selectedColors, colorTable).length > 0
        ? flattenSelectedColors(this.selectedColors, colorTable)
        : colorTable;
    const { canvas } = generatePixelArt({
      img: undefined,
      pixelWidth: this.pixelWidth,
      pixelHeight: this.pixelHeight,
      cellSize: this.cellSize,
      colorTable: useColors,
      showGrid: true,
      colorMode: this.colorMode,
      excludeEdge: this.excludeEdge,
      showText: config.showText,
      showReferenceLines: config.showReferenceLines,
      pixelData: this.pixelData,
    });
    return canvas;
  }
}
