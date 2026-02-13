import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PixelArtProvider } from "./context/PixelArtContext";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import CreatePage from "./pages/CreatePage";
import RecognitionPage from "./pages/RecognitionPage";
import ManagementPage from "./pages/ManagementPage";

function App() {
  const basename = (import.meta.env.BASE_URL || "/").replace(/\/$/, "") || undefined;
  return (
    <BrowserRouter basename={basename || undefined}>
      <PixelArtProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/create" element={<CreatePage />} />
            <Route path="/recognition" element={<RecognitionPage />} />
            <Route path="/manage" element={<ManagementPage />} />
          </Route>
        </Routes>
      </PixelArtProvider>
    </BrowserRouter>
  );
}

export default App;
