import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { BottomNav } from "@/components/BottomNav";
import PuzzlePage from "@/pages/PuzzlePage";
import ArchivePage from "@/pages/ArchivePage";
import StatsPage from "@/pages/StatsPage";
import AdminPage from "@/pages/AdminPage";

function Shell() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");
  return (
    <div className="grain min-h-screen bg-sd-base">
      <div className="relative z-10 mx-auto w-full max-w-md min-h-screen pb-24">
        <Routes>
          <Route path="/" element={<PuzzlePage />} />
          <Route path="/case/:number" element={<PuzzlePage />} />
          <Route path="/archive" element={<ArchivePage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </div>
      {!isAdmin && <BottomNav />}
      <Toaster
        position="top-center"
        toastOptions={{
          style: { background: "#241F22", color: "#F7F1E6", border: "1px solid #3A3238" },
        }}
      />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  );
}

export default App;
