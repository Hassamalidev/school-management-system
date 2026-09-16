"use client";

/**
 * The school's two-page Student Admission Form, drawn as a vector PDF.
 *
 * It doubles as a blank form and a filled one: every field in `data` is printed
 * onto its rule, and ticked boxes are drawn where a choice was made. Leave a
 * field out and its rule prints empty, ready to be written on by hand.
 *
 * Unlike the challan, this document has no React twin: the page embeds the
 * generated PDF itself for preview, so this file is the single source of truth
 * for the layout. Keep it that way — a second copy would drift.
 */

import { logoDataUrl } from "@/lib/logoImage";

const BLUE = [26, 150, 200];
const GREEN = [23, 85, 45];
const LEAF = [106, 171, 61];
const ORANGE = [224, 123, 57];
const PINK = [233, 30, 99];
const RED = [229, 57, 53];
const GREY = [110, 120, 133];
const DARK = [55, 65, 81];
const INK = [17, 45, 92]; // colour of the filled-in answers
const LINE = [176, 190, 197];
const GOLD = [180, 145, 42];

const PAGE_W = 210;
const PAGE_H = 297;
const M = 12;
const W = PAGE_W - M * 2;

/* ------------------------------------------------------------- primitives */

/** Shorten text until it fits `maxW` millimetres at the current font. */
function clip(doc, text, maxW) {
  let s = String(text);
  while (s.length > 1 && doc.getTextWidth(s) > maxW) s = s.slice(0, -1);
  return s;
}

/** Print an answer sitting just above a rule. */
function answer(doc, text, x, y, maxW, size = 8.5) {
  if (text === undefined || text === null || String(text).trim() === "") return;
  doc.setFont("helvetica", "normal").setFontSize(size).setTextColor(...INK);
  doc.text(clip(doc, String(text).trim(), maxW), x, y - 0.4);
}

/**
 * "Label: ______________", optionally with the answer written on it.
 * Returns the x where the rule starts, so callers can place their own text.
 */
function ruled(doc, label, x, y, width, opts = {}) {
  const { labelW, size = 8, color = DARK, bold = true, value } = opts;
  doc.setFont("helvetica", bold ? "bold" : "normal").setFontSize(size).setTextColor(...color);
  if (label) doc.text(label, x, y);
  const startX = x + (labelW ?? (label ? doc.getTextWidth(label) + 2 : 0));
  doc.setDrawColor(...LINE).setLineWidth(0.25);
  doc.line(startX, y + 1, x + width, y + 1);
  answer(doc, value, startX + 1.5, y, x + width - startX - 3);
  return startX;
}

/** A First / Middle / Last name rule, with the three parts spaced across it. */
function nameRule(doc, label, x, y, width, labelW, parts = []) {
  const startX = ruled(doc, label, x, y, width, { labelW });
  const span = (x + width - startX) / 3;
  hint(doc, "(First) /", startX + span - 12, y - 2.5);
  hint(doc, "(Middle) /", startX + span * 2 - 14, y - 2.5);
  hint(doc, "(Last)", x + width - 8, y - 2.5, "right");
  parts.slice(0, 3).forEach((p, i) => answer(doc, p, startX + span * i + 1.5, y, span - 4));
}

/** Small grey caption, e.g. "(First)". */
function hint(doc, text, x, y, align = "left") {
  doc.setFont("helvetica", "normal").setFontSize(5.5).setTextColor(...GREY);
  doc.text(text, x, y, { align });
}

function checkbox(doc, x, y, label, { size = 3.4, gap = 1.6, fontSize = 8, checked = false } = {}) {
  const top = y - size + 0.6;
  doc.setDrawColor(...GREY).setLineWidth(0.3);
  doc.roundedRect(x, top, size, size, 0.4, 0.4, "S");
  if (checked) {
    doc.setDrawColor(...GREEN).setLineWidth(0.7);
    doc.line(x + 0.7, top + size * 0.52, x + size * 0.42, top + size * 0.82);
    doc.line(x + size * 0.42, top + size * 0.82, x + size - 0.5, top + size * 0.18);
  }
  doc.setFont("helvetica", "normal").setFontSize(fontSize).setTextColor(...DARK);
  doc.text(label, x + size + gap, y);
  return x + size + gap + doc.getTextWidth(label);
}

function heading(doc, text, x, y, color) {
  doc.setFillColor(...color);
  doc.circle(x + 3, y - 1.4, 3.2, "F");
  doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(...color);
  doc.text(text, x + 8.5, y);
}

function topBar(doc) {
  const seg = W / 3;
  [PINK, [247, 202, 24], LEAF].forEach((c, i) => {
    doc.setFillColor(...c);
    doc.rect(M + i * seg, 6, seg, 1.8, "F");
  });
}

