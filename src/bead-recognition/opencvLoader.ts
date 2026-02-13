/**
 * 动态加载 OpenCV.js（4.8+），支持重试
 */
const OPENCV_CDN =
  "https://docs.opencv.org/4.8.0/opencv.js";
const OPENCV_LOCAL = "/pindou/opencv.js";
const MAX_RETRIES = 2;

let loadPromise: Promise<void> | null = null;

/**
 * 加载 OpenCV.js，返回 Promise；重复调用复用同一 Promise
 */
export function loadOpenCV(retries = MAX_RETRIES): Promise<void> {
  if (typeof cv !== "undefined" && (cv as unknown as { ready?: boolean }).ready !== false) {
    return Promise.resolve();
  }
  if (loadPromise) return loadPromise;
  loadPromise = tryLoad(0, retries);
  return loadPromise;
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.async = true;
    script.src = src;
    script.onerror = () => reject(new Error(`加载失败: ${src}`));
    script.onload = () => {
      const cvGlobal = (window as unknown as { cv?: unknown }).cv;
      if (!cvGlobal) {
        reject(new Error("OpenCV.js 未正确挂载"));
        return;
      }
      const cvWithReady = cvGlobal as { onRuntimeInitialized?: () => void; ready?: boolean };
      if ((cvWithReady as { ready?: boolean }).ready === true) {
        resolve();
        return;
      }
      cvWithReady.onRuntimeInitialized = () => {
        (cvWithReady as { ready?: boolean }).ready = true;
        resolve();
      };
      setTimeout(() => {
        if ((cvWithReady as { ready?: boolean }).ready) return;
        (cvWithReady as { ready?: boolean }).ready = true;
        resolve();
      }, 8000);
    };
    document.head.appendChild(script);
  });
}

function tryLoad(attempt: number, maxRetries: number): Promise<void> {
  const base =
    typeof document !== "undefined" && document.baseURI
      ? new URL(document.baseURI).origin
      : "";
  const url =
    attempt === 0 && base ? `${base}${OPENCV_LOCAL}` : OPENCV_CDN;
  return loadScript(url).catch((err) => {
    if (attempt < maxRetries) {
      return tryLoad(attempt + 1, maxRetries);
    }
    throw err;
  });
}

export function isOpenCVLoaded(): boolean {
  return typeof cv !== "undefined";
}
