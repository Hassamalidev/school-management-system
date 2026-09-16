"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Plus, Receipt, Search, Trash2, Wallet } from "lucide-react";
import { deletePayment, fetchChallans, fetchClasses, fetchPayments } from "@/lib/db";
import { downloadCSV, num, periodLabel, pkr, shortDate, statusTone, todayISO } from "@/lib/format";
import { Confirm, Empty, Loading, Modal, PageHeader, StatCard, useToast } from "@/components/ui";
import PaymentModal from "@/components/PaymentModal";
import PeriodPicker from "@/components/PeriodPicker";

export default function PaymentsPage() {
  const toast = useToast();
  const [classes, setClasses] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [classId, setClassId] = useState("");
  const [search, setSearch] = useState("");
  const [removing, setRemoving] = useState(null);
  const [picking, setPicking] = useState(false);
  const [paying, setPaying] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cl, pm] = await Promise.all([fetchClasses(), fetchPayments({ from, to, classId, search })]);
      setClasses(cl);
      setRows(pm);
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setLoading(false);
    }
  }, [from, to, classId, search, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const totalAmount = useMemo(() => rows.reduce((s, p) => s + Number(p.amount || 0), 0), [rows]);
  const byMethod = useMemo(() => {
    const m = { Cash: 0, "Bank Transfer": 0, Other: 0 };
    rows.forEach((p) => {
      m[p.method] = (m[p.method] || 0) + Number(p.amount || 0);
    });
    return m;
  }, [rows]);

  const exportCSV = () =>
    downloadCSV(
      `kindle-sprout-payments-${todayISO()}.csv`,
      [
        { label: "Date", get: (p) => p.paid_on },
        { label: "Student", get: (p) => p.students?.full_name || "" },
        { label: "Class", get: (p) => p.students?.classes?.name || "" },
        { label: "Period", get: (p) => (p.challans ? periodLabel(p.challans.year, p.challans.month) : "") },
        { label: "Receipt No", get: (p) => p.challans?.receipt_no || "" },
        { label: "Method", get: (p) => p.method },
        { label: "Reference", get: (p) => p.reference || "" },
        { label: "Received By", get: (p) => p.received_by || "" },
        { label: "Amount", get: (p) => p.amount },
      ],
      rows
    );

  return (
    <>
      <PageHeader icon={Receipt} title="Payment History" subtitle="Every fee payment received, newest first">
        <button className="btn-secondary" onClick={exportCSV} disabled={!rows.length}>
          <Download className="h-4 w-4" /> Export CSV
        </button>
        <button className="btn-primary" onClick={() => setPicking(true)}>
          <Plus className="h-4 w-4" /> Record Payment
        </button>
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Receipt} tone="sky" label="Payments shown" value={num(rows.length)} />
        <StatCard icon={Wallet} tone="green" label="Total collected" value={pkr(totalAmount)} />
        <StatCard icon={Wallet} tone="violet" label="Cash" value={pkr(byMethod.Cash || 0)} />
        <StatCard icon={Wallet} tone="amber" label="Bank Transfer" value={pkr(byMethod["Bank Transfer"] || 0)} />
      </div>

      <div className="card card-pad mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="label">From</label>
          <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div>
          <label className="label">Class</label>
          <select className="input" value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">All classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Search</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="Student, receipt or reference"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <Loading />
        ) : !rows.length ? (
          <Empty
            icon={Receipt}
            title="No payments found"
            hint="Record a payment against a student's monthly challan to see it here."
            action={
              <button className="btn-primary" onClick={() => setPicking(true)}>
                <Plus className="h-4 w-4" /> Record Payment
              </button>
            }
          />
        ) : (
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-navy-800 text-white">
                  <th className="th">Date</th>
                  <th className="th">Student</th>
                  <th className="th">Class</th>
                  <th className="th">Period</th>
                  <th className="th">Receipt No.</th>
                  <th className="th">Method</th>
                  <th className="th">Reference</th>
                  <th className="th">Received By</th>
                  <th className="th text-right">Amount</th>
                  <th className="th" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="td text-slate-600">{shortDate(p.paid_on)}</td>
                    <td className="td font-semibold text-navy-900">{p.students?.full_name || "—"}</td>
                    <td className="td text-slate-600">{p.students?.classes?.name || "—"}</td>
                    <td className="td text-slate-600">
                      {p.challans ? periodLabel(p.challans.year, p.challans.month) : "—"}
                    </td>
                    <td className="td font-mono text-xs text-slate-500">{p.challans?.receipt_no || "—"}</td>
                    <td className="td">
                      <span className="chip bg-slate-50 text-slate-600 ring-slate-200">{p.method}</span>
                    </td>
                    <td className="td text-slate-500">{p.reference || "—"}</td>
                    <td className="td text-slate-500">{p.received_by || "—"}</td>
                    <td className="td text-right font-semibold tabular-nums text-emerald-700">{num(p.amount)}</td>
                    <td className="td">
                      <button
                        title="Delete payment"
                        className="rounded-lg p-2 text-rose-500 hover:bg-rose-50"
                        onClick={() => setRemoving(p)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-amber-50 font-bold text-navy-900">
                  <td className="td" colSpan={8}>
                    Total
                  </td>
                  <td className="td text-right tabular-nums">{num(totalAmount)}</td>
                  <td className="td" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <ChallanPicker
        open={picking}
        classes={classes}
        onClose={() => setPicking(false)}
        onPick={(ch) => {
          setPicking(false);
          setPaying(ch);
        }}
      />

      <PaymentModal challan={paying} onClose={() => setPaying(null)} onSaved={load} />

      <Confirm
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        title="Delete payment"
        message={`Remove the payment of ${num(removing?.amount)} from ${removing?.students?.full_name}? The month's remaining balance will go back up.`}
        onConfirm={async () => {
          try {
            await deletePayment(removing.id);
            toast("Payment deleted.");
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

/** Choose which month's challan a new payment belongs to. */
function ChallanPicker({ open, classes, onClose, onPick }) {
  const toast = useToast();
  const now = new Date();
  const [period, setPeriod] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [classId, setClassId] = useState("");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetchChallans({ year: period.year, month: period.month, classId })
      .then(setRows)
      .catch((e) => toast(e.message, "error"))
      .finally(() => setLoading(false));
  }, [open, period, classId, toast]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q ? rows.filter((r) => r.student_name.toLowerCase().includes(q)) : rows;
    // Unpaid first — that is who the office is usually collecting from.
    return [...list].sort((a, b) => Number(b.remaining) - Number(a.remaining));
  }, [rows, search]);

  if (!open) return null;

  return (
    <Modal open onClose={onClose} title="Record payment" subtitle="Pick the student and month being paid" width="max-w-3xl">
      <div className="grid gap-3 sm:grid-cols-3">
        <PeriodPicker value={period} onChange={setPeriod} className="!w-full" />
        <select className="input" value={classId} onChange={(e) => setClassId(e.target.value)}>
          <option value="">All classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search student…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="scroll-thin mt-4 max-h-[50vh] overflow-auto rounded-xl ring-1 ring-slate-200">
        {loading ? (
          <Loading />
        ) : !visible.length ? (
          <Empty
            icon={Receipt}
            title="No challans for this month"
            hint="Generate the month's challans first, under Fee Management → Generate Challan."
          />
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 bg-slate-100">
              <tr className="text-slate-600">
                <th className="th">Student</th>
                <th className="th">Class</th>
                <th className="th text-right">Payable</th>
                <th className="th text-right">Remaining</th>
                <th className="th">Status</th>
                <th className="th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {visible.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="td font-semibold text-navy-900">{r.student_name}</td>
                  <td className="td text-slate-600">{r.class_name || "—"}</td>
                  <td className="td text-right tabular-nums">{num(r.payable)}</td>
                  <td className="td text-right font-semibold tabular-nums text-rose-700">{num(r.remaining)}</td>
                  <td className="td">
                    <span className={`chip ${statusTone(r.status)}`}>{r.status}</span>
                  </td>
                  <td className="td text-right">
                    <button className="btn-primary !px-3 !py-1.5 text-xs" onClick={() => onPick(r)}>
                      Select
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Modal>
  );
}
