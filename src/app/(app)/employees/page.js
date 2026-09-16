"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Briefcase, Download, Eye, Pencil, Plus, Search, Trash2, UserCog, Wallet } from "lucide-react";
import {
  deleteEmployee,
  fetchEmployeeSalaries,
  fetchEmployees,
  saveEmployee,
} from "@/lib/db";
import { downloadCSV, num, periodLabel, pkr, shortDate, statusTone, todayISO } from "@/lib/format";
import { Confirm, Empty, Loading, Modal, PageHeader, Spinner, StatCard, useToast } from "@/components/ui";

const DEPARTMENTS = ["Teaching", "Administration", "Daycare", "Support", "Management"];
const TYPES = ["Full time", "Part time", "Contract", "Intern"];

const BLANK = {
  employee_code: "",
  full_name: "",
  father_name: "",
  cnic: "",
  designation: "",
  department: "Teaching",
  employment_type: "Full time",
  phone: "",
  email: "",
  address: "",
  gender: "",
  date_of_birth: "",
  joining_date: todayISO(),
  monthly_salary: 0,
  allowances: 0,
  bank_name: "",
  account_number: "",
  status: "active",
  notes: "",
};

export default function EmployeesPage() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [removing, setRemoving] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchEmployees({ department, status }));
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setLoading(false);
    }
  }, [department, status, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((e) =>
      [e.full_name, e.employee_code, e.designation, e.phone, e.cnic]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [rows, search]);

  const active = visible.filter((e) => e.status === "active");
  const monthlyCost = active.reduce(
    (sum, e) => sum + Number(e.monthly_salary || 0) + Number(e.allowances || 0),
    0
  );

  const exportCSV = () =>
    downloadCSV(
      `kindle-sprout-employees-${todayISO()}.csv`,
      [
        { label: "Employee ID", get: (e) => e.employee_code },
        { label: "Name", get: (e) => e.full_name },
        { label: "Father Name", get: (e) => e.father_name || "" },
        { label: "Designation", get: (e) => e.designation || "" },
        { label: "Department", get: (e) => e.department },
        { label: "Type", get: (e) => e.employment_type },
        { label: "CNIC", get: (e) => e.cnic || "" },
        { label: "Phone", get: (e) => e.phone || "" },
        { label: "Email", get: (e) => e.email || "" },
        { label: "Joining Date", get: (e) => e.joining_date || "" },
        { label: "Monthly Salary", get: (e) => e.monthly_salary },
        { label: "Allowances", get: (e) => e.allowances },
        { label: "Gross", get: (e) => Number(e.monthly_salary) + Number(e.allowances) },
        { label: "Bank", get: (e) => e.bank_name || "" },
        { label: "Account", get: (e) => e.account_number || "" },
        { label: "Status", get: (e) => e.status },
      ],
      visible
    );

  return (
    <>
      <PageHeader icon={UserCog} title="Employees" subtitle="Teaching and support staff, with their salary details">
        <button className="btn-secondary" onClick={exportCSV} disabled={!visible.length}>
          <Download className="h-4 w-4" /> Export CSV
        </button>
        <button className="btn-primary" onClick={() => setEditing({ ...BLANK })}>
          <Plus className="h-4 w-4" /> Add Employee
        </button>
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={UserCog}
          tone="sky"
          label="Employees shown"
          value={num(visible.length)}
          sub={`${active.length} active`}
        />
        <StatCard
          icon={Briefcase}
          tone="violet"
          label="Departments"
          value={num(new Set(visible.map((e) => e.department)).size)}
          sub={DEPARTMENTS.join(" · ")}
        />
        <StatCard
          icon={Wallet}
          tone="rose"
          label="Monthly salary cost"
          value={pkr(monthlyCost)}
          sub="Active staff, salary + allowances"
        />
      </div>

      <div className="card card-pad mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative lg:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search name, ID, designation, phone or CNIC…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input" value={department} onChange={(e) => setDepartment(e.target.value)}>
          <option value="">All departments</option>
          {DEPARTMENTS.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="card">
        {loading ? (
          <Loading />
        ) : !visible.length ? (
          <Empty
            icon={UserCog}
            title="No employees found"
            hint="Adjust the filters, or add the first staff record."
            action={
              <button className="btn-primary" onClick={() => setEditing({ ...BLANK })}>
                <Plus className="h-4 w-4" /> Add Employee
              </button>
            }
          />
        ) : (
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-navy-800 text-white">
                  <th className="th">Employee ID</th>
                  <th className="th">Name</th>
                  <th className="th">Designation</th>
                  <th className="th">Department</th>
                  <th className="th">Phone</th>
                  <th className="th text-right">Salary</th>
                  <th className="th text-right">Allowances</th>
                  <th className="th text-right">Gross</th>
                  <th className="th">Status</th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="td font-mono text-xs text-slate-500">{e.employee_code}</td>
                    <td className="td">
                      <div className="font-semibold text-navy-900">{e.full_name}</div>
                      {e.father_name && <div className="text-xs text-slate-400">{e.father_name}</div>}
                    </td>
                    <td className="td text-slate-600">{e.designation || "—"}</td>
                    <td className="td">
                      <span className="chip bg-slate-50 text-slate-600 ring-slate-200">{e.department}</span>
                    </td>
                    <td className="td text-slate-600">{e.phone || "—"}</td>
                    <td className="td text-right tabular-nums">{num(e.monthly_salary)}</td>
                    <td className="td text-right tabular-nums">{num(e.allowances)}</td>
                    <td className="td text-right font-semibold tabular-nums">
                      {num(Number(e.monthly_salary) + Number(e.allowances))}
                    </td>
                    <td className="td">
                      <span
                        className={`chip ${
                          e.status === "active"
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                            : "bg-slate-100 text-slate-500 ring-slate-200"
                        }`}
                      >
                        {e.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="td">
                      <div className="flex justify-end gap-1">
                        <IconBtn title="Salary history" onClick={() => setViewing(e)}>
                          <Eye className="h-4 w-4" />
                        </IconBtn>
                        <IconBtn
                          title="Edit"
                          onClick={() =>
                            setEditing({
                              ...e,
                              date_of_birth: e.date_of_birth || "",
                              joining_date: e.joining_date || todayISO(),
                            })
                          }
                        >
                          <Pencil className="h-4 w-4" />
                        </IconBtn>
                        <IconBtn title="Delete" danger onClick={() => setRemoving(e)}>
                          <Trash2 className="h-4 w-4" />
                        </IconBtn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-amber-50 font-bold text-navy-900">
                  <td className="td" colSpan={5}>
                    Total ({visible.length})
                  </td>
                  <td className="td text-right tabular-nums">
                    {num(visible.reduce((s, e) => s + Number(e.monthly_salary || 0), 0))}
                  </td>
                  <td className="td text-right tabular-nums">
                    {num(visible.reduce((s, e) => s + Number(e.allowances || 0), 0))}
                  </td>
                  <td className="td text-right tabular-nums">
                    {num(visible.reduce((s, e) => s + Number(e.monthly_salary || 0) + Number(e.allowances || 0), 0))}
                  </td>
                  <td className="td" colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <EmployeeForm
        row={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          load();
        }}
      />

      <SalaryHistory employee={viewing} onClose={() => setViewing(null)} />

      <Confirm
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        title="Delete employee"
        message={`Delete ${removing?.full_name}? Their salary slips and payment records are removed too. This cannot be undone.`}
        onConfirm={async () => {
          try {
            await deleteEmployee(removing.id);
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
      className={`rounded-lg p-2 transition ${
        danger ? "text-rose-500 hover:bg-rose-50" : "text-slate-500 hover:bg-slate-100 hover:text-navy-900"
      }`}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------- add / edit */

function EmployeeForm({ row, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(BLANK);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (row) setForm(row);
  }, [row]);

  if (!row) return null;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const gross = Number(form.monthly_salary || 0) + Number(form.allowances || 0);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.full_name?.trim()) return toast("Employee name is required.", "error");
    setBusy(true);
    try {
      await saveEmployee(form);
      toast(row.id ? "Employee updated." : "Employee added.");
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
      title={row.id ? `Edit ${row.full_name}` : "Add employee"}
      subtitle="The employee ID is generated automatically unless you type one."
      width="max-w-3xl"
    >
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Full name *</label>
          <input className="input" required value={form.full_name || ""} onChange={set("full_name")} placeholder="Sara Ahmed" />
        </div>

        <div>
          <label className="label">
            Employee ID <span className="font-normal text-slate-400">(auto if blank)</span>
          </label>
          <input className="input" value={form.employee_code || ""} onChange={set("employee_code")} placeholder="KS-EMP-101" />
        </div>
        <div>
          <label className="label">Father&rsquo;s / husband&rsquo;s name</label>
          <input className="input" value={form.father_name || ""} onChange={set("father_name")} />
        </div>

        <div>
          <label className="label">Designation</label>
          <input className="input" value={form.designation || ""} onChange={set("designation")} placeholder="Class Teacher" />
        </div>
        <div>
          <label className="label">Department</label>
          <select className="input" value={form.department} onChange={set("department")}>
            {DEPARTMENTS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Employment type</label>
          <select className="input" value={form.employment_type} onChange={set("employment_type")}>
            {TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={form.status} onChange={set("status")}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div>
          <label className="label">CNIC</label>
          <input className="input" value={form.cnic || ""} onChange={set("cnic")} placeholder="61101-1234567-8" />
        </div>
        <div>
          <label className="label">Phone</label>
          <input className="input" value={form.phone || ""} onChange={set("phone")} placeholder="+92 3xx xxxxxxx" />
        </div>

        <div>
          <label className="label">Email</label>
          <input className="input" value={form.email || ""} onChange={set("email")} />
        </div>
        <div>
          <label className="label">Gender</label>
          <select className="input" value={form.gender || ""} onChange={set("gender")}>
            <option value="">—</option>
            <option>Female</option>
            <option>Male</option>
          </select>
        </div>

        <div>
          <label className="label">Date of birth</label>
          <input type="date" className="input" value={form.date_of_birth || ""} onChange={set("date_of_birth")} />
        </div>
        <div>
          <label className="label">Joining date</label>
          <input type="date" className="input" value={form.joining_date || ""} onChange={set("joining_date")} />
        </div>

        <div>
          <label className="label">Monthly salary (PKR)</label>
          <input type="number" min="0" className="input" value={form.monthly_salary ?? 0} onChange={set("monthly_salary")} />
        </div>
        <div>
          <label className="label">Allowances (PKR / month)</label>
          <input type="number" min="0" className="input" value={form.allowances ?? 0} onChange={set("allowances")} />
          <p className="mt-1 text-xs text-slate-400">Gross per month: <b>{pkr(gross)}</b></p>
        </div>

        <div>
          <label className="label">Bank</label>
          <input className="input" value={form.bank_name || ""} onChange={set("bank_name")} placeholder="Meezan Bank" />
        </div>
        <div>
          <label className="label">Account number</label>
          <input className="input" value={form.account_number || ""} onChange={set("account_number")} />
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
            {row.id ? "Save changes" : "Add employee"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------------------------------------------------- month-by-month pay */

function SalaryHistory({ employee, onClose }) {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!employee) return;
    setLoading(true);
    fetchEmployeeSalaries(employee.id)
      .then(setRows)
      .catch((e) => toast(e.message, "error"))
      .finally(() => setLoading(false));
  }, [employee, toast]);

  if (!employee) return null;

  const net = rows.reduce((s, r) => s + Number(r.net_salary || 0), 0);
  const paid = rows.reduce((s, r) => s + Number(r.paid || 0), 0);

  return (
    <Modal
      open
      onClose={onClose}
      title={employee.full_name}
      subtitle={`${employee.designation || employee.department} · salary history`}
      width="max-w-3xl"
    >
      <div className="mb-4 grid grid-cols-3 gap-3">
        <Mini label="Total earned" value={pkr(net)} tone="bg-slate-50 text-slate-700" />
        <Mini label="Total paid" value={pkr(paid)} tone="bg-emerald-50 text-emerald-700" />
        <Mini label="Outstanding" value={pkr(net - paid)} tone="bg-rose-50 text-rose-700" />
      </div>

      {loading ? (
        <Loading />
      ) : !rows.length ? (
        <Empty icon={Wallet} title="No salary slips yet" hint="Generate this month's payroll to create them." />
      ) : (
        <div className="scroll-thin max-h-[50vh] overflow-auto rounded-xl ring-1 ring-slate-200">
          <table className="w-full">
            <thead className="sticky top-0 bg-slate-100">
              <tr className="text-slate-600">
                <th className="th">Month</th>
                <th className="th">Slip No.</th>
                <th className="th text-right">Net</th>
                <th className="th text-right">Paid</th>
                <th className="th text-right">Remaining</th>
                <th className="th">Status</th>
                <th className="th">Last paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="td font-semibold text-navy-900">{periodLabel(r.year, r.month)}</td>
                  <td className="td font-mono text-xs text-slate-500">{r.slip_no}</td>
                  <td className="td text-right tabular-nums">{num(r.net_salary)}</td>
                  <td className="td text-right tabular-nums text-emerald-700">{num(r.paid)}</td>
                  <td className="td text-right font-semibold tabular-nums text-rose-700">{num(r.remaining)}</td>
                  <td className="td">
                    <span className={`chip ${statusTone(r.status)}`}>{r.status}</span>
                  </td>
                  <td className="td text-slate-500">{r.last_paid_on ? shortDate(r.last_paid_on) : "—"}</td>
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
