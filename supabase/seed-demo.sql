-- ============================================================================
-- Kindle Sprout — DEMO DATA (optional)
-- Run in: Supabase Dashboard -> SQL Editor -> New query
--
-- Adds 30 sample students across all nine classes, three months of fee
-- challans, and a realistic spread of full / partial / missing payments so
-- every screen has something to show.
--
-- Every demo student has a roll number starting "KS-D", which makes them easy
-- to spot and easy to remove. To delete all of it later (challans and payments
-- go with them):
--
--     delete from public.students where roll_no like 'KS-D%';
--
-- Safe to run more than once — it will not duplicate anything.
-- ============================================================================

-- ------------------------------------------------------------- 1. students --
insert into public.students
  (full_name, father_name, guardian_name, phone, class_id, roll_no, gender,
   admission_date, status, monthly_fee, discount)
select
  v.full_name,
  v.father,
  -- Guardian is only filled in when it differs from the father; the challan
  -- falls back to the father's name when this is null.
  null,
  v.phone,
  c.id,
  v.roll,
  v.gender,
  current_date - (v.months_enrolled * 30),
  'active',
  v.custom_fee,
  v.discount
from (values
  -- name,               father's name,      phone,            class,       roll,      gender,  months, custom fee, discount
  ('Areeba Khan',        'Imran Khan',       '+92 300 1112201', 'Grade 1',   'KS-D101', 'Female', 14, null,  0),
  ('Hamza Ali',          'Tariq Ali',        '+92 301 1112202', 'Grade 1',   'KS-D102', 'Male',   14, null,  0),
  ('Fatima Noor',        'Noor Ahmed',       '+92 302 1112203', 'Grade 1',   'KS-D103', 'Female', 11, null,  500),
  ('Ibrahim Ahmed',      'Rashid Ahmed',     '+92 303 1112204', 'Grade 1',   'KS-D104', 'Male',    9, null,  0),
  ('Sara Khan',          'Bilal Khan',       '+92 304 1112205', 'Grade 1',   'KS-D105', 'Female',  7, null,  0),

  ('Muhammad Zain',      'Kashif Mehmood',   '+92 305 1112206', 'Grade 2',   'KS-D106', 'Male',   20, null,  0),
  ('Laiba Fatima',       'Adnan Sheikh',     '+92 306 1112207', 'Grade 2',   'KS-D107', 'Female', 18, null,  0),
  ('Abdullah Raza',      'Ali Raza',         '+92 307 1112208', 'Grade 2',   'KS-D108', 'Male',   16, 9000,  0),
  ('Dua Zahra',          'Hassan Abbas',     '+92 308 1112209', 'Grade 2',   'KS-D109', 'Female', 12, null,  0),

  ('Usman Tariq',        'Tariq Javed',      '+92 309 1112210', 'Grade 3',   'KS-D110', 'Male',   24, null,  0),
  ('Ayesha Siddiqui',    'Farhan Siddiqui',  '+92 310 1112211', 'Grade 3',   'KS-D111', 'Female', 22, null,  1000),
  ('Bilal Hussain',      'Nadeem Hussain',   '+92 311 1112212', 'Grade 3',   'KS-D112', 'Male',   19, null,  0),

  ('Maryam Iqbal',       'Zafar Iqbal',      '+92 312 1112213', 'Grade 4',   'KS-D113', 'Female', 27, null,  0),
  ('Ahmed Hassan',       'Sohail Hassan',    '+92 313 1112214', 'Grade 4',   'KS-D114', 'Male',   25, null,  0),
  ('Zoya Malik',         'Asif Malik',       '+92 314 1112215', 'Grade 4',   'KS-D115', 'Female', 21, null,  0),

  ('Hassan Javed',       'Javed Akhtar',     '+92 315 1112216', 'Grade 5',   'KS-D116', 'Male',   33, null,  0),
  ('Eman Shah',          'Syed Kamran Shah', '+92 316 1112217', 'Grade 5',   'KS-D117', 'Female', 31, null,  0),
  ('Ali Hamza',          'Shahid Mahmood',   '+92 317 1112218', 'Grade 5',   'KS-D118', 'Male',   28, null,  1500),

  ('Aiza Rehman',        'Atif Rehman',      '+92 318 1112219', 'KG',        'KS-D119', 'Female',  8, null,  0),
  ('Musa Anwar',         'Anwar Baig',       '+92 319 1112220', 'KG',        'KS-D120', 'Male',    8, null,  0),
  ('Hoorain Asad',       'Asad Ullah',       '+92 320 1112221', 'KG',        'KS-D121', 'Female',  6, null,  0),

  ('Zain Abbas',         'Ghulam Abbas',     '+92 321 1112222', 'Nursery',   'KS-D122', 'Male',    5, null,  0),
  ('Khadija Yousaf',     'Yousaf Ali',       '+92 322 1112223', 'Nursery',   'KS-D123', 'Female',  5, null,  0),
  ('Rayyan Saeed',       'Saeed Akhtar',     '+92 323 1112224', 'Nursery',   'KS-D124', 'Male',    4, null,  0),

  ('Inaya Waheed',       'Waheed Murtaza',   '+92 324 1112225', 'Playgroup', 'KS-D125', 'Female',  4, null,  0),
  ('Ahmad Shakeel',      'Shakeel Ahmed',    '+92 325 1112226', 'Playgroup', 'KS-D126', 'Male',    3, null,  0),
  ('Mahnoor Faisal',     'Faisal Rehman',    '+92 326 1112227', 'Playgroup', 'KS-D127', 'Female',  3, 9500,  0),

  ('Yahya Naveed',       'Naveed Aslam',     '+92 327 1112228', 'Daycare',   'KS-D128', 'Male',    3, null,  0),
  ('Alishba Kamran',     'Kamran Akmal',     '+92 328 1112229', 'Daycare',   'KS-D129', 'Female',  2, null,  0),
  ('Ibrahim Saqib',      'Saqib Nisar',      '+92 329 1112230', 'Daycare',   'KS-D130', 'Male',    2, null,  2000)
) as v(full_name, father, phone, class_name, roll, gender, months_enrolled, custom_fee, discount)
join public.classes c on c.name = v.class_name
where not exists (select 1 from public.students s where s.roll_no = v.roll);

