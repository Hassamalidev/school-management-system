"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, FileText, Printer, Search, Trash2, Wallet } from "lucide-react";
import {
  deleteChallan,
  feeFor,
  fetchChallanItems,
  fetchChallans,
  fetchClassFees,
  fetchClasses,
  fetchFeeHeads,
  fetchSettings,
  generateChallans,
  totals,
} from "@/lib/db";
import { num, periodLabel, statusTone } from "@/lib/format";
import { downloadChallanPDF } from "@/lib/pdf";
import { Confirm, Empty, Loading, PageHeader, Spinner, useToast } from "@/components/ui";
import PeriodPicker from "@/components/PeriodPicker";
import PaymentModal from "@/components/PaymentModal";
import Challan from "@/components/Challan";

export default function ChallansPage() {
  const toast = useToast();
  const now = new Date();
  const [period, setPeriod] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [classId, setClassId] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [classes, setClasses] = useState([]);
  const [settings, setSettings] = useState({});
  const [rows, setRows] = useState([]);
  const [items, setItems] = useState(new Map());
  const [blanksByClass, setBlanksByClass] = useState(new Map());
  const [includeBlanks, setIncludeBlanks] = useState(true);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [preview, setPreview] = useState(null);
  const [paying, setPaying] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [printQueue, setPrintQueue] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cl, cfg, ch, heads, classFees] = await Promise.all([
        fetchClasses(),
        fetchSettings(),
        fetchChallans({ year: period.year, month: period.month, classId, status }),
        fetchFeeHeads({ activeOnly: true }),
        fetchClassFees(),
      ]);

      // Which one-time charges get a blank hand-fill box, per class. A class
      // with no admission fee — Daycare — gets no box at all.
      const oneTime = heads.filter((h) => h.frequency === "one_time");
      const admissionHead = oneTime.find((h) => /admission/i.test(h.name));
      const blanks = new Map();
      cl.forEach((k) => {
        const charged = admissionHead ? feeFor(classFees, k.id, admissionHead) : 0;
        blanks.set(
          k.id,
          charged > 0 ? oneTime.filter((h) => feeFor(classFees, k.id, h) > 0).map((h) => h.name) : []
        );
      });
      setBlanksByClass(blanks);
      setClasses(cl);
      setSettings(cfg);
      setRows(ch);
      // Fee line items for every challan on screen, in one round trip.
      setItems(await fetchChallanItems(ch.map((c) => c.id)));
      setSelectedIds(new Set());
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setLoading(false);
    }
  }, [period, classId, status, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => `${r.student_name} ${r.receipt_no}`.toLowerCase().includes(q));
  }, [rows, search]);

  // Keep the preview in step with fresh data after a payment is recorded.
  useEffect(() => {
    if (!visible.length) return setPreview(null);
    setPreview((p) => (p ? visible.find((r) => r.id === p.id) || visible[0] : visible[0]));
  }, [visible]);

  const blanksFor = (ch) => (includeBlanks ? blanksByClass.get(ch.class_id) || [] : []);

  const t = useMemo(() => totals(visible), [visible]);
  const selected = useMemo(() => visible.filter((r) => selectedIds.has(r.id)), [visible, selectedIds]);
  const allChecked = visible.length > 0 && selected.length === visible.length;

  const toggle = (id) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleAll = () => setSelectedIds(allChecked ? new Set() : new Set(visible.map((r) => r.id)));

  // Printing works by revealing a hidden block that holds only the challans.
  useEffect(() => {
    if (!printQueue.length) return undefined;
    const id = setTimeout(() => {
      window.print();
      setPrintQueue([]);
    }, 60);
    return () => clearTimeout(id);
  }, [printQueue]);

  const print = (list) => {
    if (!list.length) return toast("Nothing selected to print.", "error");
    setPrintQueue(list);
  };

  const pdf = async (list) => {
    if (!list.length) return toast("Nothing selected to download.", "error");
    try {
      const blanks = new Map(list.map((ch) => [ch.id, blanksFor(ch)]));
      await downloadChallanPDF(list, settings, undefined, items, blanks);
      toast(`PDF downloaded (${list.length} challan${list.length === 1 ? "" : "s"}).`);
    } catch (e) {
      toast(e.message, "error");
    }
  };

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await generateChallans({
        classId,
        year: period.year,
        month: period.month,
        dueDay: settings.due_day || 10,
      });
      if (!res.total) toast("No active students match this class.", "error");
      else if (!res.created) toast(`All ${res.total} challans for ${periodLabel(period.year, period.month)} already exist.`);
      else toast(`${res.created} challan${res.created === 1 ? "" : "s"} generated for ${periodLabel(period.year, period.month)}.`);
      await load();
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <PageHeader
        icon={FileText}
        title="Generate Challan"
        subtitle="Pick a class and month, generate the challans, then print or download them."
      />

      {/* --------------------------------------------------------- controls */}
      <div className="no-print card card-pad mb-6 grid gap-3 lg:grid-cols-12">
        <div className="lg:col-span-3">
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
            {generating ? <Spinner className="h-4 w-4" /> : <FileText className="h-4 w-4" />} Generate Challan
          </button>
          <button className="btn-secondary flex-1" onClick={() => print(visible)} disabled={!visible.length}>
            <Printer className="h-4 w-4" /> Print All
          </button>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-600 lg:col-span-12">
          <input
            type="checkbox"
            className="h-4 w-4 rounded"
            checked={includeBlanks}
            onChange={(e) => setIncludeBlanks(e.target.checked)}
          />
          Print a blank box for one-time admission charges (skipped for Daycare). Turning this off fits two
          challans on each A4 sheet.
        </label>
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        {/* ------------------------------------------------------- table -- */}
        <div className="no-print card xl:col-span-3">
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-5 py-4">
            <label className="flex items-center gap-2 text-sm font-semibold text-navy-900">
              <input type="checkbox" className="h-4 w-4 rounded" checked={allChecked} onChange={toggleAll} />
              Select All
            </label>
            <div className="relative ml-auto w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-9 !py-2"
                placeholder="Search student…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <span className="chip bg-slate-50 text-slate-600 ring-slate-200">Total Students: {visible.length}</span>
          </div>

          {selected.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-brand-50 px-5 py-3">
              <span className="text-sm font-semibold text-brand-800">{selected.length} selected</span>
              <button className="btn-secondary !py-2 text-xs" onClick={() => print(selected)}>
                <Printer className="h-3.5 w-3.5" /> Print selected
              </button>
              <button className="btn-secondary !py-2 text-xs" onClick={() => pdf(selected)}>
                <Download className="h-3.5 w-3.5" /> Download PDF
              </button>
            </div>
          )}

          {loading ? (
            <Loading />
          ) : !visible.length ? (
            <Empty
              icon={FileText}
              title={`No challans for ${periodLabel(period.year, period.month)}`}
              hint="Use Generate Challan above to create this month's challans for every active student in the selected class."
            />
          ) : (
            <div className="scroll-thin overflow-x-auto">
              <table className="w-full stack-table">
                <thead>
                  <tr className="bg-navy-800 text-white">
                    <th className="th w-10" />
                    <th className="th">#</th>
                    <th className="th">Student Name</th>
                    <th className="th">Class</th>
                    <th className="th text-right">Total Fee</th>
                    <th className="th text-right">Paid</th>
                    <th className="th text-right">Remaining</th>
                    <th className="th">Status</th>
                    <th className="th text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visible.map((r, i) => (
                    <tr
                      key={r.id}
                      onClick={() => setPreview(r)}
                      className={`cursor-pointer ${preview?.id === r.id ? "bg-brand-50" : "hover:bg-slate-50"}`}
                    >
                      <td className="td" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded"
                          checked={selectedIds.has(r.id)}
                          onChange={() => toggle(r.id)}
                        />
                      </td>
                      <td data-label="#" className="td text-slate-400">{i + 1}</td>
                      <td data-label="Student Name" className="td">
                        <div className="font-semibold text-navy-900">{r.student_name}</div>
                        <div className="font-mono text-[10px] text-slate-400">{r.receipt_no}</div>
                      </td>
                      <td data-label="Class" className="td text-slate-600">{r.class_name || "—"}</td>
                      <td data-label="Total Fee" className="td text-right tabular-nums">{num(r.payable)}</td>
                      <td data-label="Paid" className="td text-right tabular-nums text-emerald-700">{num(r.paid)}</td>
                      <td data-label="Remaining" className="td text-right font-semibold tabular-nums text-rose-700">{num(r.remaining)}</td>
                      <td data-label="Status" className="td">
                        <span className={`chip ${statusTone(r.status)}`}>{r.status}</span>
                      </td>
                      <td data-label="Action" className="td" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <button
                            title="Record payment"
                            className="icon-btn text-emerald-600 hover:bg-emerald-50"
                            onClick={() => setPaying(r)}
                          >
                            <Wallet className="h-4 w-4" />
                          </button>
                          <button
                            title="Print challan"
                            className="icon-btn text-slate-500 hover:bg-slate-100 hover:text-navy-900"
                            onClick={() => print([r])}
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                          <button
                            title="Download PDF"
                            className="icon-btn text-slate-500 hover:bg-slate-100 hover:text-navy-900"
                            onClick={() => pdf([r])}
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          <button
                            title="Delete challan"
                            className="icon-btn text-rose-500 hover:bg-rose-50"
                            onClick={() => setRemoving(r)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* totals strip */}
          <div className="grid grid-cols-2 gap-px border-t border-slate-200 bg-slate-200 sm:grid-cols-4">
            <Tile label="Total Students" value={num(t.count)} tone="text-navy-900" />
            <Tile label="Total Fee (PKR)" value={num(t.billed)} tone="text-navy-900" />
            <Tile label="Paid (PKR)" value={num(t.paid)} tone="text-emerald-700" />
            <Tile label="Remaining (PKR)" value={num(t.remaining)} tone="text-rose-700" />
          </div>
        </div>

        {/* ----------------------------------------------------- preview -- */}
        <div className="no-print xl:col-span-2">
          <div className="card xl:sticky xl:top-24">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-base font-bold text-navy-900">Challan Preview</h2>
                <p className="text-xs text-slate-500">Click any row to preview it</p>
              </div>
              <div className="flex gap-2">
                <button className="btn-secondary !px-3 !py-2 text-xs" disabled={!preview} onClick={() => print([preview])}>
                  <Printer className="h-3.5 w-3.5" /> Print
                </button>
                <button className="btn-primary !px-3 !py-2 text-xs" disabled={!preview} onClick={() => pdf([preview])}>
                  <Download className="h-3.5 w-3.5" /> PDF
                </button>
              </div>
            </div>
            <div className="scroll-thin max-h-[60vh] xl:max-h-[70vh] overflow-auto p-5">
              {preview ? (
                <Challan
                  ch={preview}
                  items={items.get(preview.id) || []}
                  blankHeads={blanksFor(preview)}
                  settings={settings}
                  compact
                />
              ) : (
                <p className="py-10 text-center text-sm text-slate-500">
                  Generate or select a challan to see the preview.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------- hidden print surface -- */}
      {printQueue.length > 0 && (
        <div className="print-area hidden print:block">
          {printQueue.map((ch, i) => (
            <div key={ch.id} className={i < printQueue.length - 1 ? "print-break pb-6" : ""}>
              <Challan
                ch={ch}
                items={items.get(ch.id) || []}
                blankHeads={blanksFor(ch)}
                settings={settings}
              />
            </div>
          ))}
        </div>
      )}

      <PaymentModal challan={paying} onClose={() => setPaying(null)} onSaved={load} />

      <Confirm
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        title="Delete challan"
        message={`Delete the ${periodLabel(removing?.year, removing?.month)} challan for ${removing?.student_name}? Payments recorded against it are removed too.`}
        onConfirm={async () => {
          try {
            await deleteChallan(removing.id);
            toast("Challan deleted.");
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

function Tile({ label, value, tone }) {
  return (
    <div className="bg-white px-5 py-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`text-lg font-bold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}
