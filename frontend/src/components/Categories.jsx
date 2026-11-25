import React, { useState, useEffect } from "react";
import { FaEdit, FaTrash, FaSearch, FaTable } from "react-icons/fa";
import api from "../api/client";
import { useToast } from "./ui/ToastContext";
import ConfirmModal from "./ui/ConfirmModal";
import { EmptyState, ErrorBanner, LoadingState, PageHeader } from "./ui/StateViews";

const Categories = () => {
  const toast = useToast();

  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editId, setEditId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/category");
      if (response.data.success) {
        setCategories(response.data.categories || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const resetForm = () => {
    setCategoryName("");
    setCategoryDescription("");
    setEditId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (editId) {
        const res = await api.put(`/category/${editId}`, {
          categoryName,
          categoryDescription,
        });
        if (res.data.success) {
          toast.success("Category updated successfully");
        }
      } else {
        const res = await api.post("/category/add", {
          categoryName,
          categoryDescription,
        });
        if (res.data.success) {
          toast.success("Category added successfully");
        }
      }
      resetForm();
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save category");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (category) => {
    setCategoryName(category.categoryName);
    setCategoryDescription(category.categoryDescription);
    setEditId(category._id);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      const response = await api.delete(`/category/${deleteTarget._id}`);
      if (response.data.success) {
        toast.success("Category deleted");
        if (editId === deleteTarget._id) resetForm();
        fetchCategories();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete category");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const filteredCategories = categories.filter(
    (c) =>
      c.categoryName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.categoryDescription?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <LoadingState label="Loading categories..." />;

  return (
    <div>
      <PageHeader
        title="Categories"
        subtitle="Organize your product catalog into structured categories"
        action={
          <div className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-sm">
            <span className="text-slate-500 mr-2">Total:</span>
            <span className="font-bold text-slate-900 tabular-nums">
              {categories.length}
            </span>
          </div>
        }
      />

      <ErrorBanner message={error} onRetry={fetchCategories} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              {editId ? "Edit Category" : "Add New Category"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="cat-name"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Category Name
                </label>
                <input
                  id="cat-name"
                  type="text"
                  placeholder="e.g., Electronics"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  required
                  className="w-full border border-slate-300 px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <div>
                <label
                  htmlFor="cat-desc"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Description
                </label>
                <textarea
                  id="cat-desc"
                  rows="4"
                  placeholder="Brief description of this category"
                  value={categoryDescription}
                  onChange={(e) => setCategoryDescription(e.target.value)}
                  required
                  className="w-full border border-slate-300 px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editId
                    ? "Update Category"
                    : "Add Category"}
                </button>

                {editId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="w-full border border-slate-300 text-slate-700 hover:bg-slate-50 py-2.5 rounded-xl text-sm font-medium transition"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* List */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <h2 className="text-lg font-semibold text-slate-900">
                All Categories
              </h2>
              <div className="relative w-full sm:w-64">
                <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                <input
                  type="text"
                  aria-label="Search categories"
                  placeholder="Search categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>
            </div>

            {filteredCategories.length === 0 ? (
              <EmptyState
                icon={FaTable}
                title="No categories found"
                description={
                  searchTerm
                    ? "Try adjusting your search query."
                    : "Create your first category using the form on the left."
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                      <th className="py-3 pr-4 font-semibold">#</th>
                      <th className="py-3 pr-4 font-semibold">Name</th>
                      <th className="py-3 pr-4 font-semibold">Description</th>
                      <th className="py-3 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCategories.map((cat, idx) => (
                      <tr key={cat._id} className="hover:bg-slate-50">
                        <td className="py-3 pr-4 text-slate-500 tabular-nums">
                          {idx + 1}
                        </td>
                        <td className="py-3 pr-4 font-medium text-slate-900">
                          {cat.categoryName}
                        </td>
                        <td className="py-3 pr-4 text-slate-600 max-w-xs truncate">
                          {cat.categoryDescription}
                        </td>
                        <td className="py-3 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(cat)}
                              aria-label={`Edit ${cat.categoryName}`}
                              className="p-2 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition"
                            >
                              <FaEdit />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(cat)}
                              aria-label={`Delete ${cat.categoryName}`}
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
        </div>
      </div>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete Category"
        message={`Are you sure you want to delete "${deleteTarget?.categoryName}"?`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
};

export default Categories;
