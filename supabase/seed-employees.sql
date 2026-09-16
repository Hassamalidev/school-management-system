-- ============================================================================
-- Kindle Sprout — DEMO STAFF & PAYROLL (optional)
-- Run in: Supabase Dashboard -> SQL Editor -> New query
-- Run supabase/schema.sql FIRST, so the employees tables exist.
--
-- Adds 14 employees across every department, three months of salary slips, and
-- a realistic mix of paid / part-paid / unpaid so the payroll and expenditure
-- screens have something to show.
--
-- Every demo employee has an ID in the KS-EMP-9xx range. To remove all of it
-- later (salary slips and payments go with them):
--
--     delete from public.employees where employee_code like 'KS-EMP-9%';
--
-- Safe to run more than once — it will not duplicate anything.
-- ============================================================================

-- ------------------------------------------------------------ 1. employees --
insert into public.employees
  (employee_code, full_name, father_name, cnic, designation, department, employment_type,
   phone, email, gender, joining_date, monthly_salary, allowances, bank_name, account_number, status)
select
  v.code, v.name, v.father, v.cnic, v.designation, v.department, v.emp_type,
  v.phone, v.email, v.gender,
  current_date - (v.months_served * 30),
  v.salary, v.allowance, 'Meezan Bank', v.account, 'active'
from (values
  -- code,          name,                father,             cnic,                designation,           department,       type,        phone,             email,                        gender,   months, salary, allow, account
  ('KS-EMP-901', 'Jibran Suleman',    'Suleman Ahmed',    '61101-1000001-1', 'Principal',            'Management',     'Full time', '+92 312 3177778', 'principal@kindlesprout.pk',  'Male',      60, 120000, 15000, '03200109242922'),
  ('KS-EMP-902', 'Nadia Farooq',      'Farooq Ahmed',     '61101-1000002-2', 'Vice Principal',       'Management',     'Full time', '+92 300 4000902', 'nadia@kindlesprout.pk',      'Female',    44,  90000, 10000, '03200109240902'),
  ('KS-EMP-903', 'Sara Ahmed',        'Ahmed Raza',       '61101-1000003-3', 'Senior Class Teacher', 'Teaching',       'Full time', '+92 300 4000903', 'sara@kindlesprout.pk',       'Female',    38,  55000,  5000, '03200109240903'),
  ('KS-EMP-904', 'Hina Aslam',        'Aslam Khan',       '61101-1000004-4', 'Class Teacher',        'Teaching',       'Full time', '+92 300 4000904', 'hina@kindlesprout.pk',       'Female',    30,  45000,  5000, '03200109240904'),
  ('KS-EMP-905', 'Ayesha Tariq',      'Tariq Mehmood',    '61101-1000005-5', 'Class Teacher',        'Teaching',       'Full time', '+92 300 4000905', 'ayesha@kindlesprout.pk',     'Female',    24,  42000,  3000, '03200109240905'),
  ('KS-EMP-906', 'Maria Yousaf',      'Yousaf Ali',       '61101-1000006-6', 'Montessori Teacher',   'Teaching',       'Full time', '+92 300 4000906', 'maria@kindlesprout.pk',      'Female',    18,  40000,  3000, '03200109240906'),
  ('KS-EMP-907', 'Rabia Noor',        'Noor Hussain',     '61101-1000007-7', 'Assistant Teacher',    'Teaching',       'Part time', '+92 300 4000907', 'rabia@kindlesprout.pk',      'Female',    12,  25000,  2000, '03200109240907'),
  ('KS-EMP-908', 'Fouzia Bibi',       'Ghulam Rasool',    '61101-1000008-8', 'Daycare Incharge',     'Daycare',        'Full time', '+92 300 4000908', 'fouzia@kindlesprout.pk',     'Female',    33,  38000,  3000, '03200109240908'),
  ('KS-EMP-909', 'Shazia Parveen',    'Muhammad Akram',   '61101-1000009-9', 'Daycare Attendant',    'Daycare',        'Full time', '+92 300 4000909', null,                         'Female',    20,  30000,  2000, '03200109240909'),
  ('KS-EMP-910', 'Kiran Shahzad',     'Shahzad Ali',      '61101-1000010-1', 'Daycare Attendant',    'Daycare',        'Full time', '+92 300 4000910', null,                         'Female',     9,  28000,  2000, '03200109240910'),
  ('KS-EMP-911', 'Usman Ghani',       'Abdul Ghani',      '61101-1000011-2', 'Accountant',           'Administration', 'Full time', '+92 300 4000911', 'accounts@kindlesprout.pk',   'Male',      27,  50000,  5000, '03200109240911'),
  ('KS-EMP-912', 'Mehwish Iqbal',     'Iqbal Hussain',    '61101-1000012-3', 'Receptionist',         'Administration', 'Full time', '+92 300 4000912', 'office@kindlesprout.pk',     'Female',    15,  30000,  2000, '03200109240912'),
  ('KS-EMP-913', 'Muhammad Riaz',     'Allah Ditta',      '61101-1000013-4', 'Security Guard',       'Support',        'Full time', '+92 300 4000913', null,                         'Male',      21,  25000,     0, '03200109240913'),
  ('KS-EMP-914', 'Nasreen Akhtar',    'Akhtar Ali',       '61101-1000014-5', 'Housekeeping',         'Support',        'Full time', '+92 300 4000914', null,                         'Female',    16,  22000,     0, '03200109240914')
) as v(code, name, father, cnic, designation, department, emp_type, phone, email, gender,
       months_served, salary, allowance, account)
