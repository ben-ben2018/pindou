import { Outlet } from "react-router-dom";
import Header from "./Header";
import "../App.css";

/** 通用布局：固定 Header + 主内容区 */
export default function Layout() {
  return (
    <>
      <Header />
      <main className="main-below-header">
        <Outlet />
      </main>
    </>
  );
}
