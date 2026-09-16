"use client";

import { useMemo } from "react";
import { periodOptions } from "@/lib/format";

/** Month + year selector shared by the dashboard, challans and reports. */
export default function PeriodPicker({ value, onChange, className = "" }) {
  const options = useMemo(() => periodOptions(), []);
  return (
    <select
      className={`input w-auto font-semibold ${className}`}
      value={`${value.year}-${value.month}`}
      onChange={(e) => {
        const [y, m] = e.target.value.split("-").map(Number);
        onChange({ year: y, month: m });
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
