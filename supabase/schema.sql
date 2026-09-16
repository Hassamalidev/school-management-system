-- ============================================================================
-- Kindle Sprout Daycare & School — Student Management System
-- Run this whole file once in: Supabase Dashboard -> SQL Editor -> New query
-- Safe to re-run (idempotent).
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- classes --
create table if not exists public.classes (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  monthly_fee numeric(12,2) not null default 0,
  annual_fee  numeric(12,2) not null default 0,
  sort_order  int  not null default 0,
  color       text not null default 'sky',
  created_at  timestamptz not null default now()
);

-- --------------------------------------------------------------- students --
create table if not exists public.students (
  id             uuid primary key default gen_random_uuid(),
  full_name      text not null,
  father_name    text,
  guardian_name  text,
  phone          text,
  class_id       uuid references public.classes(id) on delete set null,
  roll_no        text,
  gender         text,
  date_of_birth  date,
  admission_date date not null default current_date,
  address        text,
  -- optional per-student override; when null the class monthly_fee is used
  monthly_fee    numeric(12,2),
  discount       numeric(12,2) not null default 0,
  status         text not null default 'active' check (status in ('active','inactive')),
  notes          text,
  created_at     timestamptz not null default now()
);
create index if not exists students_class_idx  on public.students(class_id);
create index if not exists students_status_idx on public.students(status);

-- Columns added after the first release. `create table if not exists` above is a
-- no-op on an existing database, so new columns need an explicit alter to keep
-- this whole file re-runnable.
alter table public.students add column if not exists father_name text;

-- --------------------------------------------------------------- challans --
-- One fee challan per student per month.
create sequence if not exists public.receipt_seq start 1000;

create table if not exists public.challans (
  id          uuid primary key default gen_random_uuid(),
  receipt_no  text not null unique,
  student_id  uuid not null references public.students(id) on delete cascade,
  class_id    uuid references public.classes(id) on delete set null,
  year        int  not null,
  month       int  not null check (month between 1 and 12),
  total_fee   numeric(12,2) not null default 0,
  discount    numeric(12,2) not null default 0,
  due_date    date,
  notes       text,
  -- 'monthly' is the normal fee challan; 'admission' is the one-off joining
  -- challan (admission + development + registration), priced by hand.
  kind        text not null default 'monthly' check (kind in ('monthly','admission')),
  created_at  timestamptz not null default now()
);
alter table public.challans add column if not exists kind text not null default 'monthly';
do $k$ begin
  alter table public.challans add constraint challans_kind_check check (kind in ('monthly','admission'));
exception when duplicate_object then null; end $k$;

-- A student gets one monthly challan per month, and separately one admission
-- challan; the old three-column constraint is replaced by this.
alter table public.challans drop constraint if exists challans_student_id_year_month_key;
create unique index if not exists challans_student_period_kind_uidx
  on public.challans(student_id, year, month, kind);

create index if not exists challans_period_idx on public.challans(year, month);
create index if not exists challans_class_idx  on public.challans(class_id);

create or replace function public.set_receipt_no()
returns trigger language plpgsql as $fn$
begin
  if new.receipt_no is null or new.receipt_no = '' then
    new.receipt_no := case when new.kind = 'admission' then 'KS-ADM-' else 'KS-' end
                   || new.year::text
                   || lpad(new.month::text, 2, '0') || '-'
                   || nextval('public.receipt_seq')::text;
  end if;
  return new;
end $fn$;

drop trigger if exists challans_receipt_no on public.challans;
create trigger challans_receipt_no before insert on public.challans
  for each row execute function public.set_receipt_no();

-- -------------------------------------------------------------- fee heads --
-- Every chargeable item other than plain monthly tuition: admission fee,
-- registration fee, development fee, exam fee and anything the school adds
-- later. `frequency` decides which challans it lands on:
--   monthly  -> every challan
--   one_time -> only the student's very first challan (admission, registration)
--   annual   -> the student's first challan of each calendar year
create table if not exists public.fee_heads (
  id             uuid primary key default gen_random_uuid(),
  name           text not null unique,
  frequency      text not null default 'monthly'
                 check (frequency in ('monthly','one_time','annual')),
  default_amount numeric(12,2) not null default 0,
  sort_order     int  not null default 0,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now()
);

-- Per-class amount for a head. A missing row means "use default_amount".
create table if not exists public.class_fees (
  class_id uuid not null references public.classes(id)   on delete cascade,
  head_id  uuid not null references public.fee_heads(id) on delete cascade,
  amount   numeric(12,2) not null default 0,
  primary key (class_id, head_id)
);

