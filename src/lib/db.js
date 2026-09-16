"use client";

import { supabase } from "@/lib/supabase";

/** Throws Supabase errors so callers can surface them in a toast. */
function unwrap({ data, error }) {
  if (error) throw new Error(error.message);
  return data;
}

/* ------------------------------------------------- schema drift handling --
   Tables added after the first release may not exist yet if schema.sql has not
   been re-run. Rather than throwing a toast on every page, the app carries on
   without them and raises one banner telling the admin what to do. */

const MISSING = new Set();
const listeners = new Set();

export function missingTables() {
  return [...MISSING];
}

export function onMissingTables(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function isMissingTable(error) {
  return (
    error?.code === "PGRST205" ||
    error?.code === "42P01" ||
    /could not find the table|schema cache/i.test(error?.message || "")
  );
}

/** Run a query against a table that may not exist yet. */
async function optional(table, result, fallback) {
  const { data, error } = await result;
  if (!error) return data;
  if (isMissingTable(error)) {
    if (!MISSING.has(table)) {
      MISSING.add(table);
      listeners.forEach((fn) => fn([...MISSING]));
    }
    return fallback;
  }
  throw new Error(error.message);
}

/* ----------------------------------------------------------------- classes */

export async function fetchClasses() {
  return unwrap(await supabase.from("classes").select("*").order("sort_order"));
}

export async function saveClass(row) {
  const payload = {
    name: row.name,
    monthly_fee: Number(row.monthly_fee) || 0,
    annual_fee: Number(row.annual_fee) || 0,
    sort_order: Number(row.sort_order) || 0,
    color: row.color || "sky",
  };
  if (row.id) return unwrap(await supabase.from("classes").update(payload).eq("id", row.id).select().single());
  return unwrap(await supabase.from("classes").insert(payload).select().single());
}

export async function deleteClass(id) {
  return unwrap(await supabase.from("classes").delete().eq("id", id));
}

/* --------------------------------------------------------------- fee heads */

export async function fetchFeeHeads({ activeOnly = false } = {}) {
  let q = supabase.from("fee_heads").select("*").order("sort_order").order("name");
  if (activeOnly) q = q.eq("is_active", true);
  return optional("fee_heads", q, []);
}

export async function saveFeeHead(row) {
  const payload = {
    name: row.name?.trim(),
    frequency: row.frequency || "monthly",
    default_amount: Number(row.default_amount) || 0,
    sort_order: Number(row.sort_order) || 0,
    is_active: row.is_active !== false,
  };
  if (row.id) return unwrap(await supabase.from("fee_heads").update(payload).eq("id", row.id).select().single());
  return unwrap(await supabase.from("fee_heads").insert(payload).select().single());
}

export async function deleteFeeHead(id) {
  return unwrap(await supabase.from("fee_heads").delete().eq("id", id));
}

export async function fetchClassFees() {
  return optional("class_fees", supabase.from("class_fees").select("*"), []);
}

export async function saveClassFee(classId, headId, amount) {
  return unwrap(
    await supabase
      .from("class_fees")
      .upsert({ class_id: classId, head_id: headId, amount: Number(amount) || 0 })
      .select()
      .single()
  );
}

/** What a class is charged for a head: its override, else the head default. */
export function feeFor(classFees, classId, head) {
  const row = classFees.find((f) => f.class_id === classId && f.head_id === head.id);
  return Number(row ? row.amount : head.default_amount) || 0;
}

/* ---------------------------------------------------------------- settings */

export async function fetchSettings() {
  const { data, error } = await supabase.from("settings").select("*").eq("id", 1).maybeSingle();
  if (error) throw new Error(error.message);
  return data || {};
}

export async function saveSettings(values) {
  return unwrap(
    await supabase
      .from("settings")
      .upsert({ ...values, id: 1, updated_at: new Date().toISOString() })
      .select()
      .single()
  );
}

/* ---------------------------------------------------------------- students */

export async function fetchStudents({ search = "", classId = "", status = "" } = {}) {
  let q = supabase
    .from("students")
    .select("*, classes(id, name, monthly_fee, annual_fee, sort_order)")
    .order("full_name");

  if (classId) q = q.eq("class_id", classId);
  if (status) q = q.eq("status", status);
  if (search.trim()) {
    const term = `%${search.trim()}%`;
    q = q.or(
      `full_name.ilike.${term},father_name.ilike.${term},guardian_name.ilike.${term},` +
        `phone.ilike.${term},roll_no.ilike.${term}`
    );
  }
  return unwrap(await q);
}

export async function saveStudent(row) {
  const payload = {
    full_name: row.full_name?.trim(),
    father_name: row.father_name?.trim() || null,
    guardian_name: row.guardian_name?.trim() || null,
    phone: row.phone?.trim() || null,
    class_id: row.class_id || null,
    roll_no: row.roll_no?.trim() || null,
    gender: row.gender || null,
    date_of_birth: row.date_of_birth || null,
    admission_date: row.admission_date || null,
    address: row.address?.trim() || null,
    // Blank means "use the class fee", so keep it null rather than 0.
    monthly_fee: row.monthly_fee === "" || row.monthly_fee === null ? null : Number(row.monthly_fee),
    discount: Number(row.discount) || 0,
    status: row.status || "active",
    notes: row.notes?.trim() || null,
  };
  if (row.id) return unwrap(await supabase.from("students").update(payload).eq("id", row.id).select().single());
  return unwrap(await supabase.from("students").insert(payload).select().single());
}

export async function deleteStudent(id) {
  return unwrap(await supabase.from("students").delete().eq("id", id));
}

export async function fetchStudentBalances() {
  return unwrap(await supabase.from("student_balances").select("*").order("full_name"));
}

/* ---------------------------------------------------------------- challans */

export async function fetchChallans({ year, month, classId = "", status = "", search = "" } = {}) {
  let q = supabase.from("challan_details").select("*").order("student_name");
  if (year) q = q.eq("year", year);
  if (month) q = q.eq("month", month);
  if (classId) q = q.eq("class_id", classId);
  if (status) q = q.eq("status", status);
  if (search.trim()) q = q.ilike("student_name", `%${search.trim()}%`);
  return unwrap(await q);
}

export async function fetchStudentChallans(studentId) {
  return unwrap(
    await supabase
      .from("challan_details")
      .select("*")
      .eq("student_id", studentId)
      .order("year", { ascending: false })
      .order("month", { ascending: false })
  );
}

/**
 * Create the month's challans for a class (or the whole school when classId is
 * empty). Students who already have a challan for that month are left alone, so
 * this is safe to run twice.
 */
export async function generateChallans({ classId = "", year, month, dueDay = 10 }) {
  let sq = supabase
    .from("students")
    .select("id, class_id, monthly_fee, discount, classes(monthly_fee)")
    .eq("status", "active");
  if (classId) sq = sq.eq("class_id", classId);
  const students = unwrap(await sq);

  if (!students.length) return { created: 0, skipped: 0, total: 0 };

  // Who already has a challan for this month?
  let eq = supabase.from("challans").select("student_id").eq("year", year).eq("month", month);
  if (classId) eq = eq.eq("class_id", classId);
  const already = new Set(unwrap(await eq).map((c) => c.student_id));

  const pending = students.filter((s) => !already.has(s.id));
  if (!pending.length) return { created: 0, skipped: students.length, total: students.length };

  // One-time and annual heads depend on what the student has been billed before.
  const prior = unwrap(
    await supabase
      .from("challans")
      .select("student_id, year")
      .in("student_id", pending.map((s) => s.id))
  );
  const billedThisYear = new Set(prior.filter((p) => p.year === year).map((p) => p.student_id));

  const [heads, classFees] = await Promise.all([fetchFeeHeads({ activeOnly: true }), fetchClassFees()]);

  const dueDate = `${year}-${String(month).padStart(2, "0")}-${String(dueDay).padStart(2, "0")}`;

  // Build the line items for each student, and total them up.
  const itemsByStudent = new Map();
  const rows = pending.map((s) => {
    const items = [
      {
        name: "Monthly Tuition Fee",
        frequency: "monthly",
        amount: Number(s.monthly_fee ?? s.classes?.monthly_fee ?? 0),
        sort_order: 0,
      },
    ];

    heads.forEach((h) => {
      // One-time joining charges never land on a monthly challan — they belong
      // to the separate admission challan, which the office prices by hand.
      const applies =
        h.frequency === "monthly" || (h.frequency === "annual" && !billedThisYear.has(s.id));
      if (!applies) return;
      const amount = feeFor(classFees, s.class_id, h);
      if (amount <= 0) return; // a head set to zero for this class is simply skipped
      items.push({ name: h.name, frequency: h.frequency, amount, sort_order: h.sort_order + 1 });
    });

    itemsByStudent.set(s.id, items);
    return {
      student_id: s.id,
      class_id: s.class_id,
      year,
      month,
      total_fee: items.reduce((sum, it) => sum + it.amount, 0),
      discount: Number(s.discount) || 0,
      due_date: dueDate,
    };
  });

  // Insert the challans, then their items using the ids that come back.
  const inserted = unwrap(await supabase.from("challans").insert(rows).select("id, student_id"));

  const itemRows = inserted.flatMap((ch) =>
    (itemsByStudent.get(ch.student_id) || []).map((it) => ({ ...it, challan_id: ch.id }))
  );
  if (itemRows.length) {
    await optional("challan_items", supabase.from("challan_items").insert(itemRows), null);
  }

  return { created: inserted.length, skipped: students.length - pending.length, total: students.length };
}

/** Line items for a set of challans, grouped by challan id. */
export async function fetchChallanItems(challanIds) {
  if (!challanIds?.length) return new Map();
  const rows = await optional(
    "challan_items",
    supabase.from("challan_items").select("*").in("challan_id", challanIds).order("sort_order"),
    []
  );
  const byChallan = new Map();
  rows.forEach((r) => {
    if (!byChallan.has(r.challan_id)) byChallan.set(r.challan_id, []);
    byChallan.get(r.challan_id).push(r);
  });
  return byChallan;
}

/**
 * Default lines for an admission challan for a given class: every active
 * one-time head priced for that class, plus the first month's tuition. Amounts
 * of zero drop out, which is how Daycare ends up with Registration only.
 *
 * The admission challan is a blank template printed for a child who has not
 * been admitted yet, so this takes a class rather than a student.
 */
export async function admissionTemplate(classId) {
  const [heads, classFees, classes] = await Promise.all([
    fetchFeeHeads({ activeOnly: true }),
    fetchClassFees(),
    fetchClasses(),
  ]);

  const lines = heads
    .filter((h) => h.frequency === "one_time")
    .map((h) => ({ name: h.name, amount: feeFor(classFees, classId, h), sort_order: h.sort_order }))
    .filter((l) => l.amount > 0);

  const tuition = Number(classes.find((c) => c.id === classId)?.monthly_fee || 0);
  if (tuition > 0) lines.push({ name: "Tuition Fee (first month)", amount: tuition, sort_order: 50 });

  return lines.sort((a, b) => a.sort_order - b.sort_order);
}

export async function updateChallan(id, values) {
  return unwrap(await supabase.from("challans").update(values).eq("id", id).select().single());
}

export async function deleteChallan(id) {
  return unwrap(await supabase.from("challans").delete().eq("id", id));
}

/* ---------------------------------------------------------------- payments */

export async function fetchPayments({ from = "", to = "", classId = "", search = "", limit = 500 } = {}) {
  let q = supabase
    .from("payments")
    .select("*, students(full_name, class_id, classes(name)), challans(receipt_no, year, month)")
    .order("paid_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (from) q = q.gte("paid_on", from);
  if (to) q = q.lte("paid_on", to);
  const rows = unwrap(await q);

  return rows.filter((p) => {
    if (classId && p.students?.class_id !== classId) return false;
    if (search.trim()) {
      const hay = `${p.students?.full_name || ""} ${p.reference || ""} ${p.challans?.receipt_no || ""}`.toLowerCase();
      if (!hay.includes(search.trim().toLowerCase())) return false;
    }
    return true;
  });
}

export async function addPayment(row) {
  return unwrap(
    await supabase
      .from("payments")
      .insert({
        challan_id: row.challan_id,
        student_id: row.student_id,
        amount: Number(row.amount),
        paid_on: row.paid_on,
        method: row.method || "Cash",
        reference: row.reference?.trim() || null,
        received_by: row.received_by?.trim() || null,
        notes: row.notes?.trim() || null,
      })
      .select()
      .single()
  );
}

export async function fetchChallanPayments(challanId) {
  return unwrap(
    await supabase.from("payments").select("*").eq("challan_id", challanId).order("paid_on", { ascending: false })
  );
}

export async function deletePayment(id) {
  return unwrap(await supabase.from("payments").delete().eq("id", id));
}

/* ------------------------------------------------------------- aggregates */

/** Totals for one month, grouped by class — powers the dashboard and reports. */
export function summariseByClass(challans, classes) {
  const byId = new Map();
  classes.forEach((c) =>
    byId.set(c.id, {
      ...c,
      students: 0,
      billed: 0,
      paid: 0,
      remaining: 0,
      paidCount: 0,
      partialCount: 0,
      unpaidCount: 0,
    })
  );

  challans.forEach((ch) => {
    const row = byId.get(ch.class_id);
    if (!row) return;
    row.students += 1;
    row.billed += Number(ch.payable) || 0;
    row.paid += Number(ch.paid) || 0;
    row.remaining += Number(ch.remaining) || 0;
    if (ch.status === "Paid") row.paidCount += 1;
    else if (ch.status === "Partial") row.partialCount += 1;
    else row.unpaidCount += 1;
  });

  return [...byId.values()].sort((a, b) => a.sort_order - b.sort_order);
}

export function totals(challans) {
  return challans.reduce(
    (acc, ch) => {
      acc.billed += Number(ch.payable) || 0;
      acc.paid += Number(ch.paid) || 0;
      acc.remaining += Number(ch.remaining) || 0;
      acc.count += 1;
      if (ch.status === "Paid") acc.paidCount += 1;
      else if (ch.status === "Partial") acc.partialCount += 1;
      else acc.unpaidCount += 1;
      return acc;
    },
    { billed: 0, paid: 0, remaining: 0, count: 0, paidCount: 0, partialCount: 0, unpaidCount: 0 }
  );
}

/* --------------------------------------------------------------- employees */

export async function fetchEmployees({ search = "", department = "", status = "" } = {}) {
  let q = supabase.from("employees").select("*").order("full_name");
  if (department) q = q.eq("department", department);
  if (status) q = q.eq("status", status);
  const rows = await optional("employees", q, []);

  const term = search.trim().toLowerCase();
  if (!term) return rows;
  return rows.filter((e) =>
    [e.full_name, e.employee_code, e.designation, e.phone, e.cnic]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(term)
  );
}

export async function saveEmployee(row) {
  const payload = {
    full_name: row.full_name?.trim(),
    father_name: row.father_name?.trim() || null,
    cnic: row.cnic?.trim() || null,
    designation: row.designation?.trim() || null,
    department: row.department || "Teaching",
    employment_type: row.employment_type || "Full time",
    phone: row.phone?.trim() || null,
    email: row.email?.trim() || null,
    address: row.address?.trim() || null,
    gender: row.gender || null,
    date_of_birth: row.date_of_birth || null,
    joining_date: row.joining_date || null,
    monthly_salary: Number(row.monthly_salary) || 0,
    allowances: Number(row.allowances) || 0,
    bank_name: row.bank_name?.trim() || null,
    account_number: row.account_number?.trim() || null,
    status: row.status || "active",
    notes: row.notes?.trim() || null,
  };
  // employee_code is generated by a trigger, but keep a typed one if given.
  if (row.employee_code?.trim()) payload.employee_code = row.employee_code.trim();

  if (row.id) return unwrap(await supabase.from("employees").update(payload).eq("id", row.id).select().single());
  return unwrap(await supabase.from("employees").insert(payload).select().single());
}

export async function deleteEmployee(id) {
  return unwrap(await supabase.from("employees").delete().eq("id", id));
}

/* ----------------------------------------------------------------- salaries */

export async function fetchSalaries({ year, month, department = "", status = "", search = "" } = {}) {
  let q = supabase.from("salary_details").select("*").order("employee_name");
  if (year) q = q.eq("year", year);
  if (month) q = q.eq("month", month);
  if (department) q = q.eq("department", department);
  if (status) q = q.eq("status", status);
  const rows = await optional("salary_details", q, []);

  const term = search.trim().toLowerCase();
  if (!term) return rows;
  return rows.filter((r) => `${r.employee_name} ${r.employee_code}`.toLowerCase().includes(term));
}

export async function fetchEmployeeSalaries(employeeId) {
  return optional(
    "salary_details",
    supabase
      .from("salary_details")
      .select("*")
      .eq("employee_id", employeeId)
      .order("year", { ascending: false })
      .order("month", { ascending: false }),
    []
  );
}

/**
 * Create the month's salary slips for every active employee (optionally one
 * department). Anyone who already has a slip for that month is left alone, so
 * running it twice is safe.
 */
export async function generateSalaries({ department = "", year, month }) {
  let eq = supabase.from("employees").select("id, monthly_salary, allowances").eq("status", "active");
  if (department) eq = eq.eq("department", department);
  const employees = await optional("employees", eq, []);

  if (!employees.length) return { created: 0, skipped: 0, total: 0 };

  const existing = await optional(
    "salaries",
    supabase.from("salaries").select("employee_id").eq("year", year).eq("month", month),
    []
  );
  const already = new Set(existing.map((r) => r.employee_id));

  const rows = employees
    .filter((e) => !already.has(e.id))
    .map((e) => ({
      employee_id: e.id,
      year,
      month,
      basic: Number(e.monthly_salary) || 0,
      allowances: Number(e.allowances) || 0,
      deductions: 0,
    }));

  if (rows.length) unwrap(await supabase.from("salaries").insert(rows));

  return { created: rows.length, skipped: employees.length - rows.length, total: employees.length };
}

export async function updateSalary(id, values) {
  return unwrap(await supabase.from("salaries").update(values).eq("id", id).select().single());
}

export async function deleteSalary(id) {
  return unwrap(await supabase.from("salaries").delete().eq("id", id));
}

/* --------------------------------------------------------- salary payments */

export async function addSalaryPayment(row) {
  return unwrap(
    await supabase
      .from("salary_payments")
      .insert({
        salary_id: row.salary_id,
        employee_id: row.employee_id,
        amount: Number(row.amount),
        paid_on: row.paid_on,
        method: row.method || "Cash",
        reference: row.reference?.trim() || null,
        paid_by: row.paid_by?.trim() || null,
        notes: row.notes?.trim() || null,
      })
      .select()
      .single()
  );
}

export async function fetchSalaryPayments(salaryId) {
  return optional(
    "salary_payments",
    supabase.from("salary_payments").select("*").eq("salary_id", salaryId).order("paid_on", { ascending: false }),
    []
  );
}

export async function deleteSalaryPayment(id) {
  return unwrap(await supabase.from("salary_payments").delete().eq("id", id));
}

/* -------------------------------------------------------------- aggregates */

/** Month totals for a set of salary slips. */
export function payrollTotals(rows) {
  return rows.reduce(
    (acc, r) => {
      acc.gross += Number(r.basic) + Number(r.allowances);
      acc.deductions += Number(r.deductions) || 0;
      acc.net += Number(r.net_salary) || 0;
      acc.paid += Number(r.paid) || 0;
      acc.remaining += Number(r.remaining) || 0;
      acc.count += 1;
      if (r.status === "Paid") acc.paidCount += 1;
      else if (r.status === "Partial") acc.partialCount += 1;
      else acc.unpaidCount += 1;
      return acc;
    },
    { gross: 0, deductions: 0, net: 0, paid: 0, remaining: 0, count: 0, paidCount: 0, partialCount: 0, unpaidCount: 0 }
  );
}

/** Salary slips grouped by department, for the payroll summary table. */
export function summariseByDepartment(rows) {
  const map = new Map();
  rows.forEach((r) => {
    const key = r.department || "Unassigned";
    if (!map.has(key)) {
      map.set(key, { department: key, count: 0, net: 0, paid: 0, remaining: 0 });
    }
    const d = map.get(key);
    d.count += 1;
    d.net += Number(r.net_salary) || 0;
    d.paid += Number(r.paid) || 0;
    d.remaining += Number(r.remaining) || 0;
  });
  return [...map.values()].sort((a, b) => b.net - a.net);
}
