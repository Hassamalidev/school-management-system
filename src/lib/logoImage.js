"use client";

import { LOGO_SVG } from "@/lib/logoSvg";
import { findLogo } from "@/lib/logoFile";

/**
 * The school's logo as a PNG data URL, for embedding in generated PDFs.
 *
 * jsPDF needs image bytes, not markup. Preference order:
 *   1. the artwork in `public/`, whatever its extension;
 *   2. the shared `LOGO_SVG` crest.
 * Either source is painted onto a canvas and read back as PNG, so the writers
 * can always declare "PNG" to jsPDF no matter what the office supplied.
 * Either way the PDF writers get a real image, so no caller has to care which.
 * Resolves to null only if both routes fail (e.g. server-side), and the writers
 * then fall back to their drawn shield.
 */

const RASTER_SIZE = 512; // plenty for a 16mm square at print resolution

let cache; // undefined = not tried, null = unavailable, string = data URL

/** Paint any same-origin image URL onto a canvas and read it back as PNG. */
async function rasterise(url) {
  const img = await new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error(`could not load ${url}`));
    el.src = url;
  });

  const canvas = document.createElement("canvas");
  canvas.width = RASTER_SIZE;
  canvas.height = RASTER_SIZE;
  const ctx = canvas.getContext("2d");

  // Letterbox rather than stretch, so a non-square file keeps its proportions.
  const scale = Math.min(RASTER_SIZE / img.width, RASTER_SIZE / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, (RASTER_SIZE - w) / 2, (RASTER_SIZE - h) / 2, w, h);

  // Same-origin sources leave the canvas untainted, so this is allowed.
  return canvas.toDataURL("image/png");
}

async function svgDataUrl() {
  const blob = new Blob([LOGO_SVG], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    return await rasterise(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function logoDataUrl() {
  if (cache !== undefined) return cache;

  try {
    const file = await findLogo();
    if (file) {
      cache = await rasterise(file);
      return cache;
    }
  } catch {
    /* artwork missing or unreadable — fall through to the drawn crest */
  }

  try {
    cache = await svgDataUrl();
  } catch {
    cache = null;
  }
  return cache;
}
