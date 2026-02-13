import { Link } from "react-router-dom";
import "../App.css";

/** 首页 - 路由 /，提供入口跳转 */
export default function HomePage() {
  return (
    <div className="App">
      <div className="pretty-section" style={{ marginTop: 24 }}>
        <div className="pretty-label">选择功能</div>
        <div className="home-nav-buttons">
          <Link to="/create" className="home-nav-btn">
            创建页
          </Link>
          <Link to="/recognition" className="home-nav-btn">
            识别页
          </Link>
          <Link to="/check" className="home-nav-btn">
            检查页
          </Link>
        </div>
      </div>
    </div>
  );
}
