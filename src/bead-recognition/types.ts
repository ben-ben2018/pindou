/// <reference path="./cv.d.ts" />
/**
 * 拼豆识别系统 - 类型定义
 * 严格 TypeScript，所有公共接口均有完整类型
 */

/** 二维点 */
export interface Point2D {
  x: number;
  y: number;
}

/** 圆形（圆心 + 半径） */
export interface Circle {
  x: number;
  y: number;
  radius: number;
  confidence?: number;
}

/** 图像输入配置 */
export interface ImageInputConfig {
  maxWidth: number;
  maxHeight: number;
  quality: number;
}

/** 拼豆位置（检测输出） */
export interface BeadPosition {
  x: number;
  y: number;
  radius: number;
  confidence: number;
}

/** 检测模块配置 */
export interface DetectionConfig {
  minRadius: number;
  maxRadius: number;
  minDistance: number;
  cannyThreshold: number;
  accumulatorThreshold: number;
}

/** 透视校正后的图像（image/transform 为 OpenCV Mat，运行时由 cv 提供） */
export interface CorrectedImage {
  image: cv.Mat;
  transform: cv.Mat;
}

/** 网格坐标（映射输出） */
export interface GridCoordinate {
  row: number;
  col: number;
  pixelX: number;
  pixelY: number;
  bead: BeadPosition;
}

/** 颜色配置 */
export interface ColorConfig {
  kClusters: number;
  maxIterations: number;
  epsilon: number;
}

/** 官方色卡条目（含 LAB） */
export interface BeadColor {
  name: string;
  code: string;
  rgb: [number, number, number];
  lab: [number, number, number];
}

/** 颜色匹配结果 */
export interface ColorMatch {
  beadColor: BeadColor;
  confidence: number;
  deltaE: number;
}

/** 识别出的颜色 */
export interface RecognizedColor {
  hex: string;
  rgb: [number, number, number];
  lab: [number, number, number];
  beadColorName: string;
  beadColorCode: string;
  confidence: number;
  deltaE: number;
}

/** 聚类结果 */
export interface ClusterResult {
  dominantRgb: [number, number, number];
  dominantLab: [number, number, number];
  clusterSize: number;
}

/** 识别结果中的单颗拼豆 */
export interface BeadData {
  row: number;
  col: number;
  color: string;
  colorName: string;
  confidence: number;
  pixelX: number;
  pixelY: number;
}

/** 识别元数据 */
export interface RecognitionMetadata {
  imageWidth: number;
  imageHeight: number;
  gridRows: number;
  gridCols: number;
  totalBeads: number;
  processingTime: number;
}

/** 检测阶段调试信息 */
export interface DetectionDebugInfo {
  imageWidth: number;
  imageHeight: number;
  houghMatRows: number;
  houghMatCols: number;
  houghDataLength: number;
  rawCirclesParsed: number;
  afterRingFilter?: number;
  afterRefinement: number;
  afterFilter: number;
  params: { minRadius: number; maxRadius: number; minDistance: number; param1: number; param2: number };
  gridSpacing: number;
  /** 网格检测扩展信息（新版检测器） */
  gridInfo?: {
    method: "grid";
    spacingX: number;
    spacingY: number;
    originX: number;
    originY: number;
    rows: number;
    cols: number;
    confidence: number;
    totalCells: number;
    occupiedCells: number;
    emptyCells: number;
    avgContrast: number;
    avgOccupiedContrast: number;
  };
}

/** 完整识别结果 */
export interface RecognitionResult {
  success: boolean;
  beads: BeadData[];
  metadata: RecognitionMetadata;
  errors: string[];
  /** 调试信息（便于排查检测过少/过多） */
  debug?: DetectionDebugInfo;
}

// ============= 网格检测相关类型 =============

/** 网格检测器配置 */
export interface GridDetectorConfig {
  /** 最小预期间距（像素） */
  minSpacing: number;
  /** 最大预期间距（像素） */
  maxSpacing: number;
  /** 原点搜索步长（像素） */
  originSearchStep: number;
}

/** 网格参数 */
export interface GridParameters {
  /** 水平间距（像素） */
  spacingX: number;
  /** 垂直间距（像素） */
  spacingY: number;
  /** 网格原点 X 坐标 */
  originX: number;
  /** 网格原点 Y 坐标 */
  originY: number;
  /** 检测到的行数 */
  rows: number;
  /** 检测到的列数 */
  cols: number;
  /** 检测置信度 (0-1) */
  confidence: number;
}

/** 网格分析器配置 */
export interface GridAnalyzerConfig {
  /** 内圈半径比例（相对于间距的一半），用于检测中心孔洞 */
  innerRadiusRatio: number;
  /** 外环起始半径比例 */
  ringInnerRatio: number;
  /** 外环结束半径比例 */
  ringOuterRatio: number;
  /** 环-中心对比度阈值（判断有豆/空位） */
  contrastThreshold: number;
}

/** 单个格子分析结果 */
export interface CellAnalysis {
  /** 行号 */
  row: number;
  /** 列号 */
  col: number;
  /** 中心 X 像素坐标 */
  centerX: number;
  /** 中心 Y 像素坐标 */
  centerY: number;
  /** 是否有拼豆 */
  isOccupied: boolean;
  /** 占用判断置信度 (0-1) */
  confidence: number;
  /** 中心区域平均亮度 */
  centerMean: number;
  /** 外环区域平均亮度 */
  ringMean: number;
  /** 对比度 (ringMean - centerMean) */
  contrast: number;
}

/** 网格检测调试信息 */
export interface GridDetectionDebug {
  /** 检测方法 */
  method: "grid";
  /** 网格参数 */
  gridParams: GridParameters;
  /** 总格子数 */
  totalCells: number;
  /** 有拼豆的格子数 */
  occupiedCells: number;
  /** 空格子数 */
  emptyCells: number;
  /** 平均对比度 */
  avgContrast: number;
  /** 间距检测原始峰值 */
  spacingPeaks?: { lag: number; value: number }[];
}
