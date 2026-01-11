import React from 'react';
import { Modal, Checkbox, Button, Row, Col, Divider } from 'antd';

interface ColorItem {
  code: string;
  hex: string;
}

interface ColorSelectorModalProps {
  visible: boolean;
  onOk: () => void;
  onCancel: () => void;
  colorList: ColorItem[];
  selectedColors: string[];
  onChange: (checkedValues: string[]) => void;
  onSelectAll: () => void;
  onSelectAM: () => void;
  onClear: () => void;
}

const ColorSelectorModal: React.FC<ColorSelectorModalProps> = ({
  visible,
  onOk,
  onCancel,
  colorList,
  selectedColors,
  onChange,
  onSelectAll,
  onSelectAM,
  onClear
}) => {
  // 色号A-M
  const amCodes = colorList.filter(c => /^[A-M]/i.test(c.code)).map(c => c.code);

  return (
    <Modal
      title="选择可用标准色"
      open={visible}
      onOk={onOk}
      onCancel={onCancel}
      footer={null}
      width={700}
      styles={{ body: { maxHeight: 480, overflowY: 'auto', background: '#fff0f6' } }}
    >
      <div style={{ marginBottom: 12, textAlign: 'right' }}>
        <Button size="small" style={{ marginRight: 8, background: '#ffb6c1', borderColor: '#ffb6c1' }} onClick={onSelectAll}>全选</Button>
        <Button size="small" style={{ marginRight: 8, background: '#ffe4ec', borderColor: '#ffe4ec' }} onClick={onSelectAM}>仅A-M</Button>
        <Button size="small" onClick={onClear}>清空</Button>
      </div>
      <Divider style={{ margin: '8px 0' }} />
      <Checkbox.Group
        value={selectedColors}
        onChange={onChange}
        style={{ width: '100%' }}
      >
        <Row gutter={[8, 8]}>
          {colorList.map(color => (
            <Col span={4} key={color.code}>
              <div style={{ display: 'flex', alignItems: 'center', padding: 4, borderRadius: 6, background: selectedColors.includes(color.code) ? '#ffe4ec' : '#fff' }}>
                <Checkbox value={color.code} style={{ marginRight: 6 }} />
                <span style={{ display: 'inline-block', width: 18, height: 18, background: color.hex, borderRadius: 4, border: '1px solid #eee', marginRight: 6 }} />
                <span style={{ fontWeight: 500 }}>{color.code}</span>
              </div>
            </Col>
          ))}
        </Row>
      </Checkbox.Group>
      <Divider style={{ margin: '8px 0' }} />
      <div style={{ textAlign: 'right' }}>
        <Button type="primary" style={{ background: '#ffb6c1', borderColor: '#ffb6c1', marginRight: 8 }} onClick={onOk}>确定</Button>
        <Button onClick={onCancel}>取消</Button>
      </div>
    </Modal>
  );
};

export default ColorSelectorModal;

