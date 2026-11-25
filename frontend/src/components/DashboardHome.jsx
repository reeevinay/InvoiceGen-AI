import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaUsers,
  FaBoxOpen,
  FaShoppingCart,
  FaTruck,
  FaRupeeSign,
  FaDownload,
  FaExclamationTriangle,
  FaMagic,
  FaPaperPlane,
} from "react-icons/fa";
import api from "../api/client";
import { ErrorBanner, LoadingState, PageHeader } from "./ui/StateViews";
import { useToast } from "./ui/ToastContext";

const DashboardHome = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProducts: 0,
    totalOrders: 0,
    totalSuppliers: 0,
    totalCategories: 0,
    revenue: 0,
  });
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [stockBreakdown, setStockBreakdown] = useState({
    inStock: 0,
    lowStock: 0,
    outOfStock: 0,
  });
  const [reorderInsights, setReorderInsights] = useState({
    summary: "",
    recommendations: [],
    source: "",
  });

  // Ask Your Ledger AI state
  const [ledgerQuestion, setLedgerQuestion] = useState("");
  const [ledgerResult, setLedgerResult] = useState(null);
  const [ledgerSource, setLedgerSource] = useState("");
  const [askingLedger, setAskingLedger] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError("");
      const [dashRes, reorderRes] = await Promise.all([
        api.get("/dashboard"),
        api.get("/ai/reorder-insights").catch(() => null),
      ]);

      if (dashRes.data.success) {
        setStats(dashRes.data.stats);
        setLowStockProducts(dashRes.data.lowStockProducts || []);
        setRecentOrders(dashRes.data.recentOrders || []);
        setStockBreakdown(
          dashRes.data.stockBreakdown || {
            inStock: 0,
            lowStock: 0,
            outOfStock: 0,
          }
        );
      }

      if (reorderRes?.data?.success) {
        setReorderInsights({
          summary: reorderRes.data.summary,
          recommendations: reorderRes.data.recommendations || [],
          source: reorderRes.data.source || "",
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load dashboard metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const handleAskLedger = async (e, presetQuestion = null) => {
    if (e) e.preventDefault();
    const q = (presetQuestion ?? ledgerQuestion).trim();
    if (!q) return;
    if (presetQuestion) setLedgerQuestion(presetQuestion);

    try {
      setAskingLedger(true);
      const res = await api.post("/ai/ask-ledger", { question: q });
      if (res.data.success) {
        setLedgerResult(res.data.result || { summary: res.data.answer });
        setLedgerSource(res.data.source);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to query ledger");
    } finally {
      setAskingLedger(false);
    }
  };

  const handleGenerateReport = () => {
    const rows = [
      ["Metric", "Value"],
      ["Total Users", stats.totalUsers],
      ["Total Categories", stats.totalCategories],
      ["Total Products", stats.totalProducts],
      ["Total Suppliers", stats.totalSuppliers],
      ["Total Orders", stats.totalOrders],
      ["Total Revenue (INR)", stats.revenue],
      ["Healthy Stock Products", stockBreakdown.inStock],
      ["Low Stock Products", stockBreakdown.lowStock],
      ["Out of Stock Products", stockBreakdown.outOfStock],
    ];

    const csvContent = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `invoicegen-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Inventory & billing summary report downloaded");
  };

  const cards = [
    {
      title: "Users",
      value: stats.totalUsers,
      icon: <FaUsers />,
      accent: "bg-blue-50 text-blue-600",
    },
    {
      title: "Products",
      value: stats.totalProducts,
      icon: <FaBoxOpen />,
      accent: "bg-emerald-50 text-emerald-600",
    },
    {
      title: "Invoices",
      value: stats.totalOrders,
      icon: <FaShoppingCart />,
      accent: "bg-amber-50 text-amber-600",
    },
    {
      title: "Suppliers",
      value: stats.totalSuppliers,
      icon: <FaTruck />,
      accent: "bg-purple-50 text-purple-600",
    },
    {
      title: "Revenue",
      value: `₹${Number(stats.revenue || 0).toLocaleString()}`,
      icon: <FaRupeeSign />,
      accent: "bg-indigo-50 text-indigo-600",
    },
  ];

  const totalStockItems = Math.max(
    stockBreakdown.inStock + stockBreakdown.lowStock + stockBreakdown.outOfStock,
    1
  );
  const inStockPct = Math.round((stockBreakdown.inStock / totalStockItems) * 100);
  const lowStockPct = Math.round((stockBreakdown.lowStock / totalStockItems) * 100);
  const outStockPct = Math.round((stockBreakdown.outOfStock / totalStockItems) * 100);

  if (loading) {
    return <LoadingState label="Loading dashboard metrics..." />;
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Smart billing overview, real-time stock velocity, and AI ledger insights"
        action={
          <button
            type="button"
            onClick={handleGenerateReport}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-xs transition"
          >
            <FaDownload className="text-xs" />
            Export Report
          </button>
        }
      />

      <ErrorBanner message={error} onRetry={fetchDashboardStats} />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        {cards.map((card) => (
          <div
            key={card.title}
            className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  {card.title}
                </p>
                <h2 className="text-2xl font-bold text-slate-900 mt-1.5 tabular-nums">
                  {card.value}
                </h2>
              </div>
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg ${card.accent}`}
              >
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Ask Your Ledger AI */}
      <div className="bg-white border border-indigo-200 rounded-2xl shadow-xs p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-sm">
              <FaMagic />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Ask Your Ledger (AI Analytics)
              </h2>
              <p className="text-xs text-slate-500">
                Query your live orders, revenue, customers, and stock in plain English
              </p>
            </div>
          </div>
          {ledgerSource && (
            <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 self-start sm:self-auto">
              {ledgerSource === "gemini" ? "Powered by Gemini" : "Local Ledger Engine"}
            </span>
          )}
        </div>

        <form onSubmit={handleAskLedger} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            aria-label="Ask a question about your business ledger"
            value={ledgerQuestion}
            onChange={(e) => setLedgerQuestion(e.target.value)}
            placeholder="e.g. What are my top selling products or pending revenue?"
            className="flex-1 border border-slate-300 px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
          />
          <button
            type="submit"
            disabled={askingLedger || !ledgerQuestion.trim()}
            className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-60 shrink-0"
          >
            <FaPaperPlane className="text-xs" />
            {askingLedger ? "Analyzing..." : "Ask AI"}
          </button>
        </form>

        <div className="flex flex-wrap gap-2 mt-3">
          {[
            "Top selling products",
            "Who are my top customers?",
            "How much revenue is pending?",
            "Which products are low on stock?",
          ].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => handleAskLedger(null, preset)}
              className="text-xs bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 px-3 py-1.5 rounded-lg transition"
            >
              {preset}
            </button>
          ))}
        </div>

        {askingLedger && (
          <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 animate-pulse">
            <div className="h-4 bg-slate-200 rounded w-3/4" />
            <div className="h-3 bg-slate-200 rounded w-1/2" />
          </div>
        )}

        {!askingLedger && ledgerResult && (
          <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <p className="text-sm font-medium text-slate-800 leading-relaxed">
                {ledgerResult.summary}
              </p>
              {ledgerResult.actionRoute && ledgerResult.actionLabel && (
                <button
                  type="button"
                  onClick={() => navigate(ledgerResult.actionRoute)}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg shrink-0 transition"
                >
                  {ledgerResult.actionLabel} →
                </button>
              )}
            </div>

            {ledgerResult.highlights?.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {ledgerResult.highlights.map((h, i) => (
                  <div
                    key={i}
                    className="bg-white border border-slate-200 rounded-lg px-3.5 py-2.5"
                  >
                    <p className="text-[11px] uppercase tracking-wider text-slate-500">
                      {h.label}
                    </p>
                    <p className="text-sm font-bold text-slate-900 mt-0.5 tabular-nums">
                      {h.value}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {ledgerResult.columns?.length > 0 && ledgerResult.rows?.length > 0 && (
              <div className="overflow-x-auto bg-white border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 uppercase">
                      {ledgerResult.columns.map((col, idx) => (
                        <th
                          key={idx}
                          className={`py-2.5 px-3 font-semibold ${
                            idx === ledgerResult.columns.length - 1 && idx > 0
                              ? "text-right"
                              : ""
                          }`}
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ledgerResult.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-50/60">
                        {row.map((cell, cIdx) => (
                          <td
                            key={cIdx}
                            className={`py-2.5 px-3 ${
                              cIdx === 0
                                ? "font-medium text-slate-900"
                                : "text-slate-700 tabular-nums"
                            } ${
                              cIdx === row.length - 1 && cIdx > 0
                                ? "text-right font-semibold"
                                : ""
                            }`}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Recent Invoices
                </h2>
                <p className="text-xs text-slate-500">
                  Latest customer transactions across your store
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate("/admin-dashboard/orders")}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                View all
              </button>
            </div>

            {recentOrders.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500 border border-dashed border-slate-200 rounded-xl">
                No invoices recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                      <th className="py-2.5 pr-4 font-semibold">Customer</th>
                      <th className="py-2.5 pr-4 font-semibold">Amount</th>
                      <th className="py-2.5 pr-4 font-semibold">Status</th>
                      <th className="py-2.5 font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentOrders.map((order) => (
                      <tr key={order._id} className="hover:bg-slate-50">
                        <td className="py-3 pr-4 font-medium text-slate-900">
                          {order.customerName}
                        </td>
                        <td className="py-3 pr-4 tabular-nums text-slate-700">
                          ₹{Number(order.totalAmount || 0).toLocaleString()}
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              order.status === "Delivered"
                                ? "bg-emerald-50 text-emerald-700"
                                : order.status === "Pending"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-rose-50 text-rose-700"
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="py-3 text-slate-500 text-xs">
                          {order.createdAt
                            ? new Date(order.createdAt).toLocaleDateString()
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Velocity-Based Reorder Brief */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Smart Reorder Brief
                </h2>
                <p className="text-xs text-slate-500">
                  30-day sales velocity &amp; 14-day buffer recommendations
                </p>
              </div>
              {reorderInsights.source && (
                <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                  {reorderInsights.source === "gemini"
                    ? "Gemini Brief"
                    : "Velocity Engine"}
                </span>
              )}
            </div>

            {reorderInsights.summary && (
              <p className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-4">
                {reorderInsights.summary}
              </p>
            )}

            {reorderInsights.recommendations.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 uppercase text-slate-500">
                      <th className="py-2 pr-3 font-semibold">Product</th>
                      <th className="py-2 pr-3 font-semibold">Stock</th>
                      <th className="py-2 pr-3 font-semibold">30d Sold</th>
                      <th className="py-2 pr-3 font-semibold">Est. Days Left</th>
                      <th className="py-2 font-semibold text-right">
                        Suggested Reorder
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reorderInsights.recommendations.map((rec) => (
                      <tr key={rec.productId}>
                        <td className="py-2.5 pr-3 font-medium text-slate-900">
                          {rec.productName}
                        </td>
                        <td className="py-2.5 pr-3 tabular-nums text-rose-600 font-semibold">
                          {rec.currentStock}
                        </td>
                        <td className="py-2.5 pr-3 tabular-nums text-slate-600">
                          {rec.sold30d}
                        </td>
                        <td className="py-2.5 pr-3 tabular-nums text-slate-600">
                          {rec.daysLeft !== null ? `${rec.daysLeft}d` : "—"}
                        </td>
                        <td className="py-2.5 font-semibold text-indigo-600 tabular-nums text-right">
                          +{rec.suggestedOrderQty} units
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Quick Actions
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => navigate("/admin-dashboard/orders")}
                className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 p-3 rounded-xl text-sm font-semibold transition"
              >
                New AI Invoice
              </button>

              <button
                type="button"
                onClick={() => navigate("/admin-dashboard/products")}
                className="bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-800 hover:text-indigo-700 p-3 rounded-xl text-sm font-medium transition"
              >
                Manage Products
              </button>

              <button
                type="button"
                onClick={() => navigate("/admin-dashboard/suppliers")}
                className="bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-800 hover:text-indigo-700 p-3 rounded-xl text-sm font-medium transition"
              >
                Manage Suppliers
              </button>

              <button
                type="button"
                onClick={() => navigate("/admin-dashboard/categories")}
                className="bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-800 hover:text-indigo-700 p-3 rounded-xl text-sm font-medium transition"
              >
                Add Category
              </button>
            </div>
          </div>

          {/* Stock Health */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Stock Health
            </h2>

            <div className="space-y-4 text-sm">
              <div>
                <div className="flex justify-between text-slate-700">
                  <span>Healthy (&gt; 10 units)</span>
                  <span className="font-semibold tabular-nums">
                    {stockBreakdown.inStock} ({inStockPct}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full mt-1.5">
                  <div
                    className="h-2 bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${inStockPct}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-700">
                  <span>Low Stock (1–10 units)</span>
                  <span className="font-semibold tabular-nums">
                    {stockBreakdown.lowStock} ({lowStockPct}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full mt-1.5">
                  <div
                    className="h-2 bg-amber-500 rounded-full transition-all"
                    style={{ width: `${lowStockPct}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-700">
                  <span>Out of Stock (0 units)</span>
                  <span className="font-semibold tabular-nums">
                    {stockBreakdown.outOfStock} ({outStockPct}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full mt-1.5">
                  <div
                    className="h-2 bg-rose-500 rounded-full transition-all"
                    style={{ width: `${outStockPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Low Stock Alert */}
          <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-6">
            <div className="flex items-center gap-2 text-rose-700 font-semibold text-base">
              <FaExclamationTriangle />
              <h2>Low Stock Alerts</h2>
            </div>

            <div className="space-y-2.5 mt-4 text-sm">
              {lowStockProducts.length > 0 ? (
                lowStockProducts.map((product) => (
                  <div
                    key={product._id}
                    className="flex items-center justify-between bg-white/80 px-3 py-2 rounded-lg border border-rose-100"
                  >
                    <span className="font-medium text-slate-800 truncate pr-2">
                      {product.productName}
                    </span>
                    <span className="text-rose-600 font-semibold tabular-nums shrink-0">
                      {product.stock} left
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-slate-600 text-sm">
                  All products are sufficiently stocked.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
