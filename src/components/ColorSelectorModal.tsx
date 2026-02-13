import React from "react";
import { Modal, Checkbox, Button, Tabs, Spin } from "antd";
import type { ColorCards } from "../utils/colorTable";
import type { SelectedColors } from "../context/PixelArtContext";

const BRAND_NAME_MAP: Record<string, string> = {
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

export interface ColorSelectorModalProps {
  open: boolean;
  onCancel: () => void;
  onOk?: () => void;
  colorCards: ColorCards;
  colorCardsLoading: boolean;
  selectedColors: SelectedColors;
  onSelectedColorsChange: (v: SelectedColors) => void;
}

const ColorSelectorModal: React.FC<ColorSelectorModalProps> = ({
  open,
  onCancel,
  onOk,
  colorCards,
  colorCardsLoading,
  selectedColors,
  onSelectedColorsChange,
}) => {
  const handleSelectAll = () => {
    const allSelected: SelectedColors = {};
    Object.keys(colorCards).forEach((brand) => {
      allSelected[brand] = colorCards[brand].map((c) => c.name);
    });
    onSelectedColorsChange(allSelected);
  };

  const handleClear = () => {
    onSelectedColorsChange({});
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

  const handleToggleBrand = (brand: string) => {
    const brandColors = colorCards[brand] || [];
    const brandColorNames = brandColors.map((c) => c.name);
    const currentSelected = selectedColors[brand] || [];
    const allSelected = brandColorNames.every((name) => currentSelected.includes(name));
    if (allSelected) {
      const next = { ...selectedColors };
      delete next[brand];
      onSelectedColorsChange(next);
    } else {
      onSelectedColorsChange({ ...selectedColors, [brand]: brandColorNames });
    }
  };

  const handleOk = () => {
    onOk?.();
    onCancel();
  };

  return (
    <Modal
      title="选择色号"
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      okText="确定"
      cancelText="取消"
      width={900}
      style={{ top: 20 }}
      styles={{ body: { maxHeight: "70vh", overflowY: "auto" } }}
    >
      <div style={{ marginBottom: 16 }}>
        <Button size="small" onClick={handleSelectAll} style={{ marginRight: 8 }}>
          全选所有
        </Button>
        <Button size="small" onClick={handleClear}>
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
            const brandDisplayName = BRAND_NAME_MAP[brand] || brand;
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
                    onChange={(checkedValues) =>
                      onSelectedColorsChange({
                        ...selectedColors,
                        [brand]: checkedValues as string[],
                      })
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
                            style={{
                              width: 130,
                              marginBottom: 4,
                              display: "flex",
                              alignItems: "center",
                            }}
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
      )}
    </Modal>
  );
};

export default ColorSelectorModal;
