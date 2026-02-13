import React, { useState } from "react";
import { Drawer, Button, message } from "antd";
import { PlusOutlined, MinusOutlined } from "@ant-design/icons";
import "./BeadPatternEditor.css";
import type { ColorCard, ColorCards } from "../utils/colorTable";
import type { PixelColor } from "../utils/pixelArt";

export interface SelectedColors {
  [brand: string]: string[];
}

interface SelectedCell {
  row: number;
  col: number;
  color: PixelColor;
}

export interface BeadPatternEditorProps {
  pixelData: PixelColor[][];
  selectedColors: SelectedColors;
  colorCards: ColorCards;
  colorTable: ColorCard[];
  onUpdatePixelData: (newPixelData: PixelColor[][]) => void;
}

/**
 * 拼豆图纸编辑组件：基于原可视化编辑视图，用于在创建页内联编辑格子和色号。
 */
const BeadPatternEditor: React.FC<BeadPatternEditorProps> = ({
  pixelData,
  selectedColors,
  colorTable,
  onUpdatePixelData,
}) => {
  const [highlightedRow, setHighlightedRow] = useState<number | null>(null);
  const [highlightedCol, setHighlightedCol] = useState<number | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);
  /** 抽屉内选中的颜色，仅点击保存后才写入 pixelData */
  const [pendingColor, setPendingColor] = useState<PixelColor | null>(null);
  const [cellSize, setCellSize] = useState(30);
  const [fontSize, setFontSize] = useState(10);

  if (!pixelData || pixelData.length === 0) {
    return (
      <div className="bead-pattern-editor">
        <div style={{ textAlign: "center", marginTop: 40, color: "#666" }}>
          暂无像素画数据
        </div>
      </div>
    );
  }

  const pixelWidth = pixelData[0]?.length || 0;

  const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
    const h = hex.replace("#", "");
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    };
  };

  const getAvailableColors = (): PixelColor[] => {
    const result: PixelColor[] = [];
    Object.keys(selectedColors).forEach((brand) => {
      const colorNames = selectedColors[brand] || [];
      colorNames.forEach((name) => {
        const color = colorTable.find((c) => c.brand === brand && c.name === name);
        if (color) {
          const hex = color.hex.startsWith("#") ? color.hex : "#" + color.hex;
          const rgb = hexToRgb(hex);
          result.push({
            ...color,
            hex: hex.toUpperCase(),
            ...rgb,
          });
        }
      });
    });
    return result;
  };

  const availableColors = getAvailableColors();

  const handleCellClick = (row: number, col: number) => {
    const color = pixelData[row][col];
    setSelectedCell({ row, col, color });
    setPendingColor(normalizePixelColor(color));
    setDrawerVisible(true);
  };

  const normalizePixelColor = (c: PixelColor): PixelColor => ({
    ...c,
    hex: c.hex?.startsWith("#") ? c.hex : "#" + (c.hex || "").toUpperCase(),
    r: c.r ?? 0,
    g: c.g ?? 0,
    b: c.b ?? 0,
  });

  /** 抽屉内只更新待选颜色，不写入 pixelData */
  const handleSelectPendingColor = (newColor: PixelColor) => {
    setPendingColor(normalizePixelColor(newColor));
  };

  const handleDrawerSave = () => {
    if (!selectedCell || !pendingColor) return;
    const { row, col } = selectedCell;
    const newPixelData = pixelData.map((r, rIdx) =>
      rIdx === row
        ? r.map((c, cIdx) => (cIdx === col ? pendingColor : c))
        : r
    );
    onUpdatePixelData(newPixelData);
    setSelectedCell({ ...selectedCell, color: pendingColor });
    setDrawerVisible(false);
    message.success("颜色已保存");
  };

  const handleDrawerCancel = () => {
    setDrawerVisible(false);
  };

  const handleRowClick = (row: number) => {
    if (highlightedRow === row) setHighlightedRow(null);
    else {
      setHighlightedRow(row);
      setHighlightedCol(null);
    }
  };

  const handleColClick = (col: number) => {
    if (highlightedCol === col) setHighlightedCol(null);
    else {
      setHighlightedCol(col);
      setHighlightedRow(null);
    }
  };

  const handleCellSizeChange = (delta: number) => {
    setCellSize((s) => Math.max(16, Math.min(80, s + delta)));
  };

  const handleFontSizeChange = (delta: number) => {
    setFontSize((f) => Math.max(6, Math.min(24, f + delta)));
  };

  const headerCellSize = Math.max(20, Math.min(cellSize * 0.7, 50));

  return (
    <div className="bead-pattern-editor">
      <div className="bead-pattern-editor-header">
        <h3 style={{ margin: 0, color: "#2c3e50", fontSize: "1.25rem" }}>编辑像素格</h3>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, color: "#2c3e50" }}>单元格:</span>
            <Button
              icon={<MinusOutlined />}
              size="small"
              onClick={() => handleCellSizeChange(-2)}
              disabled={cellSize <= 16}
            />
            <span style={{ minWidth: 40, textAlign: "center", fontSize: 13, color: "#2c3e50" }}>
              {cellSize}px
            </span>
            <Button
              icon={<PlusOutlined />}
              size="small"
              onClick={() => handleCellSizeChange(2)}
              disabled={cellSize >= 80}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, color: "#2c3e50" }}>文字:</span>
            <Button
              icon={<MinusOutlined />}
              size="small"
              onClick={() => handleFontSizeChange(-1)}
              disabled={fontSize <= 6}
            />
            <span style={{ minWidth: 40, textAlign: "center", fontSize: 13, color: "#2c3e50" }}>
              {fontSize}px
            </span>
            <Button
              icon={<PlusOutlined />}
              size="small"
              onClick={() => handleFontSizeChange(1)}
              disabled={fontSize >= 24}
            />
          </div>
        </div>
      </div>

      <div className="bead-pattern-editor-content">
        <div className="bead-pattern-editor-table-wrapper">
          <table className="bead-pattern-editor-table">
            <thead>
              <tr>
                <th className="corner-cell" style={{ minWidth: headerCellSize, width: headerCellSize, height: headerCellSize * 0.7 }} />
                {Array.from({ length: pixelWidth }, (_, col) => (
                  <th
                    key={`top-${col}`}
                    className={`col-header-cell ${highlightedCol === col ? "highlighted" : ""}`}
                    onClick={() => handleColClick(col)}
                    style={{ minWidth: headerCellSize, width: headerCellSize, height: headerCellSize * 0.7, fontSize: Math.max(9, headerCellSize * 0.4) }}
                  >
                    {col + 1}
                  </th>
                ))}
                <th className="corner-cell" style={{ minWidth: headerCellSize, width: headerCellSize, height: headerCellSize * 0.7 }} />
              </tr>
            </thead>
            <tbody>
              {pixelData.map((row, rowIdx) => (
                <tr key={rowIdx}>
                  <td
                    className={`row-header-cell ${highlightedRow === rowIdx ? "highlighted" : ""}`}
                    onClick={() => handleRowClick(rowIdx)}
                    style={{ minWidth: headerCellSize, width: headerCellSize, height: cellSize, fontSize: Math.max(9, headerCellSize * 0.4) }}
                  >
                    {rowIdx + 1}
                  </td>
                  {row.map((cell, colIdx) => {
                    const isSelected = selectedCell?.row === rowIdx && selectedCell?.col === colIdx;
                    const isHighlighted = highlightedRow === rowIdx || highlightedCol === colIdx;
                    return (
                      <td
                        key={colIdx}
                        className={`pixel-cell ${isHighlighted ? "highlighted" : ""} ${isSelected ? "selected" : ""}`}
                        style={{
                          backgroundColor: cell.hex?.startsWith("#") ? cell.hex : "#" + (cell.hex || "").toUpperCase(),
                          width: cellSize,
                          height: cellSize,
                          minWidth: cellSize,
                          minHeight: cellSize,
                          maxWidth: cellSize,
                          maxHeight: cellSize,
                        }}
                        onClick={() => handleCellClick(rowIdx, colIdx)}
                        title={`行${rowIdx + 1} 列${colIdx + 1}: ${cell.name || ""}`}
                      >
                        <span className="cell-label" style={{ fontSize, maxWidth: cellSize, width: cellSize }}>
                          {cell.name || ""}
                        </span>
                      </td>
                    );
                  })}
                  <td
                    className={`row-header-cell ${highlightedRow === rowIdx ? "highlighted" : ""}`}
                    onClick={() => handleRowClick(rowIdx)}
                    style={{ minWidth: headerCellSize, width: headerCellSize, height: cellSize, fontSize: Math.max(9, headerCellSize * 0.4) }}
                  >
                    {rowIdx + 1}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th className="corner-cell" style={{ minWidth: headerCellSize, width: headerCellSize, height: headerCellSize * 0.7 }} />
                {Array.from({ length: pixelWidth }, (_, col) => (
                  <th
                    key={`bot-${col}`}
                    className={`col-header-cell ${highlightedCol === col ? "highlighted" : ""}`}
                    onClick={() => handleColClick(col)}
                    style={{ minWidth: headerCellSize, width: headerCellSize, height: headerCellSize * 0.7, fontSize: Math.max(9, headerCellSize * 0.4) }}
                  >
                    {col + 1}
                  </th>
                ))}
                <th className="corner-cell" style={{ minWidth: headerCellSize, width: headerCellSize, height: headerCellSize * 0.7 }} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <Drawer
        title={`编辑 - 行${selectedCell?.row !== undefined ? selectedCell.row + 1 : ""} 列${selectedCell?.col !== undefined ? selectedCell.col + 1 : ""}`}
        placement="right"
        onClose={handleDrawerCancel}
        open={drawerVisible}
        width={400}
        footer={
          <div className="bead-pattern-editor-drawer-footer">
            <Button onClick={handleDrawerCancel}>取消</Button>
            <Button type="primary" onClick={handleDrawerSave}>
              保存
            </Button>
          </div>
        }
      >
        {selectedCell && pendingColor !== null && (
          <>
            <div className="drawer-section">
              <h4>当前格子颜色</h4>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 16, background: "#f5f5f5", borderRadius: 8, marginBottom: 16 }}>
                <div
                  style={{
                    width: 60,
                    height: 60,
                    backgroundColor: selectedCell.color.hex?.startsWith("#") ? selectedCell.color.hex : "#" + (selectedCell.color.hex || "").toUpperCase(),
                    border: "2px solid #ddd",
                    borderRadius: 4,
                  }}
                />
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{selectedCell.color.name || "未知"}</div>
                  <div style={{ color: "#666", fontSize: 12 }}>
                    {selectedCell.color.hex?.startsWith("#") ? selectedCell.color.hex : "#" + (selectedCell.color.hex || "").toUpperCase()}
                  </div>
                </div>
              </div>
            </div>
            <div className="drawer-section">
              <h4>选择新颜色</h4>
              <div style={{ marginTop: 16 }}>
                {availableColors.length === 0 ? (
                  <div style={{ color: "#999", textAlign: "center", padding: 20 }}>暂无可用颜色，请先选择标准色</div>
                ) : (
                  <div className="color-selector-grid bead-pattern-editor-color-grid">
                    {availableColors.map((color) => {
                      const isPending =
                        color.name === pendingColor.name &&
                        (color.brand === pendingColor.brand || (!color.brand && !pendingColor.brand));
                      const colorHex = color.hex?.startsWith("#") ? color.hex : "#" + (color.hex || "").toUpperCase();
                      return (
                        <div
                          key={`${color.brand || "default"}-${color.name}`}
                          className={`color-option bead-pattern-editor-color-option ${isPending ? "selected" : ""}`}
                          onClick={() => handleSelectPendingColor(color)}
                          title={isPending ? "当前选中（点击保存后生效）" : undefined}
                        >
                          <div className="color-option-swatch bead-pattern-editor-color-swatch" style={{ backgroundColor: colorHex }} />
                          <div className="color-option-name">{color.name}</div>
                          {isPending && <span className="color-option-current-badge bead-pattern-editor-color-current-badge">待保存</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </Drawer>
    </div>
  );
};

export default BeadPatternEditor;
