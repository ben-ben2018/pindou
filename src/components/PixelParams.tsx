import React, { useState, useEffect } from 'react';
import { InputNumber, Checkbox, Select, Row, Col, Tooltip } from 'antd';

const { Option } = Select;

const colorMethods = [
  { value: 'main', label: '主色' },
  { value: 'average', label: '平均色' },
  { value: 'center', label: '中心像素' },
  { value: 'scale', label: '缩放像素' },
  { value: 'diagonal4', label: '对角线4点' },
  { value: 'diagonal5', label: '对角线5点' },
];

interface PixelParamsProps {
  width: number;
  height: number;
  lockRatio: boolean;
  onChange: (width: number, height: number, lockRatio: boolean) => void;
  colorMethod: string;
  onColorMethodChange: (value: string) => void;
  originalWidth?: number;
  originalHeight?: number;
  excludeEdge: boolean;
  onExcludeEdgeChange: (checked: boolean) => void;
}

const PixelParams: React.FC<PixelParamsProps> = ({
  width,
  height,
  lockRatio,
  onChange,
  colorMethod,
  onColorMethodChange,
  originalWidth,
  originalHeight,
  excludeEdge,
  onExcludeEdgeChange,
}) => {
  const [w, setW] = useState(width);
  const [h, setH] = useState(height);
  const [lock, setLock] = useState(lockRatio);

  useEffect(() => {
    setW(width);
    setH(height);
    setLock(lockRatio);
  }, [width, height, lockRatio]);

  const handleWChange = (val: number | null) => {
    if (val === null) return;
    setW(val);
    if (lock && originalWidth && originalHeight) {
      const ratio = originalHeight / originalWidth;
      const newH = Math.round(val * ratio);
      setH(newH);
      onChange(val, newH, lock);
    } else {
      onChange(val, h, lock);
    }
  };

  const handleHChange = (val: number | null) => {
    if (val === null) return;
    setH(val);
    if (lock && originalWidth && originalHeight) {
      const ratio = originalWidth / originalHeight;
      const newW = Math.round(val * ratio);
      setW(newW);
      onChange(newW, val, lock);
    } else {
      onChange(w, val, lock);
    }
  };

  const handleLockChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLock(e.target.checked);
    onChange(w, h, e.target.checked);
  };

  return (
    <div style={{ background: '#fff0f6', padding: 16, borderRadius: 12, marginBottom: 16 }}>
      <Row gutter={12} align="middle">
        <Col span={12}>
          <div style={{ marginBottom: 8 }}>像素宽度：</div>
          <InputNumber min={1} max={200} value={w} onChange={handleWChange} style={{ width: '100%' }} />
        </Col>
        <Col span={12}>
          <div style={{ marginBottom: 8 }}>像素高度：</div>
          <InputNumber min={1} max={200} value={h} onChange={handleHChange} style={{ width: '100%' }} />
        </Col>
      </Row>
      <Row align="middle" style={{ marginTop: 8 }}>
        <Col span={24}>
          <Checkbox checked={lock} onChange={handleLockChange}>
            锁定长宽比
            {originalWidth && originalHeight && (
              <span style={{ color: '#888', marginLeft: 8 }}>
                (原始尺寸：{originalWidth} × {originalHeight})
              </span>
            )}
          </Checkbox>
        </Col>
      </Row>
      <Row align="middle" style={{ marginTop: 12 }}>
        <Col span={24}>
          <div style={{ marginBottom: 8 }}>取色方式：</div>
          <Select
            value={colorMethod}
            onChange={onColorMethodChange}
            style={{ width: '100%' }}
          >
            {colorMethods.map((m) => (
              <Option value={m.value} key={m.value}>{m.label}</Option>
            ))}
          </Select>
        </Col>
      </Row>
      <Row align="middle" style={{ marginTop: 12 }}>
        <Col span={24}>
          <Tooltip title="排除边缘像素，适合带边框或有杂色的图片">
            <Checkbox checked={excludeEdge} onChange={(e) => onExcludeEdgeChange(e.target.checked)}>
              排除边缘像素
            </Checkbox>
          </Tooltip>
        </Col>
      </Row>
    </div>
  );
};

export default PixelParams;

