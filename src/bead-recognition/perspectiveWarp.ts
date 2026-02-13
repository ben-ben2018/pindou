/// <reference path="./cv.d.ts" />

export interface Point2D {
  x: number;
  y: number;
}

/**
 * 从图片 URL 加载为 ImageData（用于透视变换）
 */
export function loadImageDataFromUrl(url: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("无法创建 canvas 2d 上下文"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(ctx.getImageData(0, 0, canvas.width, canvas.height));
    };
    img.onerror = () => reject(new Error("图片加载失败"));
    img.src = url;
  });
}

/**
 * 根据四边形四个角点做透视变换，将图像拉正为矩形
 * 角点顺序：左上、右上、右下、左下（与常见裁切框一致）
 * 需在调用前确保 OpenCV 已加载
 */
export function warpImageToRectangle(
  imageData: ImageData,
  corners: [Point2D, Point2D, Point2D, Point2D]
): ImageData | null {
  if (typeof cv === "undefined") return null;
  const [tl, tr, br, bl] = corners;
  const w1 = Math.hypot(tr.x - tl.x, tr.y - tl.y);
  const w2 = Math.hypot(br.x - bl.x, br.y - bl.y);
  const h1 = Math.hypot(bl.x - tl.x, bl.y - tl.y);
  const h2 = Math.hypot(br.x - tr.x, br.y - tr.y);
  const outW = Math.max(1, Math.round((w1 + w2) / 2));
  const outH = Math.max(1, Math.round((h1 + h2) / 2));

  const srcPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
    tl.x, tl.y,
    tr.x, tr.y,
    br.x, br.y,
    bl.x, bl.y,
  ]);
  const dstPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
    0, 0,
    outW - 1, 0,
    outW - 1, outH - 1,
    0, outH - 1,
  ]);
  const src = cv.matFromImageData(imageData);
  const M = cv.getPerspectiveTransform(srcPoints, dstPoints);
  const dst = new cv.Mat();
  try {
    cv.warpPerspective(src, dst, M, { width: outW, height: outH }, cv.INTER_LINEAR);
    const out = new ImageData(outW, outH);
    const d = dst.data;
    if (!d) return null;
    for (let i = 0; i < out.data.length; i++) {
      out.data[i] = d[i] ?? 0;
    }
    return out;
  } finally {
    srcPoints.delete();
    dstPoints.delete();
    M.delete();
    src.delete();
    dst.delete();
  }
}

/**
 * 将 ImageData 转为 PNG File（用于上传/保存）
 */
export function imageDataToFileAsync(
  imageData: ImageData,
  filename = "warped.png"
): Promise<File> {
  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("无法创建 canvas 2d 上下文"));
  ctx.putImageData(imageData, 0, 0);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("toBlob 失败"));
          return;
        }
        resolve(new File([blob], filename, { type: "image/png" }));
      },
      "image/png",
      0.95
    );
  });
}

/**
 * 透视校正：四边形 → 矩形，并导出为 File
 */
export async function warpImageToFile(
  imageData: ImageData,
  corners: [Point2D, Point2D, Point2D, Point2D]
): Promise<File | null> {
  const out = warpImageToRectangle(imageData, corners);
  if (!out) return null;
  return imageDataToFileAsync(out, "perspective-corrected.png");
}
