"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, GraduationCap, Plus, Printer, RotateCcw, Trash2 } from "lucide-react";
import { admissionTemplate, fetchClasses, fetchSettings } from "@/lib/db";
import { pkr, todayISO } from "@/lib/format";
import { downloadChallanPDF } from "@/lib/pdf";
import { Loading, PageHeader, useToast } from "@/components/ui";
import Challan from "@/components/Challan";

const BLANK_FORM = {
  student_name: "",
  father_name: "",
  guardian_name: "",
  phone: "",
  roll_no: "",
  receipt_no: "",
  date: todayISO(),
  due_date: "",
  discount: 0,
  notes: "",
};

export default function AdmissionPage() {
  const toast = useToast();
  const [classes, setClasses] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  const [classId, setClassId] = useState("");
  const [form, setForm] = useState(BLANK_FORM);
  const [lines, setLines] = useState([]);
  const [printing, setPrinting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cl, cfg] = await Promise.all([fetchClasses(), fetchSettings()]);
      setClasses(cl);
      setSettings(cfg);
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Changing the class refills the amounts from the fee structure.
  const chooseClass = async (id) => {
    setClassId(id);
    if (!id) return setLines([]);
    try {
      setLines(await admissionTemplate(id));
    } catch (e) {
      toast(e.message, "error");
    }
  };

  const setLine = (i, key, value) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, [key]: value } : l)));

  const total = lines.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
  const discount = Number(form.discount) || 0;
  const payable = Math.max(total - discount, 0);

  const className = classes.find((c) => c.id === classId)?.name || "";

  // A challan-shaped object built purely from the form. Nothing is saved — this
  // is a blank template for a child who has not been admitted yet.
  const draft = useMemo(() => {
    const d = form.date ? new Date(form.date) : new Date();
    return {
      id: "draft",
      kind: "admission",
      receipt_no: form.receipt_no?.trim() || "________________",
      student_name: form.student_name?.trim() || "________________________",
      father_name: form.father_name?.trim() || "________________________",
      guardian_name: form.guardian_name?.trim() || "",
      phone: form.phone?.trim() || "",
      roll_no: form.roll_no?.trim() || "",
      class_name: className,
      admission_date: form.date || null,
      due_date: form.due_date || null,
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      created_at: form.date || todayISO(),
      total_fee: total,
      discount,
      payable,
      paid: 0,
      remaining: payable,
      status: "Unpaid",
      last_paid_on: null,
      notes: form.notes?.trim() || null,
    };
  }, [form, className, total, discount, payable]);

  const draftItems = useMemo(
    () =>
      lines
        .filter((l) => l.name?.trim() && Number(l.amount) > 0)
        .map((l, i) => ({ id: `d${i}`, name: l.name.trim(), amount: Number(l.amount), frequency: "one_time" })),
    [lines]
  );

  useEffect(() => {
    if (!printing) return undefined;
    const id = setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 60);
    return () => clearTimeout(id);
  }, [printing]);

  const pdf = async () => {
    try {
      await downloadChallanPDF(
        [draft],
        settings,
        `Admission-Challan-${(form.student_name || "blank").trim().replace(/\s+/g, "_")}.pdf`,
        new Map([["draft", draftItems]])
      );
      toast("Admission challan downloaded.");
    } catch (e) {
      toast(e.message, "error");
    }
  };

  const reset = () => {
    setForm(BLANK_FORM);
    setLines([]);
    setClassId("");
  };

  if (loading) return <Loading />;

  return (
    <>
      <PageHeader
        icon={GraduationCap}
        title="Admission Challan"
        subtitle="Fill in the details for a new admission, then print or download. Nothing is saved — the child is added under Students once admitted."
      >
        <button className="btn-secondary" onClick={reset}>
          <RotateCcw className="h-4 w-4" /> Clear form
        </button>
        <button className="btn-secondary" onClick={() => setPrinting(true)}>
          <Printer className="h-4 w-4" /> Print
        </button>
        <button className="btn-primary" onClick={pdf}>
          <Download className="h-4 w-4" /> Download PDF
        </button>
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-5">
        {/* ------------------------------------------------------- form -- */}
        <div className="no-print space-y-6 xl:col-span-3">
          <div className="card">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-bold text-navy-900">Student details</h2>
              <p className="text-xs text-slate-500">Leave anything blank to print a ruled line for it instead.</p>
            </div>
            <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label">Child&rsquo;s name</label>
                <input className="input" value={form.student_name} onChange={set("student_name")} placeholder="Areeba Khan" />
              </div>
              <div>
                <label className="label">Father&rsquo;s name</label>
                <input className="input" value={form.father_name} onChange={set("father_name")} placeholder="Imran Khan" />
              </div>
              <div>
                <label className="label">Guardian <span className="font-normal text-slate-400">(if different)</span></label>
                <input className="input" value={form.guardian_name} onChange={set("guardian_name")} />
              </div>
              <div>
                <label className="label">Class applying for</label>
                <select className="input" value={classId} onChange={(e) => chooseClass(e.target.value)}>
                  <option value="">— select class —</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Contact number</label>
                <input className="input" value={form.phone} onChange={set("phone")} placeholder="+92 3xx xxxxxxx" />
              </div>
              <div>
                <label className="label">Receipt no. <span className="font-normal text-slate-400">(optional)</span></label>
                <input className="input" value={form.receipt_no} onChange={set("receipt_no")} placeholder="Leave blank to write by hand" />
              </div>
              <div>
                <label className="label">Roll no. <span className="font-normal text-slate-400">(optional)</span></label>
                <input className="input" value={form.roll_no} onChange={set("roll_no")} />
              </div>
              <div>
                <label className="label">Date</label>
                <input type="date" className="input" value={form.date} onChange={set("date")} />
              </div>
              <div>
                <label className="label">Pay before</label>
                <input type="date" className="input" value={form.due_date} onChange={set("due_date")} />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-base font-bold text-navy-900">Admission charges</h2>
                <p className="text-xs text-slate-500">
                  {classId
                    ? "Prefilled from the fee structure — change any amount before printing."
                    : "Pick a class above to prefill, or add lines by hand."}
                </p>
              </div>
              <button
                className="btn-secondary !py-2 text-xs"
                onClick={() => setLines((p) => [...p, { name: "", amount: 0 }])}
              >
                <Plus className="h-3.5 w-3.5" /> Add line
              </button>
            </div>

            <div className="px-5 py-4">
              <div className="space-y-2">
                {lines.map((l, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      className="input flex-1"
                      value={l.name}
                      placeholder="Charge name"
                      onChange={(e) => setLine(i, "name", e.target.value)}
                    />
                    <input
                      type="number"
                      min="0"
                      className="input w-36 text-right"
                      value={l.amount}
                      onChange={(e) => setLine(i, "amount", e.target.value)}
                    />
                    <button
                      title="Remove line"
                      className="icon-btn text-rose-500 hover:bg-rose-50"
                      onClick={() => setLines((p) => p.filter((_, idx) => idx !== i))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {!lines.length && (
                  <p className="py-6 text-center text-sm text-slate-500">
                    No charges yet — select a class, or use <b>Add line</b>.
                  </p>
                )}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label">Discount / concession (PKR)</label>
                  <input type="number" min="0" className="input" value={form.discount} onChange={set("discount")} />
                </div>
                <div>
                  <label className="label">Note on challan</label>
                  <input className="input" value={form.notes} onChange={set("notes")} placeholder="Optional" />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 rounded-xl bg-slate-50 px-4 py-3 text-sm">
                <span>
                  <span className="text-slate-500">Total </span>
                  <b className="text-navy-900">{pkr(total)}</b>
                </span>
                {discount > 0 && (
                  <span>
                    <span className="text-slate-500">Payable </span>
                    <b className="text-brand-700">{pkr(payable)}</b>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ---------------------------------------------------- preview -- */}
        <div className="no-print xl:col-span-2">
          <div className="card xl:sticky xl:top-24">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-base font-bold text-navy-900">Live preview</h2>
                <p className="text-xs text-slate-500">Exactly what prints</p>
              </div>
              <div className="flex gap-2">
                <button className="btn-secondary !px-3 !py-2 text-xs" onClick={() => setPrinting(true)}>
                  <Printer className="h-3.5 w-3.5" /> Print
                </button>
                <button className="btn-primary !px-3 !py-2 text-xs" onClick={pdf}>
                  <Download className="h-3.5 w-3.5" /> PDF
                </button>
              </div>
            </div>
            <div className="scroll-thin max-h-[60vh] xl:max-h-[70vh] overflow-auto p-5">
              <Challan ch={draft} items={draftItems} settings={settings} compact />
            </div>
          </div>
        </div>
      </div>

      {printing && (
        <div className="print-area hidden print:block">
          <Challan ch={draft} items={draftItems} settings={settings} />
        </div>
      )}
    </>
  );
}
