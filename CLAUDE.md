# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

A student & fee management system for **Kindle Sprout Daycare & School**
(Service road South G-12/1, Islamabad). One admin/office user signs in and
manages student records, the per-class fee structure, monthly fee challans, and
payments. Every challan shows **total fee, paid, remaining and status**, and can
be printed or downloaded as a PDF.

## Stack

| Layer    | Choice                                                      |
| -------- | ----------------------------------------------------------- |
| Framework| Next.js 14, App Router, **JavaScript** (no TypeScript)       |
| UI       | Tailwind CSS 3 + `lucide-react` icons                        |
| Data     | Supabase (Postgres + Auth), accessed from the browser        |
| PDF      | `jspdf`, drawn with the vector API (no html2canvas)          |
| Deploy   | Vercel, zero-config                                          |

Everything runs client-side against Supabase. There are no API routes, no server
actions and no server-side secrets — which is exactly why it deploys to Vercel's
free tier without configuration.

## Layout

```
src/
  app/
    layout.js              root layout: AuthProvider + ToastProvider
    page.js                redirects to /dashboard
    login/page.js          email + password sign-in
    (app)/
      layout.js            wraps every signed-in page in <Shell>
      dashboard/           month overview, class breakdown, recent payments
      students/            student CRUD + per-student month-by-month history
      fee-structure/       class CRUD, monthly/annual fee
      challans/            generate, preview, print, PDF, record payment
      admission/           blank joining-challan template (prints only)
      admission-form/      the two-page Student Admission Form (PDF only)
      payments/            payment history, filters, CSV export
      employees/           staff records + per-employee salary history
      payroll/             monthly salary slips, payments, expenditure
      reports/             income vs expenditure, collection by class, defaulters
      settings/            school + bank details, password change
  components/
    AuthProvider.jsx       Supabase session in React context
    Shell.jsx              sidebar + topbar + auth guard
    Challan.jsx            the printable challan/receipt
    FeeHeadsCard.jsx       manage fee heads and their per-class amounts
    PaymentModal.jsx       record a payment against one month's challan
    SalaryPaymentModal.jsx record a payment against one month's salary
    SendChallanModal.jsx   walks the office through WhatsApp-ing challans
    PeriodPicker.jsx       month + year selector
    Logo.jsx               the school crest (prefers public/logo.png)
    ui.jsx                 Modal, Toast, StatCard, PageHeader, Confirm, …
  lib/
    supabase.js            browser client singleton
    db.js                  every Supabase query lives here
    format.js              currency, dates, CSV download
    pdf.js                 challan PDF generation
    salaryPdf.js           salary slip PDF generation
    logoSvg.js             the crest as SVG markup — the one source of truth
    logoImage.js           that crest as a PNG data URL for the PDF writers
    admissionFormPdf.js    the Student Admission Form, drawn as a 2-page PDF
    whatsapp.js            phone normalising + the challan message text
supabase/
  schema.sql               tables, views, RLS, seed classes — run once
```

## Conventions

- **All database access goes through `src/lib/db.js`.** Pages import functions
  from it; they never call `supabase.from(...)` directly. Add new queries there.
- Pages are `"use client"` components that load data in a `useCallback` +
  `useEffect` pair and surface failures through `useToast()`.
- Money is stored as `numeric` and always rendered with `num()` / `pkr()` from
  `lib/format.js`. Never hand-format an amount.
- Tailwind component classes (`.card`, `.input`, `.btn-primary`, `.th`, `.td`,
  `.chip`) are defined in `src/app/globals.css`. Reuse them instead of
  re-spelling long class strings.
- Anything that must not appear on paper gets `no-print`; the challan markup to
  be printed sits inside `.print-area`.
- **Data tables carry `stack-table` and every `<td>` a `data-label`.** Below
  `sm` the stylesheet hides the header row and lays each record out as a card,
  with the cell showing its column name from that attribute. A cell with no
  `data-label` (checkbox, row number, action buttons) renders bare. Adding a
  column means adding its `data-label` to the matching cell — and note that a
  self-closing `<th ... />` spacer still counts as a column when lining the two
  up.
