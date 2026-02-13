/**
 * OpenCV.js 最小类型声明（4.8+）
 * 仅声明本模块用到的 API，避免依赖 @types/opencv
 */
declare namespace cv {
  class Rect {
    constructor(x: number, y: number, width: number, height: number);
    x: number;
    y: number;
    width: number;
    height: number;
  }

  class Mat {
    constructor(rows?: number, cols?: number, type?: number);
    constructor(size?: { width: number; height: number }, type?: number);
    delete(): void;
    readonly rows: number;
    readonly cols: number;
    readonly data: Uint8Array;
    readonly data32F: Float32Array;
    readonly data32S: Int32Array;
    clone(): Mat;
    copyTo(m: Mat): void;
    convertTo(m: Mat, rtype: number, alpha?: number, beta?: number): void;
    roi(rect: Rect): Mat;
    static fromImageData(imageData: ImageData): Mat;
  }

  function matFromArray(rows: number, cols: number, type: number, array: number[]): Mat;
  function matFromImageData(imageData: ImageData): Mat;

  const COLOR_RGBA2GRAY: number;
  const COLOR_RGB2GRAY: number;
  const COLOR_BGR2GRAY: number;
  const COLOR_RGBA2RGB: number;
  const COLOR_RGB2HSV: number;
  const COLOR_BGR2HSV: number;
  const HOUGH_GRADIENT: number;
  const THRESH_BINARY: number;
  const THRESH_OTSU: number;
  const CV_8UC1: number;
  const CV_8UC3: number;
  const CV_8UC4: number;
  const CV_32F: number;
  const CV_32FC2: number;
  const CV_32FC3: number;
  const CV_32SC1: number;
  const BORDER_DEFAULT: number;
  const INTER_LINEAR: number;
  const MORPH_ELLIPSE: number;
  const MORPH_OPEN: number;
  const TERM_CRITERIA_EPS: number;
  const TERM_CRITERIA_MAX_ITER: number;
  const KMEANS_PP_CENTERS: number;
  const KMEANS_RANDOM_CENTERS: number;

  class TermCriteria {
    constructor(type: number, maxCount: number, epsilon: number);
  }

  function cvtColor(src: Mat, dst: Mat, code: number): void;
  function GaussianBlur(src: Mat, dst: Mat, ksize: { width: number; height: number }, sigmaX: number, sigmaY?: number, borderType?: number): void;
  function HoughCircles(
    image: Mat,
    circles: Mat,
    method: number,
    dp: number,
    minDist: number,
    param1?: number,
    param2?: number,
    minRadius?: number,
    maxRadius?: number
  ): void;
  function cornerSubPix(
    image: Mat,
    corners: Mat,
    winSize: { width: number; height: number },
    zeroZone: { width: number; height: number },
    criteria: { type: number; maxCount: number; epsilon: number }
  ): void;
  function Canny(image: Mat, edges: Mat, threshold1: number, threshold2: number, apertureSize?: number, L2gradient?: boolean): void;
  function getPerspectiveTransform(src: Mat, dst: Mat): Mat;
  function warpPerspective(src: Mat, dst: Mat, M: Mat, dsize: { width: number; height: number }, flags?: number, borderMode?: number): void;
  function findHomography(srcPoints: Mat, dstPoints: Mat, method?: number, ransacReprojThreshold?: number): Mat;
  function perspectiveTransform(src: Mat, dst: Mat, m: Mat): void;
  function kmeans(
    data: Mat,
    K: number,
    bestLabels: Mat,
    criteria: { type: number; maxCount: number; epsilon: number },
    attempts: number,
    flags: number,
    centers?: Mat
  ): number;
  function resize(src: Mat, dst: Mat, dsize: { width: number; height: number }, fx?: number, fy?: number, interpolation?: number): void;
  function matFromArray(rows: number, cols: number, type: number, array: number[]): Mat;
  function imshow(canvasSource: string | HTMLCanvasElement, mat: Mat): void;
  function imread(imageSource: string | HTMLImageElement | HTMLCanvasElement): Mat;
}

declare const cv: typeof cv;
