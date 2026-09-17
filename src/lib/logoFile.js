"use client";

/**
 * Where the school's logo artwork lives in `public/`.
 *
 * The file is whatever the office happened to send — a JPEG today, maybe a PNG
 * or WebP tomorrow — so every consumer probes this list rather than hard-coding
 * one extension. The first one that loads wins, and the answer is cached for
 * the page so a miss costs one request, not one per <Logo> on screen.
 */
// The file currently shipped leads, so the usual case costs no 404. Replace
// the artwork with any of these names and it is picked up automatically.
export const LOGO_CANDIDATES = ["/logo.jpg", "/logo.png", "/logo.jpeg", "/logo.webp"];

let resolved; // undefined = untested, null = none found, string = the winning path
const waiting = new Set();

/** The URL of the artwork, or null if none of the candidates exist. */
export function findLogo() {
  if (resolved !== undefined) return Promise.resolve(resolved);

  return new Promise((resolve) => {
    waiting.add(resolve);
    if (waiting.size > 1) return; // a probe is already in flight

    const settle = (value) => {
      resolved = value;
      waiting.forEach((fn) => fn(value));
      waiting.clear();
    };

    let i = 0;
    const tryNext = () => {
      if (i >= LOGO_CANDIDATES.length) return settle(null);
      const path = LOGO_CANDIDATES[i++];
      const img = new Image();
      img.onload = () => settle(path);
      img.onerror = tryNext;
      img.src = path;
    };
    tryNext();
  });
}