where not exists (select 1 from public.employees e where e.employee_code = v.code);

-- ------------------------------------------------------------- 2. payroll --
-- A salary slip per demo employee for this month and the two before it.
do $seed$
declare
  d date;
  i int;
begin
  for i in 0..2 loop
    d := (date_trunc('month', current_date) - (i || ' month')::interval)::date;

    insert into public.salaries (employee_id, year, month, basic, allowances, deductions)
    select
      e.id,
      extract(year  from d)::int,
      extract(month from d)::int,
      e.monthly_salary,
      e.allowances,
      0
    from public.employees e
    where e.status = 'active'
      and e.employee_code like 'KS-EMP-9%'
    on conflict (employee_id, year, month) do nothing;
  end loop;
end $seed$;

-- A couple of deductions, so the column is not uniformly zero.
update public.salaries s
   set deductions = 2500, deduction_note = '2 days unpaid leave'
  from public.employees e
 where e.id = s.employee_id
   and e.employee_code = 'KS-EMP-905'
   and s.year  = extract(year  from current_date)::int
   and s.month = extract(month from current_date)::int
   and s.deductions = 0;

update public.salaries s
   set deductions = 1500, deduction_note = 'Advance adjustment'
  from public.employees e
 where e.id = s.employee_id
   and e.employee_code = 'KS-EMP-909'
   and s.year  = extract(year  from current_date)::int
   and s.month = extract(month from current_date)::int
   and s.deductions = 0;

-- ------------------------------------------------------------ 3. payments --
-- Past months are settled in full; the current month is a mix, so the payroll
-- screen shows Paid, Partial and Unpaid side by side.
insert into public.salary_payments (salary_id, employee_id, amount, paid_on, method, paid_by, reference)
select
  r.id,
  r.employee_id,
  case when r.bucket = 1 then round(r.net_salary * 0.6) else r.net_salary end,
  least(r.period_start + 28, current_date),
  case when r.bucket = 2 then 'Cash' else 'Bank Transfer' end,
  'Accounts',
  case when r.bucket <> 2 then 'SAL-' || lpad((r.rn * 6577 % 99999)::text, 5, '0') else null end
from (
  select
    d.id,
    d.employee_id,
    d.net_salary,
    make_date(d.year, d.month, 1) as period_start,
    -- row_number() is bigint; the date arithmetic above needs a plain integer.
    (row_number() over (order by d.employee_id, d.year, d.month))::int     as rn,
    (row_number() over (order by d.employee_id, d.year, d.month) % 4)::int as bucket
  from public.salary_details d
  join public.employees e on e.id = d.employee_id
  where e.employee_code like 'KS-EMP-9%'
    and d.net_salary > 0
) r
where not exists (select 1 from public.salary_payments p where p.salary_id = r.id)
  -- in the current month, bucket 0 goes unpaid and bucket 1 is part paid
  and not (r.period_start = date_trunc('month', current_date)::date and r.bucket = 0);

-- ---------------------------------------------------------------- summary --
select
  (select count(*) from public.employees where employee_code like 'KS-EMP-9%')            as demo_employees,
  (select count(*) from public.salaries s
     join public.employees e on e.id = s.employee_id
    where e.employee_code like 'KS-EMP-9%')                                                as salary_slips,
  (select count(*) from public.salary_payments p
     join public.employees e on e.id = p.employee_id
    where e.employee_code like 'KS-EMP-9%')                                                as payments_made,
  (select coalesce(sum(d.net_salary), 0) from public.salary_details d
     join public.employees e on e.id = d.employee_id
    where e.employee_code like 'KS-EMP-9%'
      and d.year = extract(year from current_date)::int
      and d.month = extract(month from current_date)::int)                                 as this_month_payroll;
