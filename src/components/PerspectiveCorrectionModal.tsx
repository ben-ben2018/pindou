import { useState, useEffect } from "react";
import { Modal, Button } from "antd";
import type { Point2D } from "@/bead-recognition/perspectiveWarp";

const HANDLE_SIZE = 24;

export interface PerspectiveCorrectionModalProps {
  open: boolean;
  imageSrc: string | null;
  onConfirm: (corners: [Point2D, Point2D, Point2D, Point2D]) => void;
  onCancel: () => void;
}

/**
 * 梯形校正：用户拖拽 4 个角点对齐拼豆板边缘，确认后父组件用透视变换拉正
 * 角点顺序：左上、右上、右下、左下
 */
export default function PerspectiveCorrectionModal({
  open,
  imageSrc,
  onConfirm,
  onCancel,
}: PerspectiveCorrectionModalProps) {
  const [imageSize, setImageSize] = useState<{ w: number; h: number } | null>(null);
  const [corners, setCorners] = useState<[Point2D, Point2D, Point2D, Point2D]>([
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 },
  ]);
  const [dragging, setDragging] = useState<number | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!open || !imageSrc) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      setImageSize({ w, h });
      setCorners([
        { x: w * 0.05, y: h * 0.05 },
        { x: w * 0.95, y: h * 0.05 },
        { x: w * 0.95, y: h * 0.95 },
        { x: w * 0.05, y: h * 0.95 },
      ]);
      const maxH = 420;
      setScale(maxH / h);
    };
    img.src = imageSrc;
  }, [open, imageSrc]);

  const displayW = imageSize ? imageSize.w * scale : 0;
  const displayH = imageSize ? imageSize.h * scale : 0;

  const toDisplay = (p: Point2D) => ({ x: p.x * scale, y: p.y * scale });
  const toImage = (x: number, y: number) => ({ x: x / scale, y: y / scale });

  const handlePointerDown = (index: number, e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(index);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragging === null) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const clampedX = Math.max(0, Math.min(rect.width, x));
    const clampedY = Math.max(0, Math.min(rect.height, y));
    const p = toImage(clampedX, clampedY);
    setCorners((prev) => {
      const next = [...prev] as [Point2D, Point2D, Point2D, Point2D];
      next[dragging] = p;
      return next;
    });
  };

  const handlePointerUp = () => {
    setDragging(null);
  };

  const handleConfirm = () => {
    onConfirm(corners);
  };

  return (
    <Modal
      title="梯形校正（拖拽四角对齐拼豆板边缘）"
      open={open}
      onCancel={onCancel}
      footer={null}
      width="90%"
      style={{ maxWidth: 900 }}
      destroyOnClose
    >
      <p style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>
        按顺序拖拽四个角点：左上 → 右上 → 右下 → 左下，使框线与拼豆板边缘重合后确认。
      </p>
      <div
        style={{
          position: "relative",
          width: displayW,
          height: displayH,
          maxWidth: "100%",
          margin: "0 auto",
          background: "#e8e8e8",
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {imageSrc && imageSize && (
          <>
            <img
              src={imageSrc}
              alt="校正预览"
              style={{
                display: "block",
                width: displayW,
                height: displayH,
                pointerEvents: "none",
              }}
            />
            {corners.map((p, i) => {
              const d = toDisplay(p);
              return (
                <div
                  key={i}
                  role="button"
                  tabIndex={0}
                  onPointerDown={(e) => handlePointerDown(i, e)}
                  style={{
                    position: "absolute",
                    left: d.x - HANDLE_SIZE / 2,
                    top: d.y - HANDLE_SIZE / 2,
                    width: HANDLE_SIZE,
                    height: HANDLE_SIZE,
                    borderRadius: "50%",
                    background: "rgba(255,100,100,0.9)",
                    border: "2px solid #fff",
                    cursor: "move",
                    boxSizing: "border-box",
                  }}
                />
              );
            })}
          </>
        )}
      </div>
      <div style={{ marginTop: 12, textAlign: "right" }}>
        <Button onClick={onCancel}>取消</Button>
        <Button type="primary" onClick={handleConfirm} style={{ marginLeft: 8 }}>
          确认并拉正
        </Button>
      </div>
    </Modal>
  );
}
