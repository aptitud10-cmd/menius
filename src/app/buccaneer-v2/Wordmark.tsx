/**
 * WORDMARK v0 — PLACEHOLDER.
 *
 * The final wordmark is the roof sign's blackletter, redrawn by hand as an SVG
 * from shot S08 (AD 5.6). That drawing does not exist yet, and AD 5.3 forbids
 * loading any blackletter font, so this slot uses the closest specified face
 * (Besley 700) stretched to the lockup's box. Color comes from --b2-wm
 * (Rooftop by day, Neon at night) via currentColor, exactly like the final SVG.
 *
 * Replace the <text> nodes with the traced paths; keep the viewBox ratios and
 * the aria-label so the header/footer CSS does not change.
 */
export function WordmarkA() {
  return (
    <svg
      className="b2-wm b2-wm--a"
      viewBox="0 0 116 24"
      role="img"
      aria-label="Buccaneer Diner"
      data-wordmark="v0-placeholder"
    >
      <text x="0" y="19" textLength="116" lengthAdjust="spacingAndGlyphs" fill="currentColor">
        Buccaneer
      </text>
    </svg>
  );
}

export function WordmarkB() {
  return (
    <svg
      className="b2-wm b2-wm--b"
      viewBox="0 0 200 72"
      role="img"
      aria-label="Buccaneer Diner"
      data-wordmark="v0-placeholder"
    >
      <text x="0" y="40" textLength="200" lengthAdjust="spacingAndGlyphs" fill="currentColor" className="b2-wm__top">
        Buccaneer
      </text>
      <text x="0" y="68" textLength="92" lengthAdjust="spacingAndGlyphs" className="b2-wm__diner">
        Diner
      </text>
    </svg>
  );
}

export function PhoneIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6.6 3h3.2l1.5 4.1-2 1.4a10.5 10.5 0 0 0 5.2 5.2l1.4-2L20 13.2v3.2a2 2 0 0 1-2.2 2A15.5 15.5 0 0 1 4.6 5.2 2 2 0 0 1 6.6 3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MapPin() {
  return (
    <svg className="b2-pin" width="32" height="40" viewBox="0 0 32 40" aria-hidden="true">
      <path
        d="M16 2C8.8 2 3 7.6 3 14.6 3 24 16 38 16 38s13-14 13-23.4C29 7.6 23.2 2 16 2Z"
        fill="var(--b2-neon)"
        stroke="var(--b2-paper)"
        strokeWidth="2"
      />
      <circle cx="16" cy="14.5" r="4.5" fill="var(--b2-paper)" />
    </svg>
  );
}
