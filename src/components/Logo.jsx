"use client";

import { useEffect, useState } from "react";
import { LOGO_SVG } from "@/lib/logoSvg";
import { findLogo } from "@/lib/logoFile";

/**
 * The Kindle Sprout mark.
 *
 * Uses the artwork in `public/` when it is there, whatever its extension, and
 * falls back to the drawn crest in `lib/logoSvg.js` otherwise — so the app
 * still looks right if the file is ever missing from a deploy.
 */
export default function Logo({ className = "h-10 w-10", rounded = true }) {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    let alive = true;
    findLogo().then((found) => alive && setSrc(found));
    return () => {
      alive = false;
    };
  }, []);

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- a plain <img> keeps
      // this usable inside the print stylesheet and avoids next/image config.
      <img
        src={src}
        alt="Kindle Sprout Daycare & School"
        className={`${className} object-contain ${rounded ? "rounded-lg" : ""}`}
      />
    );
  }

  return (
    <span
      className={`${className} inline-block [&>svg]:h-full [&>svg]:w-full`}
      aria-label="Kindle Sprout Daycare & School"
      role="img"
      dangerouslySetInnerHTML={{ __html: LOGO_SVG }}
    />
  );
}

/** Logo plus the school wordmark, used in the sidebar and on the login screen. */
export function LogoWordmark({ compact = false, dark = false }) {
  return (
    <div className="flex items-center gap-3">
      <Logo className={compact ? "h-9 w-9 shrink-0" : "h-12 w-12 shrink-0"} />
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
