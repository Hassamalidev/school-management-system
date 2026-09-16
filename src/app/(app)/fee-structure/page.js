"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CreditCard, Pencil, Plus, Trash2, Users, Wallet } from "lucide-react";
import { deleteClass, fetchClasses, fetchStudents, saveClass } from "@/lib/db";
import { num, pkr } from "@/lib/format";
import { Confirm, InlineNumber, Loading, Modal, PageHeader, Spinner, StatCard, useToast } from "@/components/ui";
import FeeHeadsCard from "@/components/FeeHeadsCard";

const SWATCHES = {
  sky: "bg-sky-50 text-sky-700 ring-sky-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  rose: "bg-rose-50 text-rose-700 ring-rose-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
  teal: "bg-teal-50 text-teal-700 ring-teal-200",
  orange: "bg-orange-50 text-orange-700 ring-orange-200",
  purple: "bg-purple-50 text-purple-700 ring-purple-200",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
};

const BLANK = { name: "", monthly_fee: 0, annual_fee: 0, sort_order: 99, color: "sky" };

export default function FeeStructurePage() {
  const toast = useToast();
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cl, st] = await Promise.all([fetchClasses(), fetchStudents({ status: "active" })]);
      setClasses(cl);
      setStudents(st);
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo(() => {
    const count = new Map();
    students.forEach((s) => count.set(s.class_id, (count.get(s.class_id) || 0) + 1));
    return classes.map((c) => {
      const n = count.get(c.id) || 0;
      return { ...c, students: n, monthlyTotal: n * Number(c.monthly_fee || 0), annualTotal: n * Number(c.annual_fee || 0) };
    });
  }, [classes, students]);

  // Inline edits patch just the one class in local state, so the table does not
  // flash through a full reload on every keystroke-sized change.
  const patchClass = async (row, changes) => {
    const saved = await saveClass({ ...row, ...changes });
    setClasses((prev) => prev.map((c) => (c.id === saved.id ? saved : c)));
    toast(`${saved.name} updated.`);
  };

  const grand = rows.reduce(
    (a, r) => ({ students: a.students + r.students, monthly: a.monthly + r.monthlyTotal, annual: a.annual + r.annualTotal }),
    { students: 0, monthly: 0, annual: 0 }
  );

  return (
    <>
      <PageHeader icon={CreditCard} title="Fee Structure" subtitle="Monthly and annual fee for every class">
        <button className="btn-primary" onClick={() => setEditing({ ...BLANK, sort_order: classes.length + 1 })}>
          <Plus className="h-4 w-4" /> Add Class
        </button>
      </PageHeader>

      {loading ? (
        <Loading />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard icon={Users} tone="sky" label="Total Students" value={num(grand.students)} sub={`${classes.length} classes`} />
            <StatCard icon={Wallet} tone="violet" label="Expected per month" value={pkr(grand.monthly)} sub="All active students" />
            <StatCard icon={CreditCard} tone="green" label="Expected per year" value={pkr(grand.annual)} sub="Annual fee × students" />
          </div>

          {/* ------------------------------------------------- class cards -- */}
          <div className="card card-pad">
            <h2 className="text-base font-bold text-navy-900">Classes</h2>
            <p className="text-xs text-slate-500">Select a class to highlight it in the table below.</p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {rows.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelected(selected === c.id ? null : c.id)}
                  className={`rounded-2xl px-4 py-4 text-left ring-1 transition hover:shadow-card ${
                    SWATCHES[c.color] || SWATCHES.sky
                  } ${selected === c.id ? "ring-2 ring-offset-2" : ""}`}
                >
                  <div className="text-sm font-bold">{c.name}</div>
                  <div className="mt-1 text-xs font-semibold opacity-80">{num(c.monthly_fee)} / month</div>
                  <div className="text-[11px] opacity-70">{c.students} students</div>
                </button>
              ))}
              {!rows.length && <p className="text-sm text-slate-500">No classes yet.</p>}
            </div>
          </div>

          <FeeHeadsCard classes={classes} />

          {/* ------------------------------------------------------ table -- */}
          <div className="card">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-bold text-navy-900">Class Fee Details</h2>
              <p className="text-xs text-slate-500">
                Click any fee to edit it. Press Enter to save, Escape to cancel.
              </p>
            </div>
            <div className="scroll-thin overflow-x-auto">
              <table className="w-full stack-table">
                <thead>
                  <tr className="bg-navy-800 text-white">
                    <th className="th">Class</th>
                    <th className="th text-right">Monthly Fee (PKR)</th>
                    <th className="th text-right">Annual Fee (PKR)</th>
                    <th className="th text-right">Total Students</th>
                    <th className="th text-right">Monthly Total</th>
                    <th className="th text-right">Annual Total</th>
                    <th className="th text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((c) => (
                    <tr key={c.id} className={selected === c.id ? "bg-brand-50" : "hover:bg-slate-50"}>
                      <td data-label="Class" className="td">
                        <span className={`chip ${SWATCHES[c.color] || SWATCHES.sky}`}>{c.name}</span>
                      </td>
                      <td data-label="Monthly Fee (PKR)" className="td text-right">
                        <InlineNumber
                          value={c.monthly_fee}
                          title="Click to edit the monthly fee"
                          onSave={(v) => patchClass(c, { monthly_fee: v })}
                        />
                      </td>
                      <td data-label="Annual Fee (PKR)" className="td text-right">
                        <InlineNumber
                          value={c.annual_fee}
                          title="Click to edit the annual fee"
                          onSave={(v) => patchClass(c, { annual_fee: v })}
                        />
                      </td>
                      <td data-label="Total Students" className="td text-right tabular-nums">{c.students}</td>
                      <td data-label="Monthly Total" className="td text-right tabular-nums font-semibold">{num(c.monthlyTotal)}</td>
                      <td data-label="Annual Total" className="td text-right tabular-nums font-semibold">{num(c.annualTotal)}</td>
                      <td data-label="Actions" className="td">
                        <div className="flex justify-end gap-1">
                          <button
                            title="Edit"
                            className="icon-btn text-slate-500 hover:bg-slate-100 hover:text-navy-900"
                            onClick={() => setEditing(c)}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            title="Delete"
                            className="icon-btn text-rose-500 hover:bg-rose-50"
                            onClick={() => setRemoving(c)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!rows.length && (
                    <tr>
                      <td className="td text-center text-slate-500" colSpan={7}>
                        No classes yet — add Daycare, Nursery, KG and the grades.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-amber-50 font-bold text-navy-900">
                    <td className="td">Total</td>
                    <td className="td text-right">—</td>
                    <td className="td text-right">—</td>
                    <td className="td text-right tabular-nums">{grand.students}</td>
                    <td className="td text-right tabular-nums">{num(grand.monthly)}</td>
                    <td className="td text-right tabular-nums">{num(grand.annual)}</td>
                    <td className="td" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      <ClassForm
        row={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          load();
        }}
      />

      <Confirm
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        title="Delete class"
        message={`Delete ${removing?.name}? Students in this class keep their records but lose their class assignment.`}
        onConfirm={async () => {
          try {
            await deleteClass(removing.id);
            toast(`${removing.name} deleted.`);
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

function ClassForm({ row, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(BLANK);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (row) setForm(row);
  }, [row]);

  if (!row) return null;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name?.trim()) return toast("Class name is required.", "error");
    setBusy(true);
    try {
      await saveClass(form);
      toast(row.id ? "Class updated." : "Class added.");
      onSaved();
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={row.id ? `Edit ${row.name}` : "Add class"} width="max-w-lg">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Class name *</label>
          <input className="input" required value={form.name || ""} onChange={set("name")} placeholder="Grade 1" />
        </div>
        <div>
          <label className="label">Monthly fee (PKR)</label>
          <input type="number" min="0" className="input" value={form.monthly_fee ?? 0} onChange={set("monthly_fee")} />
        </div>
        <div>
          <label className="label">Annual fee (PKR)</label>
          <input type="number" min="0" className="input" value={form.annual_fee ?? 0} onChange={set("annual_fee")} />
        </div>
        <div>
          <label className="label">Display order</label>
          <input type="number" min="0" className="input" value={form.sort_order ?? 0} onChange={set("sort_order")} />
        </div>
        <div>
          <label className="label">Colour</label>
          <select className="input" value={form.color || "sky"} onChange={set("color")}>
            {Object.keys(SWATCHES).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2 mt-2 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy && <Spinner className="h-4 w-4" />}
            {row.id ? "Save changes" : "Add class"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
