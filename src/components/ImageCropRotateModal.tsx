import { useRef } from "react";
import { Modal, Button, Space } from "antd";
import { Cropper, CropperRef } from "react-advanced-cropper";
import "react-advanced-cropper/dist/style.css";

export interface ImageCropRotateModalProps {
  open: boolean;
  imageSrc: string | null;
  onConfirm: (file: File) => void;
  onCancel: () => void;
}

/**
 * 使用 react-advanced-cropper 实现旋转 + 裁剪，确认后通过 onConfirm 回传新 File
 */
export default function ImageCropRotateModal({
  open,
  imageSrc,
  onConfirm,
  onCancel,
}: ImageCropRotateModalProps) {
  const cropperRef = useRef<CropperRef>(null);

  const handleRotateLeft = () => {
    cropperRef.current?.rotateImage(-90);
  };

  const handleRotateRight = () => {
    cropperRef.current?.rotateImage(90);
  };

  const handleConfirm = () => {
    if (!cropperRef.current || !imageSrc) return;
    const canvas = cropperRef.current.getCanvas();
    if (!canvas) return;
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], "edited.png", { type: "image/png" });
        onConfirm(file);
      },
      "image/png",
      0.95
    );
  };

  return (
    <Modal
      title="编辑图片（旋转与裁剪）"
      open={open}
      onCancel={onCancel}
      footer={null}
      width="90%"
      style={{ maxWidth: 900 }}
      destroyOnClose
    >
      <div style={{ marginBottom: 12 }}>
        <Space>
          <Button size="small" onClick={handleRotateLeft}>
            逆时针 90°
          </Button>
          <Button size="small" onClick={handleRotateRight}>
            顺时针 90°
          </Button>
          <span style={{ color: "#666", fontSize: 12 }}>
            拖拽选区调整裁剪范围，拖动图片移动
          </span>
        </Space>
      </div>
      <div
        className="cropper-container"
        style={{
          height: 420,
          background: "#e8e8e8",
        }}
      >
        {imageSrc && (
          <Cropper
            ref={cropperRef}
            src={imageSrc}
            className="cropper-editor"
            style={{ height: "100%" }}
            stencilProps={{ aspectRatio: NaN }}
            transformImage={{ adjustStencil: true }}
          />
        )}
      </div>
      <div style={{ marginTop: 12, textAlign: "right" }}>
        <Space>
          <Button onClick={onCancel}>取消</Button>
          <Button type="primary" onClick={handleConfirm}>
            确认使用此区域
          </Button>
        </Space>
      </div>
    </Modal>
  );
}