-- The itemised lines of one challan, snapshotted at generation time so that
-- later edits to the fee structure never rewrite an already-issued challan.
create table if not exists public.challan_items (
  id         uuid primary key default gen_random_uuid(),
  challan_id uuid not null references public.challans(id) on delete cascade,
  name       text not null,
  frequency  text not null default 'monthly',
  amount     numeric(12,2) not null default 0,
  sort_order int  not null default 0
);
create index if not exists challan_items_challan_idx on public.challan_items(challan_id);

-- --------------------------------------------------------------- payments --
create table if not exists public.payments (
  id          uuid primary key default gen_random_uuid(),
  challan_id  uuid not null references public.challans(id) on delete cascade,
  student_id  uuid not null references public.students(id) on delete cascade,
  amount      numeric(12,2) not null check (amount > 0),
  paid_on     date not null default current_date,
  method      text not null default 'Cash' check (method in ('Cash','Bank Transfer','Other')),
  reference   text,
  received_by text,
  notes       text,
  created_at  timestamptz not null default now()
);
create index if not exists payments_challan_idx on public.payments(challan_id);
create index if not exists payments_student_idx on public.payments(student_id);
create index if not exists payments_date_idx    on public.payments(paid_on);

-- -------------------------------------------------------------- employees --
create sequence if not exists public.employee_seq start 100;
create sequence if not exists public.salary_seq   start 1000;

create table if not exists public.employees (
  id              uuid primary key default gen_random_uuid(),
  employee_code   text not null unique,
  full_name       text not null,
  father_name     text,
  cnic            text,
  designation     text,
  department      text not null default 'Teaching'
                  check (department in ('Teaching','Administration','Daycare','Support','Management')),
  employment_type text not null default 'Full time'
                  check (employment_type in ('Full time','Part time','Contract','Intern')),
  phone           text,
  email           text,
  address         text,
  gender          text,
  date_of_birth   date,
  joining_date    date not null default current_date,
  monthly_salary  numeric(12,2) not null default 0,
  allowances      numeric(12,2) not null default 0,
  bank_name       text,
  account_number  text,
  status          text not null default 'active' check (status in ('active','inactive')),
  notes           text,
  created_at      timestamptz not null default now()
);
create index if not exists employees_dept_idx   on public.employees(department);
create index if not exists employees_status_idx on public.employees(status);

create or replace function public.set_employee_code()
returns trigger language plpgsql as $ec$
begin
  if new.employee_code is null or new.employee_code = '' then
    new.employee_code := 'KS-EMP-' || lpad(nextval('public.employee_seq')::text, 3, '0');
  end if;
  return new;
end $ec$;

drop trigger if exists employees_code on public.employees;
create trigger employees_code before insert on public.employees
  for each row execute function public.set_employee_code();

-- One salary record per employee per month, mirroring how challans work.
create table if not exists public.salaries (
  id          uuid primary key default gen_random_uuid(),
  slip_no     text not null unique,
  employee_id uuid not null references public.employees(id) on delete cascade,
  year        int  not null,
  month       int  not null check (month between 1 and 12),
  basic       numeric(12,2) not null default 0,
  allowances  numeric(12,2) not null default 0,
  deductions  numeric(12,2) not null default 0,
  deduction_note text,
  notes       text,
  created_at  timestamptz not null default now(),
  unique (employee_id, year, month)
);
create index if not exists salaries_period_idx on public.salaries(year, month);

create or replace function public.set_slip_no()
returns trigger language plpgsql as $sn$
begin
  if new.slip_no is null or new.slip_no = '' then
    new.slip_no := 'KS-SAL-' || new.year::text
                || lpad(new.month::text, 2, '0') || '-'
                || nextval('public.salary_seq')::text;
  end if;
  return new;
end $sn$;

drop trigger if exists salaries_slip_no on public.salaries;
create trigger salaries_slip_no before insert on public.salaries
  for each row execute function public.set_slip_no();

-- Many payments per salary, so part payments and advances work.
create table if not exists public.salary_payments (
  id          uuid primary key default gen_random_uuid(),
  salary_id   uuid not null references public.salaries(id)  on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  amount      numeric(12,2) not null check (amount > 0),
  paid_on     date not null default current_date,
  method      text not null default 'Cash' check (method in ('Cash','Bank Transfer','Other')),
  reference   text,
  paid_by     text,
  notes       text,
  created_at  timestamptz not null default now()
);
create index if not exists salary_payments_salary_idx on public.salary_payments(salary_id);
create index if not exists salary_payments_date_idx   on public.salary_payments(paid_on);

