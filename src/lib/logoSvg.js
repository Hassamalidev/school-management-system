/**
 * The Kindle Sprout crest, as SVG markup.
 *
 * Held as a string rather than JSX because it is used three ways from one
 * source: rendered on screen by <Logo>, rasterised to a PNG data URL for the
 * jsPDF writers, and served as the browser tab icon. A second copy would drift.
 *
 * The background is transparent on purpose, so the crest sits equally well on
 * the navy sidebar, a white card and a printed page.
 */
export const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" role="img" aria-label="Kindle Sprout">
  <defs>
    <linearGradient id="ks-gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f0d98a"/>
      <stop offset=".35" stop-color="#d4af37"/>
      <stop offset=".65" stop-color="#b8912c"/>
      <stop offset="1" stop-color="#e8cd7a"/>
    </linearGradient>
    <linearGradient id="ks-leaf" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8dc63f"/>
      <stop offset="1" stop-color="#3b7d2f"/>
    </linearGradient>
    <linearGradient id="ks-page" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fffdf5"/>
      <stop offset="1" stop-color="#efe7d2"/>
    </linearGradient>
    <linearGradient id="ks-cover" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#b8863b"/>
      <stop offset="1" stop-color="#7a5226"/>
    </linearGradient>
  </defs>

  <!-- shield: gold rim, dark green field, thin inner gold line -->
  <path d="M100 6C133 6 167 13 189 21v80c0 44-37 74-89 93-52-19-89-49-89-93V21C33 13 67 6 100 6Z"
        fill="url(#ks-gold)"/>
  <path d="M100 15C130 15 161 21 181 28v72c0 39-33 66-81 83-48-17-81-44-81-83V28c20-7 51-13 81-13Z"
        fill="#14401f"/>
  <path d="M100 23C128 23 156 28 175 35v65c0 35-30 60-75 76-45-16-75-41-75-76V35c19-7 47-12 75-12Z"
        fill="none" stroke="url(#ks-gold)" stroke-width="2.4"/>

  <!-- ivory medallion -->
  <ellipse cx="100" cy="99" rx="62" ry="71" fill="#f7f4e6"/>
  <ellipse cx="100" cy="99" rx="62" ry="71" fill="none" stroke="url(#ks-gold)" stroke-width="2.6"/>

  <!-- canopy -->
  <g>
    <circle cx="78" cy="72" r="20" fill="#2f7d32"/>
    <circle cx="122" cy="72" r="20" fill="#4a9c3e"/>
    <circle cx="88" cy="55" r="18" fill="#55a03a"/>
    <circle cx="113" cy="55" r="18" fill="#6fb544"/>
    <circle cx="100" cy="48" r="17" fill="#9ccc5a"/>
    <circle cx="100" cy="68" r="22" fill="#7fbe49"/>
    <circle cx="68" cy="60" r="13" fill="#3d8a34"/>
    <circle cx="132" cy="60" r="13" fill="#5aa73f"/>
  </g>

  <!-- trunk and branches -->
  <path d="M96 78h8l3 62H93Z" fill="#6f4a25"/>
  <path d="M100 86 84 68M100 92l16-20M100 100 90 88" fill="none" stroke="#6f4a25" stroke-width="3.4"
        stroke-linecap="round"/>

  <!-- wordmark, split by the trunk -->
  <text x="63" y="116" text-anchor="middle" font-family="Georgia,'Times New Roman',serif"
        font-size="21" letter-spacing="0.5" fill="#1b5e20">K<tspan font-size="16">INDLE</tspan></text>
  <text x="140" y="116" text-anchor="middle" font-family="Georgia,'Times New Roman',serif"
        font-size="21" letter-spacing="0.5" fill="#1b5e20">S<tspan font-size="16">PROUT</tspan></text>

  <!-- leaves springing from the book -->
  <path d="M97 140c-14-2-28 3-38 14 14 5 30 2 38-6Z" fill="url(#ks-leaf)"/>
  <path d="M103 140c14-2 28 3 38 14-14 5-30 2-38-6Z" fill="url(#ks-leaf)"/>

  <!-- open book -->
  <path d="M100 156c-14-9-33-12-53-9l-13 20c21-3 41 0 53 8Z" fill="url(#ks-page)" stroke="#8a5f2c" stroke-width="1.6" stroke-linejoin="round"/>
  <path d="M100 156c14-9 33-12 53-9l13 20c-21-3-41 0-53 8Z" fill="url(#ks-page)" stroke="#8a5f2c" stroke-width="1.6" stroke-linejoin="round"/>
  <path d="M34 167c21-3 41 0 53 8l-4 9c-12-7-31-10-52-7Z" fill="url(#ks-cover)"/>
  <path d="M166 167c-21-3-41 0-53 8l4 9c12-7 31-10 52-7Z" fill="url(#ks-cover)"/>
  <ellipse cx="100" cy="174" rx="9" ry="5" fill="#5a3a18"/>
</svg>`;
