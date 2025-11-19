import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Redirect root → login */}
        <Route path="/" element={<Navigate to="/login" />} />

        {/* Public pages */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* After login */}
        {/* <Route path="/dashboard" element={<Dashboard />} /> */}

        {/* 404 fallback */}
        <Route
          path="*"
          element={<h2 className="text-center mt-5">Page not found</h2>}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
