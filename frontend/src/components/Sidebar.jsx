import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  FaHome,
  FaTable,
  FaBox,
  FaTruck,
  FaShoppingCart,
  FaUsers,
  FaCog,
  FaSignOutAlt,
  FaCubes,
} from "react-icons/fa";
import { useAuth } from "../context/AuthContext";

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role?.toLowerCase() === "admin";

  const menuItems = [
    { name: "Dashboard", icon: <FaHome />, path: "/admin-dashboard", isParent: true },
    { name: "Categories", icon: <FaTable />, path: "/admin-dashboard/categories" },
    { name: "Products", icon: <FaBox />, path: "/admin-dashboard/products" },
    { name: "Suppliers", icon: <FaTruck />, path: "/admin-dashboard/suppliers" },
    { name: "Orders", icon: <FaShoppingCart />, path: "/admin-dashboard/orders" },
    ...(isAdmin
      ? [{ name: "Users", icon: <FaUsers />, path: "/admin-dashboard/users" }]
      : []),
    { name: "Profile", icon: <FaCog />, path: "/admin-dashboard/profile" },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <aside
      aria-label="Primary Navigation"
      className="fixed left-0 top-0 flex flex-col h-screen w-16 md:w-64 bg-slate-950 text-slate-300 border-r border-slate-800 z-30"
    >
      {/* Brand */}
      <div className="flex items-center justify-center md:justify-start md:px-5 gap-3 h-16 border-b border-slate-800">
        <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
          <FaCubes className="text-lg" />
        </div>
        <span className="hidden md:block text-lg font-bold tracking-tight text-white">
          StockPilot
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 md:px-3 overflow-y-auto">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.name}>
              <NavLink
                end={Boolean(item.isParent)}
                to={item.path}
                title={item.name}
                className={({ isActive }) =>
                  `flex items-center justify-center md:justify-start px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                  }`
                }
              >
                <span className="text-lg shrink-0">{item.icon}</span>
                <span className="hidden md:block ml-3">{item.name}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* User & Logout */}
      <div className="p-2 md:p-3 border-t border-slate-800 space-y-2">
        {user && (
          <div className="hidden md:flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-900">
            <div className="w-8 h-8 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center text-xs font-bold uppercase shrink-0">
              {user.name?.charAt(0) || "U"}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                {user.name}
              </p>
              <p className="text-[11px] text-slate-400 truncate">{user.role}</p>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleLogout}
          title="Logout"
          className="w-full flex items-center justify-center md:justify-start px-3 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-rose-600/15 hover:text-rose-400 transition-colors"
        >
          <FaSignOutAlt className="text-lg shrink-0" />
          <span className="hidden md:block ml-3">Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
