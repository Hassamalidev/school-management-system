"use client";

import { supabase } from "@/lib/supabase";

/**
 * Getting the challan PDF itself to a parent, not just the figures as text.
 *
 * WhatsApp's wa.me link can pre-fill a message to a specific number but cannot
 * attach a file, so the PDF is uploaded to a private Supabase bucket and the
 * message carries a time-limited signed link. Private rather than public,
 * because a challan names a child and shows what the family owes.
 *
 * On a phone, `shareWithFile` can hand WhatsApp the actual file through the
 * system share sheet — but the sheet chooses the recipient, so it is offered
 * alongside the link rather than in place of it.
 */

const BUCKET = "challans";
const LINK_DAYS = 60;

/** True when this browser can share a PDF through the system share sheet. */
export function canShareFile() {
  if (typeof navigator === "undefined" || typeof navigator.canShare !== "function") return false;
  try {
    const probe = new File([new Blob(["x"], { type: "application/pdf" })], "p.pdf", {
      type: "application/pdf",
    });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

/**
 * Hand the PDF to the system share sheet. Resolves true when the sheet opened
 * (including when the user then cancelled), false when sharing is unavailable.
 */
export async function shareWithFile({ blob, name, text }) {
  if (!canShareFile()) return false;
  const file = new File([blob], name, { type: "application/pdf" });
  try {
    await navigator.share({ files: [file], text });
    return true;
  } catch (e) {
    return e?.name === "AbortError"; // the user closed the sheet; nothing broke
  }
}

function randomId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Raised when the storage bucket has not been created yet. */
export class BucketMissingError extends Error {
  constructor() {
    super("The challans storage bucket does not exist yet.");
    this.name = "BucketMissingError";
  }
}

/**
 * Upload the PDF and return a signed link the parent can open for 60 days.
 * The path is unguessable, so the link is the only way in.
 */
export async function uploadChallanPdf(blob, name, ch) {
  const path = `${ch?.year ?? "misc"}/${String(ch?.month ?? "00").padStart(2, "0")}/${randomId()}-${name}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: "application/pdf", upsert: false });

  if (error) {
    const msg = `${error.message || ""} ${error.error || ""}`.toLowerCase();
    if (msg.includes("bucket") && (msg.includes("not found") || msg.includes("exist"))) {
      throw new BucketMissingError();
    }
    throw new Error(error.message || "Could not upload the challan.");
  }

  const { data, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, LINK_DAYS * 24 * 60 * 60);

  if (signError) throw new Error(signError.message || "Could not create the download link.");
  return data.signedUrl;
}

export const LINK_VALID_DAYS = LINK_DAYS;
