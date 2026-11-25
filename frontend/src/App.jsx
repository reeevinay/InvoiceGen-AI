import "./App.css";
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from "react-router-dom";
import Root from "./components/Root";
import Login from "./pages/Login";
import ProtectedRoutes from "./utils/ProtectedRoutes";
import Dashboard from "./pages/Dashboard";
import Categories from "./components/Categories";
import Products from "./components/Products";
import Suppliers from "./components/Suppliers";
import Orders from "./components/Orders";
import Users from "./components/Users";
import Profile from "./components/Profile";
import DashboardHome from "./components/DashboardHome";
import { ToastProvider } from "./components/ui/ToastContext";

const StatusPage = ({ code, title, description }) => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
      <p className="text-sm font-semibold text-indigo-600">{code}</p>
      <h1 className="text-2xl font-bold text-slate-900 mt-2">{title}</h1>
      <p className="text-sm text-slate-500 mt-2">{description}</p>
      <div className="mt-6 flex justify-center gap-3">
        <Link
          to="/admin-dashboard"
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition"
        >
          Go to Dashboard
        </Link>
        <Link
          to="/login"
          className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition"
        >
          Sign In
        </Link>
      </div>
    </div>
  </div>
);

function App() {
  return (
    <ToastProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Root />} />
          <Route path="/admin/dashboard" element={<Navigate to="/admin-dashboard" replace />} />

          <Route
            path="/admin-dashboard"
            element={
              <ProtectedRoutes requireRole={["Admin", "Manager", "Staff"]}>
                <Dashboard />
              </ProtectedRoutes>
            }
          >
            <Route index element={<DashboardHome />} />
            <Route path="categories" element={<Categories />} />
            <Route path="products" element={<Products />} />
            <Route path="suppliers" element={<Suppliers />} />
            <Route path="orders" element={<Orders />} />
            <Route
              path="users"
              element={
                <ProtectedRoutes requireRole={["Admin"]}>
                  <Users />
                </ProtectedRoutes>
              }
            />
            <Route path="profile" element={<Profile />} />
          </Route>

          <Route
            path="/customer/dashboard"
            element={<Navigate to="/admin-dashboard" replace />}
          />
          <Route path="/login" element={<Login />} />
          <Route
            path="/unauthorized"
            element={
              <StatusPage
                code="403"
                title="Unauthorized Access"
                description="You do not have permission to view this page."
              />
            }
          />
          <Route
            path="*"
            element={
              <StatusPage
                code="404"
                title="Page Not Found"
                description="The page you requested does not exist or has been moved."
              />
            }
          />
        </Routes>
      </Router>
    </ToastProvider>
  );
}

export default App;
