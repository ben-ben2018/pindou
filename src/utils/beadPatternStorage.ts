/**
 * 拼豆图纸本地存储：使用 IndexedDB，保存原始数据（pixelData + 参数）以支持再次编辑。
 */
import type { SavedBeadPattern, SaveBeadPatternInput } from "../types/beadPattern";

const DB_NAME = "pindou-db";
const STORE_NAME = "patterns";
const DB_VERSION = 2;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
}

function genId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `pattern_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function isNewFormat(record: unknown): record is SavedBeadPattern {
  return (
    typeof record === "object" &&
    record !== null &&
    "pixelData" in record &&
    Array.isArray((record as SavedBeadPattern).pixelData)
  );
}

/** 添加一条图纸；返回带 id 与时间的完整记录 */
export async function addPattern(input: SaveBeadPatternInput): Promise<SavedBeadPattern> {
  const db = await openDB();
  const now = Date.now();
  const record: SavedBeadPattern = {
    id: genId(),
    name: input.name.trim() || "未命名图纸",
    createdAt: now,
    updatedAt: now,
    pixelData: input.pixelData,
    pixelWidth: input.pixelWidth,
    pixelHeight: input.pixelHeight,
    cellSize: input.cellSize,
    colorMode: input.colorMode,
    excludeEdge: input.excludeEdge,
    showText: input.showText,
    showReferenceLines: input.showReferenceLines,
    selectedColors: input.selectedColors,
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.add(record);
    req.onsuccess = () => {
      db.close();
      resolve(record);
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

/** 获取所有图纸（仅新格式），按 updatedAt 倒序 */
export async function getAllPatterns(): Promise<SavedBeadPattern[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => {
      db.close();
      const raw = req.result as unknown[];
      const list = raw.filter(isNewFormat).sort((a, b) => b.updatedAt - a.updatedAt);
      resolve(list);
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

/** 按 id 获取一条 */
export async function getPatternById(id: string): Promise<SavedBeadPattern | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => {
      db.close();
      const record = req.result;
      resolve(record && isNewFormat(record) ? record : undefined);
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

/** 按 id 删除 */
export async function removePattern(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const req = tx.objectStore(STORE_NAME).delete(id);
    req.onsuccess = () => {
      db.close();
      resolve();
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}
