"use client";

import { useCallback, useEffect, useState } from "react";
import { Layers, Pencil, Plus, Trash2 } from "lucide-react";
import {
  deleteFeeHead,
  feeFor,
  fetchClassFees,
  fetchFeeHeads,
  saveClassFee,
  saveFeeHead,
} from "@/lib/db";
import { Confirm, InlineNumber, Loading, Modal, Spinner, useToast } from "@/components/ui";

const BLANK_HEAD = { name: "", frequency: "monthly", default_amount: 0, sort_order: 99, is_active: true };

const FREQ_LABEL = {
  monthly: "Every month",
  one_time: "One time",
  annual: "Once a year",
};

const FREQ_TONE = {
  monthly: "bg-sky-50 text-sky-700 ring-sky-200",
  one_time: "bg-violet-50 text-violet-700 ring-violet-200",
  annual: "bg-amber-50 text-amber-700 ring-amber-200",
};

/**
 * Everything charged on top of monthly tuition — admission, registration,
 * development, exam fees and anything else the school adds. Each head has a
 * default amount plus an optional per-class override.
 */
export default function FeeHeadsCard({ classes }) {
  const toast = useToast();
  const [heads, setHeads] = useState([]);
  const [classFees, setClassFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [classId, setClassId] = useState("");
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [fh, cf] = await Promise.all([fetchFeeHeads(), fetchClassFees()]);
      setHeads(fh);
      setClassFees(cf);
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const patchClassFee = async (head, amount) => {
    await saveClassFee(classId, head.id, amount);
    setClassFees((prev) => [
      ...prev.filter((f) => !(f.class_id === classId && f.head_id === head.id)),
      { class_id: classId, head_id: head.id, amount },
    ]);
  };

  const patchHead = async (head, changes) => {
    const saved = await saveFeeHead({ ...head, ...changes });
    setHeads((prev) => prev.map((h) => (h.id === saved.id ? saved : h)));
    toast(`${saved.name} updated.`);
  };

  const selectedClass = classes.find((c) => c.id === classId);

  return (
    <div className="card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <Layers className="h-5 w-5 shrink-0 text-brand-600" />
          <div>
            <h2 className="text-base font-bold text-navy-900">Other Fee Heads</h2>
            <p className="text-xs text-slate-500">
              Admission, registration, development and anything else charged on top of monthly tuition.
            </p>
          </div>
        </div>
        <button className="btn-secondary !py-2 text-xs" onClick={() => setEditing({ ...BLANK_HEAD })}>
          <Plus className="h-3.5 w-3.5" /> Add Fee Head
        </button>
      </div>

      <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
        <label className="label !mb-1">Show and edit amounts for</label>
        <select className="input w-auto font-semibold" value={classId} onChange={(e) => setClassId(e.target.value)}>
          <option value="">— pick a class —</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <Loading />
      ) : (
        <div className="scroll-thin overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-navy-800 text-white">
                <th className="th">Fee Head</th>
                <th className="th">Charged</th>
                <th className="th text-right">Default (PKR)</th>
                <th className="th text-right">{selectedClass ? `${selectedClass.name} (PKR)` : "Class amount"}</th>
                <th className="th">Status</th>
                <th className="th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {heads.map((h) => (
                <tr key={h.id} className="hover:bg-slate-50">
                  <td className="td font-semibold text-navy-900">{h.name}</td>
                  <td className="td">
                    <span className={`chip ${FREQ_TONE[h.frequency]}`}>{FREQ_LABEL[h.frequency]}</span>
                  </td>
                  <td className="td text-right">
                    <InlineNumber
                      value={h.default_amount}
                      title="Default amount, used by any class without its own"
                      onSave={(v) => patchHead(h, { default_amount: v })}
                    />
                  </td>
                  <td className="td text-right">
                    {classId ? (
                      <InlineNumber
                        value={feeFor(classFees, classId, h)}
                        title="Amount for the selected class"
                        onSave={(v) => patchClassFee(h, v)}
                      />
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="td">
                    <span
                      className={`chip ${
                        h.is_active
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                          : "bg-slate-100 text-slate-500 ring-slate-200"
                      }`}
                    >
                      {h.is_active ? "Active" : "Off"}
                    </span>
                  </td>
                  <td className="td">
                    <div className="flex justify-end gap-1">
                      <button
                        title="Edit"
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-navy-900"
                        onClick={() => setEditing(h)}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        title="Delete"
                        className="rounded-lg p-2 text-rose-500 hover:bg-rose-50"
                        onClick={() => setRemoving(h)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!heads.length && (
                <tr>
                  <td className="td text-center text-slate-500" colSpan={6}>
                    No extra fee heads — challans will show monthly tuition only.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <p className="border-t border-slate-200 px-5 py-3 text-xs leading-relaxed text-slate-500">
        A head set to <b>0</b> for a class is left off that class&rsquo;s challans entirely. <b>One time</b> heads
        appear only on a student&rsquo;s very first challan; <b>once a year</b> heads on their first challan of each
        calendar year. Changes here apply to <b>newly generated</b> challans — ones already issued keep the amounts
        they were billed at.
      </p>

      <FeeHeadForm
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
        title="Delete fee head"
        message={`Delete ${removing?.name}? Challans already issued keep this line — it just stops appearing on new ones.`}
        onConfirm={async () => {
          try {
            await deleteFeeHead(removing.id);
            toast(`${removing.name} deleted.`);
            setRemoving(null);
            load();
          } catch (e) {
            toast(e.message, "error");
          }
        }}
      />
    </div>
  );
}

function FeeHeadForm({ row, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(BLANK_HEAD);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (row) setForm(row);
  }, [row]);

  if (!row) return null;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name?.trim()) return toast("Fee head name is required.", "error");
    setBusy(true);
    try {
      await saveFeeHead(form);
      toast(row.id ? "Fee head updated." : "Fee head added.");
      onSaved();
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
      title={row.id ? `Edit ${row.name}` : "Add fee head"}
      subtitle="Charged on top of monthly tuition."
      width="max-w-lg"
    >
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Name *</label>
          <input className="input" required value={form.name || ""} onChange={set("name")} placeholder="Development Fee" />
        </div>

        <div className="sm:col-span-2">
          <label className="label">How often is it charged?</label>
          <select className="input" value={form.frequency} onChange={set("frequency")}>
            <option value="monthly">Every month</option>
            <option value="one_time">One time — the student&rsquo;s first challan only</option>
            <option value="annual">Once a year — their first challan of each year</option>
          </select>
        </div>

        <div>
          <label className="label">Default amount (PKR)</label>
          <input
            type="number"
            min="0"
            className="input"
            value={form.default_amount ?? 0}
            onChange={set("default_amount")}
          />
          <p className="mt-1 text-xs text-slate-400">Used by any class without its own amount.</p>
        </div>

        <div>
          <label className="label">Display order</label>
          <input type="number" min="0" className="input" value={form.sort_order ?? 0} onChange={set("sort_order")} />
        </div>

        <div className="sm:col-span-2">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded"
              checked={form.is_active !== false}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
            />
            Active — include on newly generated challans
          </label>
        </div>

        <div className="sm:col-span-2 mt-2 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy && <Spinner className="h-4 w-4" />}
            {row.id ? "Save changes" : "Add fee head"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
