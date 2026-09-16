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
const M = 10; // page margin
const W = PAGE_W - M * 2; // usable width
const GAP = 6; // space between two slips on the same sheet

const FIELD_H = 5.6;
const ROW_H = 5.8;
// Everything on a slip except the variable fee rows and detail rows.
// Verified against drawChallan by the layout check in the README.
const CHROME_H = 65;
const DETAIL_ROWS = 6;
const BLANK_BOX_H = 13; // dashed hand-fill box for one-time charges

/**
 * How tall this slip will be, in mm. The fee table grows with the number of
 * line items, so slips are measured before they are placed and two only share
 * a sheet when they genuinely both fit.
 */
function slipHeight(ch, items, blankHeads = []) {
  // A blank admission template still prints four ruled rows to write into.
  const lines = items?.length || (ch.kind === "admission" ? 4 : 1);
  // line items + gross total + optional discount + payable + paid + remaining
  const feeRows = lines + 4 + (Number(ch.discount) > 0 ? 1 : 0);
  const blankBox = ch.kind !== "admission" && blankHeads.length ? BLANK_BOX_H : 0;
  return CHROME_H + DETAIL_ROWS * FIELD_H + (feeRows + 1) * ROW_H + blankBox;
}

/**
 * Build a PDF of one or more challans (two per A4 page, matching the school's
 * printed receipt sheet) and hand it to the browser as a download.
 *
 * Drawn with jsPDF's vector API rather than screenshotting the DOM, so the text
 * stays selectable and the file stays small.
 */
export async function downloadChallanPDF(challans, settings = {}, filename, itemsByChallan, blanksByChallan) {
  // jspdf ships both an ESM default export and a named `jsPDF`; accept either.
  const mod = await import("jspdf");
  const JsPDF = mod.jsPDF || mod.default?.jsPDF || mod.default;
  const doc = new JsPDF({ unit: "mm", format: "a4" });
  const logo = await logoDataUrl(); // null when public/logo.png is absent
  const list = Array.isArray(challans) ? challans : [challans];
  const itemsOf = (ch) =>
    (itemsByChallan instanceof Map ? itemsByChallan.get(ch.id) : itemsByChallan?.[ch.id]) || [];
  const blanksOf = (ch) =>
    (blanksByChallan instanceof Map ? blanksByChallan.get(ch.id) : blanksByChallan?.[ch.id]) || [];

  let y = M;
  let first = true;

  list.forEach((ch) => {
    const items = itemsOf(ch);
    const blanks = blanksOf(ch);
    const h = slipHeight(ch, items, blanks);

    // Start a new sheet when this slip will not fit below the previous one.
    if (!first && y + h > PAGE_H - M) {
      doc.addPage();
      y = M;
    } else if (!first) {
      // cut line between two slips sharing a sheet
      doc.setDrawColor(...LINE);
      doc.setLineDashPattern([1.5, 1.5], 0);
      doc.line(M, y - GAP / 2, M + W, y - GAP / 2);
      doc.setLineDashPattern([], 0);
    }

    drawChallan(doc, ch, settings, y, items, blanks, logo);
    y += h + GAP;
    first = false;
  });

  const name =
    filename ||
    (list.length === 1
      ? `Challan-${list[0].receipt_no}-${list[0].student_name}.pdf`.replace(/\s+/g, "_")
      : `Challans-${periodLabel(list[0].year, list[0].month)}.pdf`.replace(/\s+/g, "_"));

  doc.save(name);
}

