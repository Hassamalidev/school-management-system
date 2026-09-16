"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { addSalaryPayment, deleteSalaryPayment, fetchSalaryPayments } from "@/lib/db";
import { num, periodLabel, shortDate, todayISO } from "@/lib/format";
import { Modal, Spinner, useToast } from "@/components/ui";

/**
 * Pay a month's salary, in full or in parts. Mirrors PaymentModal on the fee
 * side so the two halves of the ledger behave the same way.
 */
export default function SalaryPaymentModal({ salary, onClose, onSaved }) {
  const toast = useToast();
  const [history, setHistory] = useState([]);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    amount: "",
    paid_on: todayISO(),
    method: "Bank Transfer",
    reference: "",
    paid_by: "",
    notes: "",
  });

  useEffect(() => {
    if (!salary) return;
    setForm((f) => ({ ...f, amount: String(Math.max(Number(salary.remaining) || 0, 0)) }));
    fetchSalaryPayments(salary.id)
      .then(setHistory)
      .catch((e) => toast(e.message, "error"));
  }, [salary, toast]);

  if (!salary) return null;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const refresh = async () => setHistory(await fetchSalaryPayments(salary.id));

  const alreadyPaid = history.reduce((s, p) => s + Number(p.amount), 0);
  const stillDue = Number(salary.net_salary) - alreadyPaid;

  const submit = async (e) => {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!amount || amount <= 0) return toast("Enter an amount greater than zero.", "error");
    setBusy(true);
    try {
      await addSalaryPayment({ ...form, amount, salary_id: salary.id, employee_id: salary.employee_id });
      toast(`Paid ${num(amount)} to ${salary.employee_name}.`);
      await refresh();
      onSaved?.();
      onClose();
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Pay salary"
      subtitle={`${salary.employee_name} · ${salary.designation || salary.department} · ${periodLabel(
        salary.year,
        salary.month
      )}`}
      width="max-w-2xl"
    >
      <div className="mb-5 grid grid-cols-3 gap-3 text-center">
        <Box label="Net salary" value={num(salary.net_salary)} tone="bg-slate-50 text-slate-700" />
        <Box label="Already paid" value={num(alreadyPaid)} tone="bg-emerald-50 text-emerald-700" />
        <Box label="Remaining" value={num(Math.max(stillDue, 0))} tone="bg-rose-50 text-rose-700" />
      </div>

      {salary.account_number && (
        <p className="mb-4 rounded-xl bg-sky-50 px-3.5 py-2.5 text-xs text-sky-800 ring-1 ring-sky-200">
          {salary.bank_name || "Bank"} · A/C <b>{salary.account_number}</b>
        </p>
      )}

      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Amount (PKR) *</label>
          <input type="number" min="1" className="input" required value={form.amount} onChange={set("amount")} />
          {stillDue > 0 && (
            <button
              type="button"
              className="mt-1.5 text-xs font-semibold text-brand-700 hover:underline"
              onClick={() => setForm((f) => ({ ...f, amount: String(stillDue) }))}
            >
              Pay full remaining ({num(stillDue)})
            </button>
          )}
        </div>
        <div>
          <label className="label">Payment date *</label>
          <input type="date" className="input" required value={form.paid_on} onChange={set("paid_on")} />
        </div>
        <div>
          <label className="label">Method</label>
          <select className="input" value={form.method} onChange={set("method")}>
            <option>Bank Transfer</option>
            <option>Cash</option>
            <option>Other</option>
          </select>
        </div>
        <div>
          <label className="label">Reference / Transaction ID</label>
          <input className="input" value={form.reference} onChange={set("reference")} placeholder="Optional" />
        </div>
        <div>
          <label className="label">Paid by</label>
          <input className="input" value={form.paid_by} onChange={set("paid_by")} placeholder="Staff name" />
        </div>
        <div>
          <label className="label">Notes</label>
          <input className="input" value={form.notes} onChange={set("notes")} />
        </div>

        <div className="sm:col-span-2 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy && <Spinner className="h-4 w-4" />} Save payment
          </button>
        </div>
      </form>

      {history.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-bold text-navy-900">Payments for this month</h3>
          <div className="scroll-thin max-h-48 overflow-auto rounded-xl ring-1 ring-slate-200">
            <table className="w-full">
              <thead className="sticky top-0 bg-slate-100">
                <tr className="text-slate-600">
                  <th className="th">Date</th>
                  <th className="th">Method</th>
                  <th className="th">Reference</th>
                  <th className="th text-right">Amount</th>
                  <th className="th" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {history.map((p) => (
                  <tr key={p.id}>
                    <td className="td text-slate-600">{shortDate(p.paid_on)}</td>
                    <td className="td text-slate-600">{p.method}</td>
                    <td className="td text-slate-500">{p.reference || "—"}</td>
                    <td className="td text-right font-semibold tabular-nums text-emerald-700">{num(p.amount)}</td>
                    <td className="td">
                      <button
                        title="Remove this payment"
                        className="icon-btn text-rose-500 hover:bg-rose-50"
                        onClick={async () => {
                          try {
                            await deleteSalaryPayment(p.id);
                            await refresh();
                            onSaved?.();
                            toast("Payment removed.");
                          } catch (e) {
                            toast(e.message, "error");
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Box({ label, value, tone }) {
  return (
    <div className={`rounded-xl px-3 py-2.5 ${tone}`}>
      <p className="text-[11px] font-medium opacity-80">{label}</p>
      <p className="text-base font-bold tabular-nums">{value}</p>
    </div>
  );
}