-- A few children are collected by someone other than the father.
update public.students set guardian_name = 'Nasreen Bibi (Mother)'   where roll_no = 'KS-D103';
update public.students set guardian_name = 'Kamran Shah (Uncle)'     where roll_no = 'KS-D117';
update public.students set guardian_name = 'Saima Kamran (Mother)'   where roll_no = 'KS-D129';

-- ------------------------------------------------------------- 2. challans --
-- One challan per demo student for this month and the two before it.
do $seed$
declare
  d date;
  i int;
begin
  for i in 0..2 loop
    d := (date_trunc('month', current_date) - (i || ' month')::interval)::date;

    insert into public.challans (student_id, class_id, year, month, total_fee, discount, due_date)
    select
      s.id,
      s.class_id,
      extract(year  from d)::int,
      extract(month from d)::int,
      coalesce(s.monthly_fee, c.monthly_fee, 0),
      s.discount,
      d + 9
    from public.students s
    join public.classes c on c.id = s.class_id
    where s.status = 'active'
      and s.roll_no like 'KS-D%'
    on conflict (student_id, year, month) do nothing;
  end loop;
end $seed$;

-- ------------------------------------------------------------- 3. payments --
-- Older months are mostly settled; the current month is a mix of paid,
-- part-paid and not-yet-paid, so the dashboard and reports look realistic.
insert into public.payments (challan_id, student_id, amount, paid_on, method, received_by, reference)
select
  r.id,
  r.student_id,
  case when r.bucket = 1 then round(r.payable * 0.5) else r.payable end,
  least(r.period_start + (4 + r.bucket * 3), current_date),
  case r.bucket when 1 then 'Bank Transfer' when 3 then 'Bank Transfer' else 'Cash' end,
  case r.bucket when 0 then 'Front Desk' else 'Accounts' end,
  case when r.bucket in (1, 3) then 'TRX-' || lpad((r.rn * 7919 % 99999)::text, 5, '0') else null end
from (
  select
    d.id,
    d.student_id,
    d.payable,
    make_date(d.year, d.month, 1) as period_start,
    -- row_number() is bigint; date arithmetic below needs a plain integer.
    (row_number() over (order by d.student_id, d.year, d.month))::int     as rn,
    (row_number() over (order by d.student_id, d.year, d.month) % 4)::int as bucket
  from public.challan_details d
  join public.students s on s.id = d.student_id
  where s.roll_no like 'KS-D%'
) r
where not exists (select 1 from public.payments p where p.challan_id = r.id)
  -- bucket 0 in the current month stays unpaid, and bucket 1 stays half paid
  and not (r.period_start = date_trunc('month', current_date)::date and r.bucket = 0);

-- ---------------------------------------------------------------- summary --
select
  (select count(*) from public.students where roll_no like 'KS-D%') as demo_students,
  (select count(*) from public.challans c
     join public.students s on s.id = c.student_id
    where s.roll_no like 'KS-D%')                                   as demo_challans,
  (select count(*) from public.payments p
     join public.students s on s.id = p.student_id
    where s.roll_no like 'KS-D%')                                   as demo_payments;
