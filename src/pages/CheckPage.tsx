import { useState, useEffect } from "react";
import "../App.css";
import { loadColorTable, loadColorCards } from "../utils/colorTable";
import type { ColorCard } from "../utils/colorTable";
import type { SelectedColors } from "../context/PixelArtContext";
import ColorSelectorModal from "../components/ColorSelectorModal";
import { useBeadRecognition } from "../hooks/useBeadRecognition";
import { Button, Upload, message, Progress, Table } from "antd";

/** 检查页 - 拼豆识别：上传照片 → 选标准色 → 开始识别 → 查看结果 */
export default function CheckPage() {
  const [colorTable, setColorTable] = useState<ColorCard[]>([]);
  const [colorCards, setColorCards] = useState<Record<string, { name: string; color: string }[]>>({});
  const [colorCardsLoading, setColorCardsLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
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

  const columns = [
    { title: "行", dataIndex: "row", width: 60 },
    { title: "列", dataIndex: "col", width: 60 },
    {
      title: "颜色",
      dataIndex: "color",
      width: 80,
      render: (hex: string) => (
        <span
          style={{
            display: "inline-block",
            width: 20,
            height: 20,
            backgroundColor: hex,
            border: "1px solid #ccc",
            verticalAlign: "middle",
          }}
        />
      ),
    },
    { title: "色号", dataIndex: "colorName" },
    { title: "置信度", dataIndex: "confidence", render: (v: number) => (v * 100).toFixed(0) + "%" },
  ];

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
          <div style={{ marginTop: 8, textAlign: "center" }}>
            <img
              src={previewUrl}
              alt="预览"
              style={{ maxWidth: 280, maxHeight: 180, border: "1px solid #ddd" }}
            />
          </div>
        )}
      </div>

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

      {result?.success && result.beads.length > 0 && (
        <div className="pretty-section">
          <div className="pretty-label">识别结果</div>
          <div style={{ fontSize: 13, color: "#2c3e50", marginBottom: 8 }}>
            共 {result.metadata.totalBeads} 颗 · 网格 {result.metadata.gridRows}×{result.metadata.gridCols} · 耗时 {result.metadata.processingTime.toFixed(2)}s
          </div>
          <Table
            dataSource={result.beads}
            columns={columns}
            rowKey={(r) => `${r.row}-${r.col}`}
            pagination={{ pageSize: 20 }}
            size="small"
            scroll={{ x: 400 }}
          />
        </div>
      )}
    </div>
  );
}
