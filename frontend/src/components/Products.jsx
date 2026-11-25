import React, { useState, useEffect } from "react";
import { FaPlus, FaEdit, FaTrash, FaSearch, FaBoxOpen } from "react-icons/fa";
import api from "../api/client";
import { useToast } from "./ui/ToastContext";
import ConfirmModal from "./ui/ConfirmModal";
import { EmptyState, ErrorBanner, LoadingState, PageHeader } from "./ui/StateViews";

const Products = () => {
  const toast = useToast();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);

  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [status, setStatus] = useState("In Stock");

  const [searchTerm, setSearchTerm] = useState("");
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
      const [prodRes, catRes] = await Promise.all([
        api.get("/product"),
        api.get("/category"),
      ]);
      if (prodRes.data.success) setProducts(prodRes.data.products || []);
      if (catRes.data.success) setCategories(catRes.data.categories || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setShowForm(false);
    setEditId(null);
    setProductName("");
    setCategory("");
    setPrice("");
    setStock("");
    setStatus("In Stock");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const numericStock = Number(stock);
      const productData = {
        productName,
        category,
        price: Number(price),
        stock: numericStock,
        status: numericStock <= 0 ? "Out of Stock" : status,
      };

      if (editId) {
        await api.put(`/product/${editId}`, productData);
        toast.success("Product updated successfully");
      } else {
        await api.post("/product/add", productData);
        toast.success("Product added successfully");
      }
      resetForm();
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (product) => {
    setProductName(product.productName);
    setCategory(product.category);
    setPrice(product.price);
    setStock(product.stock);
    setStatus(product.status);
    setEditId(product._id);
    setShowForm(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await api.delete(`/product/${deleteTarget._id}`);
      toast.success("Product deleted");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete product");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const filteredProducts = products.filter(
    (product) =>
      product.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <LoadingState label="Loading products..." />;

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle="Manage SKUs, pricing, category assignments, and stock levels"
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
            Add Product
          </button>
        }
      />

      <ErrorBanner message={error} onRetry={fetchData} />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Total Products
          </p>
          <h2 className="text-2xl font-bold text-slate-900 mt-1.5 tabular-nums">
            {products.length}
          </h2>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            In Stock
          </p>
          <h2 className="text-2xl font-bold text-emerald-600 mt-1.5 tabular-nums">
            {products.filter((p) => p.status === "In Stock").length}
          </h2>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Out of Stock
          </p>
          <h2 className="text-2xl font-bold text-rose-600 mt-1.5 tabular-nums">
            {products.filter((p) => p.status === "Out of Stock").length}
          </h2>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            {editId ? "Update Product" : "Add New Product"}
          </h2>

          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div>
              <label
                htmlFor="prod-name"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Product Name
              </label>
              <input
                id="prod-name"
                type="text"
                placeholder="e.g., Wireless Mouse"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="w-full border border-slate-300 px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                required
              />
            </div>

            <div>
              <label
                htmlFor="prod-category"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Category
              </label>
              {categories.length > 0 ? (
                <select
                  id="prod-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full border border-slate-300 px-3.5 py-2.5 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c.categoryName}>
                      {c.categoryName}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id="prod-category"
                  type="text"
                  placeholder="Enter category name"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full border border-slate-300 px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  required
                />
              )}
            </div>

            <div>
              <label
                htmlFor="prod-price"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Price (₹)
              </label>
              <input
                id="prod-price"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full border border-slate-300 px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                required
              />
            </div>

            <div>
              <label
                htmlFor="prod-stock"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Stock Quantity
              </label>
              <input
                id="prod-stock"
                type="number"
                min="0"
                placeholder="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full border border-slate-300 px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                required
              />
            </div>

            <div>
              <label
                htmlFor="prod-status"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Availability Status
              </label>
              <select
                id="prod-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full border border-slate-300 px-3.5 py-2.5 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              >
                <option value="In Stock">In Stock</option>
                <option value="Out of Stock">Out of Stock</option>
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
                  ? "Update Product"
                  : "Save Product"}
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

      {/* Search + Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <h2 className="text-lg font-semibold text-slate-900">
            Product Catalog
          </h2>
          <div className="relative w-full sm:w-72">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
            <input
              type="text"
              aria-label="Search products"
              placeholder="Search by name or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <EmptyState
            icon={FaBoxOpen}
            title="No products found"
            description={
              searchTerm
                ? "Try searching with a different keyword."
                : "Add your first product to start tracking inventory."
            }
            action={
              !searchTerm && (
                <button
                  type="button"
                  onClick={() => setShowForm(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition"
                >
                  Add Product
                </button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                  <th className="py-3 pr-4 font-semibold">#</th>
                  <th className="py-3 pr-4 font-semibold">Product</th>
                  <th className="py-3 pr-4 font-semibold">Category</th>
                  <th className="py-3 pr-4 font-semibold">Price</th>
                  <th className="py-3 pr-4 font-semibold">Stock</th>
                  <th className="py-3 pr-4 font-semibold">Status</th>
                  <th className="py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((product, index) => (
                  <tr key={product._id} className="hover:bg-slate-50">
                    <td className="py-3 pr-4 text-slate-500 tabular-nums">
                      {index + 1}
                    </td>
                    <td className="py-3 pr-4 font-medium text-slate-900">
                      {product.productName}
                    </td>
                    <td className="py-3 pr-4 text-slate-600">
                      {product.category}
                    </td>
                    <td className="py-3 pr-4 tabular-nums text-slate-700">
                      ₹{Number(product.price || 0).toLocaleString()}
                    </td>
                    <td className="py-3 pr-4 tabular-nums text-slate-700">
                      {product.stock}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          product.status === "In Stock"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {product.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(product)}
                          aria-label={`Edit ${product.productName}`}
                          className="p-2 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition"
                        >
                          <FaEdit />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(product)}
                          aria-label={`Delete ${product.productName}`}
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
        title="Delete Product"
        message={`Are you sure you want to delete "${deleteTarget?.productName}"?`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
};

export default Products;
