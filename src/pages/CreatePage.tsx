import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";
import { loadColorTable, loadColorCards } from "../utils/colorTable";
import { generatePixelArt } from "../utils/pixelArt";
import type { ColorCard } from "../utils/colorTable";
import { usePixelArt } from "../context/PixelArtContext";
import {
  Button,
  InputNumber,
  Upload,
  message,
  Spin,
  Checkbox,
  Divider,
  Select,
  Modal,
  Tabs,
} from "antd";
import type { UploadChangeParam } from "antd/es/upload";
import type { UploadFile } from "antd/es/upload/interface";

const { Option } = Select;

interface BrandSelectionInfo {
  brand: string;
  count: number;
  total: number;
  isFullySelected: boolean;
}

export default function CreatePage() {
  const navigate = useNavigate();
  const {
    img,
    setImg,
    imgObj,
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
    lockRatio,
    setLockRatio,
    loading,
    setLoading,
  } = usePixelArt();

  const [colorCardsLoading, setColorCardsLoading] = useState(true);
  const [showColorModal, setShowColorModal] = useState(false);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);

  const flattenedSelectedColors = useMemo(() => {
    const result: ColorCard[] = [];
    Object.keys(selectedColors).forEach((brand) => {
      const colorNames = selectedColors[brand] || [];
      colorNames.forEach((name) => {
        const color = colorTable.find((c) => c.brand === brand && c.name === name);
        if (color) result.push(color);
      });
    });
    return result;
  }, [selectedColors, colorTable]);

  // 图片加载后、锁定比例时同步高度
  useEffect(() => {
    if (lockRatio && imgObj) {
      setPixelHeight(Math.round(pixelWidth / ratio));
    }
  }, [imgObj, ratio, lockRatio, pixelWidth]);

  // 有像素数据且已加载图片时同步生成画布（含从可视化编辑页返回后的更新）
  useEffect(() => {
    if (!imgObj || !pixelData || pixelData.length === 0) return;
    const useColors = flattenedSelectedColors.length > 0 ? flattenedSelectedColors : colorTable;
    if (useColors.length === 0) return;
    const { canvas } = generatePixelArt({
      img: imgObj,
      pixelWidth,
      pixelHeight,
      cellSize,
      colorTable: useColors,
      showGrid: true,
      colorMode,
      excludeEdge,
      showText,
      showReferenceLines,
      pixelData,
    });
    setCanvasUrl(canvas.toDataURL("image/png"));
    setCanvas(canvas);
  }, [
    imgObj,
    pixelData,
    pixelWidth,
    pixelHeight,
    cellSize,
    colorMode,
    excludeEdge,
    showText,
    showReferenceLines,
    flattenedSelectedColors,
    colorTable,
  ]);

  useEffect(() => {
    setColorCardsLoading(true);
    Promise.all([loadColorTable(), loadColorCards()])
      .then(([table, cards]) => {
        setColorTable(table);
        setColorCards(cards);
        if (cards.mard && cards.mard.length > 0) {
          setSelectedColors({ mard: cards.mard.map((c) => c.name) });
        } else {
          setSelectedColors({});
        }
      })
      .catch((err) => {
        console.error("加载色号表失败:", err);
        message.error("加载色号表失败，请刷新页面重试");
      })
      .finally(() => setColorCardsLoading(false));
  }, []);

  const handleUpload = (info: UploadChangeParam<UploadFile>) => {
    let file: File | null = null;
    if (info.file?.originFileObj) file = info.file.originFileObj;
    else if (info.file && "size" in info.file) file = info.file as unknown as File;
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImg(url);
  };

  const handleWidthChange = (w: number | null) => {
    if (w === null) return;
    setPixelWidth(w);
    if (lockRatio && imgObj) setPixelHeight(Math.round(w / ratio));
  };
  const handleHeightChange = (h: number | null) => {
    if (h === null) return;
    setPixelHeight(h);
    if (lockRatio && imgObj) setPixelWidth(Math.round(h * ratio));
  };
  const handleLockRatio = (checked: boolean) => {
    setLockRatio(checked);
    if (checked && imgObj) setPixelHeight(Math.round(pixelWidth / ratio));
  };

  const handleGenerate = async () => {
    if (!imgObj) {
      message.error("请先上传图片");
      return;
    }
    setLoading(true);
    const useColors = flattenedSelectedColors.length > 0 ? flattenedSelectedColors : colorTable;
    setTimeout(() => {
      const { result } = generatePixelArt({
        img: imgObj,
        pixelWidth,
        pixelHeight,
        cellSize,
        colorTable: useColors,
        showGrid: true,
        colorMode,
        excludeEdge,
        showText,
        showReferenceLines,
      });
      setPixelData(result);
      setLoading(false);
    }, 100);
  };

  const handleDownloadImg = () => {
    if (!canvas) return;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = "像素画.png";
    link.click();
  };

  const handleOpenColorModal = () => setShowColorModal(true);

  const handleToggleBrand = (brand: string) => {
    const brandColors = colorCards[brand] || [];
    const brandColorNames = brandColors.map((c) => c.name);
    const currentSelected = selectedColors[brand] || [];
    const allSelected = brandColorNames.every((name) => currentSelected.includes(name));
    if (allSelected) {
      const next = { ...selectedColors };
      delete next[brand];
      setSelectedColors(next);
    } else {
      setSelectedColors({ ...selectedColors, [brand]: brandColorNames });
    }
  };

  const isBrandFullySelected = (brand: string) => {
    const brandColors = colorCards[brand] || [];
    if (brandColors.length === 0) return false;
    const current = selectedColors[brand] || [];
    return brandColors.every((c) => current.includes(c.name));
  };
  const isBrandPartiallySelected = (brand: string) => {
    const brandColors = colorCards[brand] || [];
    if (brandColors.length === 0) return false;
    const current = selectedColors[brand] || [];
    const n = brandColors.filter((c) => current.includes(c.name)).length;
    return n > 0 && n < brandColors.length;
  };

  const getBrandSelectionInfo = (): BrandSelectionInfo[] => {
    const brandNameMap: Record<string, string> = {
      mard: "Mard",
      hama: "Hama",
      perler: "Perler",
      "perler-mini": "Perler Mini",
      nabbi: "Nabbi",
      "artkal-s": "Artkal S",
      "artkal-r": "Artkal R",
      "artkal-c": "Artkal C",
      "artkal-a": "Artkal A",
    };
    const info: BrandSelectionInfo[] = [];
    Object.keys(selectedColors).forEach((brand) => {
      const brandColors = colorCards[brand] || [];
      const current = selectedColors[brand] || [];
      if (current.length > 0) {
        info.push({
          brand: brandNameMap[brand] || brand,
          count: current.length,
          total: brandColors.length,
          isFullySelected: isBrandFullySelected(brand),
        });
      }
    });
    return info;
  };

  const goToVisualizationEdit = () => {
    if (!pixelData) return;
    navigate("/visualization-edit");
  };

  return (
    <div className="App">
      <div className="pretty-section">
        <div className="pretty-label">1. 选择图片</div>
        <Upload
          accept="image/*"
          showUploadList={false}
          beforeUpload={() => false}
          onChange={handleUpload}
        >
          <Button style={{ marginTop: 8, marginBottom: 8 }}>选择图片</Button>
        </Upload>
        {img && (
          <div style={{ margin: "8px 0 0 0", textAlign: "center" }}>
            <img src={img} alt="预览" style={{ maxWidth: 180, maxHeight: 120 }} />
            {imgObj && (
              <div style={{ color: "#2c3e50", fontSize: 13, marginTop: 4, fontFamily: "monospace" }}>
                原始尺寸：{imgObj.width} × {imgObj.height}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="pretty-section">
        <div className="pretty-label">2. 设置像素画参数</div>
        <div className="pretty-param-row">
          <span>宽(格):</span>
          <InputNumber min={2} max={200} value={pixelWidth} onChange={handleWidthChange} />
          <span style={{ marginLeft: 12 }}>高(格):</span>
          <InputNumber min={2} max={600} value={pixelHeight} onChange={handleHeightChange} />
          <Checkbox
            checked={lockRatio}
            onChange={(e) => handleLockRatio(e.target.checked)}
            style={{ marginLeft: 16 }}
          >
            锁定长宽比
          </Checkbox>
        </div>
        <div className="pretty-param-row">
          <span>单格像素(px):</span>
          <InputNumber min={8} max={64} value={cellSize} onChange={(val) => val !== null && setCellSize(val)} />
        </div>
        <div className="pretty-param-row">
          <span>取色方式:</span>
          <Select
            value={colorMode}
            onChange={(val) => setColorMode(val as import("../context/PixelArtContext").ColorMode)}
            style={{ width: 180 }}
          >
            <Option value="dominant">主色（面积最大）</Option>
            <Option value="average">平均色</Option>
            <Option value="center">中心像素色</Option>
            <Option value="original">自动</Option>
            <Option value="diagonal45">对角线4/5处像素色</Option>
          </Select>
        </div>
        <div className="pretty-param-row">
          <Checkbox checked={excludeEdge} onChange={(e) => setExcludeEdge(e.target.checked)}>
            排除边缘像素（适合带网格线/格子有字的图片）
          </Checkbox>
        </div>
        <div className="pretty-param-row">
          <Checkbox checked={showText} onChange={(e) => setShowText(e.target.checked)}>
            显示色号文字
          </Checkbox>
        </div>
        <div className="pretty-param-row">
          <Checkbox checked={showReferenceLines} onChange={(e) => setShowReferenceLines(e.target.checked)}>
            显示参考线（每5格加粗）
          </Checkbox>
        </div>
        <div className="pretty-param-row">
          <Button onClick={handleOpenColorModal}>选择标准色</Button>
        </div>
        {Object.keys(selectedColors).length > 0 && (() => {
          const brandInfo = getBrandSelectionInfo();
          return (
            <div
              style={{
                marginTop: 8,
                marginBottom: 8,
                padding: "8px 12px",
                background: "#f2f5fb",
                border: "1px solid #5a6c7d",
                fontSize: "0.9rem",
                color: "#2c3e50",
                fontFamily: "zh-cn-full, sans-serif",
              }}
            >
              {brandInfo.map((info, index) => (
                <div key={index} style={{ marginBottom: index < brandInfo.length - 1 ? 4 : 0 }}>
                  <span style={{ fontWeight: 600 }}>{info.brand}：</span>
                  <span>{info.isFullySelected ? "全选" : `${info.count}个`}</span>
                </div>
              ))}
            </div>
          );
        })()}
      </div>
      <div className="pretty-section" style={{ textAlign: "center", marginTop: 18 }}>
        <Button
          type="primary"
          onClick={handleGenerate}
          disabled={!imgObj}
          loading={loading}
          style={{ minWidth: 120 }}
        >
          生成像素画
        </Button>
      </div>
      <div style={{ margin: "32px 0 0 0", textAlign: "center" }}>
        {loading && <Spin />}
        {canvasUrl && (
          <div>
            <img
              src={canvasUrl}
              alt="像素画预览"
              style={{ maxWidth: "100%", margin: "0 auto", cursor: "pointer", display: "block" }}
              onClick={() => setPreviewModalVisible(true)}
            />
            <div style={{ marginTop: 16, display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
              <Button onClick={handleDownloadImg}>下载像素画图片</Button>
              <Button type="primary" onClick={goToVisualizationEdit} disabled={!pixelData}>
                进入可视化
              </Button>
            </div>
          </div>
        )}
      </div>

      <Modal
        title="选择色号"
        open={showColorModal}
        onCancel={() => setShowColorModal(false)}
        onOk={() => setShowColorModal(false)}
        okText="确定"
        cancelText="取消"
        width={900}
        style={{ top: 20 }}
        styles={{ body: { maxHeight: "70vh", overflowY: "auto" } }}
      >
        <div style={{ marginBottom: 16 }}>
          <Button
            size="small"
            onClick={() => {
              const allSelected: import("../context/PixelArtContext").SelectedColors = {};
              Object.keys(colorCards).forEach((brand) => {
                allSelected[brand] = colorCards[brand].map((c) => c.name);
              });
              setSelectedColors(allSelected);
            }}
            style={{ marginRight: 8 }}
          >
            全选所有
          </Button>
          <Button size="small" onClick={() => setSelectedColors({})}>
            清空
          </Button>
        </div>
        {colorCardsLoading ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <Spin size="large" />
            <div style={{ marginTop: 16, color: "#666" }}>加载色号表中...</div>
          </div>
        ) : Object.keys(colorCards).length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#999" }}>
            暂无色号数据，请检查 color_cards.json 文件
          </div>
        ) : (
          <Tabs
            defaultActiveKey={Object.keys(colorCards)[0] || ""}
            items={Object.keys(colorCards).map((brand) => {
              const brandColors = colorCards[brand] || [];
              const brandNameMap: Record<string, string> = {
                mard: "Mard",
                hama: "Hama",
                perler: "Perler",
                "perler-mini": "Perler Mini",
                nabbi: "Nabbi",
                "artkal-s": "Artkal S",
                "artkal-r": "Artkal R",
                "artkal-c": "Artkal C",
                "artkal-a": "Artkal A",
              };
              const brandDisplayName = brandNameMap[brand] || brand;
              const isFullySelected = isBrandFullySelected(brand);
              const isPartiallySelected = isBrandPartiallySelected(brand);
              return {
                key: brand,
                label: <span>{brandDisplayName} ({brandColors.length})</span>,
                children: (
                  <div style={{ padding: "16px 0" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        marginBottom: 16,
                        paddingBottom: 12,
                        borderBottom: "1px solid #f0f0f0",
                      }}
                    >
                      <Checkbox
                        indeterminate={isPartiallySelected}
                        checked={isFullySelected}
                        onChange={() => handleToggleBrand(brand)}
                        style={{ marginRight: 8 }}
                      >
                        <span style={{ fontWeight: 600, fontSize: 15 }}>全选 {brandDisplayName}</span>
                      </Checkbox>
                    </div>
                    <Checkbox.Group
                      value={selectedColors[brand] || []}
                      onChange={(checkedValues) =>
                        setSelectedColors({ ...selectedColors, [brand]: checkedValues as string[] })
                      }
                      style={{ width: "100%" }}
                    >
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {brandColors.map((color) => {
                          const hex = "#" + color.color.toUpperCase();
                          return (
                            <Checkbox
                              key={color.name}
                              value={color.name}
                              style={{ width: 130, marginBottom: 4, display: "flex", alignItems: "center" }}
                            >
                              <span style={{ display: "inline-flex", alignItems: "center" }}>
                                <span
                                  style={{
                                    display: "inline-block",
                                    width: 18,
                                    height: 18,
                                    background: hex,
                                    border: "1px solid #5a6c7d",
                                    marginRight: 6,
                                    verticalAlign: "middle",
                                  }}
                                />
                                <span style={{ color: "#2c3e50", fontFamily: "monospace", fontSize: 13 }}>
                                  {color.name} {hex}
                                </span>
                              </span>
                            </Checkbox>
                          );
                        })}
                      </div>
                    </Checkbox.Group>
                  </div>
                ),
              };
            })}
          />
        )}
      </Modal>
      <Modal
        title="像素画预览"
        open={previewModalVisible}
        onCancel={() => setPreviewModalVisible(false)}
        footer={null}
        width="90%"
        style={{ top: 20 }}
        styles={{ body: { textAlign: "center", padding: 20 } }}
      >
        {canvasUrl && (
          <img src={canvasUrl} alt="像素画放大预览" style={{ maxWidth: "100%", height: "auto" }} />
        )}
      </Modal>
    </div>
  );
}
