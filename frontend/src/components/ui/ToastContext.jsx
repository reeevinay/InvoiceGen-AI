import React, { createContext, useCallback, useContext, useState } from "react";
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaTimes } from "react-icons/fa";

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message, type = "info") => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => removeToast(id), 4000);
    },
    [removeToast]
  );

  const toast = {
    success: (msg) => showToast(msg, "success"),
    error: (msg) => showToast(msg, "error"),
    info: (msg) => showToast(msg, "info"),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        aria-live="polite"
        className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((t) => {
          const styles =
            t.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : t.type === "error"
              ? "bg-rose-50 border-rose-200 text-rose-900"
              : "bg-slate-900 border-slate-800 text-white";

          const Icon =
            t.type === "success"
              ? FaCheckCircle
              : t.type === "error"
              ? FaExclamationCircle
              : FaInfoCircle;

          const iconColor =
            t.type === "success"
              ? "text-emerald-600"
              : t.type === "error"
              ? "text-rose-600"
              : "text-indigo-400";

          return (
            <div
              key={t.id}
              role="status"
              className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium transition-all ${styles}`}
            >
              <Icon className={`mt-0.5 shrink-0 text-base ${iconColor}`} />
              <span className="flex-1">{t.message}</span>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                aria-label="Dismiss notification"
                className="opacity-60 hover:opacity-100 p-0.5"
              >
                <FaTimes className="text-xs" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
};
