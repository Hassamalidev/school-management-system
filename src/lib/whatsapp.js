"use client";

import { dmy, num, periodLabel } from "@/lib/format";

/**
 * Sending a challan to a parent over WhatsApp.
 *
 * There is no gateway and no API key: a wa.me link opens WhatsApp with the
 * message already written, and the staff member presses send. That keeps the
 * app free to run and means messages come from the school's own number.
 */

const DEFAULT_COUNTRY = "92"; // Pakistan

/**
 * Turn whatever was typed into a student record into the digits wa.me wants.
 *
 * Handles the shapes the office actually enters:
 *   "+92 312 3177778" / "0312 3177778" / "312-3177778" / "00923123177778"
 * Returns null when there is nothing usable, so the caller can flag the row
 * rather than opening a chat with a wrong number.
 */
export function normalisePhone(raw, country = DEFAULT_COUNTRY) {
  if (!raw) return null;

  let d = String(raw).replace(/[^\d+]/g, "");
  if (!d) return null;

  if (d.startsWith("+")) d = d.slice(1);
  else if (d.startsWith("00")) d = d.slice(2);

  // Local forms: 03xx… -> 3xx…, then prefix the country code.
  if (!d.startsWith(country)) {
    d = d.replace(/^0+/, "");
    if (!d) return null;
    d = country + d;
  }

  // A Pakistani mobile is 92 + 10 digits; allow a little latitude for others.
  if (d.length < 11 || d.length > 15) return null;
  return d;
}

/** True when this student can actually be messaged. */
export function canMessage(phone) {
  return normalisePhone(phone) !== null;
}

/**
 * The message body for one challan. Unpaid and part-paid challans ask for the
 * balance and carry the bank details; a settled one simply confirms receipt.
 */
export function challanMessage(ch, settings = {}, items = [], note = "") {
  const school = settings.school_name || "Kindle Sprout Daycare & School";
  const period = periodLabel(ch.year, ch.month);
  const settled = Number(ch.remaining) <= 0;

  const lines = [`*${school}*`, settled ? `Fee Receipt — ${period}` : `Fee Challan — ${period}`, ""];

  lines.push(`Student: *${ch.student_name}*`);
  if (ch.class_name) lines.push(`Class: ${ch.class_name}`);
  lines.push(`Receipt No: ${ch.receipt_no}`, "");

  if (items.length) {
    lines.push("*Fee details*");
    items.forEach((it) => lines.push(`• ${it.name}: PKR ${num(it.amount)}`));
    lines.push("");
  }

  lines.push(`Total fee: PKR ${num(ch.payable)}`);
  lines.push(`Paid: PKR ${num(ch.paid)}`);

  if (settled) {
    lines.push("", "✅ Paid in full — thank you.");
  } else {
    lines.push(`*Remaining: PKR ${num(ch.remaining)}*`);
    if (ch.due_date) lines.push(`Please pay by ${dmy(ch.due_date)}.`);
    lines.push("", "*Payment details*");
    if (settings.bank_name) lines.push(settings.bank_name);
    if (settings.bank_title) lines.push(`Title: ${settings.bank_title}`);
    if (settings.account_number) lines.push(`Account: ${settings.account_number}`);
    if (settings.iban) lines.push(`IBAN: ${settings.iban}`);
    lines.push("Cash is also accepted at the school office.");
  }

  if (note?.trim()) lines.push("", note.trim());

  lines.push("", settings.phone ? `Queries: ${settings.phone}` : "", "Thank you.");

  return lines.filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n");
}

/** The wa.me URL that opens WhatsApp with this message ready to send. */
export function whatsappLink(phone, message) {
  const to = normalisePhone(phone);
  if (!to) return null;
  return `https://wa.me/${to}?text=${encodeURIComponent(message)}`;
}
