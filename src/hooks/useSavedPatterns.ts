import { useState, useEffect } from "react";
import type { SavedBeadPattern, SaveBeadPatternInput } from "../types/beadPattern";
import * as beadPatternStorage from "../utils/beadPatternStorage";

export interface UseSavedPatternsReturn {
  /** 已保存的图纸列表，按修改时间倒序 */
  patterns: SavedBeadPattern[];
  /** 是否正在加载列表 */
  loading: boolean;
  /** 加载或操作错误 */
  error: Error | null;
  /** 保存新图纸，返回新记录；失败抛错 */
  savePattern: (input: SaveBeadPatternInput) => Promise<SavedBeadPattern>;
  /** 按 id 获取一条图纸（用于编辑） */
  getPatternById: (id: string) => Promise<SavedBeadPattern | undefined>;
  /** 删除指定 id 的图纸 */
  removePattern: (id: string) => Promise<void>;
  /** 刷新列表（从 IndexedDB 重新拉取） */
  refresh: () => Promise<void>;
}

export function useSavedPatterns(): UseSavedPatternsReturn {
  const [patterns, setPatterns] = useState<SavedBeadPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await beadPatternStorage.getAllPatterns();
      setPatterns(list);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const savePattern = async (input: SaveBeadPatternInput): Promise<SavedBeadPattern> => {
    const record = await beadPatternStorage.addPattern(input);
    setPatterns((prev) => [record, ...prev.filter((p) => p.id !== record.id)]);
    return record;
  };

  const getPatternById = (id: string) => beadPatternStorage.getPatternById(id);

  const removePattern = async (id: string): Promise<void> => {
    await beadPatternStorage.removePattern(id);
    setPatterns((prev) => prev.filter((p) => p.id !== id));
  };

  return {
    patterns,
    loading,
    error,
    savePattern,
    getPatternById,
    removePattern,
    refresh,
  };
}
