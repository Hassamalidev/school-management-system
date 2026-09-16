"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Banknote, Download, Search, Trash2, TrendingDown, Users, Wallet } from "lucide-react";
import {
  deleteSalary,
  fetchSalaries,
  fetchSettings,
  generateSalaries,
  payrollTotals,
  summariseByDepartment,
  updateSalary,
} from "@/lib/db";
import { downloadCSV, num, periodLabel, pkr, statusTone } from "@/lib/format";
import { downloadSalaryPDF } from "@/lib/salaryPdf";
import { Confirm, Empty, InlineNumber, Loading, PageHeader, Spinner, StatCard, useToast } from "@/components/ui";
import PeriodPicker from "@/components/PeriodPicker";
import SalaryPaymentModal from "@/components/SalaryPaymentModal";

const DEPARTMENTS = ["Teaching", "Administration", "Daycare", "Support", "Management"];

export default function PayrollPage() {
  const toast = useToast();
  const now = new Date();
  const [period, setPeriod] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [paying, setPaying] = useState(null);
  const [removing, setRemoving] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sal, cfg] = await Promise.all([
        fetchSalaries({ year: period.year, month: period.month, department, status }),
        fetchSettings(),
      ]);
      setRows(sal);
      setSettings(cfg);
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setLoading(false);
    }
  }, [period, department, status, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => `${r.employee_name} ${r.employee_code}`.toLowerCase().includes(q));
  }, [rows, search]);

  const t = useMemo(() => payrollTotals(visible), [visible]);
  const byDept = useMemo(() => summariseByDepartment(visible), [visible]);
  const label = periodLabel(period.year, period.month);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await generateSalaries({ department, year: period.year, month: period.month });
      if (!res.total) toast("No active employees match this department.", "error");
      else if (!res.created) toast(`All ${res.total} salary slips for ${label} already exist.`);
      else toast(`${res.created} salary slip${res.created === 1 ? "" : "s"} generated for ${label}.`);
      await load();
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setGenerating(false);
    }
  };

  // Deductions are edited in place, the way class fees are.
  const patchDeduction = async (row, deductions) => {
    await updateSalary(row.id, { deductions });
    await load();
  };

  const pdf = async (list) => {
    if (!list.length) return toast("Nothing to download.", "error");
    try {
      await downloadSalaryPDF(list, settings);
      toast(`Downloaded ${list.length} salary slip${list.length === 1 ? "" : "s"}.`);
    } catch (e) {
      toast(e.message, "error");
    }
  };

  const exportCSV = () =>
    downloadCSV(
      `payroll-${period.year}-${period.month}.csv`,
      [
        { label: "Employee ID", get: (r) => r.employee_code },
        { label: "Name", get: (r) => r.employee_name },
        { label: "Designation", get: (r) => r.designation || "" },
        { label: "Department", get: (r) => r.department },
        { label: "Slip No", get: (r) => r.slip_no },
        { label: "Basic", get: (r) => r.basic },
        { label: "Allowances", get: (r) => r.allowances },
        { label: "Deductions", get: (r) => r.deductions },
        { label: "Net Salary", get: (r) => r.net_salary },
        { label: "Paid", get: (r) => r.paid },
        { label: "Remaining", get: (r) => r.remaining },
        { label: "Status", get: (r) => r.status },
      ],
      visible
    );

  return (
    <>
      <PageHeader icon={Banknote} title="Payroll" subtitle={`Salary slips and payments for ${label}`} />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} tone="sky" label="Salary slips" value={num(t.count)} sub={label} />
        <StatCard
          icon={TrendingDown}
          tone="violet"
          label="Total expenditure"
          value={pkr(t.net)}
          sub={t.deductions > 0 ? `after ${pkr(t.deductions)} deductions` : "net payable"}
        />
        <StatCard icon={Wallet} tone="green" label="Paid out" value={pkr(t.paid)} sub={`${t.paidCount} fully paid`} />
        <StatCard
          icon={Wallet}
          tone="rose"
          label="Still owed to staff"
          value={pkr(t.remaining)}
          sub={`${t.unpaidCount} unpaid · ${t.partialCount} partial`}
        />
      </div>

      {/* ---------------------------------------------------------- controls */}
      <div className="card card-pad mb-6 grid gap-3 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <label className="label">Department</label>
          <select className="input" value={department} onChange={(e) => setDepartment(e.target.value)}>
            <option value="">All departments</option>
            {DEPARTMENTS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </div>
        <div className="lg:col-span-3">
          <label className="label">Month</label>
          <PeriodPicker value={period} onChange={setPeriod} className="!w-full" />
        </div>
        <div className="lg:col-span-2">
          <label className="label">Status</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="Paid">Paid</option>
            <option value="Partial">Partial</option>
            <option value="Unpaid">Unpaid</option>
          </select>
        </div>
        <div className="flex items-end gap-2 lg:col-span-4">
          <button className="btn-primary flex-1" onClick={generate} disabled={generating}>
            {generating ? <Spinner className="h-4 w-4" /> : <Banknote className="h-4 w-4" />} Generate Payroll
          </button>
          <button className="btn-secondary" onClick={() => pdf(visible)} disabled={!visible.length}>
            <Download className="h-4 w-4" /> Slips
          </button>
          <button className="btn-secondary" onClick={exportCSV} disabled={!visible.length}>
            CSV
          </button>
        </div>
      </div>

      {loading ? (
        <Loading />
      ) : (
        <div className="space-y-6">
          <div className="card">
            <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-base font-bold text-navy-900">Salary slips — {label}</h2>
                <p className="text-xs text-slate-500">Click a deduction to edit it; the net recalculates.</p>
              </div>
              <div className="relative ml-auto w-full sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  className="input pl-9 !py-2"
                  placeholder="Search employee…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {!visible.length ? (
              <Empty
                icon={Banknote}
                title={`No salary slips for ${label}`}
                hint="Use Generate Payroll above to create this month's slips for every active employee."
              />
            ) : (
              <div className="scroll-thin overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-navy-800 text-white">
                      <th className="th">Employee</th>
                      <th className="th">Department</th>
                      <th className="th text-right">Basic</th>
                      <th className="th text-right">Allowances</th>
                      <th className="th text-right">Deductions</th>
                      <th className="th text-right">Net</th>
                      <th className="th text-right">Paid</th>
                      <th className="th text-right">Remaining</th>
                      <th className="th">Status</th>
                      <th className="th text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visible.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="td">
                          <div className="font-semibold text-navy-900">{r.employee_name}</div>
                          <div className="font-mono text-[10px] text-slate-400">
                            {r.employee_code} · {r.slip_no}
                          </div>
                        </td>
                        <td className="td text-slate-600">{r.department}</td>
                        <td className="td text-right tabular-nums">{num(r.basic)}</td>
                        <td className="td text-right tabular-nums">{num(r.allowances)}</td>
                        <td className="td text-right">
                          <InlineNumber
                            value={r.deductions}
                            title="Click to edit deductions"
                            onSave={(v) => patchDeduction(r, v)}
                          />
                        </td>
                        <td className="td text-right font-semibold tabular-nums">{num(r.net_salary)}</td>
                        <td className="td text-right tabular-nums text-emerald-700">{num(r.paid)}</td>
                        <td className="td text-right font-semibold tabular-nums text-rose-700">{num(r.remaining)}</td>
                        <td className="td">
                          <span className={`chip ${statusTone(r.status)}`}>{r.status}</span>
                        </td>
                        <td className="td">
                          <div className="flex justify-end gap-1">
                            <button
                              title="Pay salary"
                              className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50"
                              onClick={() => setPaying(r)}
                            >
                              <Wallet className="h-4 w-4" />
                            </button>
                            <button
                              title="Download slip"
                              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-navy-900"
                              onClick={() => pdf([r])}
                            >
                              <Download className="h-4 w-4" />
                            </button>
                            <button
                              title="Delete slip"
                              className="rounded-lg p-2 text-rose-500 hover:bg-rose-50"
                              onClick={() => setRemoving(r)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-amber-50 font-bold text-navy-900">
                      <td className="td" colSpan={2}>
                        Total ({t.count})
                      </td>
                      <td className="td text-right tabular-nums">
                        {num(visible.reduce((s, r) => s + Number(r.basic), 0))}
                      </td>
                      <td className="td text-right tabular-nums">
                        {num(visible.reduce((s, r) => s + Number(r.allowances), 0))}
                      </td>
                      <td className="td text-right tabular-nums">{num(t.deductions)}</td>
                      <td className="td text-right tabular-nums">{num(t.net)}</td>
                      <td className="td text-right tabular-nums text-emerald-700">{num(t.paid)}</td>
                      <td className="td text-right tabular-nums text-rose-700">{num(t.remaining)}</td>
                      <td className="td" colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {byDept.length > 0 && (
            <div className="card">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="text-base font-bold text-navy-900">Expenditure by department</h2>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
              <div className="scroll-thin overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600">
                      <th className="th">Department</th>
                      <th className="th text-right">Staff</th>
                      <th className="th text-right">Net payable</th>
                      <th className="th text-right">Paid</th>
                      <th className="th text-right">Remaining</th>
                      <th className="th text-right">Share of payroll</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {byDept.map((d) => (
                      <tr key={d.department} className="hover:bg-slate-50">
                        <td className="td font-semibold text-navy-900">{d.department}</td>
                        <td className="td text-right tabular-nums">{d.count}</td>
                        <td className="td text-right tabular-nums">{num(d.net)}</td>
                        <td className="td text-right tabular-nums text-emerald-700">{num(d.paid)}</td>
                        <td className="td text-right tabular-nums text-rose-700">{num(d.remaining)}</td>
                        <td className="td text-right tabular-nums">
                          {t.net > 0 ? `${Math.round((d.net / t.net) * 100)}%` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      <SalaryPaymentModal salary={paying} onClose={() => setPaying(null)} onSaved={load} />

      <Confirm
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        title="Delete salary slip"
        message={`Delete the ${periodLabel(removing?.year, removing?.month)} slip for ${
          removing?.employee_name
        }? Payments recorded against it are removed too.`}
        onConfirm={async () => {
          try {
            await deleteSalary(removing.id);
            toast("Salary slip deleted.");
            setRemoving(null);
            load();
          } catch (e) {
            toast(e.message, "error");
          }
        }}
      />
    </>
  );
}
