import { useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

import Login_Header from "../headers/Login_Header";
import Regular_User_Header from "../headers/Regular_User_Header";
import Cashier_Header from "../headers/Cashier_Header";
import Manager_Header from "../headers/Manager_Header";
import Superuser_Header from "../headers/Superuser_Header";
import Footer from "../headers/Footer";
import ProfileQrModal from "../components/ProfileQrModal";
import { useEffect } from "react";

export default function Layout({ children, title }) {
    const { pathname } = useLocation();
    const { user, currentRole, showQr } = useAuth();
    // Default to regular user header;
    let HeaderComponent = Regular_User_Header;

    // Use login header on auth routes
    if (pathname === "/login" || pathname === "/register" || pathname === "/verify" || pathname === "/forgot-password") {
        HeaderComponent = Login_Header;
    } else if (user) {
        // Pick a header based on the currently selected interface (switched role)
        const role = currentRole || user.role || "regular";
        if (role === "cashier") HeaderComponent = Cashier_Header;
        else if (role === "manager") HeaderComponent = Manager_Header;
        else if (role === "superuser") HeaderComponent = Superuser_Header;
        else HeaderComponent = Regular_User_Header;
    }

    // ---------- On mount, set title ----------
    useEffect(() => {
        document.title = title;
    }, [pathname]);
    
    //TODO:You can add more conditions here for different headers based on the route
    return (
        <div className="d-flex flex-column min-vh-100">

            {HeaderComponent && <HeaderComponent />}
            {showQr && <div className="qr-full-overlay" />}
            <ProfileQrModal />

            {/* children are responsible for their own layout */}
            <main className="flex-grow-1 pb-3">
                {children}
            </main>

            <Footer />
        </div>
    );
}
