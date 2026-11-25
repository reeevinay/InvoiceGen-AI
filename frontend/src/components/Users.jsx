import React, { useState, useEffect } from "react";
import {
  FaPlus,
  FaSearch,
  FaEdit,
  FaTrash,
  FaEnvelope,
  FaPhone,
  FaUsers,
} from "react-icons/fa";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "./ui/ToastContext";
import ConfirmModal from "./ui/ConfirmModal";
import { EmptyState, ErrorBanner, LoadingState, PageHeader } from "./ui/StateViews";

const Users = () => {
  const { user: currentUser } = useAuth();
  const toast = useToast();

  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("Staff");
  const [status, setStatus] = useState("Active");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/user/");
      if (response.data.success) {
        setUsers(response.data.users || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const resetForm = () => {
    setName("");
    setEmail("");
    setPassword("");
    setPhone("");
    setRole("Staff");
    setStatus("Active");
    setEditId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const userData = {
        name,
        email,
        phone,
        role,
        status,
        ...(password.trim() ? { password } : {}),
      };

      if (editId) {
        const res = await api.put(`/user/${editId}`, userData);
        if (res.data.success) toast.success("User updated successfully");
      } else {
        const res = await api.post("/user/add", userData);
        if (res.data.success) toast.success("User created successfully");
      }

      resetForm();
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save user");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (user) => {
    setName(user.name);
    setEmail(user.email);
    setPassword("");
    setPhone(user.phone);
    setRole(user.role);
    setStatus(user.status);
    setEditId(user._id);
    setShowForm(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      const res = await api.delete(`/user/${deleteTarget._id}`);
      if (res.data.success) {
        toast.success("User deleted");
        fetchUsers();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete user");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const getRoleColor = (r) => {
    switch (r) {
      case "Admin":
        return "bg-purple-50 text-purple-700";
      case "Manager":
        return "bg-blue-50 text-blue-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <LoadingState label="Loading users..." />;

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="Manage team accounts, roles, and access status"
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
            Add User
          </button>
        }
      />

      <ErrorBanner message={error} onRetry={fetchUsers} />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Total Users
          </p>
          <h2 className="text-2xl font-bold text-slate-900 mt-1.5 tabular-nums">
            {users.length}
          </h2>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Admins
          </p>
          <h2 className="text-2xl font-bold text-purple-600 mt-1.5 tabular-nums">
            {users.filter((u) => u.role === "Admin").length}
          </h2>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Managers
          </p>
          <h2 className="text-2xl font-bold text-blue-600 mt-1.5 tabular-nums">
            {users.filter((u) => u.role === "Manager").length}
          </h2>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Active
          </p>
          <h2 className="text-2xl font-bold text-emerald-600 mt-1.5 tabular-nums">
            {users.filter((u) => u.status === "Active").length}
          </h2>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            {editId ? "Update User" : "Add New User"}
          </h2>

          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div>
              <label
                htmlFor="usr-name"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Full Name
              </label>
              <input
                id="usr-name"
                type="text"
                placeholder="e.g., Ananya Patel"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-slate-300 px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                required
              />
            </div>

            <div>
              <label
                htmlFor="usr-email"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Email Address
              </label>
              <input
                id="usr-email"
                type="email"
                placeholder="user@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-slate-300 px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                required
              />
            </div>

            <div>
              <label
                htmlFor="usr-password"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                {editId ? "New Password (optional)" : "Password"}
              </label>
              <input
                id="usr-password"
                type="password"
                placeholder={editId ? "Leave blank to keep current" : "Minimum 4 characters"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={!editId}
                className="w-full border border-slate-300 px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>

            <div>
              <label
                htmlFor="usr-phone"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Phone Number
              </label>
              <input
                id="usr-phone"
                type="text"
                placeholder="9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border border-slate-300 px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                required
              />
            </div>

            <div>
              <label
                htmlFor="usr-role"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Role
              </label>
              <select
                id="usr-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full border border-slate-300 px-3.5 py-2.5 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              >
                <option value="Admin">Admin</option>
                <option value="Manager">Manager</option>
                <option value="Staff">Staff</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="usr-status"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Status
              </label>
              <select
                id="usr-status"
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
                {saving ? "Saving..." : editId ? "Update User" : "Create User"}
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
          <h2 className="text-lg font-semibold text-slate-900">Team Members</h2>
          <div className="relative w-full sm:w-72">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
            <input
              type="text"
              aria-label="Search users"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <EmptyState
            icon={FaUsers}
            title="No users found"
            description="Try adjusting your search query."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                  <th className="py-3 pr-4 font-semibold">#</th>
                  <th className="py-3 pr-4 font-semibold">Name</th>
                  <th className="py-3 pr-4 font-semibold">Email</th>
                  <th className="py-3 pr-4 font-semibold">Phone</th>
                  <th className="py-3 pr-4 font-semibold">Role</th>
                  <th className="py-3 pr-4 font-semibold">Status</th>
                  <th className="py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user, index) => {
                  const isSelf = currentUser?.id === user._id;
                  return (
                    <tr key={user._id} className="hover:bg-slate-50">
                      <td className="py-3 pr-4 text-slate-500 tabular-nums">
                        {index + 1}
                      </td>
                      <td className="py-3 pr-4 font-medium text-slate-900">
                        {user.name}
                        {isSelf && (
                          <span className="ml-2 text-xs text-indigo-600 font-normal">
                            (You)
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-slate-600">
                        <span className="inline-flex items-center gap-1.5">
                          <FaEnvelope className="text-slate-400 text-xs" />
                          {user.email}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-slate-600">
                        <span className="inline-flex items-center gap-1.5">
                          <FaPhone className="text-slate-400 text-xs" />
                          {user.phone}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${getRoleColor(
                            user.role
                          )}`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            user.status === "Active"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {user.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(user)}
                            aria-label={`Edit ${user.name}`}
                            className="p-2 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition"
                          >
                            <FaEdit />
                          </button>
                          {!isSelf && (
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(user)}
                              aria-label={`Delete ${user.name}`}
                              className="p-2 rounded-lg text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition"
                            >
                              <FaTrash />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete User"
        message={`Are you sure you want to delete "${deleteTarget?.name}"?`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
};

export default Users;
