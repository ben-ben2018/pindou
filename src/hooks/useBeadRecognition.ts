import { useState } from "react";
import {
  loadOpenCV,
  BeadRecognitionController,
  ColorDatabase,
  type RecognitionResult,
} from "@/bead-recognition";
import type { ColorCard } from "@/utils/colorTable";

export interface UseBeadRecognitionOptions {
  /** 选中的标准色（用于颜色库） */
  selectedColorCards: ColorCard[];
}

export interface UseBeadRecognitionReturn {
  /** 执行识别（先加载 OpenCV，再跑流水线） */
  recognize: (file: File) => Promise<RecognitionResult>;
  /** 识别结果 */
  result: RecognitionResult | null;
  /** 进度 0–100 */
  progress: number;
  /** 当前阶段描述 */
  stage: string;
  /** 是否正在识别 */
  loading: boolean;
  /** 错误信息（如 OpenCV 未加载、识别失败） */
  error: string | null;
  /** 是否已加载 OpenCV */
  opencvReady: boolean;
  /** 预加载 OpenCV（可选，页面挂载时调用） */
  ensureOpenCV: () => Promise<void>;
}

/**
 * 拼豆识别 Hook：封装 BeadRecognitionController + OpenCV 加载 + 颜色库
 * 使用方式：上传图片 → 选择标准色 → 点击开始识别 → 获取 result
 */
export function useBeadRecognition(
  options: UseBeadRecognitionOptions
): UseBeadRecognitionReturn {
  const { selectedColorCards } = options;
  const [result, setResult] = useState<RecognitionResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [opencvReady, setOpencvReady] = useState(false);

  const ensureOpenCV = async () => {
    if (opencvReady) return;
    try {
      await loadOpenCV();
      setOpencvReady(true);
      setError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "OpenCV 加载失败";
      setError(msg);
    }
  };

  const recognize = async (file: File): Promise<RecognitionResult> => {
    setLoading(true);
    setError(null);
    setResult(null);
    setProgress(0);
    setStage("准备中");
    try {
      await loadOpenCV();
      setOpencvReady(true);
      const db = new ColorDatabase();
      const cards = selectedColorCards.length > 0
        ? selectedColorCards
        : [{ name: "未知", hex: "#808080", brand: "" }];
      db.loadFromColorCards(cards);
      const controller = new BeadRecognitionController();
      controller.onProgress((p, s) => {
        setProgress(p);
        setStage(s);
      });
      const res = await controller.recognize(file, db);
      setResult(res);
      if (!res.success && res.errors.length > 0) {
        setError(res.errors[0]);
      }
      return res;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "识别失败";
      setError(msg);
      const failResult: RecognitionResult = {
        success: false,
        beads: [],
        metadata: {
          imageWidth: 0,
          imageHeight: 0,
          gridRows: 0,
          gridCols: 0,
          totalBeads: 0,
          processingTime: 0,
        },
        errors: [msg],
      };
      setResult(failResult);
      return failResult;
    } finally {
      setLoading(false);
      setProgress(100);
      setStage("完成");
    }
  };

  return {
    recognize,
    result,
    progress,
    stage,
    loading,
    error,
    opencvReady,
    ensureOpenCV,
  };
}
