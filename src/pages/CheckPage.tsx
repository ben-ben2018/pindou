import { useState, useEffect } from "react";
import "../App.css";
import { loadColorTable, loadColorCards } from "../utils/colorTable";
import type { ColorCard } from "../utils/colorTable";
import type { SelectedColors } from "../context/PixelArtContext";
import ColorSelectorModal from "../components/ColorSelectorModal";
import ImageCropRotateModal from "../components/ImageCropRotateModal";
import { useBeadRecognition } from "../hooks/useBeadRecognition";
import { Button, Upload, message, Progress, Collapse } from "antd";

/** 检查页 - 拼豆识别：上传照片 → 选标准色 → 开始识别 → 查看结果 */
export default function CheckPage() {
  const [colorTable, setColorTable] = useState<ColorCard[]>([]);
  const [colorCards, setColorCards] = useState<Record<string, { name: string; color: string }[]>>({});
  const [colorCardsLoading, setColorCardsLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cropModalVisible, setCropModalVisible] = useState(false);
  const [colorModalVisible, setColorModalVisible] = useState(false);
  const [selectedColors, setSelectedColors] = useState<SelectedColors>({});

  const selectedColorCards: ColorCard[] = [];
  Object.keys(selectedColors).forEach((brand) => {
    (selectedColors[brand] || []).forEach((name) => {
      const card = colorTable.find((c) => c.brand === brand && c.name === name);
      if (card) selectedColorCards.push(card);
    });
  });
  const {
    recognize,
    result,
    progress,
    stage,
    loading,
    error,
    ensureOpenCV,
  } = useBeadRecognition({ selectedColorCards });

  useEffect(() => {
    setColorCardsLoading(true);
    Promise.all([loadColorTable(), loadColorCards()])
      .then(([table, cards]) => {
        setColorTable(table);
        setColorCards(cards);
      })
      .catch(() => message.error("加载色表失败"))
      .finally(() => setColorCardsLoading(false));
  }, []);

  useEffect(() => {
    ensureOpenCV();
  }, [ensureOpenCV]);

  const handleUpload = (f: File | null) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (!f) {
      setFile(null);
      setPreviewUrl(null);
      return;
    }
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const handleCropConfirm = (editedFile: File) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(editedFile);
    setPreviewUrl(URL.createObjectURL(editedFile));
    setCropModalVisible(false);
  };

  const handleRecognize = async () => {
    if (!file) {
      message.warning("请先上传拼豆板照片");
      return;
    }
    if (selectedColorCards.length === 0) {
      message.warning("请先选择标准色");
      return;
    }
    const res = await recognize(file);
    if (!res.success) {
      message.error(res.errors[0] ?? "识别失败");
    } else {
      message.success(`识别完成，共 ${res.beads.length} 颗拼豆`);
    }
  };

  const beadGrid = result?.success && result.beads.length > 0
    ? (() => {
        const map = new Map<string, string>();
        result.beads.forEach((b) => map.set(`${b.row},${b.col}`, b.color));
        return {
          rows: result.metadata.gridRows,
          cols: result.metadata.gridCols,
          getColor: (r: number, c: number) => map.get(`${r},${c}`) ?? "#e0e0e0",
        };
      })()
    : null;

  const cellSize = 16;

  return (
    <div className="App">
      <h2 className="pretty-title">拼豆识别检查</h2>
      <p style={{ color: "#2c3e50", fontFamily: "zh-cn-full, sans-serif", marginBottom: 16 }}>
        上传拼豆板照片，选择标准色后点击「开始识别」，在浏览器内自动识别每颗拼豆的颜色与坐标。
      </p>

      <div className="pretty-section" style={{ marginBottom: 16 }}>
        <div className="pretty-label">1. 上传拼豆板照片</div>
        <Upload
          accept="image/jpeg,image/png,image/webp"
          showUploadList={false}
          beforeUpload={(f) => {
            handleUpload(f as File);
            return false;
          }}
        >
          <Button size="small">选择图片 (JPG/PNG)</Button>
        </Upload>
        {previewUrl && (
          <div style={{ marginTop: 8 }}>
            <div style={{ textAlign: "center", marginBottom: 8 }}>
              <img
                src={previewUrl}
                alt="预览"
                style={{ maxWidth: 280, maxHeight: 180, border: "1px solid #ddd" }}
              />
            </div>
            <Button size="small" onClick={() => setCropModalVisible(true)}>
              旋转与裁剪
            </Button>
          </div>
        )}
      </div>

      <ImageCropRotateModal
        open={cropModalVisible}
        imageSrc={previewUrl}
        onConfirm={handleCropConfirm}
        onCancel={() => setCropModalVisible(false)}
      />

      <div className="pretty-section" style={{ marginBottom: 16 }}>
        <div className="pretty-label">2. 选择可用标准色（已选 {selectedColorCards.length} 个）</div>
        <Button
          size="small"
          onClick={() => setColorModalVisible(true)}
        >
          选择标准色
        </Button>
        <ColorSelectorModal
          open={colorModalVisible}
          onOk={() => setColorModalVisible(false)}
          onCancel={() => setColorModalVisible(false)}
          colorCards={colorCards}
          colorCardsLoading={colorCardsLoading}
          selectedColors={selectedColors}
          onSelectedColorsChange={setSelectedColors}
        />
      </div>

      <div className="pretty-section" style={{ marginBottom: 16 }}>
        <div className="pretty-label">3. 开始识别</div>
        <Button
          type="primary"
          size="small"
          disabled={!file || selectedColorCards.length === 0 || loading}
          onClick={handleRecognize}
        >
          {loading ? "识别中…" : "开始识别"}
        </Button>
        {loading && (
          <div style={{ marginTop: 8 }}>
            <Progress percent={Math.round(progress)} size="small" />
            <div style={{ fontSize: 12, color: "#666" }}>{stage}</div>
          </div>
        )}
        {error && (
          <div style={{ marginTop: 8, color: "#c00", fontSize: 13 }}>{error}</div>
        )}
      </div>

      {result?.success && beadGrid && (
        <div className="pretty-section">
          <div className="pretty-label">识别结果</div>
          <div style={{ fontSize: 13, color: "#2c3e50", marginBottom: 8 }}>
            共 {result.metadata.totalBeads} 颗 · 网格 {beadGrid.rows}×{beadGrid.cols} · 耗时 {result.metadata.processingTime.toFixed(2)}s
          </div>
          <div
            style={{
              display: "inline-block",
              border: "1px solid #ccc",
              lineHeight: 0,
              fontSize: 0,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${beadGrid.cols}, ${cellSize}px)`,
                gridTemplateRows: `repeat(${beadGrid.rows}, ${cellSize}px)`,
                width: beadGrid.cols * cellSize,
                height: beadGrid.rows * cellSize,
              }}
            >
              {Array.from({ length: beadGrid.rows * beadGrid.cols }, (_, i) => {
                const r = Math.floor(i / beadGrid.cols);
                const c = i % beadGrid.cols;
                return (
                  <div
                    key={`${r}-${c}`}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      backgroundColor: beadGrid.getColor(r, c),
                      border: "1px solid rgba(0,0,0,0.08)",
                      boxSizing: "border-box",
                    }}
                    title={`${r},${c}`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}

      {result && result.debug && (
        <div className="pretty-section" style={{ marginTop: 16 }}>
          <Collapse
            items={[
              {
                key: "1",
                label: "🔧 调试信息（用于排查检测过少/过多）",
                children: (
                  <pre style={{ fontSize: 12, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                    {[
                      `图像尺寸: ${result.debug.imageWidth} × ${result.debug.imageHeight}`,
                      `Hough 输出 Mat: rows=${result.debug.houghMatRows}, cols=${result.debug.houghMatCols}, dataLength=${result.debug.houghDataLength}`,
                      `解析出的圆(原始): ${result.debug.rawCirclesParsed}`,
                      `亚像素精修后: ${result.debug.afterRefinement}`,
                      `过滤后: ${result.debug.afterFilter}`,
                      `网格间距(估算): ${result.debug.gridSpacing.toFixed(1)}px`,
                      `检测参数: minR=${result.debug.params.minRadius} maxR=${result.debug.params.maxRadius} minDist=${result.debug.params.minDistance} param1(canny)=${result.debug.params.param1} param2(累加器)=${result.debug.params.param2}`,
                    ].join("\n")}
                  </pre>
                ),
              },
            ]}
          />
          <p style={{ fontSize: 12, color: "#666", marginTop: 8 }}>
            若「解析出的圆」很少：可尝试调低 param2（累加器阈值）或调小 minRadius；打开控制台可看到更详细日志。
          </p>
        </div>
      )}
    </div>
  );
}
