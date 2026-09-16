"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Eye, Pencil, Plus, Search, Trash2, UserPlus, Users } from "lucide-react";
import {
  deleteStudent,
  fetchClasses,
  fetchStudentBalances,
  fetchStudentChallans,
  fetchStudents,
  saveStudent,
} from "@/lib/db";
import { downloadCSV, num, periodLabel, pkr, shortDate, statusTone, todayISO } from "@/lib/format";
import { Confirm, Empty, Loading, Modal, PageHeader, Spinner, StatCard, useToast } from "@/components/ui";

const BLANK = {
  full_name: "",
  father_name: "",
  guardian_name: "",
  phone: "",
  class_id: "",
  roll_no: "",
  gender: "",
  date_of_birth: "",
  admission_date: todayISO(),
  address: "",
  monthly_fee: "",
  discount: 0,
  status: "active",
  notes: "",
};

export default function StudentsPage() {
  const toast = useToast();
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [classId, setClassId] = useState("");
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [removing, setRemoving] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cl, st, bal] = await Promise.all([fetchClasses(), fetchStudents({ classId, status }), fetchStudentBalances()]);
      setClasses(cl);
      setStudents(st);
      setBalances(bal);
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setLoading(false);
    }
  }, [classId, status, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const balanceOf = useMemo(() => {
    const m = new Map();
    balances.forEach((b) => m.set(b.student_id, b));
    return m;
  }, [balances]);

  // Search runs in the browser so typing feels instant on a list this size.
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) =>
      [s.full_name, s.father_name, s.guardian_name, s.phone, s.roll_no]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [students, search]);

  const activeCount = students.filter((s) => s.status === "active").length;
  const outstanding = visible.reduce((sum, s) => sum + Number(balanceOf.get(s.id)?.total_remaining || 0), 0);

  const exportCSV = () =>
    downloadCSV(
      `kindle-sprout-students-${todayISO()}.csv`,
      [
        { label: "Name", get: (s) => s.full_name },
        { label: "Class", get: (s) => s.classes?.name || "" },
        { label: "Roll No", get: (s) => s.roll_no || "" },
        { label: "Father Name", get: (s) => s.father_name || "" },
        { label: "Guardian", get: (s) => s.guardian_name || "" },
        { label: "Phone", get: (s) => s.phone || "" },
        { label: "Monthly Fee", get: (s) => s.monthly_fee ?? s.classes?.monthly_fee ?? 0 },
        { label: "Status", get: (s) => s.status },
        { label: "Total Billed", get: (s) => balanceOf.get(s.id)?.total_billed ?? 0 },
        { label: "Total Paid", get: (s) => balanceOf.get(s.id)?.total_paid ?? 0 },
        { label: "Total Remaining", get: (s) => balanceOf.get(s.id)?.total_remaining ?? 0 },
        { label: "Admission Date", get: (s) => s.admission_date || "" },
      ],
      visible
    );

  return (
    <>
      <PageHeader icon={Users} title="Students" subtitle="Every child enrolled at Kindle Sprout">
        <button className="btn-secondary" onClick={exportCSV} disabled={!visible.length}>
          <Download className="h-4 w-4" /> Export CSV
        </button>
        <button className="btn-primary" onClick={() => setEditing({ ...BLANK })}>
          <Plus className="h-4 w-4" /> Add Student
        </button>
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard icon={Users} tone="sky" label="Students shown" value={num(visible.length)} sub={`${activeCount} active`} />
        <StatCard icon={UserPlus} tone="violet" label="Classes" value={num(classes.length)} sub="Daycare through Grade 5" />
        <StatCard icon={Eye} tone="rose" label="Outstanding (all months)" value={pkr(outstanding)} sub="For the students shown" />
      </div>

      {/* ---------------------------------------------------------- filters */}
      <div className="card card-pad mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative lg:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search by name, father, guardian, phone or roll no…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input" value={classId} onChange={(e) => setClassId(e.target.value)}>
          <option value="">All classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* ------------------------------------------------------------ table */}
      <div className="card">
        {loading ? (
          <Loading />
        ) : !visible.length ? (
          <Empty
            icon={Users}
            title="No students found"
            hint="Adjust the filters, or add the first student record."
            action={
              <button className="btn-primary" onClick={() => setEditing({ ...BLANK })}>
                <Plus className="h-4 w-4" /> Add Student
              </button>
            }
          />
        ) : (
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full stack-table">
              <thead>
                <tr className="bg-navy-800 text-white">
                  <th className="th">#</th>
                  <th className="th">Student</th>
                  <th className="th">Class</th>
                  <th className="th">Father Name</th>
                  <th className="th">Guardian</th>
                  <th className="th">Phone</th>
                  <th className="th text-right">Monthly Fee</th>
                  <th className="th text-right">Paid</th>
                  <th className="th text-right">Remaining</th>
                  <th className="th">Status</th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((s, i) => {
                  const bal = balanceOf.get(s.id);
                  const fee = s.monthly_fee ?? s.classes?.monthly_fee ?? 0;
                  return (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td data-label="#" className="td text-slate-400">{i + 1}</td>
                      <td data-label="Student" className="td">
                        <div className="font-semibold text-navy-900">{s.full_name}</div>
                        {s.roll_no && <div className="text-xs text-slate-400">Roll {s.roll_no}</div>}
                      </td>
                      <td data-label="Class" className="td text-slate-600">{s.classes?.name || "—"}</td>
                      <td data-label="Father Name" className="td text-slate-600">{s.father_name || "—"}</td>
                      <td data-label="Guardian" className="td text-slate-600">{s.guardian_name || "—"}</td>
                      <td data-label="Phone" className="td text-slate-600">{s.phone || "—"}</td>
                      <td data-label="Monthly Fee" className="td text-right tabular-nums">
                        {num(fee)}
                        {s.monthly_fee != null && <span className="ml-1 text-[10px] text-amber-600">custom</span>}
                      </td>
                      <td data-label="Paid" className="td text-right font-semibold tabular-nums text-emerald-700">
                        {num(bal?.total_paid || 0)}
                      </td>
                      <td data-label="Remaining" className="td text-right font-semibold tabular-nums text-rose-700">
                        {num(bal?.total_remaining || 0)}
                      </td>
                      <td data-label="Status" className="td">
                        <span
                          className={`chip ${
                            s.status === "active"
                              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                              : "bg-slate-100 text-slate-500 ring-slate-200"
                          }`}
                        >
                          {s.status === "active" ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td data-label="Actions" className="td">
                        <div className="flex justify-end gap-1">
                          <IconBtn title="Fee history" onClick={() => setViewing(s)}>
                            <Eye className="h-4 w-4" />
                          </IconBtn>
                          <IconBtn
                            title="Edit"
                            onClick={() =>
                              setEditing({
                                ...s,
                                class_id: s.class_id || "",
                                monthly_fee: s.monthly_fee ?? "",
                                date_of_birth: s.date_of_birth || "",
                                admission_date: s.admission_date || todayISO(),
                              })
                            }
                          >
                            <Pencil className="h-4 w-4" />
                          </IconBtn>
                          <IconBtn title="Delete" danger onClick={() => setRemoving(s)}>
                            <Trash2 className="h-4 w-4" />
                          </IconBtn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <StudentForm
        student={editing}
        classes={classes}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          load();
        }}
      />

      <StudentHistory student={viewing} onClose={() => setViewing(null)} />

      <Confirm
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        title="Delete student"
        message={`Delete ${removing?.full_name}? Their challans and payment records will be removed too. This cannot be undone.`}
        onConfirm={async () => {
          try {
            await deleteStudent(removing.id);
            toast(`${removing.full_name} deleted.`);
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

function IconBtn({ children, title, onClick, danger }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`icon-btn ${
        danger ? "text-rose-500 hover:bg-rose-50" : "text-slate-500 hover:bg-slate-100 hover:text-navy-900"
      }`}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------- add / edit */

function StudentForm({ student, classes, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(BLANK);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (student) setForm(student);
  }, [student]);

  if (!student) return null;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const selectedClass = classes.find((c) => c.id === form.class_id);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.full_name?.trim()) return toast("Student name is required.", "error");
    setBusy(true);
    try {
      await saveStudent(form);
      toast(student.id ? "Student updated." : "Student added.");
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
      title={student.id ? "Edit student" : "Add new student"}
      subtitle="Fee defaults to the class fee unless you set a custom amount."
      width="max-w-3xl"
    >
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Full name *</label>
          <input className="input" required value={form.full_name || ""} onChange={set("full_name")} placeholder="Areeba Khan" />
        </div>

        <div>
          <label className="label">Class</label>
          <select className="input" value={form.class_id || ""} onChange={set("class_id")}>
            <option value="">— Select class —</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {num(c.monthly_fee)}/month
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Roll number</label>
          <input className="input" value={form.roll_no || ""} onChange={set("roll_no")} placeholder="KS-101" />
        </div>

        <div>
          <label className="label">Father&rsquo;s name</label>
          <input
            className="input"
            value={form.father_name || ""}
            onChange={set("father_name")}
            placeholder="Imran Khan"
          />
        </div>

        <div>
          <label className="label">Guardian name <span className="font-normal text-slate-400">(if different)</span></label>
          <input className="input" value={form.guardian_name || ""} onChange={set("guardian_name")} placeholder="Mr. Khan" />
        </div>

        <div>
          <label className="label">Phone</label>
          <input className="input" value={form.phone || ""} onChange={set("phone")} placeholder="+92 3xx xxxxxxx" />
        </div>

        <div>
          <label className="label">Gender</label>
          <select className="input" value={form.gender || ""} onChange={set("gender")}>
            <option value="">—</option>
            <option value="Female">Female</option>
            <option value="Male">Male</option>
          </select>
        </div>

        <div>
          <label className="label">Date of birth</label>
          <input type="date" className="input" value={form.date_of_birth || ""} onChange={set("date_of_birth")} />
        </div>

        <div>
          <label className="label">Admission date</label>
          <input type="date" className="input" value={form.admission_date || ""} onChange={set("admission_date")} />
        </div>

        <div>
          <label className="label">Status</label>
          <select className="input" value={form.status || "active"} onChange={set("status")}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div>
          <label className="label">
            Custom monthly fee{" "}
            <span className="font-normal text-slate-400">
              (blank = class fee {selectedClass ? num(selectedClass.monthly_fee) : "—"})
            </span>
          </label>
          <input
            type="number"
            min="0"
            className="input"
            value={form.monthly_fee ?? ""}
            onChange={set("monthly_fee")}
            placeholder="Leave blank"
          />
        </div>

        <div>
          <label className="label">Standing discount (PKR / month)</label>
          <input type="number" min="0" className="input" value={form.discount ?? 0} onChange={set("discount")} />
        </div>

        <div className="sm:col-span-2">
          <label className="label">Address</label>
          <input className="input" value={form.address || ""} onChange={set("address")} />
        </div>

        <div className="sm:col-span-2">
          <label className="label">Notes</label>
          <textarea className="input" rows={2} value={form.notes || ""} onChange={set("notes")} />
        </div>

        <div className="sm:col-span-2 mt-2 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy && <Spinner className="h-4 w-4" />}
            {student.id ? "Save changes" : "Add student"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ------------------------------------------------- month-by-month history */

function StudentHistory({ student, onClose }) {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!student) return;
    setLoading(true);
    fetchStudentChallans(student.id)
      .then(setRows)
      .catch((e) => toast(e.message, "error"))
      .finally(() => setLoading(false));
  }, [student, toast]);

  if (!student) return null;

  const billed = rows.reduce((s, r) => s + Number(r.payable || 0), 0);
  const paid = rows.reduce((s, r) => s + Number(r.paid || 0), 0);

  return (
    <Modal
      open
      onClose={onClose}
      title={student.full_name}
      subtitle={`${student.classes?.name || "No class"} · month-by-month fee record`}
      width="max-w-3xl"
    >
      <div className="mb-4 grid grid-cols-3 gap-3">
        <Mini label="Total billed" value={pkr(billed)} tone="bg-slate-50 text-slate-700" />
        <Mini label="Total paid" value={pkr(paid)} tone="bg-emerald-50 text-emerald-700" />
        <Mini label="Remaining" value={pkr(billed - paid)} tone="bg-rose-50 text-rose-700" />
      </div>

      {loading ? (
        <Loading />
      ) : !rows.length ? (
        <Empty icon={Eye} title="No challans yet" hint="Generate this month's challans from Fee Management." />
      ) : (
        <div className="scroll-thin max-h-[50vh] overflow-auto rounded-xl ring-1 ring-slate-200">
          <table className="w-full stack-table">
            <thead className="sticky top-0">
              <tr className="bg-slate-100 text-slate-600">
                <th className="th">Month</th>
                <th className="th">Receipt No.</th>
                <th className="th text-right">Payable</th>
                <th className="th text-right">Paid</th>
                <th className="th text-right">Remaining</th>
                <th className="th">Status</th>
                <th className="th">Last payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td data-label="Month" className="td font-semibold text-navy-900">{periodLabel(r.year, r.month)}</td>
                  <td data-label="Receipt No." className="td font-mono text-xs text-slate-500">{r.receipt_no}</td>
                  <td data-label="Payable" className="td text-right tabular-nums">{num(r.payable)}</td>
                  <td data-label="Paid" className="td text-right tabular-nums text-emerald-700">{num(r.paid)}</td>
                  <td data-label="Remaining" className="td text-right tabular-nums font-semibold text-rose-700">{num(r.remaining)}</td>
                  <td data-label="Status" className="td">
                    <span className={`chip ${statusTone(r.status)}`}>{r.status}</span>
                  </td>
                  <td data-label="Last payment" className="td text-slate-500">{r.last_paid_on ? shortDate(r.last_paid_on) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}

function Mini({ label, value, tone }) {
  return (
    <div className={`rounded-xl px-4 py-3 ${tone}`}>
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className="text-base font-bold">{value}</p>
    </div>
  );
}
