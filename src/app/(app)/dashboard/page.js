"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  ChevronRight,
  Clock,
  FileText,
  LayoutDashboard,
  Receipt,
  Users,
  Wallet,
} from "lucide-react";
import {
  fetchChallans,
  fetchClasses,
  fetchPayments,
  fetchStudents,
  saveClass,
  expectedBilling,
  summariseByClass,
  totals,
} from "@/lib/db";
import { num, periodLabel, pkr, shortDate } from "@/lib/format";
import { InlineNumber, Loading, PageHeader, StatCard, useToast } from "@/components/ui";
import PeriodPicker from "@/components/PeriodPicker";

export default function DashboardPage() {
  const toast = useToast();
  const now = new Date();
  const [period, setPeriod] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [challans, setChallans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cl, st, ch, pm] = await Promise.all([
        fetchClasses(),
        fetchStudents({ status: "active" }),
        fetchChallans({ year: period.year, month: period.month }),
        fetchPayments({ limit: 8 }),
      ]);
      setClasses(cl);
      setStudents(st);
      setChallans(ch);
      setPayments(pm.slice(0, 8));
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

  // Class rows carry both figures: what the student records say should be
  // charged, and what the issued challans actually add up to.
  const rows = useMemo(
    () => summariseByClass(challans, classes, students),
    [challans, classes, students]
  );

  // The monthly fee is editable right here as well as on Fee Structure.
  const patchFee = async (row, monthly_fee) => {
    const saved = await saveClass({ ...row, monthly_fee });
    setClasses((prev) => prev.map((c) => (c.id === saved.id ? saved : c)));
    toast(`${saved.name} monthly fee updated to ${num(monthly_fee)}.`);
  };

  // From each student's own fee and discount — not class fee x headcount,
  // which silently ignores per-student overrides.
  const expectedMonthly = useMemo(
    () => students.reduce((sum, st) => sum + expectedBilling(st), 0),
    [students]
  );

  const totalPaid = rows.reduce((sum, r) => sum + r.paid, 0);
  const totalIssued = rows.reduce((sum, r) => sum + r.issued, 0);

  // Classes where the issued challans no longer match the student records.
  const drift = useMemo(
    () =>
      rows.filter(
        (r) => r.enrolled > 0 && (r.withoutChallan > 0 || Math.round(r.issued) !== Math.round(r.expected))
      ),
    [rows]
  );

  return (
    <>
      <PageHeader
        icon={LayoutDashboard}
        title="Dashboard"
        subtitle={`Kindle Sprout Daycare & School · ${periodLabel(period.year, period.month)}`}
      >
        <PeriodPicker value={period} onChange={setPeriod} />
      </PageHeader>

      {loading ? (
        <Loading />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={Users} tone="sky" label="Active Students" value={num(students.length)} sub={`${classes.length} classes`} />
            <StatCard
              icon={Wallet}
              tone="violet"
              label="Billed this month"
              value={pkr(expectedMonthly)}
              sub={`${t.count} challan${t.count === 1 ? "" : "s"} issued, worth ${pkr(totalIssued)}`}
            />
            <StatCard
              icon={Receipt}
              tone="green"
              label="Paid"
              value={pkr(t.paid)}
              sub={expectedMonthly ? `${Math.round((t.paid / expectedMonthly) * 100)}% of expected` : "—"}
            />
            <StatCard
              icon={Clock}
              tone="rose"
              label="Remaining"
              value={pkr(Math.max(expectedMonthly - t.paid, 0))}
              sub={`${t.unpaidCount} unpaid · ${t.partialCount} partial`}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            {/* ------------------------------------------ class breakdown -- */}
            <div className="card xl:col-span-2">
              <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
                <div>
                  <h2 className="text-base font-bold text-navy-900">Class Fee Details</h2>
                  <p className="text-xs text-slate-500">
                    {periodLabel(period.year, period.month)} · billed from the student records · click a
                    monthly fee to edit it
                  </p>
                </div>
                <Link href="/fee-structure" className="btn-secondary !py-2 text-xs">
                  Manage
                </Link>
              </div>

              <div className="scroll-thin overflow-x-auto">
                <table className="w-full stack-table">
                  <thead>
                    <tr className="bg-navy-800 text-white">
                      <th className="th">Class</th>
                      <th className="th text-right">Monthly Fee</th>
                      <th className="th text-right">Students</th>
                      <th className="th text-right">Billed</th>
                      <th className="th text-right">Paid</th>
                      <th className="th text-right">Remaining</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td data-label="Class" className="td font-semibold text-navy-900">{r.name}</td>
                        <td data-label="Monthly Fee" className="td text-right">
                          <InlineNumber
                            value={r.monthly_fee}
                            title="Click to edit the monthly fee"
                            onSave={(v) => patchFee(r, v)}
                          />
                        </td>
                        <td data-label="Students" className="td text-right tabular-nums">{r.enrolled}</td>
                        <td data-label="Billed" className="td text-right tabular-nums">
                          <span className="inline-flex items-center justify-end gap-1.5">
                            {num(r.expected)}
                            {r.enrolled > 0 && Math.round(r.issued) !== Math.round(r.expected) && (
                              <AlertTriangle
                                className="h-3.5 w-3.5 shrink-0 text-amber-500"
                                title={`Challans issued for ${periodLabel(period.year, period.month)} total ${num(
                                  r.issued
                                )}${
                                  r.withoutChallan
                                    ? ` and ${r.withoutChallan} student${
                                        r.withoutChallan === 1 ? " has" : "s have"
                                      } none yet`
                                    : ""
                                }. Regenerate the month's challans to bring them in line.`}
                              />
                            )}
                          </span>
                        </td>
                        <td data-label="Paid" className="td text-right tabular-nums font-semibold text-emerald-700">{num(r.paid)}</td>
                        <td data-label="Remaining" className="td text-right tabular-nums font-semibold text-rose-700">
                          {num(Math.max(r.expected - r.paid, 0))}
                        </td>
                      </tr>
                    ))}
                    {!rows.length && (
                      <tr>
                        <td className="td text-center text-slate-500" colSpan={6}>
                          No classes yet — add them under Fee Structure.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-amber-50 font-bold text-navy-900">
                      <td className="td">Total</td>
                      <td className="td text-right">—</td>
                      <td className="td text-right tabular-nums">{students.length}</td>
                      <td className="td text-right tabular-nums">{num(expectedMonthly)}</td>
                      <td className="td text-right tabular-nums text-emerald-700">{num(totalPaid)}</td>
                      <td className="td text-right tabular-nums text-rose-700">
                        {num(Math.max(expectedMonthly - totalPaid, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {drift.length > 0 && (
                <div className="flex items-start gap-2.5 border-t border-amber-200 bg-amber-50 px-5 py-3 text-xs text-amber-900">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    <b>Billed above comes from the student records</b>, which is what should be charged this
                    month. The challans already issued for{" "}
                    {drift.map((r) => r.name).join(", ")} add up to {pkr(totalIssued)} instead of{" "}
                    {pkr(expectedMonthly)} — they were generated before a fee or discount changed, or a student
                    joined afterwards. Issued challans keep their original amounts on purpose;{" "}
                    <Link href="/challans" className="font-semibold underline">
                      generate this month&rsquo;s challans
                    </Link>{" "}
                    to cover anyone missing.
                  </p>
                </div>
              )}
            </div>

            {/* ----------------------------------------------- side column -- */}
            <div className="space-y-6">
              <div className="card card-pad">
                <h2 className="text-base font-bold text-navy-900">Fee Overview</h2>
                <dl className="mt-4 space-y-3">
                  <Overview
                    label="Should be billed (from student records)"
                    value={pkr(expectedMonthly)}
                    tone="bg-sky-50 text-sky-800"
                  />
                  <Overview
                    label="Challans actually issued"
                    value={pkr(totalIssued)}
                    tone="bg-violet-50 text-violet-800"
                  />
                  <Overview label="Paid" value={pkr(t.paid)} tone="bg-emerald-50 text-emerald-800" />
                  <Overview
                    label="Remaining (expected less paid)"
                    value={pkr(Math.max(expectedMonthly - t.paid, 0))}
                    tone="bg-rose-50 text-rose-800"
                  />
                </dl>
                {t.count === 0 && (
                  <p className="mt-4 rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
                    No challans exist for {periodLabel(period.year, period.month)} yet. Generate them from Fee
                    Management → Generate Challan.
                  </p>
                )}
              </div>

              <div className="card card-pad">
                <h2 className="text-base font-bold text-navy-900">Quick Actions</h2>
                <div className="mt-4 space-y-2">
                  <Quick href="/students" icon={Users} label="Add New Student" tone="bg-sky-600" />
                  <Quick href="/challans" icon={FileText} label="Generate Challan" tone="bg-brand-600" />
                  <Quick href="/payments" icon={Receipt} label="Record Payment" tone="bg-violet-600" />
                  <Quick href="/reports" icon={BarChart3} label="View Reports" tone="bg-amber-600" />
                </div>
              </div>
            </div>
          </div>

          {/* ---------------------------------------------- recent payments -- */}
          <div className="card">
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-bold text-navy-900">Recent Payments</h2>
              <Link href="/payments" className="text-sm font-semibold text-brand-700 hover:underline">
                View all
              </Link>
            </div>
            <div className="scroll-thin overflow-x-auto">
              <table className="w-full stack-table">
                <thead>
                  <tr className="bg-slate-50 text-slate-600">
                    <th className="th">Date</th>
                    <th className="th">Student</th>
                    <th className="th">Class</th>
                    <th className="th">Period</th>
                    <th className="th">Method</th>
                    <th className="th text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td data-label="Date" className="td text-slate-600">{shortDate(p.paid_on)}</td>
                      <td data-label="Student" className="td font-semibold text-navy-900">{p.students?.full_name || "—"}</td>
                      <td data-label="Class" className="td text-slate-600">{p.students?.classes?.name || "—"}</td>
                      <td data-label="Period" className="td text-slate-600">
                        {p.challans ? periodLabel(p.challans.year, p.challans.month) : "—"}
                      </td>
                      <td data-label="Method" className="td">
                        <span className="chip bg-slate-50 text-slate-600 ring-slate-200">{p.method}</span>
                      </td>
                      <td data-label="Amount" className="td text-right font-semibold tabular-nums text-emerald-700">{num(p.amount)}</td>
                    </tr>
                  ))}
                  {!payments.length && (
                    <tr>
                      <td className="td text-center text-slate-500" colSpan={6}>
                        No payments recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Overview({ label, value, tone }) {
  return (
    <div className={`rounded-xl px-4 py-3 ${tone}`}>
      <dt className="text-xs font-medium opacity-80">{label}</dt>
      <dd className="text-lg font-bold">{value}</dd>
    </div>
  );
}

function Quick({ href, icon: Icon, label, tone }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 ${tone}`}
    >
      <Icon className="h-4 w-4" />
      <span className="flex-1">{label}</span>
      <ChevronRight className="h-4 w-4" />
    </Link>
  );
}