-- --------------------------------------------------------------- settings --
create table if not exists public.settings (
  id             int primary key default 1 check (id = 1),
  school_name    text not null default 'Kindle Sprout Daycare & School',
  tagline        text not null default 'Learn  |  Grow  |  Shine',
  phone          text not null default '+92 312 3177778',
  address        text not null default 'Service road South G-12/1, Islamabad (Opposite to metro bus station)',
  instagram      text default 'kindlesprout',
  facebook       text default 'Kindle Sprout Daycare and School',
  bank_title     text default 'JIBRAN SULEMAN',
  bank_name      text default 'Meezan Bank - G-13 BR-ISLAMABAD',
  account_number text default '03200109242922',
  iban           text default 'PK32MEZN0003200109242922',
  due_day        int  not null default 10,
  updated_at     timestamptz not null default now()
);
insert into public.settings (id) values (1) on conflict (id) do nothing;

-- ------------------------------------------------------------------ views --
-- Dropped first: `create or replace view` refuses to add a column anywhere but
-- the end, and these views hold no data of their own.
drop view if exists public.student_balances;
drop view if exists public.challan_details;
drop view if exists public.salary_details;

-- Everything the UI needs about a challan: paid, remaining and status.
create view public.challan_details as
select
  c.id,
  c.receipt_no,
  c.student_id,
  c.class_id,
  c.year,
  c.month,
  c.total_fee,
  c.discount,
  c.due_date,
  c.notes,
  c.kind,
  c.created_at,
  s.full_name     as student_name,
  s.father_name,
  s.guardian_name,
  s.phone,
  s.roll_no,
  s.admission_date,
  s.address,
  s.gender,
  cl.name         as class_name,
  cl.sort_order   as class_sort_order,
  (c.total_fee - c.discount)                          as payable,
  coalesce(p.paid, 0)                                 as paid,
  (c.total_fee - c.discount) - coalesce(p.paid, 0)    as remaining,
  case
    when coalesce(p.paid, 0) >= (c.total_fee - c.discount) then 'Paid'
    when coalesce(p.paid, 0) > 0 then 'Partial'
    else 'Unpaid'
  end                                                 as status,
  p.last_paid_on,
  p.methods
from public.challans c
join public.students s on s.id = c.student_id
left join public.classes cl on cl.id = c.class_id
left join lateral (
  select sum(amount) as paid,
         max(paid_on) as last_paid_on,
         string_agg(distinct method, ', ') as methods
  from public.payments where challan_id = c.id
) p on true;

-- Per-student lifetime position (all months combined).
create view public.student_balances as
select
  s.id             as student_id,
  s.full_name,
  s.father_name,
  s.class_id,
  cl.name          as class_name,
  s.status,
  coalesce(t.billed, 0)                       as total_billed,
  coalesce(t.paid, 0)                         as total_paid,
  coalesce(t.billed, 0) - coalesce(t.paid, 0) as total_remaining,
  coalesce(t.months_billed, 0)                as months_billed,
  coalesce(t.months_unpaid, 0)                as months_unpaid
from public.students s
left join public.classes cl on cl.id = s.class_id
left join lateral (
  select
    sum(d.payable)                             as billed,
    sum(d.paid)                                as paid,
    count(*)                                   as months_billed,
    count(*) filter (where d.status <> 'Paid') as months_unpaid
  from public.challan_details d where d.student_id = s.id
) t on true;

-- Payroll counterpart of challan_details: paid, remaining and status per slip.
create view public.salary_details as
select
  s.id,
  s.slip_no,
  s.employee_id,
  s.year,
  s.month,
  s.basic,
  s.allowances,
  s.deductions,
  s.deduction_note,
  s.notes,
  s.created_at,
  e.employee_code,
  e.full_name      as employee_name,
  e.father_name,
  e.designation,
  e.department,
  e.employment_type,
  e.phone,
  e.cnic,
  e.joining_date,
  e.bank_name,
  e.account_number,
  (s.basic + s.allowances - s.deductions)                        as net_salary,
  coalesce(p.paid, 0)                                            as paid,
  (s.basic + s.allowances - s.deductions) - coalesce(p.paid, 0)  as remaining,
  case
    when coalesce(p.paid, 0) >= (s.basic + s.allowances - s.deductions) then 'Paid'
    when coalesce(p.paid, 0) > 0 then 'Partial'
    else 'Unpaid'
  end                                                            as status,
  p.last_paid_on,
  p.methods
