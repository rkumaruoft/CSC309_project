import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// import "bootstrap/dist/css/bootstrap.min.css";
import "bootswatch/dist/quartz/bootstrap.min.css";
import './index.css';
import App from './App.jsx';
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext.jsx";

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <BrowserRouter>
            <AuthProvider>
                <App />
            </AuthProvider>
        </BrowserRouter>
    </StrictMode>
);
