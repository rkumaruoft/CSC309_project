import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import "bootstrap/dist/css/bootstrap.min.css";
import "bootswatch/dist/united/bootstrap.min.css";
import App from './App.jsx';
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext.jsx";
// import './index.css';
createRoot(document.getElementById('root')).render(
    <StrictMode>
        <BrowserRouter>
            <AuthProvider>
                <App />
            </AuthProvider>
        </BrowserRouter>
    </StrictMode>
);
