import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./layout/Layout.jsx";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";
import Transfers from "./pages/Transfers";
import Promotions from "./pages/Promotions.jsx";
import Transactions from "./pages/Transactions.jsx";
import Redemption from "./pages/Redemption.jsx";
import EventsList from "./pages/EventsList.jsx";
import RequireRole from "./components/RequireRole.jsx";
import CashierTransactions from "./pages/CashierTransactions.jsx";
import Profile from "./pages/Profile.jsx";

export default function App() {
  return (
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

      {/* Authenticated pages */}
      <Route
        path="/dashboard"
        element={
          <Layout>
            <Home />
          </Layout>
        }
      />

      <Route
        path="/transfers"
        element={
          <Layout>
            <Transfers />
          </Layout>
        }
      />

      <Route
        path="/transactions"
        element={
          <Layout>
            <Transactions />
          </Layout>
        }
      />
      {/* Regular user transactions (protected for role 'regular') */}
      <Route element={<RequireRole allowedRoles={["regular"]} />}>
          <Route
              path="/transactions"
              element={
                  <Layout>
                      <Transactions />
                  </Layout>
              }
          />
      </Route>

      {/* Cashier transactions (protected for cashiers) */}
      <Route element={<RequireRole allowedRoles={["cashier"]} />}>
          <Route
              path="/cashier/transactions"
              element={
                  <Layout>
                      <CashierTransactions />
                  </Layout>
              }
          />
      </Route>

      {/*Displaying events, displays different popups depending on organizer or attendee*/}
      <Route
        path="/events"
        element={
          <Layout>
            <EventsList />
          </Layout>
        }
      />

      {/* Other pages will be added by teammates. */}
      <Route
        path="/promotions"
        element={
          <Layout>
            <Promotions />
          </Layout>
        }
      />
      <Route
          path="/redemption"
          element={
              <Layout>
                  <Redemption />
              </Layout>
          }
      />

      <Route
          path="/profile"
          element={
              <Layout>
                  <Profile />
              </Layout>
          }
      />

      {/* DEFAULT ROUTE */}
      <Route path="/" element={<Navigate to="/login" />} />

      {/* 404 */}
      <Route path="*" element={<h2>Page Not Found</h2>} />

    </Routes>
  );
}
