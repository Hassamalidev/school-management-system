export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function monthName(m) {
  return MONTHS[Number(m) - 1] || "";
}

/** "September 2026" */
export function periodLabel(year, month) {
  return `${monthName(month)} ${year}`;
}

const nf = new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 });

/** 3570 -> "3,570" */
export function num(value) {
  const n = Number(value || 0);
  return nf.format(Math.round(n));
}

/** 3570 -> "PKR 3,570" */
export function pkr(value) {
  return `PKR ${num(value)}`;
}

/** "2026-09-15" -> "15 Sep 2026" */
export function shortDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/** "2026-09-15" -> "15-09-2026" */
export function dmy(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()}`;
}

/** Today as "YYYY-MM-DD" in local time (not UTC, which can shift the day). */
export function todayISO() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** A list of {year, month, label} around today, newest first. */
export function periodOptions(back = 18, forward = 6) {
  const now = new Date();
  const out = [];
  for (let i = forward; i >= -back; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    out.push({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      value: `${d.getFullYear()}-${d.getMonth() + 1}`,
      label: periodLabel(d.getFullYear(), d.getMonth() + 1),
    });
  }
  return out;
}

export function statusTone(status) {
  if (status === "Paid") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (status === "Partial") return "bg-amber-50 text-amber-700 ring-amber-200";
  return "bg-rose-50 text-rose-700 ring-rose-200";
}

/** Turn rows into a CSV file the browser downloads. */
export function downloadCSV(filename, columns, rows) {
  const esc = (v) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = columns.map((c) => esc(c.label)).join(",");
  const body = rows.map((r) => columns.map((c) => esc(c.get(r))).join(",")).join("\n");
  const blob = new Blob(["﻿" + head + "\n" + body], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
