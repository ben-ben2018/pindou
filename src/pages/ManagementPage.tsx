import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";
import { useSavedPatterns } from "../hooks/useSavedPatterns";
import { renderPixelDataToDataUrl } from "../utils/pixelArt";
import { Button, Spin, Empty, Modal } from "antd";

/** 管理页 - 路由 /manage：查看、编辑、删除本地保存的拼豆图纸 */
export default function ManagementPage() {
  const navigate = useNavigate();
  const { patterns, loading, error, removePattern, refresh } = useSavedPatterns();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleDelete = (id: string, name: string) => {
    Modal.confirm({
      title: "删除图纸",
      content: `确定要删除「${name}」吗？`,
      okText: "删除",
      okType: "danger",
      cancelText: "取消",
      onOk: async () => {
        await removePattern(id);
      },
    });
  };

  const handleEdit = (id: string) => {
    navigate(`/create?patternId=${encodeURIComponent(id)}`);
  };

  const handlePreview = (p: (typeof patterns)[0]) => {
    const url = renderPixelDataToDataUrl(p.pixelData, {
      cellSize: p.cellSize,
      maxWidth: 600,
    });
    setPreviewUrl(url);
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="App">
        <h2 className="pretty-title">管理图纸</h2>
        <div style={{ textAlign: "center", padding: 48 }}>
          <Spin size="large" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="App">
        <h2 className="pretty-title">管理图纸</h2>
        <p style={{ color: "#c0392b" }}>加载失败：{error.message}</p>
        <Button onClick={refresh}>重试</Button>
      </div>
    );
  }

  return (
    <div className="App">
      <h2 className="pretty-title">管理图纸</h2>
      <p style={{ color: "#2c3e50", fontFamily: "zh-cn-full, sans-serif", marginBottom: 16 }}>
        保存的是原始数据，可在此编辑、删除或预览。
      </p>
      <Button type="primary" onClick={refresh} style={{ marginBottom: 16 }}>
        刷新
      </Button>

      {patterns.length === 0 ? (
        <Empty description="暂无保存的图纸" style={{ marginTop: 48 }} />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 16,
          }}
        >
          {patterns.map((p) => {
            const thumbUrl = renderPixelDataToDataUrl(p.pixelData, { maxWidth: 200 });
            return (
              <div
                key={p.id}
                style={{
                  border: "1px solid #e8e8e8",
                  borderRadius: 8,
                  overflow: "hidden",
                  background: "#fafafa",
                }}
              >
                <div
                  style={{ cursor: "pointer", background: "#fff" }}
                  onClick={() => handlePreview(p)}
                >
                  <img
                    src={thumbUrl}
                    alt={p.name}
                    style={{
                      width: "100%",
                      height: 140,
                      objectFit: "contain",
                      display: "block",
                    }}
                  />
                </div>
                <div style={{ padding: "8px 12px" }}>
                  <div
                    style={{
                      fontWeight: 600,
                      marginBottom: 4,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={p.name}
                  >
                    {p.name}
                  </div>
                  <div style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>
                    {formatTime(p.updatedAt)}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Button type="primary" size="small" onClick={() => handleEdit(p.id)}>
                      编辑
                    </Button>
                    <Button
                      type="link"
                      danger
                      size="small"
                      onClick={() => handleDelete(p.id, p.name)}
                    >
                      删除
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        title="预览"
        open={!!previewUrl}
        onCancel={() => setPreviewUrl(null)}
        footer={null}
        width="90%"
        styles={{ body: { textAlign: "center" } }}
      >
        {previewUrl && (
          <img src={previewUrl} alt="预览" style={{ maxWidth: "100%", height: "auto" }} />
        )}
      </Modal>
    </div>
  );
}
