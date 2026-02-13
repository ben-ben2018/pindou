/// <reference path="./cv.d.ts" />
import type { ImageInputConfig } from "./types";

const DEFAULT_CONFIG: ImageInputConfig = {
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 0.9,
};

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * 图像输入模块：加载文件、降采样、预处理为 Canvas/ImageData
 */
export class ImageInput {
  private config: ImageInputConfig;
  private onProgress?: (percent: number, stage: string) => void;

  constructor(config: Partial<ImageInputConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 设置加载进度回调
   */
  setProgressCallback(cb: (percent: number, stage: string) => void): void {
    this.onProgress = cb;
  }

  /**
   * 从 File 加载图像，返回 HTMLImageElement（已解码）
   */
  async loadImage(file: File): Promise<HTMLImageElement> {
    this.report(5, "读取文件");
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error(`不支持的图片格式，请使用 JPG/PNG：${file.type}`);
    }
    const url = URL.createObjectURL(file);
    try {
      const img = await this.decodeImage(url);
      this.report(30, "解码完成");
      if (!this.validateImage(img)) {
        throw new Error("图片无效或尺寸过小");
      }
      this.report(40, "校验通过");
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  /**
   * 将图像预处理为指定尺寸内的 Canvas，并返回该 Canvas
   */
  preprocess(image: HTMLImageElement): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    let { width, height } = image;
    if (width > this.config.maxWidth || height > this.config.maxHeight) {
      const scale = Math.min(
        this.config.maxWidth / width,
        this.config.maxHeight / height
      );
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("无法获取 Canvas 2D 上下文");
    ctx.drawImage(image, 0, 0, width, height);
    return canvas;
  }

  /**
   * 从 Canvas 获取 ImageData（供 OpenCV 使用）
   */
  getImageDataFromCanvas(canvas: HTMLCanvasElement): ImageData {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("无法获取 Canvas 2D 上下文");
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  /**
   * 一步：加载文件 → 预处理 → 返回 ImageData 与尺寸
   */
  async loadAndPreprocess(file: File): Promise<{ imageData: ImageData; width: number; height: number }> {
    const img = await this.loadImage(file);
    this.report(50, "预处理");
    const canvas = this.preprocess(img);
    const imageData = this.getImageDataFromCanvas(canvas);
    this.report(60, "就绪");
    return {
      imageData,
      width: canvas.width,
      height: canvas.height,
    };
  }

  private report(percent: number, stage: string): void {
    this.onProgress?.(percent, stage);
  }

  private decodeImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("图片加载失败"));
      img.src = url;
    });
  }

  private validateImage(image: HTMLImageElement): boolean {
    return (
      image.naturalWidth > 0 &&
      image.naturalHeight > 0 &&
      image.naturalWidth >= 20 &&
      image.naturalHeight >= 20
    );
  }
}