function footerBar(doc) {
  doc.setFillColor(...LEAF);
  doc.rect(0, PAGE_H - 8, PAGE_W, 8, "F");
}

function dashed(doc, x1, y, x2) {
  doc.setDrawColor(...LINE).setLineWidth(0.25);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(x1, y, x2, y);
  doc.setLineDashPattern([], 0);
}

function spine(doc, top, bottom) {
  doc.setDrawColor(...LINE).setLineWidth(0.25);
  doc.setLineDashPattern([1.2, 1.2], 0);
  doc.line(M + 5, top, M + 5, bottom);
  doc.setLineDashPattern([], 0);
}

/** The Kindle Sprout shield — real artwork when available, drawn otherwise. */
function logo(doc, x, y, s = 20, img = null) {
  if (img) {
    doc.addImage(img, "PNG", x, y, s, s, undefined, "FAST");
    return;
  }
  doc.setFillColor(...GREEN);
  doc.roundedRect(x, y, s, s, s * 0.18, s * 0.18, "F");
  doc.setDrawColor(...GOLD).setLineWidth(0.5);
  doc.roundedRect(x + 1, y + 1, s - 2, s - 2, s * 0.14, s * 0.14, "S");
  doc.setFillColor(78, 164, 104);
  doc.circle(x + s / 2, y + s * 0.4, s * 0.19, "F");
  doc.setFillColor(138, 90, 43);
  doc.rect(x + s / 2 - s * 0.03, y + s * 0.53, s * 0.06, s * 0.21, "F");
  doc.setFillColor(250, 248, 240);
  doc.rect(x + s * 0.28, y + s * 0.72, s * 0.44, s * 0.11, "F");
}

/* ------------------------------------------------------------------ page 1 */

