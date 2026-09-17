"use client";

import { CheckCircle2, Clock, Facebook, Instagram, MapPin, Phone, XCircle } from "lucide-react";
import Logo from "@/components/Logo";
import { dmy, num, periodLabel } from "@/lib/format";

/**
 * One fee challan / receipt, styled to match the school's printed slip.
 * `ch` is a row from the challan_details view; `items` are its challan_items.
 *
 * Challans issued before itemised fee heads existed have no items, so we fall
 * back to showing the stored total as a single tuition line.
 */
export default function Challan({ ch, items = [], settings = {}, compact = false, blankHeads = [] }) {
  const isAdmission = ch.kind === "admission";
  const st = ch.status;
  const tone =
    st === "Paid"
      ? { bg: "bg-emerald-50", ring: "ring-emerald-200", text: "text-emerald-700", Icon: CheckCircle2, label: "Fully Paid" }
      : st === "Partial"
      ? { bg: "bg-amber-50", ring: "ring-amber-200", text: "text-amber-700", Icon: Clock, label: "Partially Paid" }
      : { bg: "bg-rose-50", ring: "ring-rose-200", text: "text-rose-700", Icon: XCircle, label: "Unpaid" };

  // A blank admission template prints ruled rows to write the charges into.
  const lines = items.length
    ? items
    : isAdmission
    ? [0, 1, 2, 3].map((i) => ({ id: `blank${i}`, name: "", amount: null, frequency: "one_time" }))
    : [{ id: "fallback", name: "Monthly Tuition Fee", amount: ch.total_fee, frequency: "monthly" }];

  return (
    <div className={`bg-white ${compact ? "text-[11px]" : "text-[13px]"} text-slate-800`}>
      {/* ------------------------------------------------------- header -- */}
      <div className="flex items-start justify-between gap-4 border-b-2 border-brand-700 pb-3">
        <div className="flex items-center gap-3">
          <Logo className="h-14 w-14 shrink-0" />
          <div className="leading-tight">
            <div className="text-xl font-extrabold tracking-tight text-brand-800">KINDLE SPROUT</div>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-gold-600">Daycare &amp; School</div>
            <div className="mt-0.5 text-[10px] font-medium tracking-[0.15em] text-slate-500">LEARN | GROW | SHINE</div>
          </div>
        </div>
        <div className="text-right">
          <div
            className={`inline-block rounded-md px-3 py-1 text-sm font-bold text-white ${
              isAdmission ? "bg-gold-600" : "bg-brand-700"
            }`}
          >
            {isAdmission ? "ADMISSION CHALLAN" : "FEE CHALLAN"}
          </div>
          <div className="mt-1.5 text-sm font-semibold text-navy-900">
            {isAdmission ? "New Admission" : periodLabel(ch.year, ch.month)}
          </div>
        </div>
      </div>

      {/* --------------------------------------------------- student rows -- */}
      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5">
        <Field label="Receipt No." value={ch.receipt_no} mono />
        <Field label="Date" value={dmy(ch.created_at)} />
        <Field label="Child's Name" value={ch.student_name} strong />
        <Field label="Class / Group" value={ch.class_name || "—"} />
        <Field label="Father's Name" value={ch.father_name || "—"} />
        <Field label="Roll No." value={ch.roll_no || "—"} />
        <Field label="Received From" value={ch.guardian_name || ch.father_name || "—"} />
        <Field label="Contact" value={ch.phone || "—"} />
        <Field label="Admission Date" value={dmy(ch.admission_date)} />
        <Field label={isAdmission ? "Session" : "Month / Period"} value={periodLabel(ch.year, ch.month)} />
        <Field label="Due Date" value={dmy(ch.due_date)} />
      </div>

      {/* --------------------------------------------------- fee summary -- */}
      <table className="mt-4 w-full border-collapse">
        <thead>
          <tr className="bg-brand-800 text-white">
            <th className="border border-brand-800 px-3 py-2 text-left text-xs font-bold uppercase tracking-wide">
              Fee Details
            </th>
            <th className="border border-brand-800 px-3 py-2 text-right text-xs font-bold uppercase tracking-wide">
              Amount (PKR)
            </th>
          </tr>
        </thead>
        <tbody>
          {lines.map((it) => (
            <Row
              key={it.id || it.name}
              label={it.name || <span className="inline-block h-3 w-40 border-b border-dotted border-slate-400" />}
              note={it.name && it.frequency === "one_time" ? "one time" : null}
              value={it.amount === null ? <span className="inline-block h-3 w-20 border-b border-dotted border-slate-400" /> : num(it.amount)}
            />
          ))}
          <Row label="Gross Total" value={num(ch.total_fee)} strong />
          {Number(ch.discount) > 0 && <Row label="Discount / Concession" value={`- ${num(ch.discount)}`} />}
          <Row label="Total Payable" value={num(ch.payable)} strong />
          <Row label="Paid" value={num(ch.paid)} tone="text-emerald-700" />
          <Row label="Remaining" value={num(ch.remaining)} tone="text-rose-700" strong />
        </tbody>
      </table>

      {/* ------------------------------------- one-time charges, by hand -- */}
      {!isAdmission && blankHeads.length > 0 && (
        <div className="mt-3 rounded-lg border border-dashed border-gold-500 px-3 py-2">
          <div className="text-[10px] font-bold uppercase tracking-wide text-gold-600">
            One-time admission charges — if applicable, fill in by hand
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-6 gap-y-1">
            {blankHeads.map((name) => (
              <span key={name} className="flex items-baseline gap-1.5 text-[11px] text-slate-600">
                {name}
                <span className="inline-block w-20 border-b border-slate-400" />
              </span>
            ))}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------- status -- */}
      <div className={`mt-3 flex items-center gap-2 rounded-lg px-3 py-2 ring-1 ${tone.bg} ${tone.ring} ${tone.text}`}>
        <tone.Icon className="h-4 w-4 shrink-0" />
        <span className="text-sm font-bold">Status: {tone.label}</span>
        {ch.last_paid_on && <span className="ml-auto text-xs font-medium">Last payment {dmy(ch.last_paid_on)}</span>}
      </div>

      {/* ------------------------------------------- where to pay -- */}
      <div className="mt-3 overflow-hidden rounded-lg border-2 border-brand-700">
        <div className="flex items-center justify-between gap-3 bg-brand-700 px-3 py-1.5">
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-white">
            Pay to — Bank Details
          </span>
          <span className="text-[10px] font-semibold text-brand-100">Cash also accepted at the office</span>
        </div>

        <div className="grid grid-cols-5 gap-x-4 bg-brand-50/60 px-3 py-2.5">
          {/* the number parents actually need, given the most weight */}
          <div className="col-span-3">
            <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">
              Account Number
            </div>
            <div className="font-mono text-xl font-extrabold leading-tight tracking-[0.06em] text-navy-900">
              {settings.account_number || "03200109242922"}
            </div>
          </div>
          <div className="col-span-2">
            <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">Account Title</div>
            <div className="text-sm font-bold leading-tight text-navy-900">
              {settings.bank_title || "JIBRAN SULEMAN"}
            </div>
          </div>

          <div className="col-span-3 mt-2">
            <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">IBAN</div>
            <div className="font-mono text-[13px] font-bold tracking-wide text-navy-900">
              {settings.iban || "PK32MEZN0003200109242922"}
            </div>
          </div>
          <div className="col-span-2 mt-2">
            <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">Bank</div>
            <div className="text-[11px] font-semibold text-navy-900">
              {settings.bank_name || "Meezan Bank - G-13 BR-ISLAMABAD"}
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------- school details -- */}
      <div className="mt-3 flex items-end justify-between gap-6 border-t border-slate-300 pt-2">
        <div className="space-y-0.5 text-[11px] text-slate-600">
          <div className="flex items-start gap-1.5">
            <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-brand-700" />
            <span className="font-medium">
              {settings.address || "Service road South G-12/1, Islamabad (Opposite to metro bus station)"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5">
            <span className="flex items-center gap-1.5 font-semibold text-navy-900">
              <Phone className="h-3 w-3 shrink-0 text-brand-700" />
              {settings.phone || "+92 312 3177778"}
            </span>
            <span className="flex items-center gap-1.5">
              <Instagram className="h-3 w-3 shrink-0 text-brand-700" />
              {settings.instagram || "kindlesprout"}
            </span>
            <span className="flex items-center gap-1.5">
              <Facebook className="h-3 w-3 shrink-0 text-brand-700" />
              {settings.facebook || "Kindle Sprout Daycare and School"}
            </span>
          </div>
        </div>
        <div className="shrink-0 text-center">
          <div className="h-8 w-44 border-b border-dashed border-slate-400" />
          <div className="mt-1 text-[10px] font-semibold text-slate-600">Authorized Signature &amp; Stamp</div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, strong, mono }) {
  return (
    <div className="flex items-baseline gap-2 border-b border-dotted border-slate-300 pb-1">
      <span className="w-28 shrink-0 text-[11px] font-semibold text-slate-500">{label}</span>
      <span className={`flex-1 truncate ${strong ? "font-bold text-navy-900" : "font-medium"} ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </span>
    </div>
  );
}

function Row({ label, value, strong, tone, note }) {
  return (
    <tr className={strong ? "bg-slate-50" : ""}>
      <td className={`border border-slate-300 px-3 py-1.5 ${strong ? "font-bold text-navy-900" : ""}`}>
        {label}
        {note && <span className="ml-1.5 text-[10px] font-medium uppercase text-amber-600">({note})</span>}
      </td>
      <td className={`border border-slate-300 px-3 py-1.5 text-right tabular-nums ${strong ? "font-bold" : ""} ${tone || ""}`}>
        {value}
      </td>
    </tr>
  );
}