function drawChallan(doc, ch, settings, top, items = [], blankHeads = [], logo = null) {
  const isAdmission = ch.kind === "admission";
  let y = top;

  /* ------------------------------------------------------------- header */
  if (logo) {
    doc.addImage(logo, "PNG", M, y, 16, 16, undefined, "FAST");
  } else {
    // Drawn stand-in when the artwork is not available.
    doc.setFillColor(...GREEN);
    doc.roundedRect(M, y, 16, 16, 3, 3, "F");
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.5);
    doc.roundedRect(M + 1, y + 1, 14, 14, 2.5, 2.5, "S");
    doc.setFillColor(78, 164, 104);
    doc.circle(M + 8, y + 6.5, 3.1, "F");
    doc.setFillColor(138, 90, 43);
    doc.rect(M + 7.5, y + 8.5, 1, 3.4, "F");
    doc.setFillColor(250, 248, 240);
    doc.rect(M + 4.5, y + 11.6, 7, 1.8, "F");
  }

  doc.setTextColor(...GREEN_DARK);
  doc.setFont("helvetica", "bold").setFontSize(16);
  doc.text("KINDLE SPROUT", M + 19, y + 6);
  doc.setTextColor(...GOLD);
  doc.setFontSize(7.5);
  doc.text("D A Y C A R E   &   S C H O O L", M + 19.5, y + 10);
  doc.setTextColor(...GREY);
  doc.setFont("helvetica", "normal").setFontSize(6.5);
  doc.text("LEARN  |  GROW  |  SHINE", M + 19.5, y + 13.5);

  // "FEE CHALLAN" badge on the right.
  doc.setFillColor(...(isAdmission ? GOLD : GREEN));
  doc.roundedRect(M + W - 52, y, 52, 8, 1.5, 1.5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold").setFontSize(isAdmission ? 10 : 11);
  doc.text(isAdmission ? "ADMISSION CHALLAN" : "FEE CHALLAN", M + W - 26, y + 5.6, { align: "center" });
  doc.setTextColor(...NAVY);
  doc.setFontSize(9.5);
  doc.text(isAdmission ? "New Admission" : periodLabel(ch.year, ch.month), M + W, y + 13.5, { align: "right" });

  y += 18;
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(0.8);
  doc.line(M, y, M + W, y);
  y += 5;

  /* -------------------------------------------------------- detail rows */
  const colW = W / 2;
  // Ten fields, five rows. The month is already large in the header, so it is
  // not repeated here.
  const fields = [
    ["Receipt No.", ch.receipt_no],
    ["Date", dmy(ch.created_at)],
    ["Child's Name", ch.student_name],
    ["Class / Group", ch.class_name || "-"],
    ["Father's Name", ch.father_name || "-"],
    ["Roll No.", ch.roll_no || "-"],
    ["Received From", ch.guardian_name || ch.father_name || "-"],
    ["Contact", ch.phone || "-"],
    ["Admission Date", dmy(ch.admission_date)],
    [isAdmission ? "Session" : "Month / Period", periodLabel(ch.year, ch.month)],
    ["Due Date", dmy(ch.due_date)],
  ];


  const fieldH = FIELD_H;
  fields.forEach(([label, value], i) => {
    const x = M + (i % 2) * colW;
    const ry = y + Math.floor(i / 2) * fieldH;
    doc.setFont("helvetica", "normal").setFontSize(7.5).setTextColor(...GREY);
    doc.text(label, x, ry);
    doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(...NAVY);
    doc.text(clip(doc, String(value ?? "-"), colW - 30), x + 26, ry);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.2);
    doc.line(x, ry + 1.8, x + colW - 6, ry + 1.8);
  });

  y += Math.ceil(fields.length / 2) * fieldH + 4;

  /* ----------------------------------------------------------- fee table */
  const rowH = ROW_H;
  doc.setFillColor(...GREEN_DARK);
  doc.rect(M, y, W, rowH, "F");
  doc.setTextColor(255, 255, 255).setFont("helvetica", "bold").setFontSize(8.5);
  doc.text("FEE DETAILS", M + 3, y + 4.0);
  doc.text("AMOUNT (PKR)", M + W - 3, y + 4.0, { align: "right" });
  y += rowH;

  // Challans issued before itemised fee heads existed fall back to one line; a
  // blank admission template prints empty rows to be written into by hand.
  const lines = items.length
    ? items
    : isAdmission
    ? [0, 1, 2, 3].map(() => ({ name: "", amount: null, frequency: "one_time" }))
    : [{ name: "Monthly Tuition Fee", amount: ch.total_fee, frequency: "monthly" }];

  const suffix = (f) => (f === "one_time" ? "  (one time)" : f === "annual" ? "  (annual)" : "");
  const rows = lines.map((it) => [
    it.name ? `${it.name}${suffix(it.frequency)}` : "",
    it.amount === null ? "" : num(it.amount),
    false,
    NAVY,
  ]);
  rows.push(["Gross Total", num(ch.total_fee), true, NAVY]);
  if (Number(ch.discount) > 0) rows.push(["Discount / Concession", `- ${num(ch.discount)}`, false, NAVY]);
  rows.push(["Total Payable", num(ch.payable), true, NAVY]);
  rows.push(["Paid", num(ch.paid), false, EMERALD]);
  rows.push(["Remaining", num(ch.remaining), true, RED]);

  rows.forEach(([label, value, strong, colour]) => {
    if (strong) {
      doc.setFillColor(243, 246, 249);
      doc.rect(M, y, W, rowH, "F");
    }
    doc.setDrawColor(...LINE).setLineWidth(0.2);
    doc.rect(M, y, W, rowH, "S");
    doc.line(M + W - 45, y, M + W - 45, y + rowH);
    doc.setFont("helvetica", strong ? "bold" : "normal").setFontSize(9).setTextColor(...NAVY);
    doc.text(label, M + 3, y + 4.0);
    doc.setTextColor(...colour).setFont("helvetica", strong ? "bold" : "normal");
    doc.text(value, M + W - 3, y + 4.0, { align: "right" });
    y += rowH;
  });

  y += 3;

  /* --------------------------------- one-time charges, filled in by hand */
  if (!isAdmission && blankHeads.length) {
    doc.setDrawColor(...GOLD).setLineWidth(0.3);
    doc.setLineDashPattern([1, 1], 0);
    doc.roundedRect(M, y, W, 11, 1.5, 1.5, "S");
    doc.setLineDashPattern([], 0);
    doc.setTextColor(...GOLD).setFont("helvetica", "bold").setFontSize(6.5);
    doc.text("ONE-TIME ADMISSION CHARGES  -  IF APPLICABLE, FILL IN BY HAND", M + 3, y + 3.8);

    const slot = (W - 6) / blankHeads.length;
    blankHeads.forEach((name, i) => {
      const x = M + 3 + i * slot;
      doc.setTextColor(...GREY).setFont("helvetica", "normal").setFontSize(7);
      doc.text(clip(doc, name, slot - 24), x, y + 8.6);
      doc.setDrawColor(...GREY).setLineWidth(0.2);
      doc.line(x + slot - 23, y + 8.9, x + slot - 4, y + 8.9);
    });
    y += BLANK_BOX_H;
  }

  /* -------------------------------------------------------- status strip */
  const statusText =
    ch.status === "Paid" ? "FULLY PAID" : ch.status === "Partial" ? "PARTIALLY PAID" : "UNPAID";
  const statusBg =
    ch.status === "Paid" ? [232, 247, 238] : ch.status === "Partial" ? [255, 247, 229] : [253, 235, 238];
  const statusFg = ch.status === "Paid" ? EMERALD : ch.status === "Partial" ? [170, 110, 10] : RED;

  doc.setFillColor(...statusBg);
  doc.roundedRect(M, y, W, 8, 1.5, 1.5, "F");
  doc.setTextColor(...statusFg).setFont("helvetica", "bold").setFontSize(9);
  doc.text(`STATUS: ${statusText}`, M + 3, y + 5.5);
  if (ch.last_paid_on) {
    doc.setFont("helvetica", "normal").setFontSize(7.5);
    doc.text(`Last payment: ${dmy(ch.last_paid_on)}`, M + W - 3, y + 5.5, { align: "right" });
  }
  y += 11;

  /* ------------------------------------------------------------ bank box */
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...LINE).setLineWidth(0.2);
  doc.roundedRect(M, y, W, 15, 1.5, 1.5, "FD");
  doc.setTextColor(...NAVY).setFont("helvetica", "bold").setFontSize(7.5);
  doc.text("PAYMENT METHOD", M + 3, y + 4.2);
  doc.setFont("helvetica", "normal").setFontSize(7).setTextColor(...GREY);
  doc.text(
    `${settings.bank_name || "Meezan Bank - G-13 BR-ISLAMABAD"}   |   Title: ${
      settings.bank_title || "JIBRAN SULEMAN"
    }`,
    M + 3,
    y + 8.6
  );
  doc.text(
    `A/C: ${settings.account_number || "03200109242922"}   |   IBAN: ${
      settings.iban || "PK32MEZN0003200109242922"
    }   |   Cash / Bank Transfer / Other`,
    M + 3,
    y + 12.6
  );
  y += 18;

  /* -------------------------------------------------------------- footer */
  doc.setFontSize(7).setTextColor(...GREY);
  doc.text(
    clip(doc, settings.address || "Service road South G-12/1, Islamabad (Opposite to metro bus station)", W - 58),
    M,
    y
  );
  doc.text(
    clip(
      doc,
      `Phone: ${settings.phone || "+92 312 3177778"}   |   Instagram: ${
        settings.instagram || "kindlesprout"
      }   |   Facebook: ${settings.facebook || "Kindle Sprout Daycare and School"}`,
      W - 58
    ),
    M,
    y + 4
  );

  doc.setDrawColor(...GREY).setLineWidth(0.2);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(M + W - 50, y + 2, M + W, y + 2);
  doc.setLineDashPattern([], 0);
  doc.setFontSize(7).setTextColor(...NAVY);
  doc.text("Authorized Signature & Stamp", M + W - 25, y + 6, { align: "center" });

  return y + 6; // bottom of the slip, used by the layout test
}

/** Trim a string until it fits `maxW` millimetres at the current font size. */
function clip(doc, text, maxW) {
  let s = text;
  while (s.length > 4 && doc.getTextWidth(s) > maxW) s = s.slice(0, -2);
  return s === text ? s : `${s}…`;
}
