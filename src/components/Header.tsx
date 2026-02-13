import { Link, useLocation } from "react-router-dom";
import "./Header.css";

const NAV_ITEMS = [
  { path: "/", label: "首页" },
  { path: "/create", label: "创建" },
  { path: "/recognition", label: "识别" },
  { path: "/manage", label: "管理" },
] as const;

/** 通用顶部导航：紧凑、固定顶部，与主流 app 一致 */
export default function Header() {
  const location = useLocation();
  const pathname = location.pathname;

  return (
    <header className="app-header">
      <Link to="/" className="app-header-title">
        鹤林爱拼豆
      </Link>
      <nav className="app-header-nav">
        {NAV_ITEMS.map(({ path, label }) => {
          const isActive = pathname === path || (path !== "/" && pathname.startsWith(path));
          return (
            <Link
              key={path}
              to={path}
              className={`app-header-link ${isActive ? "active" : ""}`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
