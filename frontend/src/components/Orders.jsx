import React, { useState, useEffect } from "react";
import {
  FaSearch,
  FaEye,
  FaEdit,
  FaTrash,
  FaPlus,
  FaShoppingCart,
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

  const [customerName, setCustomerName] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [totalAmount, setTotalAmount] = useState("");
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

  useEffect(() => {
    if (!editId && selectedProductId) {
      const prod = products.find((p) => p._id === selectedProductId);
      if (prod) {
        setTotalAmount((prod.price * Number(quantity || 1)).toFixed(2));
      }
    }
  }, [selectedProductId, quantity, products, editId]);

  const resetForm = () => {
    setCustomerName("");
    setSelectedProductId("");
    setQuantity(1);
    setTotalAmount("");
    setStatus("Pending");
    setEditId(null);
    setShowForm(false);
  };

  const handleEdit = (order) => {
    setEditId(order._id);
    setCustomerName(order.customerName);
    setTotalAmount(order.totalAmount);
    setStatus(order.status);
    setSelectedProductId("");
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (editId) {
        await api.put(`/order/${editId}`, {
          customerName,
          totalAmount: Number(totalAmount),
          status,
        });
        toast.success("Order updated successfully");
      } else {
        const payload = {
          customerName,
          totalAmount: Number(totalAmount),
          status,
          ...(selectedProductId
            ? {
                items: [
                  {
                    productId: selectedProductId,
                    quantity: Number(quantity),
                  },
                ],
              }
            : {}),
        };
        await api.post("/order/add", payload);
        toast.success("Order created successfully");
      }
      resetForm();
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save order");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await api.delete(`/order/${deleteTarget._id}`);
      toast.success("Order deleted");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete order");
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

  if (loading) return <LoadingState label="Loading orders..." />;

  return (
    <div>
      <PageHeader
        title="Orders"
        subtitle="Track customer orders, fulfillment statuses, and stock deductions"
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
            Add Order
          </button>
        }
      />

      <ErrorBanner message={error} onRetry={fetchData} />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Total Orders
          </p>
          <h2 className="text-2xl font-bold text-slate-900 mt-1.5 tabular-nums">
            {orders.length}
          </h2>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Delivered
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
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            {editId ? "Update Order" : "Create New Order"}
          </h2>

          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
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

            {!editId && products.length > 0 && (
              <>
                <div>
                  <label
                    htmlFor="ord-product"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    Product (auto-updates stock)
                  </label>
                  <select
                    id="ord-product"
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full border border-slate-300 px-3.5 py-2.5 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  >
                    <option value="">Custom / Manual Amount</option>
                    {products.map((p) => (
                      <option
                        key={p._id}
                        value={p._id}
                        disabled={p.stock <= 0}
                      >
                        {p.productName} — ₹{p.price} ({p.stock} in stock)
                      </option>
                    ))}
                  </select>
                </div>

                {selectedProductId && (
                  <div>
                    <label
                      htmlFor="ord-qty"
                      className="block text-sm font-medium text-slate-700 mb-1.5"
                    >
                      Quantity
                    </label>
                    <input
                      id="ord-qty"
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full border border-slate-300 px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                      required
                    />
                  </div>
                )}
              </>
            )}

            <div>
              <label
                htmlFor="ord-amount"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Total Amount (₹)
              </label>
              <input
                id="ord-amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                readOnly={!editId && Boolean(selectedProductId)}
                className="w-full border border-slate-300 px-3.5 py-2.5 rounded-xl text-sm read-only:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                required
              />
            </div>

            <div>
              <label
                htmlFor="ord-status"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Order Status
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

            <div className="md:col-span-2 flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : editId
                  ? "Update Order"
                  : "Create Order"}
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
            title="No orders found"
            description="Orders placed or recorded will appear here."
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
                    <td className="py-3 pr-4 text-slate-600">
                      {order.items?.length > 0
                        ? order.items
                            .map((i) => `${i.productName} ×${i.quantity}`)
                            .join(", ")
                        : "Manual order"}
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
                          aria-label={`View order for ${order.customerName}`}
                          className="p-2 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition"
                        >
                          <FaEye />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEdit(order)}
                          aria-label={`Edit order for ${order.customerName}`}
                          className="p-2 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition"
                        >
                          <FaEdit />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(order)}
                          aria-label={`Delete order for ${order.customerName}`}
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

      {/* Order Details Modal */}
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
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              Order Details
            </h2>
            <div className="space-y-2.5 text-sm text-slate-700">
              <p>
                <span className="font-semibold text-slate-900">Order ID:</span>{" "}
                <span className="font-mono text-xs">{selectedOrder._id}</span>
              </p>
              <p>
                <span className="font-semibold text-slate-900">Customer:</span>{" "}
                {selectedOrder.customerName}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Status:</span>{" "}
                {selectedOrder.status}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Total:</span> ₹
                {Number(selectedOrder.totalAmount || 0).toLocaleString()}
              </p>
              {selectedOrder.items?.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <p className="font-semibold text-slate-900 mb-1">Items:</p>
                  <ul className="space-y-1 text-xs">
                    {selectedOrder.items.map((item, idx) => (
                      <li key={idx} className="flex justify-between">
                        <span>
                          {item.productName} × {item.quantity}
                        </span>
                        <span>₹{(item.price * item.quantity).toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
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
        title="Delete Order"
        message={`Are you sure you want to delete the order for "${deleteTarget?.customerName}"?`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
};

export default Orders;
