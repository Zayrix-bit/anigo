import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ScrollToTop from "./components/common/ScrollToTop";
import PageLoader from "./components/common/PageLoader";

// Dynamic Imports (Code Splitting)
const Home = lazy(() => import("./pages/Home"));
const Portal = lazy(() => import("./pages/Portal"));
const Browse = lazy(() => import("./pages/Browse"));
const Watch = lazy(() => import("./pages/Watch"));
const Character = lazy(() => import("./pages/Character"));
const Staff = lazy(() => import("./pages/Staff"));
const Schedule = lazy(() => import("./pages/Schedule"));

export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <PageLoader />
      <Suspense fallback={<div className="min-h-screen bg-[#0a0a0a]" />}>
        <Routes>
          <Route path="/" element={<Portal />} />
          <Route path="/home" element={<Home />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/watch/:id" element={<Watch />} />
          <Route path="/character/:id" element={<Character />} />
          <Route path="/staff/:id" element={<Staff />} />
          <Route path="/schedule" element={<Schedule />} />
        </Routes>
      </Suspense>
    </Router>
  );
}
