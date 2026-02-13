import { Navigate } from "react-router-dom";

/**
 * 可视化编辑页（原「进入可视化」全屏编辑）
 * 路由：/visualization-edit
 * 已移除独立 VisualizationView，统一在创建页编辑，此处重定向到 /create
 */
export default function VisualizationEditPage() {
  return <Navigate to="/create" replace />;
}
