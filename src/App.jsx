import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Browse from "./pages/Browse";
import Watch from "./pages/Watch";
import Character from "./pages/Character";
import Staff from "./pages/Staff";


export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/watch/:id" element={<Watch />} />
        <Route path="/character/:id" element={<Character />} />
        <Route path="/staff/:id" element={<Staff />} />
      </Routes>
    </Router>
  );
}
