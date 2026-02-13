import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import type { ColorCard, ColorCards } from "../utils/colorTable";
import type { PixelColor } from "../utils/pixelArt";

export type ColorMode = "dominant" | "average" | "center" | "original" | "diagonal45";

export interface SelectedColors {
  [brand: string]: string[];
}

interface PixelArtContextValue {
  img: string | null;
  setImg: (v: string | null) => void;
  imgObj: HTMLImageElement | null;
  setImgObj: (v: HTMLImageElement | null) => void;
  pixelWidth: number;
  setPixelWidth: (v: number) => void;
  pixelHeight: number;
  setPixelHeight: (v: number) => void;
  cellSize: number;
  setCellSize: (v: number) => void;
  colorMode: ColorMode;
  setColorMode: (v: ColorMode) => void;
  excludeEdge: boolean;
  setExcludeEdge: (v: boolean) => void;
  showText: boolean;
  setShowText: (v: boolean) => void;
  showReferenceLines: boolean;
  setShowReferenceLines: (v: boolean) => void;
  selectedColors: SelectedColors;
  setSelectedColors: (v: SelectedColors | ((prev: SelectedColors) => SelectedColors)) => void;
  colorTable: ColorCard[];
  setColorTable: (v: ColorCard[]) => void;
  colorCards: ColorCards;
  setColorCards: (v: ColorCards) => void;
  pixelData: PixelColor[][] | null;
  setPixelData: (v: PixelColor[][] | null) => void;
  canvasUrl: string;
  setCanvasUrl: (v: string) => void;
  canvas: HTMLCanvasElement | null;
  setCanvas: (v: HTMLCanvasElement | null) => void;
  ratio: number;
  setRatio: (v: number) => void;
  lockRatio: boolean;
  setLockRatio: (v: boolean) => void;
  loading: boolean;
  setLoading: (v: boolean) => void;
}

const PixelArtContext = createContext<PixelArtContextValue | null>(null);

export function PixelArtProvider({ children }: { children: ReactNode }) {
  const [img, setImg] = useState<string | null>(null);
  const [imgObj, setImgObj] = useState<HTMLImageElement | null>(null);
  const [pixelWidth, setPixelWidth] = useState(50);
  const [pixelHeight, setPixelHeight] = useState(50);
  const [cellSize, setCellSize] = useState(24);
  const [colorMode, setColorMode] = useState<ColorMode>("dominant");
  const [excludeEdge, setExcludeEdge] = useState(false);
  const [showText, setShowText] = useState(true);
  const [showReferenceLines, setShowReferenceLines] = useState(false);
  const [selectedColors, setSelectedColors] = useState<SelectedColors>({});
  const [colorTable, setColorTable] = useState<ColorCard[]>([]);
  const [colorCards, setColorCards] = useState<ColorCards>({});
  const [pixelData, setPixelData] = useState<PixelColor[][] | null>(null);
  const [canvasUrl, setCanvasUrl] = useState("");
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [ratio, setRatio] = useState(1);
  const [lockRatio, setLockRatio] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!img) {
      setImgObj(null);
      return;
    }
    const image = new Image();
    image.onload = () => {
      setImgObj(image);
      setRatio(image.width / image.height);
    };
    image.onerror = () => setImgObj(null);
    image.src = img;
  }, [img]);

  const value = useMemo<PixelArtContextValue>(
    () => ({
      img,
      setImg,
      imgObj,
      setImgObj,
      pixelWidth,
      setPixelWidth,
      pixelHeight,
      setPixelHeight,
      cellSize,
      setCellSize,
      colorMode,
      setColorMode,
      excludeEdge,
      setExcludeEdge,
      showText,
      setShowText,
      showReferenceLines,
      setShowReferenceLines,
      selectedColors,
      setSelectedColors,
      colorTable,
      setColorTable,
      colorCards,
      setColorCards,
      pixelData,
      setPixelData,
      canvasUrl,
      setCanvasUrl,
      canvas,
      setCanvas,
      ratio,
      setRatio,
      lockRatio,
      setLockRatio,
      loading,
      setLoading,
    }),
    [
      img,
      imgObj,
      pixelWidth,
      pixelHeight,
      cellSize,
      colorMode,
      excludeEdge,
      showText,
      showReferenceLines,
      selectedColors,
      colorTable,
      colorCards,
      pixelData,
      canvasUrl,
      canvas,
      ratio,
      lockRatio,
      loading,
    ]
  );

  return (
    <PixelArtContext.Provider value={value}>
      {children}
    </PixelArtContext.Provider>
  );
}

export function usePixelArt() {
  const ctx = useContext(PixelArtContext);
  if (!ctx) throw new Error("usePixelArt must be used within PixelArtProvider");
  return ctx;
}
