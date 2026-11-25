import React, { useState, useEffect } from "react";
import {
  FaSearch,
  FaEye,
  FaEdit,
  FaTrash,
  FaPlus,
  FaShoppingCart,
  FaMagic,
  FaTimes,
} from "react-icons/fa";
import api from "../api/client";
import { useToast } from "./ui/ToastContext";
import ConfirmModal from "./ui/ConfirmModal";
import { EmptyState, ErrorBanner, LoadingState, PageHeader } from "./ui/StateViews";

const Orders = () => {
  const toast = useToast();

  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // AI Quick Invoice state
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiParsing, setAiParsing] = useState(false);
  const [aiWarnings, setAiWarnings] = useState([]);

  // Order / Invoice form state
  const [customerName, setCustomerName] = useState("");
  const [lineItems, setLineItems] = useState([]);
  const [taxRate, setTaxRate] = useState(0);
  const [manualTotal, setManualTotal] = useState("");
  const [status, setStatus] = useState("Pending");

  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");
      const [ordRes, prodRes] = await Promise.all([
        api.get("/order"),
        api.get("/product"),
      ]);
      if (ordRes.data.success) setOrders(ordRes.data.orders || []);
      if (prodRes.data.success) setProducts(prodRes.data.products || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setCustomerName("");
    setLineItems([]);
    setTaxRate(0);
    setManualTotal("");
    setStatus("Pending");
    setAiPrompt("");
    setAiWarnings([]);
    setEditId(null);
    setShowForm(false);
  };

  const handleAiParse = async (e) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    try {
      setAiParsing(true);
      setAiWarnings([]);
      const res = await api.post("/ai/parse-invoice", { prompt: aiPrompt });
      if (res.data.success && res.data.draft) {
        const { draft, source, warnings } = res.data;
        if (draft.customerName) setCustomerName(draft.customerName);
        setStatus(draft.status || "Pending");
        setTaxRate(draft.taxRate || 0);
        if (draft.items?.length > 0) {
          setLineItems(
            draft.items.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
            }))
          );
        }
        setAiWarnings(warnings || []);
        toast.success(
          `Invoice draft populated (${
            source === "gemini" ? "Gemini AI" : "Smart Parser"
          }). Review before saving.`
        );
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to parse invoice");
    } finally {
      setAiParsing(false);
    }
  };

  const addLineItem = () => {
    const firstAvailable = products.find((p) => p.stock > 0) || products[0];
    if (!firstAvailable) {
      toast.info("Add a product first to attach line items");
      return;
    }
    setLineItems((prev) => [
      ...prev,
      { productId: firstAvailable._id, quantity: 1 },
    ]);
  };

  const updateLineItem = (index, field, value) => {
    setLineItems((prev) =>
      prev.map((item, idx) =>
        idx === index
          ? { ...item, [field]: field === "quantity" ? Number(value) : value }
          : item
      )
    );
  };

  const removeLineItem = (index) => {
    setLineItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const subtotal = lineItems.reduce((sum, item) => {
    const prod = products.find((p) => p._id === item.productId);
    return sum + (prod ? prod.price * Number(item.quantity || 0) : 0);
  }, 0);
  const numericTaxRate = Math.min(100, Math.max(0, Number(taxRate) || 0));
  const taxAmount = Number(((subtotal * numericTaxRate) / 100).toFixed(2));
  const computedTotal =
    lineItems.length > 0
      ? Number((subtotal + taxAmount).toFixed(2))
      : Number(manualTotal || 0);

  const handleEdit = (order) => {
    setEditId(order._id);
    setCustomerName(order.customerName);
    setManualTotal(order.totalAmount);
    setTaxRate(order.taxRate || 0);
    setStatus(order.status);
    setLineItems([]);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (editId) {
        await api.put(`/order/${editId}`, {
          customerName,
          totalAmount: Number(manualTotal),
          status,
        });
        toast.success("Invoice updated successfully");
      } else {
        const payload = {
          customerName,
          status,
          taxRate: numericTaxRate,
          totalAmount: computedTotal,
          ...(lineItems.length > 0 ? { items: lineItems } : {}),
        };
        await api.post("/order/add", payload);
        toast.success("Invoice created successfully");
      }
      resetForm();
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save invoice");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await api.delete(`/order/${deleteTarget._id}`);
      toast.success("Invoice deleted");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete invoice");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const getStatusColor = (s) => {
    switch (s) {
      case "Delivered":
        return "bg-emerald-50 text-emerald-700";
      case "Pending":
        return "bg-amber-50 text-amber-700";
      case "Cancelled":
        return "bg-rose-50 text-rose-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order._id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "All" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) return <LoadingState label="Loading invoices & orders..." />;

  return (
    <div>
      <PageHeader
        title="Orders & Invoices"
        subtitle="Create multi-item invoices with AI, calculate tax, and sync stock automatically"
        action={
          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-xs transition"
          >
            <FaPlus className="text-xs" />
            New Invoice
          </button>
        }
      />

      <ErrorBanner message={error} onRetry={fetchData} />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Total Invoices
          </p>
          <h2 className="text-2xl font-bold text-slate-900 mt-1.5 tabular-nums">
            {orders.length}
          </h2>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Delivered / Paid
          </p>
          <h2 className="text-2xl font-bold text-emerald-600 mt-1.5 tabular-nums">
            {orders.filter((o) => o.status === "Delivered").length}
          </h2>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Pending
          </p>
          <h2 className="text-2xl font-bold text-amber-600 mt-1.5 tabular-nums">
            {orders.filter((o) => o.status === "Pending").length}
          </h2>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Cancelled
          </p>
          <h2 className="text-2xl font-bold text-rose-600 mt-1.5 tabular-nums">
            {orders.filter((o) => o.status === "Cancelled").length}
          </h2>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6 mb-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              {editId ? "Update Invoice" : "Create New Invoice"}
            </h2>
            <button
              type="button"
              onClick={resetForm}
              aria-label="Close form"
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <FaTimes />
            </button>
          </div>

          {/* AI Quick Invoice Bar */}
          {!editId && (
            <form
              onSubmit={handleAiParse}
              className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-4"
            >
              <label
                htmlFor="ai-invoice-prompt"
                className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-700 mb-2"
              >
                <FaMagic />
                AI Quick Invoice (Natural Language → Line Items)
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  id="ai-invoice-prompt"
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder='e.g. "Bill Rahul Sharma for 2 Wireless Mice and 1 Keyboard, 18% GST, Delivered"'
                  className="flex-1 bg-white border border-indigo-200 px-3.5 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
                <button
                  type="submit"
                  disabled={aiParsing || !aiPrompt.trim()}
                  className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-60 shrink-0"
                >
                  <FaMagic className="text-xs" />
                  {aiParsing ? "Parsing..." : "Parse with AI"}
                </button>
              </div>
              {aiWarnings.length > 0 && (
                <div className="mt-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Stock warning: {aiWarnings.join(" • ")}
                </div>
              )}
            </form>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="ord-customer"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Customer Name
                </label>
                <input
                  id="ord-customer"
                  type="text"
                  placeholder="e.g., Rahul Verma"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full border border-slate-300 px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="ord-tax"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Tax / GST (%)
                </label>
                <input
                  id="ord-tax"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  disabled={Boolean(editId)}
                  className="w-full border border-slate-300 px-3.5 py-2.5 rounded-xl text-sm disabled:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <div>
                <label
                  htmlFor="ord-status"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Invoice Status
                </label>
                <select
                  id="ord-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full border border-slate-300 px-3.5 py-2.5 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                >
                  <option value="Pending">Pending</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Line Items Builder */}
            {!editId && (
              <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-800">
                    Line Items
                  </h3>
                  <button
                    type="button"
                    onClick={addLineItem}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg"
                  >
                    <FaPlus /> Add Item
                  </button>
                </div>

                {lineItems.length === 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center pt-1">
                    <p className="text-xs text-slate-500">
                      No line items added. Add products for automatic pricing &amp;
                      stock deduction, or enter a custom amount.
                    </p>
                    <div>
                      <label
                        htmlFor="ord-manual-amount"
                        className="block text-xs font-medium text-slate-700 mb-1"
                      >
                        Custom Total Amount (₹)
                      </label>
                      <input
                        id="ord-manual-amount"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={manualTotal}
                        onChange={(e) => setManualTotal(e.target.value)}
                        required
                        className="w-full border border-slate-300 px-3 py-2 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {lineItems.map((item, idx) => {
                      const prod = products.find(
                        (p) => p._id === item.productId
                      );
                      return (
                        <div
                          key={idx}
                          className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                        >
                          <div className="sm:col-span-6">
                            <select
                              aria-label={`Product for line ${idx + 1}`}
                              value={item.productId}
                              onChange={(e) =>
                                updateLineItem(idx, "productId", e.target.value)
                              }
                              className="w-full border border-slate-300 px-3 py-2 rounded-lg text-sm bg-white"
                            >
                              {products.map((p) => (
                                <option key={p._id} value={p._id}>
                                  {p.productName} — ₹{p.price} ({p.stock} left)
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="sm:col-span-3">
                            <input
                              type="number"
                              min="1"
                              aria-label={`Quantity for line ${idx + 1}`}
                              value={item.quantity}
                              onChange={(e) =>
                                updateLineItem(idx, "quantity", e.target.value)
                              }
                              className="w-full border border-slate-300 px-3 py-2 rounded-lg text-sm"
                              required
                            />
                          </div>
                          <div className="sm:col-span-2 text-sm font-semibold text-slate-700 tabular-nums sm:text-right">
                            ₹
                            {(
                              (prod?.price || 0) * Number(item.quantity || 0)
                            ).toLocaleString()}
                          </div>
                          <div className="sm:col-span-1 text-right">
                            <button
                              type="button"
                              onClick={() => removeLineItem(idx)}
                              aria-label={`Remove line ${idx + 1}`}
                              className="p-2 text-slate-400 hover:text-rose-600"
                            >
                              <FaTrash className="text-xs" />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    <div className="pt-3 border-t border-slate-200 flex flex-col items-end text-sm space-y-1">
                      <p className="text-slate-600">
                        Subtotal:{" "}
                        <span className="font-semibold text-slate-900 tabular-nums">
                          ₹{subtotal.toLocaleString()}
                        </span>
                      </p>
                      {numericTaxRate > 0 && (
                        <p className="text-slate-600">
                          Tax ({numericTaxRate}%):{" "}
                          <span className="font-semibold text-slate-900 tabular-nums">
                            ₹{taxAmount.toLocaleString()}
                          </span>
                        </p>
                      )}
                      <p className="text-base font-bold text-slate-900">
                        Total:{" "}
                        <span className="tabular-nums text-indigo-600">
                          ₹{computedTotal.toLocaleString()}
                        </span>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {editId && (
              <div>
                <label
                  htmlFor="ord-edit-amount"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Total Amount (₹)
                </label>
                <input
                  id="ord-edit-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={manualTotal}
                  onChange={(e) => setManualTotal(e.target.value)}
                  className="w-full border border-slate-300 px-3.5 py-2.5 rounded-xl text-sm"
                  required
                />
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : editId
                  ? "Update Invoice"
                  : "Create Invoice"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="border border-slate-300 text-slate-700 hover:bg-slate-50 px-5 py-2.5 rounded-xl text-sm font-medium transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
          <div className="flex flex-wrap items-center gap-2">
            {["All", "Pending", "Delivered", "Cancelled"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  statusFilter === s
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
            <input
              type="text"
              aria-label="Search orders"
              placeholder="Search by customer or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <EmptyState
            icon={FaShoppingCart}
            title="No invoices found"
            description="Create a new invoice manually or with the AI Quick Invoice bar."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                  <th className="py-3 pr-4 font-semibold">#</th>
                  <th className="py-3 pr-4 font-semibold">Customer</th>
                  <th className="py-3 pr-4 font-semibold">Items</th>
                  <th className="py-3 pr-4 font-semibold">Total</th>
                  <th className="py-3 pr-4 font-semibold">Status</th>
                  <th className="py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((order, index) => (
                  <tr key={order._id} className="hover:bg-slate-50">
                    <td className="py-3 pr-4 text-slate-500 tabular-nums">
                      {index + 1}
                    </td>
                    <td className="py-3 pr-4 font-medium text-slate-900">
                      {order.customerName}
                    </td>
                    <td className="py-3 pr-4 text-slate-600 max-w-xs truncate">
                      {order.items?.length > 0
                        ? order.items
                            .map((i) => `${i.productName} ×${i.quantity}`)
                            .join(", ")
                        : "Custom invoice"}
                    </td>
                    <td className="py-3 pr-4 tabular-nums font-semibold text-slate-800">
                      ₹{Number(order.totalAmount || 0).toLocaleString()}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(
                          order.status
                        )}`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(order)}
                          aria-label={`View invoice for ${order.customerName}`}
                          className="p-2 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition"
                        >
                          <FaEye />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEdit(order)}
                          aria-label={`Edit invoice for ${order.customerName}`}
                          className="p-2 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition"
                        >
                          <FaEdit />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(order)}
                          aria-label={`Delete invoice for ${order.customerName}`}
                          className="p-2 rounded-lg text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice Details Modal */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Invoice</h2>
                <p className="font-mono text-xs text-slate-400">
                  #{selectedOrder._id}
                </p>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(
                  selectedOrder.status
                )}`}
              >
                {selectedOrder.status}
              </span>
            </div>

            <div className="space-y-2 text-sm text-slate-700">
              <p>
                <span className="font-semibold text-slate-900">Customer:</span>{" "}
                {selectedOrder.customerName}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Date:</span>{" "}
                {selectedOrder.createdAt
                  ? new Date(selectedOrder.createdAt).toLocaleString()
                  : "—"}
              </p>

              {selectedOrder.items?.length > 0 && (
                <div className="pt-3 border-t border-slate-100">
                  <p className="font-semibold text-slate-900 mb-2 text-xs uppercase tracking-wider">
                    Line Items
                  </p>
                  <ul className="space-y-1.5 text-xs">
                    {selectedOrder.items.map((item, idx) => (
                      <li key={idx} className="flex justify-between">
                        <span>
                          {item.productName} × {item.quantity} (₹{item.price})
                        </span>
                        <span className="font-semibold tabular-nums">
                          ₹{(item.price * item.quantity).toLocaleString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 space-y-1 text-right">
                {selectedOrder.taxRate > 0 && (
                  <>
                    <p className="text-xs text-slate-500">
                      Subtotal: ₹
                      {Number(selectedOrder.subtotal || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500">
                      Tax ({selectedOrder.taxRate}%): ₹
                      {Number(selectedOrder.taxAmount || 0).toLocaleString()}
                    </p>
                  </>
                )}
                <p className="text-base font-bold text-slate-900">
                  Total: ₹
                  {Number(selectedOrder.totalAmount || 0).toLocaleString()}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedOrder(null)}
              className="mt-6 w-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl text-sm font-semibold transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete Invoice"
        message={`Are you sure you want to delete the invoice for "${deleteTarget?.customerName}"?`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
};

export default Orders;