function pageOne(doc, classes, d, img = null) {
  topBar(doc);

  doc.setFont("helvetica", "bold").setFontSize(17).setTextColor(...BLUE);
  doc.text("Student Admission Form", PAGE_W / 2, 16, { align: "center" });
  dashed(doc, M, 20, M + W);

  logo(doc, M, 24, 22, img);
  doc.setFont("helvetica", "bold").setFontSize(19).setTextColor(...GREEN);
  doc.text("Kindle Sprout Daycare", M + 26, 33);
  doc.text("and School", M + 26, 42);

  ruled(doc, "Form NO.:", M + W - 62, 28, 62, { value: d.form_no });
  ruled(doc, "Location.:", M + W - 62, 35, 62, { value: d.location });

  doc.setDrawColor(...LINE).setLineWidth(0.3);
  doc.setLineDashPattern([1.2, 1.2], 0);
  doc.rect(M + W - 52, 39, 52, 32, "S");
  doc.setLineDashPattern([], 0);
  doc.setFont("helvetica", "normal").setFontSize(7).setTextColor(...GREY);
  doc.text("Attach a recent", M + W - 26, 51, { align: "center" });
  doc.text("passport size color", M + W - 26, 55.5, { align: "center" });
  doc.text("photograph", M + W - 26, 60, { align: "center" });

  // ---- admission seeking in ----
  let y = 54;
  doc.setFont("helvetica", "bold").setFontSize(8.5).setTextColor(...PINK);
  doc.text("Admission Seeking In:", M, y);

  const names = classes?.length
    ? classes.map((c) => c.name)
    : ["Daycare", "Nursery", "KG", "Playgroup", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5"];

  let cx = M + 36;
  names.slice(0, 4).forEach((n) => {
    cx = checkbox(doc, cx, y, n, { checked: d.class_name === n }) + 8;
  });
  y += 7;
  cx = M + 36;
  names.slice(4).forEach((n) => {
    cx = checkbox(doc, cx, y, n, { checked: d.class_name === n }) + 7;
  });

  y += 9;
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(...RED);
  doc.text("To be completed by Parent / Guardian.", PAGE_W / 2, y, { align: "center" });
  doc.text("Please use CAPITAL LETTERS to complete the form", PAGE_W / 2, y + 5, { align: "center" });
  y += 13;

  const spineTop = y - 4;
  const fx = M + 14;
  const fw = W - 14;

  // ---- candidate details ----
  heading(doc, "Candidate's Personal Details:", M + 2, y + 2, LEAF);
  y += 12;

  nameRule(doc, "Student's Name:", fx, y, fw, 32, [d.student_first, d.student_middle, d.student_last]);
  y += 10;

  doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(...DARK);
  doc.text("Date of Birth:", fx, y);
  doc.setDrawColor(...LINE).setLineWidth(0.25);
  doc.line(fx + 32, y + 1, fx + 104, y + 1);
  if (d.dob_d || d.dob_m || d.dob_y) {
    answer(doc, d.dob_d, fx + 34, y, 18);
    answer(doc, d.dob_m, fx + 58, y, 18);
    answer(doc, d.dob_y, fx + 82, y, 20);
  } else {
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(...LINE);
    doc.text("DD          /MM          / YYYY", fx + 32, y);
  }

  doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(...DARK);
  doc.text("Gender:", fx + 112, y);
  let gx = checkbox(doc, fx + 126, y, "Male", { checked: d.gender === "Male" }) + 6;
  gx = checkbox(doc, gx, y, "Female", { checked: d.gender === "Female" });
  hint(doc, "(Please tick Appropriate)", gx + 2, y);
  y += 9;

  ruled(doc, "Nationality:", fx, y, 96, { labelW: 32, value: d.nationality });
  ruled(doc, "First Language:", fx + 100, y, fw - 100, { labelW: 30, value: d.first_language });
  y += 9;

  ruled(doc, "Other Languages Known:", fx + 44, y, fw - 44, { labelW: 46, value: d.other_languages });
  y += 12;

  // ---- address & family ----
  heading(doc, "Address & Family information:", M + 2, y, LEAF);
  y += 9;

  ruled(doc, "Address:", fx, y, fw, { labelW: 32, value: d.address });
  y += 8;
  ruled(doc, "City:", fx, y, 96, { labelW: 32, color: GREY, bold: false, value: d.city });
  ruled(doc, "Country:", fx + 100, y, fw - 100, { labelW: 30, color: GREY, bold: false, value: d.country });
  y += 11;

  y = parentBlock(doc, "Father:", fx, y, fw, d, "father");
  y = parentBlock(doc, "Mother:", fx, y, fw, d, "mother");

  // ---- guardian ----
  doc.setFillColor(...ORANGE);
  doc.circle(fx - 8, y - 1.2, 2.2, "F");
  doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(...ORANGE);
  doc.text("Guardian:", fx - 4, y);
  doc.setFont("helvetica", "normal").setFontSize(6).setTextColor(...GREY);
  doc.text("(If Applicable)", fx + 16, y);
  y += 8;

  nameRule(doc, "Full Name:", fx, y, 128, 30, [d.guardian_first, d.guardian_middle, d.guardian_last]);
  ruled(doc, "E-mail:", fx + 132, y, fw - 132, { labelW: 18, value: d.guardian_email });
  y += 9;
  ruled(doc, "Relation with student:", fx, y, 110, { labelW: 44, value: d.guardian_relation });
  ruled(doc, "Phone:", fx + 114, y, fw - 114, { labelW: 18, value: d.guardian_phone });
  y += 6;

  spine(doc, spineTop, y);
  footerBar(doc);
}

/** The Father / Mother block — identical fields, different prefix in `d`. */
function parentBlock(doc, title, fx, y, fw, d, k) {
  doc.setFillColor(...ORANGE);
  doc.circle(fx - 8, y - 1.2, 2.2, "F");
  doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(...ORANGE);
  doc.text(title, fx - 4, y);
  y += 8;

  nameRule(doc, "Full Name:", fx, y, fw, 30, [d[`${k}_first`], d[`${k}_middle`], d[`${k}_last`]]);
  y += 9;

  ruled(doc, "E-mail:", fx, y, 92, { labelW: 30, value: d[`${k}_email`] });
  ruled(doc, "Educational Qualification:", fx + 96, y, fw - 96, { labelW: 48, value: d[`${k}_qualification`] });
  y += 8;

  ruled(doc, "Profession:", fx, y, 62, { labelW: 30, value: d[`${k}_profession`] });
  ruled(doc, "Designation:", fx + 66, y, 56, { labelW: 30, value: d[`${k}_designation`] });
  ruled(doc, "Phone:", fx + 126, y, fw - 126, { labelW: 20, value: d[`${k}_phone`] });
  y += 11;
  return y;
}

/* ------------------------------------------------------------------ page 2 */

const CHECKLIST = [
  ["birth_certificate", "Birth Certificate"],
  ["father_cnic", "Father CNIC copy"],
  ["school_report", "School Report"],
  ["transfer_certificate", "Transfer Certificate"],
  ["photos", "Passport size Photos"],
  ["medical_form", "Medical Form"],
];

function pageTwo(doc, settings, d) {
  topBar(doc);
  let y = 22;
  const fx = M + 14;
  const fw = W - 14;
  const spineTop = y - 6;

  heading(doc, "Previous Schooling (if any)", M + 2, y, RED);
  y += 10;
  ruled(doc, "Name of School", fx + 6, y, fw - 6, { labelW: 34, value: d.prev_school });
  y += 8;
  ruled(doc, "Class Completed", fx + 6, y, fw - 6, { labelW: 34, value: d.class_completed });
  y += 12;

  heading(doc, "Medical Information", M + 2, y, BLUE);
  y += 11;
  doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(...RED);
  doc.text("Any medical problem", fx, y);
  doc.setDrawColor(...LINE).setLineWidth(0.25);
  doc.line(fx + 44, y + 1, M + W, y + 1);
  answer(doc, d.medical_problem, fx + 46, y, M + W - fx - 48);
  y += 9;
  ruled(doc, "Chronic illness/Special needs", fx, y, 104, { labelW: 52, size: 7.5, value: d.chronic });
  ruled(doc, "Allergies", fx + 108, y, fw - 108, { labelW: 20, size: 7.5, value: d.allergies });
  y += 13;

  heading(doc, "Reference Details:", M + 2, y, [140, 120, 100]);
  y += 10;
  ruled(doc, "Reference Through:", fx, y, fw, { labelW: 44, size: 7.5, value: d.reference_through });
  y += 7;
  ruled(doc, "Address with Tel No.:", fx, y, fw, { labelW: 44, size: 7.5, value: d.reference_address });
  y += 7;
  ruled(doc, "", fx + 44, y, fw - 44, { value: d.reference_address2 });
  y += 13;

  heading(doc, "Declaration:", M + 2, y, RED);
  y += 10;
  doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(...DARK);
  const declaration =
    "I confirm that all the information provided by me is true and correct. I accept full " +
    "responsibility for meeting all financial obligations on time. I understand that providing " +
    "any false or incorrect information may result in cancellation of admission.";
  doc.text(doc.splitTextToSize(declaration, fw - 4), fx, y);
  y += 22;

  ruled(doc, "Date:", fx, y, 70, { labelW: 16, value: d.declaration_date });
  ruled(doc, "Signature:", fx + 104, y, fw - 104, { labelW: 24 });
  hint(doc, "(Parent / Guardian)", M + W, y + 5, "right");
  y += 18;

  heading(doc, "For School office use only", M + 2, y, [90, 100, 115]);
  y += 10;

  doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(...DARK);
  doc.text("Checklist:", fx, y);
  y += 7;

  const col = (fw - 4) / 4;
  CHECKLIST.slice(0, 4).forEach(([key, label], i) =>
    checkbox(doc, fx + i * col, y, label, { fontSize: 7.5, checked: Boolean(d[key]) })
  );
  y += 8;
  CHECKLIST.slice(4).forEach(([key, label], i) =>
    checkbox(doc, fx + i * col, y, label, { fontSize: 7.5, checked: Boolean(d[key]) })
  );
  y += 10;

  ruled(doc, "Name of the Student:", fx, y, fw, { labelW: 44, value: d.office_student_name });
  y += 8;
  ruled(doc, "Class:", fx, y, 76, { labelW: 18, value: d.office_class });
  ruled(doc, "Section:", fx + 80, y, fw - 80, { labelW: 22, value: d.office_section });
  y += 22;

  ruled(doc, "Date:", fx, y, 70, { labelW: 16, value: d.office_date });
  ruled(doc, "Signature:", fx + 104, y, fw - 104, { labelW: 24 });
  hint(doc, "(Admission Officer)", M + W, y + 5, "right");
  y += 6;

  spine(doc, spineTop, y);

  doc.setFont("helvetica", "normal").setFontSize(6.5).setTextColor(...GREY);
  doc.text(
    `${settings?.address || "Service road South G-12/1, Islamabad (Opposite to metro bus station)"}   |   ${
      settings?.phone || "+92 312 3177778"
    }`,
    PAGE_W / 2,
    PAGE_H - 14,
    { align: "center" }
  );

  footerBar(doc);
}

/* -------------------------------------------------------------------- api */

async function build({ classes = [], settings = {}, data = {} } = {}) {
  const mod = await import("jspdf");
  const JsPDF = mod.jsPDF || mod.default?.jsPDF || mod.default;
  const doc = new JsPDF({ unit: "mm", format: "a4" });

  doc.setProperties({ title: "Kindle Sprout - Student Admission Form" });

  const img = await logoDataUrl(); // null when public/logo.png is absent

  pageOne(doc, classes, data, img);
  doc.addPage();
  pageTwo(doc, settings, data);

  return doc;
}

/** A sensible file name from whatever the student is called. */
function fileNameFor(data = {}) {
  const name = [data.student_first, data.student_middle, data.student_last]
    .filter(Boolean)
    .join(" ")
    .trim();
  return name
    ? `Admission-Form-${name.replace(/\s+/g, "_")}.pdf`
    : "Kindle-Sprout-Student-Admission-Form.pdf";
}

/** Download the admission form, blank or filled in. */
export async function downloadAdmissionForm(opts = {}) {
  const doc = await build(opts);
  doc.save(opts.filename || fileNameFor(opts.data));
}

/** A blob URL of the same PDF, for previewing it in an iframe. */
export async function admissionFormBlobUrl(opts = {}) {
  const doc = await build(opts);
  return doc.output("bloburl").toString();
}