from public.salaries s
join public.employees e on e.id = s.employee_id
left join lateral (
  select sum(amount) as paid,
         max(paid_on) as last_paid_on,
         string_agg(distinct method, ', ') as methods
  from public.salary_payments where salary_id = s.id
) p on true;

-- ------------------------------------------------------------------- RLS --
alter table public.employees       enable row level security;
alter table public.salaries        enable row level security;
alter table public.salary_payments enable row level security;
alter table public.classes       enable row level security;
alter table public.fee_heads     enable row level security;
alter table public.class_fees    enable row level security;
alter table public.challan_items enable row level security;
alter table public.students enable row level security;
alter table public.challans enable row level security;
alter table public.payments enable row level security;
alter table public.settings enable row level security;

-- Any signed-in staff account gets full access; anonymous visitors get nothing.
do $rls$
declare t text;
begin
  foreach t in array array['classes','fee_heads','class_fees','challan_items',
                           'students','challans','payments','settings',
                           'employees','salaries','salary_payments'] loop
    execute format('drop policy if exists %I on public.%I', t || '_authenticated_all', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (true) with check (true)',
      t || '_authenticated_all', t);
  end loop;
end $rls$;

-- Views run with the caller's permissions so the RLS above applies to them too.
alter view public.challan_details  set (security_invoker = on);
alter view public.salary_details   set (security_invoker = on);
alter view public.student_balances set (security_invoker = on);

grant usage on schema public to authenticated;
grant select, insert, update, delete
  on public.classes, public.fee_heads, public.class_fees, public.challan_items,
     public.students, public.challans, public.payments, public.settings,
     public.employees, public.salaries, public.salary_payments
  to authenticated;
grant select on public.challan_details, public.student_balances, public.salary_details
  to authenticated;
-- The receipt-number trigger calls nextval() as the signed-in user.
grant usage, select on sequence public.receipt_seq  to authenticated;
grant usage, select on sequence public.employee_seq to authenticated;
grant usage, select on sequence public.salary_seq   to authenticated;

-- --------------------------------------------------------------- seeding --
-- Classes, priced from the school's printed "Fee Structure for Admission".
-- Montessori through Grade V share one structure; Daycare has its own.
insert into public.classes (name, monthly_fee, annual_fee, sort_order, color) values
  ('Daycare',   15000, 180000, 1, 'sky'),
  ('Playgroup', 10000, 120000, 2, 'rose'),
  ('Nursery',   10000, 120000, 3, 'green'),
  ('KG',        10000, 120000, 4, 'amber'),
  ('Grade 1',   10000, 120000, 5, 'violet'),
  ('Grade 2',   10000, 120000, 6, 'teal'),
  ('Grade 3',   10000, 120000, 7, 'orange'),
  ('Grade 4',   10000, 120000, 8, 'purple'),
  ('Grade 5',   10000, 120000, 9, 'blue')
on conflict (name) do nothing;

-- Bring an existing database in line with the printed sheet. Comment this
-- block out if the fees have since been edited in the app and should be kept.
update public.classes set monthly_fee = 15000 where name = 'Daycare'   and monthly_fee = 12000;
update public.classes set monthly_fee = 10000
  where name in ('Playgroup','Nursery','KG','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5')
    and monthly_fee in (10500, 11000, 12000);

-- The three one-off joining charges. They are NOT added to monthly challans:
-- they make up the separate admission challan, which the office prices by hand.
insert into public.fee_heads (name, frequency, default_amount, sort_order) values
  ('Admission Fee',           'one_time', 12000, 1),
  ('Student Development Fee', 'one_time',  5000, 2),
  ('Registration Fee',        'one_time',  5000, 3)
on conflict (name) do nothing;

-- Tidy up earlier defaults so only the three real heads stay in play.
update public.fee_heads set default_amount = 12000 where name = 'Admission Fee';
update public.fee_heads set default_amount =  5000 where name = 'Student Development Fee';
update public.fee_heads set default_amount =  5000, frequency = 'one_time' where name = 'Registration Fee';
update public.fee_heads set is_active = false
  where name in ('Development Fee', 'Examination Fee', 'Activity Fee', 'Stationery Fee');

-- Daycare joins on Registration only — no admission or development fee.
insert into public.class_fees (class_id, head_id, amount)
select c.id, h.id,
       case when h.name = 'Registration Fee' then 5000 else 0 end
from public.classes c
join public.fee_heads h on h.name in ('Admission Fee', 'Student Development Fee', 'Registration Fee')
where c.name = 'Daycare'
on conflict (class_id, head_id) do update set amount = excluded.amount;