- Inputs are `text-base` below `sm` so iOS does not zoom in on focus; icon-only
  buttons use `.icon-btn`, which is a 44px touch target on phones.
- **The logo lives once, in `lib/logoSvg.js`.** `<Logo>` renders that markup,
  `lib/logoImage.js` rasterises it through a canvas into the PNG data URL the
  jsPDF writers need, and `app/icon.svg` is a copy of it for the browser tab.
  If a raster original is dropped in at `public/logo.png` it wins everywhere
  automatically — `<Logo>` probes it once per page and `logoDataUrl()` prefers
  it — so no code changes when the artwork arrives. Regenerate the favicon after
  editing the crest; it is a plain copy of the string.

## Data model

- `classes` — name, `monthly_fee`, `annual_fee`, `sort_order`, `color`.
- `students` — `class_id`, `father_name`, `guardian_name`, phone, status, and
  optional `monthly_fee` (overrides the class fee) and `discount`.
  `father_name` is the primary parent field and appears on the challan;
  `guardian_name` is only filled in when the day-to-day guardian differs, and
  the challan's "Received From" line falls back to the father.
- `fee_heads` — everything charged besides monthly tuition. `frequency` is
  `monthly`, `annual` (first challan of each calendar year) or `one_time`.
  **One-time heads never land on a monthly challan.** They are the joining
  charges — admission, student development, registration — and they fill the
  Admission Challan template.
- `class_fees` — per-class amount for a head. No row means "use
  `default_amount`"; `feeFor()` in `db.js` resolves it. An amount of 0 means
  the head is skipped for that class.
- `challans` — one row per student per `(year, month, kind)`. `receipt_no` is
  set by a trigger as `KS-YYYYMM-<seq>`. Every stored challan is currently
  `kind = 'monthly'`; the column exists because the challan renderers switch on
  it, and it leaves room to store admission challans later.
- `challan_items` — the itemised lines of a challan, written at generation
  time. They are a *snapshot*: editing the fee structure later never rewrites
  an issued challan. `challans.total_fee` is the sum of its items.
- `payments` — many per challan, so part-payments work naturally.
- `employees` — staff records: `employee_code` (set by a trigger as
  `KS-EMP-nnn`), designation, department, employment type, CNIC, joining date,
  `monthly_salary`, `allowances`, bank details, status.
- `salaries` — one slip per employee per month, `slip_no` as `KS-SAL-YYYYMM-n`.
  Basic and allowances are snapshotted at generation; `deductions` is edited on
  the payroll page.
- `salary_payments` — many per slip, so part payments and advances work.
- `settings` — a single row (`id = 1`) with school and bank details.

Monthly challans for classes that charge an admission fee also print a dashed
**blank box** for the one-time charges, to be filled in by hand; Daycare has no
admission fee so it gets no box. The box costs ~13mm, which is enough to stop
two slips sharing a sheet — hence the toggle on the challans page.

The **Admission Challan** page is deliberately not backed by the database: a
child being admitted does not exist as a student yet, so there is nobody to
select and nothing to link a row to. The page builds a challan-shaped object in
memory from the form, hands it to the same `Challan` component and PDF writer,
and prints it. `admissionTemplate(classId)` supplies the default amounts. The
student is created under Students once they actually join.

Payroll deliberately mirrors the fee side: `salaries` is to `challans` what
`salary_payments` is to `payments`, and `salary_details` is the payroll twin of
`challan_details`. Keep them symmetrical — a change to one usually belongs in
the other.

