"use client";

import { useState } from "react";

/**
 * The Kindle Sprout mark.
 *
 * Prefers the real artwork at `public/logo.png`. If that file is missing the
 * component falls back to a drawn approximation, so the app still looks right
 * before the asset is dropped in.
 */
export default function Logo({ className = "h-10 w-10" }) {
  const [failed, setFailed] = useState(false);

  if (failed) return <VectorMark className={className} />;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- a plain <img> keeps
    // this usable inside the print stylesheet and avoids next/image config.
    <img
      src="/logo.png"
      alt="Kindle Sprout Daycare & School"
      className={`${className} object-contain`}
      onError={() => setFailed(true)}
    />
  );
}

/** Fallback: a sprout growing from an open book inside a gold-rimmed shield. */
function VectorMark({ className }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="Kindle Sprout">
      <path
        d="M32 2 60 9v25c0 13-11.5 23.5-28 29C15.5 57.5 4 47 4 34V9L32 2Z"
        fill="#17552d"
        stroke="#d4af37"
        strokeWidth="2.5"
      />
      <path
        d="M32 7.5 55.5 13v20.8c0 10.8-9.6 19.6-23.5 24.3C18.1 53.4 8.5 44.6 8.5 33.8V13L32 7.5Z"
        fill="none"
        stroke="#e3c264"
        strokeWidth="1.2"
      />
      <circle cx="32" cy="22" r="8.5" fill="#4ea468" />
      <circle cx="24.5" cy="25" r="6" fill="#2f8a4c" />
      <circle cx="39.5" cy="25" r="6" fill="#7fc191" />
      <rect x="30.6" y="26" width="2.8" height="12" rx="1" fill="#8a5a2b" />
      <path d="M11 40h19a3 3 0 0 1 2 1v11a3 3 0 0 0-2-1H11V40Z" fill="#f7f3e8" stroke="#8a5a2b" strokeWidth="1.6" />
      <path d="M53 40H34a3 3 0 0 0-2 1v11a3 3 0 0 1 2-1h19V40Z" fill="#fffdf6" stroke="#8a5a2b" strokeWidth="1.6" />
    </svg>
  );
}

/** Logo plus the school wordmark, used in the sidebar and on the login screen. */
export function LogoWordmark({ compact = false, dark = false }) {
  return (
    <div className="flex items-center gap-3">
      <Logo className={compact ? "h-9 w-9 shrink-0 rounded-lg" : "h-12 w-12 shrink-0 rounded-lg"} />
      <div className="leading-tight">
        <div className={`font-bold tracking-tight ${compact ? "text-base" : "text-xl"} ${dark ? "text-navy-900" : "text-white"}`}>
          Kindle Sprout
        </div>
        <div className={`${compact ? "text-[11px]" : "text-sm"} font-semibold ${dark ? "text-brand-700" : "text-brand-200"}`}>
          Daycare &amp; School
        </div>
        {!compact && (
          <div className={`mt-0.5 text-[10px] font-medium tracking-[0.18em] ${dark ? "text-slate-500" : "text-slate-300"}`}>
            LEARN | GROW | SHINE
          </div>
        )}
      </div>
    </div>
  );
}
