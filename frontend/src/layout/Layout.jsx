import { useLocation } from "react-router-dom";

import Login_Header from "../headers/Login_Header";
import Main_Header from "../headers/Main_Header";
import Footer from "../headers/Footer";

export default function Layout({ children }) {
    const { pathname } = useLocation();

    let HeaderComponent = null;

    // Show login/register header only
    if (pathname === "/login" || pathname === "/register") {
        HeaderComponent = Login_Header;
    } else if (pathname === "/promotions") {
        HeaderComponent = Main_Header;
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
