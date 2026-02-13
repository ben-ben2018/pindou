import { useState } from "react";
import { Modal, Checkbox } from "antd";
import type { BeadPatternExportConfig } from "../models/BeadPattern";

export interface BeadPatternExportModalProps {
  open: boolean;
  onCancel: () => void;
  /** 用户确认导出时传入当前勾选配置 */
  onConfirm: (config: BeadPatternExportConfig) => void;
}

const defaultConfig: BeadPatternExportConfig = {
  showText: true,
  showReferenceLines: true,
};

/**
 * 通用导出弹窗：勾选「显示色号文字」「显示参考线」后确认，由父组件根据 config 执行导出并下载。
 */
export default function BeadPatternExportModal({
  open,
  onCancel,
  onConfirm,
}: BeadPatternExportModalProps) {
  const [showText, setShowText] = useState(defaultConfig.showText);
  const [showReferenceLines, setShowReferenceLines] = useState(defaultConfig.showReferenceLines);

  const handleOk = () => {
    onConfirm({ showText, showReferenceLines });
    onCancel();
  };

  return (
    <Modal
      title="导出设置"
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      okText="导出并下载"
      cancelText="取消"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
        <Checkbox checked={showText} onChange={(e) => setShowText(e.target.checked)}>
          显示色号文字
        </Checkbox>
        <Checkbox checked={showReferenceLines} onChange={(e) => setShowReferenceLines(e.target.checked)}>
          显示参考线（每5格加粗）
        </Checkbox>
      </div>
    </Modal>
  );
}
