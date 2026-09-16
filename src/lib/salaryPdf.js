"use client";

import { dmy, num, periodLabel } from "@/lib/format";
import { logoDataUrl } from "@/lib/logoImage";

/* Brand colours as RGB triples. */
const GREEN = [23, 85, 45];
const GREEN_DARK = [18, 67, 36];
const GOLD = [180, 145, 42];
const NAVY = [10, 26, 51];
const GREY = [110, 120, 133];
const LINE = [205, 212, 220];
const RED = [190, 40, 60];
const EMERALD = [16, 120, 80];

const PAGE_W = 210;
const PAGE_H = 297;
const M = 10;
const W = PAGE_W - M * 2;
const GAP = 6;

const FIELD_H = 5.6;
const ROW_H = 5.8;
const CHROME_H = 62;
const DETAIL_ROWS = 4;

/** Height of one slip, so two only share a sheet when they both fit. */
function slipHeight(s) {
  const rows = 3 + (Number(s.deductions) > 0 ? 1 : 0) + 3; // earnings + deductions + net/paid/remaining
  return CHROME_H + DETAIL_ROWS * FIELD_H + (rows + 1) * ROW_H;
}

/** Download salary slips, two per A4 sheet where they fit. */
export async function downloadSalaryPDF(salaries, settings = {}, filename) {
  const mod = await import("jspdf");
  const JsPDF = mod.jsPDF || mod.default?.jsPDF || mod.default;
  const doc = new JsPDF({ unit: "mm", format: "a4" });
  const logo = await logoDataUrl();
  const list = Array.isArray(salaries) ? salaries : [salaries];

  let y = M;
  let first = true;

  list.forEach((s) => {
    const h = slipHeight(s);
    if (!first && y + h > PAGE_H - M) {
      doc.addPage();
      y = M;
    } else if (!first) {
      doc.setDrawColor(...LINE);
      doc.setLineDashPattern([1.5, 1.5], 0);
      doc.line(M, y - GAP / 2, M + W, y - GAP / 2);
      doc.setLineDashPattern([], 0);
    }
    drawSlip(doc, s, settings, y, logo);
    y += h + GAP;
    first = false;
  });

  const name =
    filename ||
    (list.length === 1
      ? `Salary-Slip-${list[0].slip_no}-${list[0].employee_name}.pdf`.replace(/\s+/g, "_")
      : `Salary-Slips-${periodLabel(list[0].year, list[0].month)}.pdf`.replace(/\s+/g, "_"));

  doc.save(name);
}