Challans are sent to parents over **WhatsApp click-to-send**: `whatsapp.js`
builds a `wa.me` link carrying the message, and the staff member presses send
in WhatsApp. The PDF goes with it: `challanShare.js` uploads the generated
challan to the private `challans` storage bucket and folds a 60-day signed link
into the message. The bucket is private on purpose — a challan names a child
and shows the family's balance — so the link, not the path, is the credential.
Where the browser supports it, "Share file" hands WhatsApp the actual PDF
through the system share sheet, but the sheet picks the recipient, so it is an
extra rather than the main route. There is no gateway and no API key, so this costs nothing and the
message comes from the school's own number — but it cannot attach the PDF, and
a browser will only open one window per click, which is why `SendChallanModal`
is a queue rather than a "send all at once" button. `normalisePhone()` accepts
the shapes the office actually types (`+92 3xx`, `03xx`, `00923xx`, `3xx`) and
returns null for anything unusable, so those students are listed for fixing
instead of opening a chat with a wrong number.

**Expected billing and issued challans are different numbers.** `expectedBilling(student)`
is the student's own monthly fee (or their class's) less their discount — what
*should* be charged this month, and it always agrees with the Students page.
A challan is a snapshot taken at generation, so it lags whenever a fee or
discount changed afterwards, and a student enrolled after the run has none at
all. `summariseByClass(challans, classes, students)` returns both: `expected`
from the student rows and `issued` from the challans. The dashboard leads with
`expected` and flags any class where the two disagree; Reports deliberately
shows the issued view, because that is the audit trail. Never "fix" a
divergence by rewriting issued challans.

**Paid and remaining are never stored.** The `challan_details` and
`salary_details` views derive `paid`, `remaining` and `status` (`Paid` /
`Partial` / `Unpaid`) by summing the payments for each row. `student_balances`
does the same across all months.
If you need a new total, extend a view rather than adding a column that has to
be kept in sync.

## Security

RLS is enabled on every table with a single policy: any **authenticated** user
has full access; anonymous visitors get nothing. Only the publishable (anon) key
is used in the browser. The `service_role` key and the database password must
never appear in this repo or in `NEXT_PUBLIC_*` variables.

## Running it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # must pass before any commit
```

`.env.local` needs `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. `supabase/schema.sql` must have been run
once in the Supabase SQL editor, and at least one user must exist under
Authentication → Users.

## When changing things

- Run `npm run build` after edits; it type-checks nothing but does catch broken
  imports and invalid JSX.
- Schema changes go in `supabase/schema.sql`, written so the whole file can be
  re-run safely (`create table if not exists`, `on conflict do nothing`). A new
  column on an existing table needs its own
  `alter table ... add column if not exists`, because `create table if not
  exists` is a no-op once the table is there. Views are dropped and recreated
  rather than replaced, since `create or replace view` cannot add a column
  anywhere but the end.
- `supabase/seed-demo.sql` is optional demo data. Every row it creates hangs off
  a student whose `roll_no` starts `KS-D`, so it can be removed in one delete.
- The challan appears twice — as React in `components/Challan.jsx` (screen and
  print) and as jsPDF drawing in `lib/pdf.js` (download). Update both together.
- The Student Admission Form has no React twin on purpose: `lib/admissionFormPdf.js`
  is the only copy, and the page previews it by embedding the generated blob in
  an iframe. Printing goes through the PDF viewer, not the print stylesheet. Its
  class checkboxes come from `classes`, so the form follows the fee structure.
  The same file renders both the blank and the filled form: `ruled()` takes an
  optional `value` and `checkbox()` an optional `checked`, so a missing field
  simply prints an empty rule. Nothing about it is stored — it is a document
  generator, not a record. Blob URLs from `admissionFormBlobUrl` must be revoked
  when replaced, or each keystroke leaks one.
- Slips in the PDF vary in height with the number of fee lines, so
  `downloadChallanPDF` measures each with `slipHeight()` and packs two onto a
  sheet only when both fit. `slipHeight` must stay in step with what
  `drawChallan` actually draws — `drawChallan` returns its finished y so the two
  can be compared. After changing any row height or adding a field, re-check
  that predicted equals actual and that a routine two-line challan still pairs
  up (it is ~134mm against 277mm of usable page).
