import React from 'react';
import { Button, Card, Row, Col, Tooltip } from 'antd';
import { DownloadOutlined, FileExcelOutlined } from '@ant-design/icons';

interface PreviewPanelProps {
  originalImage?: string;
  pixelImage?: string;
  originalWidth?: number;
  originalHeight?: number;
  onExportImage: () => void;
  onExportExcel: () => void;
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({
  originalImage,
  pixelImage,
  originalWidth,
  originalHeight,
  onExportImage,
  onExportExcel
}) => {
  return (
    <Card style={{ background: '#fff0f6', borderRadius: 12 }} styles={{ body: { padding: 16 } }}>
      <Row gutter={16}>
        <Col span={12} style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: 8, fontWeight: 500 }}>原图</div>
          {originalImage ? (
            <img
              src={originalImage}
              alt="原图"
              style={{ maxWidth: '100%', maxHeight: 220, borderRadius: 8, border: '2px solid #ffe4ec' }}
            />
          ) : (
            <div style={{ color: '#bbb', height: 220, lineHeight: '220px', background: '#fff', borderRadius: 8, border: '2px dashed #ffe4ec' }}>
              暂无图片
            </div>
          )}
          {originalWidth && originalHeight && (
            <div style={{ marginTop: 8, color: '#888' }}>
              原始尺寸：{originalWidth} × {originalHeight}
            </div>
          )}
        </Col>
        <Col span={12} style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: 8, fontWeight: 500 }}>像素画预览</div>
          {pixelImage ? (
            <img
              src={pixelImage}
              alt="像素画"
              style={{ maxWidth: '100%', maxHeight: 220, borderRadius: 8, border: '2px solid #ffb6c1' }}
            />
          ) : (
            <div style={{ color: '#bbb', height: 220, lineHeight: '220px', background: '#fff', borderRadius: 8, border: '2px dashed #ffb6c1' }}>
              暂无像素画
            </div>
          )}
        </Col>
      </Row>
      <Row justify="center" style={{ marginTop: 20 }} gutter={16}>
        <Col>
          <Tooltip title="导出像素画图片">
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              style={{ background: '#ffb6c1', borderColor: '#ffb6c1', marginRight: 8 }}
              onClick={onExportImage}
              disabled={!pixelImage}
            >
              导出图片
            </Button>
          </Tooltip>
        </Col>
        <Col>
          <Tooltip title="导出色号表（Excel/CSV）">
            <Button
              icon={<FileExcelOutlined />}
              style={{ background: '#ffe4ec', borderColor: '#ffe4ec' }}
              onClick={onExportExcel}
              disabled={!pixelImage}
            >
              导出色号表
            </Button>
          </Tooltip>
        </Col>
      </Row>
    </Card>
  );
};

export default PreviewPanel;

