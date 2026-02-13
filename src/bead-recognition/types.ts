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

/** 完整识别结果 */
export interface RecognitionResult {
  success: boolean;
  beads: BeadData[];
  metadata: RecognitionMetadata;
  errors: string[];
}
