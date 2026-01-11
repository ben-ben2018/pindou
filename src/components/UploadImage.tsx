import React from 'react';
import { Upload, Button, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import type { UploadChangeParam } from 'antd/es/upload';
import type { UploadFile } from 'antd/es/upload/interface';

interface UploadImageProps {
  onImageUpload: (imageUrl: string) => void;
  imageUrl?: string;
}

const UploadImage: React.FC<UploadImageProps> = ({ onImageUpload, imageUrl }) => {
  const beforeUpload = (file: File): boolean => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('只能上传图片文件！');
    }
    return isImage;
  };

  const handleChange = (info: UploadChangeParam<UploadFile>) => {
    if (info.file.status === 'done' || info.file.status === 'uploading') {
      const file = info.file.originFileObj;
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            onImageUpload(e.target.result as string);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <Upload
        showUploadList={false}
        beforeUpload={beforeUpload}
        customRequest={({ file, onSuccess }) => {
          setTimeout(() => {
            onSuccess?.('ok');
          }, 0);
        }}
        onChange={handleChange}
        accept="image/*"
      >
        <Button icon={<UploadOutlined />} type="primary" style={{ background: '#ffb6c1', borderColor: '#ffb6c1' }}>
          上传图片
        </Button>
      </Upload>
      {imageUrl && (
        <div style={{ marginTop: 12, textAlign: 'center' }}>
          <img src={imageUrl} alt="预览" style={{ maxWidth: '100%', maxHeight: 180, borderRadius: 8, border: '2px solid #ffe4ec' }} />
        </div>
      )}
    </div>
  );
};

export default UploadImage;

