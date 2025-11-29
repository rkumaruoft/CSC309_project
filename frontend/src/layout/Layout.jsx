import { useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

import Login_Header from "../headers/Login_Header";
import Regular_User_Header from "../headers/Regular_User_Header";
import Cashier_Header from "../headers/Cashier_Header";
import Manager_Header from "../headers/Manager_Header";
import Superuser_Header from "../headers/Superuser_Header";
import Footer from "../headers/Footer";

export default function Layout({ children }) {
    const { pathname } = useLocation();
    const { user } = useAuth();

    // Default to regular user header;
    let HeaderComponent = Regular_User_Header;

    // Use login header on auth routes
    if (pathname === "/login" || pathname === "/register") {
        HeaderComponent = Login_Header;
    } else if (user) {
        // Pick a header based on role
        const role = user.role || "regular";
        if (role === "cashier") HeaderComponent = Cashier_Header;
        else if (role === "manager") HeaderComponent = Manager_Header;
        else if (role === "superuser") HeaderComponent = Superuser_Header;
        else HeaderComponent = Regular_User_Header;
    }
    //TODO:You can add more conditions here for different headers based on the route
    return (
        <div className="d-flex flex-column min-vh-100">

            {HeaderComponent && <HeaderComponent />}

            {/* children are responsible for their own layout */}
            <main className="flex-grow-1">
                {children}
            </main>

            <Footer />
        </div>
    );
}
