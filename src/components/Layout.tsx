import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header";
import "../App.css";

/** 通用布局：固定 Header + 主内容区 */
export default function Layout() {
  const location = useLocation();
  return (
    <>
      <Header />
      <main className="main-below-header">
        <Outlet key={location.pathname} />
      </main>
    </>
  );
}
