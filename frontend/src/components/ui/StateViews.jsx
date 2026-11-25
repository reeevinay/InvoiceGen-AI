import React from "react";

export const PageHeader = ({ title, subtitle, action }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs mb-6">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  </div>
);

export const LoadingState = ({ label = "Loading data..." }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-xs">
    <div className="inline-block w-7 h-7 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
    <p className="text-sm font-medium text-slate-500">{label}</p>
  </div>
);

export const ErrorBanner = ({ message, onRetry }) => {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl px-4 py-3 mb-6 flex items-center justify-between gap-4 text-sm"
    >
      <span>{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="px-3 py-1 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition shrink-0"
        >
          Retry
        </button>
      )}
    </div>
  );
};

export const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="py-12 px-4 text-center">
    {Icon && (
      <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-xl mb-3">
        <Icon />
      </div>
    )}
    <h3 className="text-base font-semibold text-slate-800">{title}</h3>
    {description && (
      <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
        {description}
      </p>
    )}
    {action && <div className="mt-4">{action}</div>}
  </div>
);
