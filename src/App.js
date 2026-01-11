import React, { useRef, useState, useEffect, useMemo } from "react";
import "./App.css";
import { loadColorTable, loadColorCards } from "./utils/colorTable";
import { generatePixelArt } from "./utils/pixelArt";
import VisualizationView from "./components/VisualizationView";
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

const { Option } = Select;

function App() {
  const [img, setImg] = useState(null);
  const [imgObj, setImgObj] = useState(null);
  const [pixelWidth, setPixelWidth] = useState(50);
  const [pixelHeight, setPixelHeight] = useState(50);
  const [cellSize, setCellSize] = useState(24);
  const [canvasUrl, setCanvasUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [lockRatio, setLockRatio] = useState(true);
  const [ratio, setRatio] = useState(1);
  const [colorMode, setColorMode] = useState("dominant");
  const [excludeEdge, setExcludeEdge] = useState(false);
  const [showText, setShowText] = useState(true); // 是否显示色号文字
  const [showReferenceLines, setShowReferenceLines] = useState(false); // 是否显示参考线（每5格加粗）
  const [colorTable, setColorTable] = useState([]); // 全部色号
  const [colorCards, setColorCards] = useState({}); // 按厂商分组的色卡
  const [showColorModal, setShowColorModal] = useState(false);
  const [selectedColors, setSelectedColors] = useState({}); // 用户选择的色号，按厂商分组 { mard: ['A1', 'A2'], hama: ['H01'], ... }
  const [previewModalVisible, setPreviewModalVisible] = useState(false); // 图片放大预览
  const [pixelData, setPixelData] = useState(null); // 存储像素画数据，用于可视化
  const [showVisualization, setShowVisualization] = useState(false); // 是否显示可视化页面
  const canvasRef = useRef();

  // 加载色号表
  useEffect(() => {
    Promise.all([loadColorTable(), loadColorCards()]).then(([table, cards]) => {
      setColorTable(table);
      setColorCards(cards);
      // 默认只选中Mard标准色，清空其他所有选择
      if (cards.mard && cards.mard.length > 0) {
        const mardColorNames = cards.mard.map((c) => c.name);
        setSelectedColors({ mard: mardColorNames });
      } else {
        setSelectedColors({});
      }
    });
  }, []);

  // 将选中的颜色拉平成一个数组，供生成像素画使用
  const flattenedSelectedColors = useMemo(() => {
    const result = [];
    Object.keys(selectedColors).forEach((brand) => {
      const colorNames = selectedColors[brand] || [];
      colorNames.forEach((name) => {
        // 从colorTable中找到对应的颜色对象（包含brand信息）
        const color = colorTable.find((c) => c.brand === brand && c.name === name);
        if (color) {
          result.push(color);
        }
      });
    });
    return result;
  }, [selectedColors, colorTable]);

  // 处理图片上传
  const handleUpload = (info) => {
    let file = null;
    if (info.file && info.file.originFileObj) {
      file = info.file.originFileObj;
    } else if (info.file) {
      file = info.file;
    }
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImg(url);
    const image = new window.Image();
    image.onload = () => {
      setImgObj(image);
      setRatio(image.width / image.height);
      if (lockRatio) {
        setPixelHeight(Math.round(pixelWidth / (image.width / image.height)));
      }
    };
    image.onerror = () => {
      message.error("图片加载失败，请换一张图片试试");
      setImgObj(null);
    };
    image.src = url;
  };

  // 宽度变化
  const handleWidthChange = (w) => {
    setPixelWidth(w);
    if (lockRatio && imgObj) {
      setPixelHeight(Math.round(w / ratio));
    }
  };
  // 高度变化
  const handleHeightChange = (h) => {
    setPixelHeight(h);
    if (lockRatio && imgObj) {
      setPixelWidth(Math.round(h * ratio));
    }
  };
  // 切换锁定
  const handleLockRatio = (checked) => {
    setLockRatio(checked);
    if (checked && imgObj) {
      setPixelHeight(Math.round(pixelWidth / ratio));
    }
  };

  // 生成像素画
  const handleGenerate = async () => {
    if (!imgObj) {
      message.error("请先上传图片");
      return;
    }
    setLoading(true);
    // 使用拉平后的选中颜色数组
    let useColors = colorTable;
    if (flattenedSelectedColors.length > 0) {
      useColors = flattenedSelectedColors;
    }
    setTimeout(() => {
      const { canvas, result } = generatePixelArt({
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
      setCanvasUrl(canvas.toDataURL("image/png"));
      canvasRef.current = canvas;
      setPixelData(result); // 保存像素画数据
      setLoading(false);
    }, 100);
  };

  // 下载像素画图片
  const handleDownloadImg = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.href = canvasRef.current.toDataURL("image/png");
    link.download = "像素画.png";
    link.click();
  };

  // 处理可视化页面更新像素数据
  const handleUpdatePixelData = (newPixelData) => {
    setPixelData(newPixelData);
    // 重新生成canvas
    if (imgObj && newPixelData) {
      const useColors = flattenedSelectedColors.length > 0 ? flattenedSelectedColors : colorTable;
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
        pixelData: newPixelData, // 传入新的像素数据
      });
      setCanvasUrl(canvas.toDataURL("image/png"));
      canvasRef.current = canvas;
    }
  };

  // 打开弹窗
  const handleOpenColorModal = () => {
    setShowColorModal(true);
  };

  // 全选/取消全选某个厂商
  const handleToggleBrand = (brand) => {
    const brandColors = colorCards[brand] || [];
    const brandColorNames = brandColors.map((c) => c.name);
    const currentSelected = selectedColors[brand] || [];
    const allSelected = brandColorNames.every((name) =>
      currentSelected.includes(name)
    );
    if (allSelected) {
      // 取消全选该厂商
      const newSelected = { ...selectedColors };
      delete newSelected[brand];
      setSelectedColors(newSelected);
    } else {
      // 全选该厂商
      setSelectedColors({
        ...selectedColors,
        [brand]: brandColorNames,
      });
    }
  };

  // 检查厂商是否全选
  const isBrandFullySelected = (brand) => {
    const brandColors = colorCards[brand] || [];
    if (brandColors.length === 0) return false;
    const currentSelected = selectedColors[brand] || [];
    return brandColors.every((c) => currentSelected.includes(c.name));
  };

  // 检查厂商是否部分选中
  const isBrandPartiallySelected = (brand) => {
    const brandColors = colorCards[brand] || [];
    if (brandColors.length === 0) return false;
    const currentSelected = selectedColors[brand] || [];
    const selectedCount = brandColors.filter((c) =>
      currentSelected.includes(c.name)
    ).length;
    return selectedCount > 0 && selectedCount < brandColors.length;
  };

  // 获取每个厂商的选中情况
  const getBrandSelectionInfo = () => {
    const brandNameMap = {
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
    
    const info = [];
    // 只统计有选中颜色的厂商
    Object.keys(selectedColors).forEach((brand) => {
      const brandColors = colorCards[brand] || [];
      const currentSelected = selectedColors[brand] || [];
      const selectedCount = currentSelected.length;
      
      if (selectedCount > 0) {
        const brandDisplayName = brandNameMap[brand] || brand;
        const isFullySelected = isBrandFullySelected(brand);
        info.push({
          brand: brandDisplayName,
          count: selectedCount,
          total: brandColors.length,
          isFullySelected,
        });
      }
    });
    return info;
  };

  // 如果显示可视化页面，则只显示可视化组件
  if (showVisualization) {
    return (
      <VisualizationView
        pixelData={pixelData}
        selectedColors={selectedColors}
        colorCards={colorCards}
        colorTable={colorTable}
        onClose={() => setShowVisualization(false)}
        onUpdatePixelData={handleUpdatePixelData}
      />
    );
  }

  return (
    <div className="App">
      <h2 className="pretty-title">鹤林爱拼豆</h2>
      <Divider />
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
            <img
              src={img}
              alt="预览"
              style={{ maxWidth: 180, maxHeight: 120 }}
            />
            {imgObj && (
              <div
                style={{
                  color: "#2c3e50",
                  fontSize: 13,
                  marginTop: 4,
                  fontFamily: "monospace",
                }}
              >
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
          <InputNumber
            min={2}
            max={200}
            value={pixelWidth}
            onChange={handleWidthChange}
          />
          <span style={{ marginLeft: 12 }}>高(格):</span>
          <InputNumber
            min={2}
            max={600}
            value={pixelHeight}
            onChange={handleHeightChange}
          />
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
          <InputNumber
            min={8}
            max={64}
            value={cellSize}
            onChange={setCellSize}
          />
        </div>
        <div className="pretty-param-row">
          <span>取色方式:</span>
          <Select
            value={colorMode}
            onChange={setColorMode}
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
          <Checkbox
            checked={excludeEdge}
            onChange={(e) => setExcludeEdge(e.target.checked)}
          >
            排除边缘像素（适合带网格线/格子有字的图片）
          </Checkbox>
        </div>
        <div className="pretty-param-row">
          <Checkbox
            checked={showText}
            onChange={(e) => setShowText(e.target.checked)}
          >
            显示色号文字
          </Checkbox>
        </div>
        <div className="pretty-param-row">
          <Checkbox
            checked={showReferenceLines}
            onChange={(e) => setShowReferenceLines(e.target.checked)}
          >
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
                  <span>
                    {info.isFullySelected ? "全选" : `${info.count}个`}
                  </span>
                </div>
              ))}
            </div>
          );
        })()}
      </div>
      <div
        className="pretty-section"
        style={{ textAlign: "center", marginTop: 18 }}
      >
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
              style={{
                maxWidth: "100%",
                margin: "0 auto",
                cursor: "pointer",
                display: "block",
              }}
              onClick={() => setPreviewModalVisible(true)}
            />
            <div
              style={{
                marginTop: 16,
                display: "flex",
                justifyContent: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <Button onClick={handleDownloadImg}>下载像素画图片</Button>
              <Button 
                type="primary" 
                onClick={() => setShowVisualization(true)}
                disabled={!pixelData}
              >
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
        bodyStyle={{ maxHeight: "70vh", overflowY: "auto" }}
      >
        <div style={{ marginBottom: 16 }}>
          <Button
            size="small"
            onClick={() => {
              // 全选所有厂商的所有颜色
              const allSelected = {};
              Object.keys(colorCards).forEach((brand) => {
                allSelected[brand] = colorCards[brand].map((c) => c.name);
              });
              setSelectedColors(allSelected);
            }}
            style={{ marginRight: 8 }}
          >
            全选所有
          </Button>
          <Button
            size="small"
            onClick={() => setSelectedColors({})}
          >
            清空
          </Button>
        </div>
        <Tabs
          defaultActiveKey={Object.keys(colorCards)[0]}
          items={Object.keys(colorCards).map((brand) => {
            const brandColors = colorCards[brand] || [];
            const brandNameMap = {
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
              label: (
                <span>
                  {brandDisplayName} ({brandColors.length})
                </span>
              ),
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
                      <span style={{ fontWeight: 600, fontSize: 15 }}>
                        全选 {brandDisplayName}
                      </span>
                    </Checkbox>
                  </div>
                  <Checkbox.Group
                    value={selectedColors[brand] || []}
                    onChange={(checkedValues) => {
                      setSelectedColors({
                        ...selectedColors,
                        [brand]: checkedValues,
                      });
                    }}
                    style={{ width: "100%" }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 8,
                      }}
                    >
                      {brandColors.map((color) => {
                        const hex = "#" + color.color.toUpperCase();
                        return (
                          <Checkbox
                            key={color.name}
                            value={color.name}
                            style={{
                              width: 130,
                              marginBottom: 4,
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                              }}
                            >
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
                              <span
                                style={{
                                  color: "#2c3e50",
                                  fontFamily: "monospace",
                                  fontSize: 13,
                                }}
                              >
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
      </Modal>
      <Modal
        title="像素画预览"
        open={previewModalVisible}
        onCancel={() => setPreviewModalVisible(false)}
        footer={null}
        width="90%"
        style={{ top: 20 }}
        bodyStyle={{ textAlign: "center", padding: 20 }}
      >
        {canvasUrl && (
          <img
            src={canvasUrl}
            alt="像素画放大预览"
            style={{ maxWidth: "100%", height: "auto" }}
          />
        )}
      </Modal>
    </div>
  );
}

export default App;
