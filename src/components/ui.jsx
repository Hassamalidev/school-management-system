"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Pencil, X } from "lucide-react";
import { num } from "@/lib/format";

/* ------------------------------------------------------------------ toasts */

const ToastContext = createContext({ toast: () => {} });

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);

  const toast = useCallback((message, tone = "success") => {
    const id = Math.random().toString(36).slice(2);
    setItems((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="no-print pointer-events-none fixed bottom-6 right-6 z-[60] flex w-80 flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${
              t.tone === "error" ? "bg-rose-600" : "bg-brand-600"
            }`}
          >
            {t.tone === "error" ? (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span className="flex-1">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext).toast;

/* ------------------------------------------------------------------- modal */

export function Modal({ open, onClose, title, subtitle, children, width = "max-w-2xl" }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="no-print fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 sm:items-start sm:overflow-y-auto sm:p-8">
      {/* A bottom sheet on phones, a centred dialog from sm upwards. */}
      <div
        className={`flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-2xl
                    sm:my-auto sm:max-h-none sm:rounded-2xl ${width}`}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-navy-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="icon-btn shrink-0 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="scroll-thin overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- small parts */

export function Spinner({ className = "h-5 w-5" }) {
  return <Loader2 className={`animate-spin ${className}`} />;
}

export function Loading({ label = "Loading…" }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-slate-500">
      <Spinner /> {label}
    </div>
  );
}

export function Empty({ icon: Icon, title, hint, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      {Icon && <Icon className="h-10 w-10 text-slate-300" />}
      <p className="text-base font-semibold text-slate-700">{title}</p>
      {hint && <p className="max-w-md text-sm text-slate-500">{hint}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, sub, tone = "sky" }) {
  const tones = {
    sky: "bg-sky-50 text-sky-600",
    green: "bg-emerald-50 text-emerald-600",
    violet: "bg-violet-50 text-violet-600",
    rose: "bg-rose-50 text-rose-600",
    amber: "bg-amber-50 text-amber-600",
  };
  return (
    <div className="card flex items-center gap-3 p-4 sm:gap-4 sm:p-6">
      <div
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl sm:h-12 sm:w-12 ${
          tones[tone] || tones.sky
        }`}
      >
        {Icon && <Icon className="h-5 w-5 sm:h-6 sm:w-6" />}
      </div>
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium text-slate-500">{label}</p>
        <p className="truncate text-lg font-bold text-navy-900 sm:text-xl">{value}</p>
        {sub && <p className="truncate text-xs text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, icon: Icon, children }) {
  return (
    <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand-600 text-white">
            <Icon className="h-6 w-6" />
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold tracking-tight text-navy-900 sm:text-3xl">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {children && (
        <div className="flex w-full flex-wrap items-center gap-2 [&>*]:flex-1 sm:w-auto sm:[&>*]:flex-none">
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * A number shown as plain text until you click it, then an input. Enter or
 * clicking away saves, Escape cancels. `onSave` receives the new number and
 * should return a promise; the cell shows a spinner until it settles.
 */
export function InlineNumber({ value, onSave, min = 0, className = "", title = "Click to edit" }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);
  const toast = useToast();

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const start = () => {
    setDraft(String(Number(value ?? 0)));
    setEditing(true);
  };

  const cancel = () => setEditing(false);

  const commit = async () => {
    const next = Number(draft);
    if (!Number.isFinite(next) || next < min) {
      toast(`Enter a number of ${min} or more.`, "error");
      return cancel();
    }
    if (next === Number(value ?? 0)) return cancel();

    setBusy(true);
    try {
      await onSave(next);
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setBusy(false);
      setEditing(false);
    }
  };

  if (busy) {
    return (
      <span className="inline-flex items-center justify-end gap-1.5 text-slate-400">
        <Spinner className="h-3.5 w-3.5" />
      </span>
    );
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        min={min}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") cancel();
        }}
        className="w-28 rounded-lg border border-brand-500 bg-white px-2 py-1 text-right text-sm tabular-nums
                   outline-none ring-2 ring-brand-500/20"
      />
    );
  }

  return (
    <button
      type="button"
      title={title}
      onClick={start}
      className={`group inline-flex items-center justify-end gap-1.5 rounded-lg px-2 py-1 tabular-nums
                  transition hover:bg-brand-50 hover:text-brand-800 ${className}`}
    >
      {num(value)}
      <Pencil className="h-3 w-3 shrink-0 text-slate-300 transition group-hover:text-brand-600" />
    </button>
  );
}

export function Confirm({ open, onClose, onConfirm, title, message, confirmLabel = "Delete" }) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal open={open} onClose={onClose} title={title} width="max-w-md">
      <p className="text-sm text-slate-600">{message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <button className="btn-secondary" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button
          className="btn-danger"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm();
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy && <Spinner className="h-4 w-4" />}
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
