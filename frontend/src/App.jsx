import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./layout/Layout.jsx";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* LOGIN */}
        <Route 
          path="/login" 
          element={
            <Layout>
              <Login />
            </Layout>
          } 
        />

        {/* REGISTER */}
        <Route 
          path="/register" 
          element={
            <Layout>
              <Register />
            </Layout>
          } 
        />

        {/* {DASHBOARD} */}
        {/* <Route 
          path="/dashboard" 
          element={
            <Layout>
              <Dashboard />
            </Layout>
          } 
        /> */}

        {/* DEFAULT ROUTE */}
        <Route path="/" element={<Navigate to="/login" />} />

        {/* 404 */}
        <Route path="*" element={<h2>Page Not Found</h2>} />

      </Routes>
    </BrowserRouter>
  );
}
