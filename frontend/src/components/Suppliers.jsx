import React, { useState, useEffect } from "react";
import {
  FaPlus,
  FaSearch,
  FaEdit,
  FaTrash,
  FaPhone,
  FaEnvelope,
  FaTruck,
} from "react-icons/fa";
import api from "../api/client";
import { useToast } from "./ui/ToastContext";
import ConfirmModal from "./ui/ConfirmModal";
import { EmptyState, ErrorBanner, LoadingState, PageHeader } from "./ui/StateViews";

const Suppliers = () => {
  const toast = useToast();

  const [showForm, setShowForm] = useState(false);
  const [supplierName, setSupplierName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("Active");

  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editId, setEditId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/supplier");
      if (response.data.success) {
        setSuppliers(response.data.suppliers || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load suppliers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const resetForm = () => {
    setSupplierName("");
    setContactPerson("");
    setEmail("");
    setPhone("");
    setStatus("Active");
    setEditId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = { supplierName, contactPerson, email, phone, status };

      if (editId) {
        const res = await api.put(`/supplier/${editId}`, payload);
        if (res.data.success) toast.success("Supplier updated successfully");
      } else {
        const res = await api.post("/supplier/add", payload);
        if (res.data.success) toast.success("Supplier added successfully");
      }

      resetForm();
      fetchSuppliers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save supplier");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (supplier) => {
    setSupplierName(supplier.supplierName);
    setContactPerson(supplier.contactPerson);
    setEmail(supplier.email);
    setPhone(supplier.phone);
    setStatus(supplier.status);
    setEditId(supplier._id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      const response = await api.delete(`/supplier/${deleteTarget._id}`);
      if (response.data.success) {
        toast.success("Supplier deleted");
        fetchSuppliers();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete supplier");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.supplierName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <LoadingState label="Loading suppliers..." />;

  return (
    <div>
      <PageHeader
        title="Suppliers"
        subtitle="Manage vendor contacts, statuses, and procurement partners"
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
            Add Supplier
          </button>
        }
      />

      <ErrorBanner message={error} onRetry={fetchSuppliers} />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Total Suppliers
          </p>
          <h2 className="text-2xl font-bold text-slate-900 mt-1.5 tabular-nums">
            {suppliers.length}
          </h2>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Active
          </p>
          <h2 className="text-2xl font-bold text-emerald-600 mt-1.5 tabular-nums">
            {suppliers.filter((s) => s.status === "Active").length}
          </h2>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Inactive
          </p>
          <h2 className="text-2xl font-bold text-rose-600 mt-1.5 tabular-nums">
            {suppliers.filter((s) => s.status === "Inactive").length}
          </h2>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            {editId ? "Update Supplier" : "Add New Supplier"}
          </h2>

          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div>
              <label
                htmlFor="sup-name"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Supplier Name
              </label>
              <input
                id="sup-name"
                type="text"
                placeholder="e.g., Acme Distribution"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                className="w-full border border-slate-300 px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                required
              />
            </div>

            <div>
              <label
                htmlFor="sup-contact"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Contact Person
              </label>
              <input
                id="sup-contact"
                type="text"
                placeholder="e.g., Priya Sharma"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                className="w-full border border-slate-300 px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                required
              />
            </div>

            <div>
              <label
                htmlFor="sup-email"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Email Address
              </label>
              <input
                id="sup-email"
                type="email"
                placeholder="vendor@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-slate-300 px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                required
              />
            </div>

            <div>
              <label
                htmlFor="sup-phone"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Phone Number
              </label>
              <input
                id="sup-phone"
                type="text"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border border-slate-300 px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                required
              />
            </div>

            <div>
              <label
                htmlFor="sup-status"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Status
              </label>
              <select
                id="sup-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full border border-slate-300 px-3.5 py-2.5 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
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
                    ? "Update Supplier"
                    : "Save Supplier"}
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <h2 className="text-lg font-semibold text-slate-900">
            Suppliers Directory
          </h2>
          <div className="relative w-full sm:w-72">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
            <input
              type="text"
              aria-label="Search suppliers"
              placeholder="Search suppliers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>
        </div>

        {filteredSuppliers.length === 0 ? (
          <EmptyState
            icon={FaTruck}
            title="No suppliers found"
            description={
              searchTerm
                ? "Try a different search term."
                : "Add your first supplier to track vendor relationships."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                  <th className="py-3 pr-4 font-semibold">#</th>
                  <th className="py-3 pr-4 font-semibold">Supplier</th>
                  <th className="py-3 pr-4 font-semibold">Contact</th>
                  <th className="py-3 pr-4 font-semibold">Email</th>
                  <th className="py-3 pr-4 font-semibold">Phone</th>
                  <th className="py-3 pr-4 font-semibold">Status</th>
                  <th className="py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSuppliers.map((supplier, index) => (
                  <tr key={supplier._id} className="hover:bg-slate-50">
                    <td className="py-3 pr-4 text-slate-500 tabular-nums">
                      {index + 1}
                    </td>
                    <td className="py-3 pr-4 font-medium text-slate-900">
                      {supplier.supplierName}
                    </td>
                    <td className="py-3 pr-4 text-slate-700">
                      {supplier.contactPerson}
                    </td>
                    <td className="py-3 pr-4 text-slate-600">
                      <span className="inline-flex items-center gap-1.5">
                        <FaEnvelope className="text-slate-400 text-xs" />
                        {supplier.email}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-slate-600">
                      <span className="inline-flex items-center gap-1.5">
                        <FaPhone className="text-slate-400 text-xs" />
                        {supplier.phone}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${supplier.status === "Active"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-rose-50 text-rose-700"
                          }`}
                      >
                        {supplier.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(supplier)}
                          aria-label={`Edit ${supplier.supplierName}`}
                          className="p-2 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition"
                        >
                          <FaEdit />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(supplier)}
                          aria-label={`Delete ${supplier.supplierName}`}
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

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete Supplier"
        message={`Are you sure you want to delete "${deleteTarget?.supplierName}"?`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
};

export default Suppliers;
