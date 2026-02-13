import { lazy, Suspense } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Spin } from "antd";
import { usePixelArt } from "../context/PixelArtContext";

const VisualizationView = lazy(() => import("../components/VisualizationView"));

/**
 * 可视化编辑页（原「进入可视化」弹出的全屏编辑视图）
 * 路由：/visualization-edit
 */
export default function VisualizationEditPage() {
  const navigate = useNavigate();
  const {
    pixelData,
    setPixelData,
    selectedColors,
    colorCards,
    colorTable,
  } = usePixelArt();

  if (!pixelData || pixelData.length === 0) {
    return <Navigate to="/create" replace />;
  }

  return (
    <Suspense
      fallback={
        <div style={{ textAlign: "center", padding: "40px" }}>
          <Spin size="large" />
        </div>
      }
    >
      <VisualizationView
        pixelData={pixelData}
        selectedColors={selectedColors}
        colorCards={colorCards}
        colorTable={colorTable}
        onClose={() => navigate("/create")}
        onUpdatePixelData={setPixelData}
      />
    </Suspense>
  );
}
