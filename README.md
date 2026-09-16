# Kindle Sprout — Student & Fee Management System

Student records, class fee structure, monthly fee challans and payment tracking
for **Kindle Sprout Daycare & School**, Service road South G-12/1, Islamabad.

Built with Next.js + Supabase, and designed to deploy to Vercel's free tier with
no configuration beyond two environment variables.

---

## What it does

- **Students** — add, edit, search and filter every child, with guardian and
  contact details, class, admission date and status.
- **Fee Structure** — monthly and annual fee for Daycare, Playgroup, Nursery,
  KG and Grades 1–5. A student can carry a custom fee or a standing discount.
- **Generate Challan** — pick a class and month, create the challans for every
  active student in one click, preview them, then **print** or **download a
  PDF** (two challans per A4 page, matching the school's printed slip).
- **Payments** — record full or part payments against a month's challan, with
  Cash / Bank Transfer / Other and a reference number.
- **Total, Paid and Remaining** appear on every screen and on the challan
  itself, per month and across all months.
- **Reports** — collection by class, who still owes this month, and running
  balances across all months. Every table exports to CSV.

---

## Setup

### 1. Create the database

In your Supabase project, open **SQL Editor → New query**, paste the whole of
[`supabase/schema.sql`](supabase/schema.sql) and run it. It creates the tables,
views, row-level security policies and the nine classes with their current fees.

The file is safe to run again later if you change it.

### 2. Create the admin login

**Authentication → Users → Add user**. Enter an email and password and tick
*Auto Confirm User*. That is the account you will sign in with.

To stop anyone signing themselves up, go to **Authentication → Providers →
Email** and turn **Enable sign-ups** off.

### 3. Configure the app

`.env.local` in the project root:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxx
```

Both values are in **Project Settings → API**. Use the *publishable* (anon) key
— never the `service_role` key or your database password.

### 4. Run it

```bash
npm install
npm run dev
```

Open <http://localhost:3000> and sign in.

---

## Deploying to Vercel (free)

1. Push this folder to a GitHub repository.
2. On [vercel.com](https://vercel.com), **Add New → Project**, import the repo.
   Vercel detects Next.js on its own — leave the build settings alone.
3. Under **Environment Variables**, add the same two keys as above
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) for
   Production, Preview and Development.
4. **Deploy.**

There are no server secrets, no API routes and no background jobs, so the whole
app fits inside the Hobby plan. Every push to `main` redeploys automatically.

Optional: in Supabase, add your Vercel URL under **Authentication → URL
Configuration → Site URL**.

---

## Day-to-day use

1. **Fee Structure** — check the monthly fee for each class is right.
2. **Students** — add the children; each one is assigned to a class.
3. **Fee Management → Generate Challan** — choose the class and month, press
   *Generate Challan*. One challan is created per active student. Running it
   again never creates duplicates.
4. Print all the challans, or download them as a PDF and send them out.
5. As parents pay, open **Record Payment** (from the challan row or the Payment
   History page), enter the amount and method. Part payments are fine — the
   status becomes *Partial* and the remaining balance updates everywhere.
6. **Reports** at month end shows who has paid and who still owes.

### Notes

- A student's monthly fee comes from their class unless you set a custom amount
  on the student, in which case that wins.
- Receipt numbers are generated automatically as `KS-YYYYMM-####`.
- Deleting a student removes their challans and payments; deleting a payment
  puts the amount back onto the month's remaining balance.

---

## Security

Row-level security is on for every table. Only signed-in users can read or write
anything; the publishable key on its own gets you nothing. Keep the
`service_role` key and the database password out of this repository — anything
prefixed `NEXT_PUBLIC_` is visible to everyone who loads the site.