function drawSlip(doc, s, settings, top, logo) {
  let y = top;

  /* ------------------------------------------------------------- header */
  if (logo) {
    doc.addImage(logo, "PNG", M, y, 16, 16, undefined, "FAST");
  } else {
    doc.setFillColor(...GREEN);
    doc.roundedRect(M, y, 16, 16, 3, 3, "F");
    doc.setDrawColor(...GOLD).setLineWidth(0.5);
    doc.roundedRect(M + 1, y + 1, 14, 14, 2.5, 2.5, "S");
  }

  doc.setTextColor(...GREEN_DARK).setFont("helvetica", "bold").setFontSize(16);
  doc.text("KINDLE SPROUT", M + 19, y + 6);
  doc.setTextColor(...GOLD).setFontSize(7.5);
  doc.text("D A Y C A R E   &   S C H O O L", M + 19.5, y + 10);
  doc.setTextColor(...GREY).setFont("helvetica", "normal").setFontSize(6.5);
  doc.text("LEARN  |  GROW  |  SHINE", M + 19.5, y + 13.5);

  doc.setFillColor(...NAVY);
  doc.roundedRect(M + W - 46, y, 46, 8, 1.5, 1.5, "F");
  doc.setTextColor(255, 255, 255).setFont("helvetica", "bold").setFontSize(10.5);
  doc.text("SALARY SLIP", M + W - 23, y + 5.6, { align: "center" });
  doc.setTextColor(...NAVY).setFontSize(9.5);
  doc.text(periodLabel(s.year, s.month), M + W, y + 13.5, { align: "right" });

  y += 18;
  doc.setDrawColor(...GREEN).setLineWidth(0.8);
  doc.line(M, y, M + W, y);
  y += 5;

  /* -------------------------------------------------------- detail rows */
  const colW = W / 2;
  const fields = [
    ["Slip No.", s.slip_no],
    ["Date", dmy(s.created_at)],
    ["Employee", s.employee_name],
    ["Employee ID", s.employee_code],
    ["Designation", s.designation || "-"],
    ["Department", s.department || "-"],
    ["Joining Date", dmy(s.joining_date)],
    ["CNIC", s.cnic || "-"],
  ];

  fields.forEach(([label, value], i) => {
    const x = M + (i % 2) * colW;
    const ry = y + Math.floor(i / 2) * FIELD_H;
    doc.setFont("helvetica", "normal").setFontSize(7.5).setTextColor(...GREY);
    doc.text(label, x, ry);
    doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(...NAVY);
    doc.text(clip(doc, String(value ?? "-"), colW - 30), x + 26, ry);
    doc.setDrawColor(...LINE).setLineWidth(0.2);
    doc.line(x, ry + 1.8, x + colW - 6, ry + 1.8);
  });

  y += Math.ceil(fields.length / 2) * FIELD_H + 4;

  /* ------------------------------------------------------------- amounts */
  doc.setFillColor(...GREEN_DARK);
  doc.rect(M, y, W, ROW_H, "F");
  doc.setTextColor(255, 255, 255).setFont("helvetica", "bold").setFontSize(8.5);
  doc.text("EARNINGS & DEDUCTIONS", M + 3, y + 4.0);
  doc.text("AMOUNT (PKR)", M + W - 3, y + 4.0, { align: "right" });
  y += ROW_H;

  const rows = [
    ["Basic Salary", num(s.basic), false, NAVY],
    ["Allowances", num(s.allowances), false, NAVY],
  ];
  if (Number(s.deductions) > 0) {
    rows.push([`Deductions${s.deduction_note ? ` (${s.deduction_note})` : ""}`, `- ${num(s.deductions)}`, false, RED]);
  }
  rows.push(["Net Salary", num(s.net_salary), true, NAVY]);
  rows.push(["Paid", num(s.paid), false, EMERALD]);
  rows.push(["Remaining", num(s.remaining), true, RED]);

  rows.forEach(([label, value, strong, colour]) => {
    if (strong) {
      doc.setFillColor(243, 246, 249);
      doc.rect(M, y, W, ROW_H, "F");
    }
    doc.setDrawColor(...LINE).setLineWidth(0.2);
    doc.rect(M, y, W, ROW_H, "S");
    doc.line(M + W - 45, y, M + W - 45, y + ROW_H);
    doc.setFont("helvetica", strong ? "bold" : "normal").setFontSize(9).setTextColor(...NAVY);
    doc.text(clip(doc, label, W - 52), M + 3, y + 4.0);
    doc.setTextColor(...colour).setFont("helvetica", strong ? "bold" : "normal");
    doc.text(value, M + W - 3, y + 4.0, { align: "right" });
    y += ROW_H;
  });

  y += 3;

  /* -------------------------------------------------------- status strip */
  const label = s.status === "Paid" ? "FULLY PAID" : s.status === "Partial" ? "PARTIALLY PAID" : "UNPAID";
  const bg = s.status === "Paid" ? [232, 247, 238] : s.status === "Partial" ? [255, 247, 229] : [253, 235, 238];
  const fg = s.status === "Paid" ? EMERALD : s.status === "Partial" ? [170, 110, 10] : RED;

  doc.setFillColor(...bg);
  doc.roundedRect(M, y, W, 8, 1.5, 1.5, "F");
  doc.setTextColor(...fg).setFont("helvetica", "bold").setFontSize(9);
  doc.text(`STATUS: ${label}`, M + 3, y + 5.5);
  if (s.last_paid_on) {
    doc.setFont("helvetica", "normal").setFontSize(7.5);
    doc.text(`Last payment: ${dmy(s.last_paid_on)}`, M + W - 3, y + 5.5, { align: "right" });
  }
  y += 11;

  /* -------------------------------------------------------------- footer */
  doc.setFont("helvetica", "normal").setFontSize(7).setTextColor(...GREY);
  doc.text(
    clip(doc, settings?.address || "Service road South G-12/1, Islamabad", W - 60),
    M,
    y
  );
  doc.text(
    `${s.bank_name ? `${s.bank_name}  |  ` : ""}${s.account_number ? `A/C: ${s.account_number}` : ""}`,
    M,
    y + 4
  );

  doc.setDrawColor(...GREY).setLineWidth(0.2);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(M + W - 50, y + 2, M + W, y + 2);
  doc.setLineDashPattern([], 0);
  doc.setFontSize(7).setTextColor(...NAVY);
  doc.text("Authorized Signature & Stamp", M + W - 25, y + 6, { align: "center" });

  return y + 6;
}

function clip(doc, text, maxW) {
  let s = String(text);
  while (s.length > 4 && doc.getTextWidth(s) > maxW) s = s.slice(0, -2);
  return s;
}
