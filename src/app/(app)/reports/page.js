"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, BarChart3, Download, Receipt, Scale, Users, Wallet } from "lucide-react";
import {
  fetchChallans,
  fetchClasses,
  fetchSalaries,
  fetchStudentBalances,
  payrollTotals,
  summariseByClass,
  totals,
} from "@/lib/db";
import { downloadCSV, num, periodLabel, pkr, statusTone } from "@/lib/format";
import { Empty, Loading, PageHeader, StatCard, useToast } from "@/components/ui";
import PeriodPicker from "@/components/PeriodPicker";

export default function ReportsPage() {
  const toast = useToast();
  const now = new Date();
  const [period, setPeriod] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [classes, setClasses] = useState([]);
  const [challans, setChallans] = useState([]);
  const [balances, setBalances] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cl, ch, bal, sal] = await Promise.all([
        fetchClasses(),
        fetchChallans({ year: period.year, month: period.month }),
        fetchStudentBalances(),
        fetchSalaries({ year: period.year, month: period.month }),
      ]);
      setClasses(cl);
      setChallans(ch);
      setBalances(bal);
      setSalaries(sal);
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setLoading(false);
    }
  }, [period, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const t = useMemo(() => totals(challans), [challans]);
  const pay = useMemo(() => payrollTotals(salaries), [salaries]);
  const byClass = useMemo(() => summariseByClass(challans, classes), [challans, classes]);
  const defaulters = useMemo(
    () => challans.filter((c) => Number(c.remaining) > 0).sort((a, b) => Number(b.remaining) - Number(a.remaining)),
    [challans]
  );
  const outstanding = useMemo(
    () => balances.filter((b) => Number(b.total_remaining) > 0).sort((a, b) => Number(b.total_remaining) - Number(a.total_remaining)),
    [balances]
  );

  const label = periodLabel(period.year, period.month);
  const pct = (paid, billed) => (billed > 0 ? `${Math.round((paid / billed) * 100)}%` : "—");

  return (
    <>
      <PageHeader icon={BarChart3} title="Reports" subtitle={`Collection summary for ${label}`}>
        <PeriodPicker value={period} onChange={setPeriod} />
      </PageHeader>

      {loading ? (
        <Loading />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={Users} tone="sky" label="Challans issued" value={num(t.count)} sub={label} />
            <StatCard icon={Wallet} tone="violet" label="Billed" value={pkr(t.billed)} />
            <StatCard icon={Receipt} tone="green" label="Collected" value={pkr(t.paid)} sub={pct(t.paid, t.billed) + " of billed"} />
            <StatCard
              icon={AlertTriangle}
              tone="rose"
              label="Outstanding"
              value={pkr(t.remaining)}
              sub={`${t.unpaidCount} unpaid · ${t.partialCount} partial`}
            />
          </div>

          {/* ------------------------------------- income vs expenditure -- */}
          <div className="card">
            <div className="flex items-center gap-2.5 border-b border-slate-200 px-5 py-4">
              <Scale className="h-5 w-5 shrink-0 text-brand-600" />
              <div>
                <h2 className="text-base font-bold text-navy-900">Income vs expenditure</h2>
                <p className="text-xs text-slate-500">
                  Fees collected against salaries paid, {label}. Cash actually moved, not amounts merely billed.
                </p>
              </div>
            </div>
            <div className="grid gap-px bg-slate-200 sm:grid-cols-4">
              <Tile label="Fees collected" value={pkr(t.paid)} sub={`of ${pkr(t.billed)} billed`} tone="text-emerald-700" />
              <Tile label="Salaries paid" value={pkr(pay.paid)} sub={`of ${pkr(pay.net)} payroll`} tone="text-rose-700" />
              <Tile
                label="Net cash position"
                value={pkr(t.paid - pay.paid)}
                sub={t.paid - pay.paid >= 0 ? "surplus" : "deficit"}
                tone={t.paid - pay.paid >= 0 ? "text-emerald-700" : "text-rose-700"}
              />
              <Tile
                label="Still to settle"
                value={pkr(t.remaining + pay.remaining)}
                sub={`${pkr(t.remaining)} owed to school · ${pkr(pay.remaining)} owed to staff`}
                tone="text-amber-700"
              />
            </div>
            {pay.count === 0 && (
              <p className="border-t border-slate-200 px-5 py-3 text-xs text-slate-500">
                No payroll generated for {label} yet — expenditure shows as zero. Generate it under Staff &amp;
                Payroll.
              </p>
            )}
          </div>

          {/* ------------------------------------------- class-wise report -- */}
          <Section
            title="Collection by class"
            subtitle={label}
            onExport={() =>
              downloadCSV(
                `collection-by-class-${period.year}-${period.month}.csv`,
                [
                  { label: "Class", get: (r) => r.name },
                  { label: "Monthly Fee", get: (r) => r.monthly_fee },
                  { label: "Challans", get: (r) => r.students },
                  { label: "Billed", get: (r) => r.billed },
                  { label: "Paid", get: (r) => r.paid },
                  { label: "Remaining", get: (r) => r.remaining },
                  { label: "Fully Paid", get: (r) => r.paidCount },
                  { label: "Partial", get: (r) => r.partialCount },
                  { label: "Unpaid", get: (r) => r.unpaidCount },
                ],
                byClass
              )
            }
            disabled={!byClass.length}
          >
            <table className="w-full">
              <thead>
                <tr className="bg-navy-800 text-white">
                  <th className="th">Class</th>
                  <th className="th text-right">Challans</th>
                  <th className="th text-right">Billed</th>
                  <th className="th text-right">Paid</th>
                  <th className="th text-right">Remaining</th>
                  <th className="th text-right">Collected</th>
                  <th className="th text-right">Paid / Partial / Unpaid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {byClass.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="td font-semibold text-navy-900">{r.name}</td>
                    <td className="td text-right tabular-nums">{r.students}</td>
                    <td className="td text-right tabular-nums">{num(r.billed)}</td>
                    <td className="td text-right tabular-nums text-emerald-700">{num(r.paid)}</td>
                    <td className="td text-right font-semibold tabular-nums text-rose-700">{num(r.remaining)}</td>
                    <td className="td text-right font-semibold tabular-nums">{pct(r.paid, r.billed)}</td>
                    <td className="td text-right tabular-nums text-slate-500">
                      {r.paidCount} / {r.partialCount} / {r.unpaidCount}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-amber-50 font-bold text-navy-900">
                  <td className="td">Total</td>
                  <td className="td text-right tabular-nums">{t.count}</td>
                  <td className="td text-right tabular-nums">{num(t.billed)}</td>
                  <td className="td text-right tabular-nums text-emerald-700">{num(t.paid)}</td>
                  <td className="td text-right tabular-nums text-rose-700">{num(t.remaining)}</td>
                  <td className="td text-right tabular-nums">{pct(t.paid, t.billed)}</td>
                  <td className="td text-right tabular-nums">
                    {t.paidCount} / {t.partialCount} / {t.unpaidCount}
                  </td>
                </tr>
              </tfoot>
            </table>
          </Section>

          {/* ------------------------------------------------- defaulters -- */}
          <Section
            title={`Unpaid & partial — ${label}`}
            subtitle={`${defaulters.length} student${defaulters.length === 1 ? "" : "s"} still owe this month`}
            onExport={() =>
              downloadCSV(
                `defaulters-${period.year}-${period.month}.csv`,
                [
                  { label: "Student", get: (r) => r.student_name },
                  { label: "Class", get: (r) => r.class_name || "" },
                  { label: "Father Name", get: (r) => r.father_name || "" },
                  { label: "Guardian", get: (r) => r.guardian_name || "" },
                  { label: "Phone", get: (r) => r.phone || "" },
                  { label: "Receipt No", get: (r) => r.receipt_no },
                  { label: "Payable", get: (r) => r.payable },
                  { label: "Paid", get: (r) => r.paid },
                  { label: "Remaining", get: (r) => r.remaining },
                  { label: "Status", get: (r) => r.status },
                ],
                defaulters
              )
            }
            disabled={!defaulters.length}
          >
            {!defaulters.length ? (
              <Empty icon={Receipt} title="Everyone has paid" hint={`All ${label} challans are fully settled.`} />
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-navy-800 text-white">
                    <th className="th">Student</th>
                    <th className="th">Class</th>
                    <th className="th">Father Name</th>
                    <th className="th">Guardian</th>
                    <th className="th">Phone</th>
                    <th className="th text-right">Payable</th>
                    <th className="th text-right">Paid</th>
                    <th className="th text-right">Remaining</th>
                    <th className="th">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {defaulters.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="td font-semibold text-navy-900">{r.student_name}</td>
                      <td className="td text-slate-600">{r.class_name || "—"}</td>
                      <td className="td text-slate-600">{r.father_name || "—"}</td>
                      <td className="td text-slate-600">{r.guardian_name || "—"}</td>
                      <td className="td text-slate-600">{r.phone || "—"}</td>
                      <td className="td text-right tabular-nums">{num(r.payable)}</td>
                      <td className="td text-right tabular-nums text-emerald-700">{num(r.paid)}</td>
                      <td className="td text-right font-semibold tabular-nums text-rose-700">{num(r.remaining)}</td>
                      <td className="td">
                        <span className={`chip ${statusTone(r.status)}`}>{r.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>

          {/* ---------------------------------------- lifetime outstanding -- */}
          <Section
            title="Outstanding across all months"
            subtitle={`${outstanding.length} student${outstanding.length === 1 ? "" : "s"} with a running balance`}
            onExport={() =>
              downloadCSV(
                "outstanding-all-months.csv",
                [
                  { label: "Student", get: (r) => r.full_name },
                  { label: "Class", get: (r) => r.class_name || "" },
                  { label: "Months Billed", get: (r) => r.months_billed },
                  { label: "Months Unpaid", get: (r) => r.months_unpaid },
                  { label: "Total Billed", get: (r) => r.total_billed },
                  { label: "Total Paid", get: (r) => r.total_paid },
                  { label: "Total Remaining", get: (r) => r.total_remaining },
                ],
                outstanding
              )
            }
            disabled={!outstanding.length}
          >
            {!outstanding.length ? (
              <Empty icon={Receipt} title="No running balances" hint="Every generated challan has been settled in full." />
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-navy-800 text-white">
                    <th className="th">Student</th>
                    <th className="th">Class</th>
                    <th className="th text-right">Months billed</th>
                    <th className="th text-right">Months unpaid</th>
                    <th className="th text-right">Total billed</th>
                    <th className="th text-right">Total paid</th>
                    <th className="th text-right">Total remaining</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {outstanding.map((r) => (
                    <tr key={r.student_id} className="hover:bg-slate-50">
                      <td className="td font-semibold text-navy-900">{r.full_name}</td>
                      <td className="td text-slate-600">{r.class_name || "—"}</td>
                      <td className="td text-right tabular-nums">{r.months_billed}</td>
                      <td className="td text-right tabular-nums text-amber-700">{r.months_unpaid}</td>
                      <td className="td text-right tabular-nums">{num(r.total_billed)}</td>
                      <td className="td text-right tabular-nums text-emerald-700">{num(r.total_paid)}</td>
                      <td className="td text-right font-semibold tabular-nums text-rose-700">{num(r.total_remaining)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>
        </div>
      )}
    </>
  );
}

function Section({ title, subtitle, onExport, disabled, children }) {
  return (
    <div className="card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div>
          <h2 className="text-base font-bold text-navy-900">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
        <button className="btn-secondary !py-2 text-xs" onClick={onExport} disabled={disabled}>
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
      </div>
      <div className="scroll-thin overflow-x-auto">{children}</div>
    </div>
  );
}

function Tile({ label, value, sub, tone }) {
  return (
    <div className="bg-white px-5 py-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`text-lg font-bold tabular-nums ${tone}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p>}
    </div>
  );
}
