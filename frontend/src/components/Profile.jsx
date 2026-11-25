import React, { useState, useEffect } from "react";
import {
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaBriefcase,
  FaEdit,
} from "react-icons/fa";
import api from "../api/client";
import { useToast } from "./ui/ToastContext";
import { ErrorBanner, LoadingState, PageHeader } from "./ui/StateViews";

const Profile = () => {
  const toast = useToast();

  const [profile, setProfile] = useState({});
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [company, setCompany] = useState("");
  const [joinDate, setJoinDate] = useState("");

  const [stats, setStats] = useState({
    totalOrders: 0,
    totalProducts: 0,
    totalSuppliers: 0,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchProfileAndStats = async () => {
    try {
      setLoading(true);
      setError("");
      const [profRes, dashRes] = await Promise.all([
        api.get("/profile"),
        api.get("/dashboard"),
      ]);

      if (profRes.data.success && profRes.data.profile) {
        const data = profRes.data.profile;
        setProfile(data);
        setName(data.name || "");
        setEmail(data.email || "");
        setPhone(data.phone || "");
        setAddress(data.address || "");
        setCompany(data.company || "");
        setJoinDate(data.joinDate || "");
      }

      if (dashRes.data.success && dashRes.data.stats) {
        setStats({
          totalOrders: dashRes.data.stats.totalOrders || 0,
          totalProducts: dashRes.data.stats.totalProducts || 0,
          totalSuppliers: dashRes.data.stats.totalSuppliers || 0,
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileAndStats();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const response = await api.put("/profile", {
        name,
        email,
        phone,
        address,
        company,
        joinDate,
      });

      if (response.data.success) {
        toast.success("Profile updated successfully");
        setShowForm(false);
        fetchProfileAndStats();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState label="Loading profile..." />;

  return (
    <div>
      <PageHeader
        title="My Profile"
        subtitle="Manage your personal account information and workspace details"
        action={
          <button
            type="button"
            onClick={() => setShowForm((prev) => !prev)}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-xs transition"
          >
            <FaEdit className="text-xs" />
            {showForm ? "Close Editor" : "Edit Profile"}
          </button>
        }
      />

      <ErrorBanner message={error} onRetry={fetchProfileAndStats} />

      {showForm && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Update Profile
          </h2>

          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div>
              <label
                htmlFor="prof-name"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Full Name
              </label>
              <input
                id="prof-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full border border-slate-300 px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>

            <div>
              <label
                htmlFor="prof-email"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Email Address
              </label>
              <input
                id="prof-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-slate-300 px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>

            <div>
              <label
                htmlFor="prof-phone"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Phone Number
              </label>
              <input
                id="prof-phone"
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border border-slate-300 px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>

            <div>
              <label
                htmlFor="prof-company"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Company
              </label>
              <input
                id="prof-company"
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full border border-slate-300 px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="prof-address"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Address
              </label>
              <input
                id="prof-address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full border border-slate-300 px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>

            <div className="md:col-span-2 flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="border border-slate-300 text-slate-700 hover:bg-slate-50 px-5 py-2.5 rounded-xl text-sm font-medium transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl shadow-xs p-6 text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-indigo-600 text-white flex items-center justify-center text-2xl font-bold uppercase">
            {profile?.name ? profile.name.charAt(0) : "U"}
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-4">
            {profile?.name || "User"}
          </h2>
          <p className="text-sm font-medium text-indigo-600 mt-0.5">
            {profile?.role || "Staff"}
          </p>
          {profile?.joinDate && (
            <p className="text-xs text-slate-500 mt-1">
              Joined {profile.joinDate}
            </p>
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6">
            <h3 className="text-base font-semibold text-slate-900 mb-4">
              Account Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                <FaEnvelope className="text-indigo-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">Email</p>
                  <p className="font-medium text-slate-900 truncate">
                    {profile?.email || "—"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                <FaPhone className="text-indigo-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">Phone</p>
                  <p className="font-medium text-slate-900 truncate">
                    {profile?.phone || "—"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                <FaBriefcase className="text-indigo-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">Company</p>
                  <p className="font-medium text-slate-900 truncate">
                    {profile?.company || "—"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                <FaMapMarkerAlt className="text-indigo-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">Address</p>
                  <p className="font-medium text-slate-900 truncate">
                    {profile?.address || "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Orders
              </p>
              <h4 className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                {stats.totalOrders}
              </h4>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Products
              </p>
              <h4 className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                {stats.totalProducts}
              </h4>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Suppliers
              </p>
              <h4 className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                {stats.totalSuppliers}
              </h4>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
