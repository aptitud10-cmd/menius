/**
 * CSS mínimo de la fase 2 para not-found.tsx y error.tsx (raíz).
 *
 * Va en un <style> que solo existe mientras esas pantallas están montadas:
 * los dos son boundaries del layout raíz y un `import './x.css'` ahí se
 * cargaría en TODAS las rutas (tiendas incluidas). Es un subconjunto de
 * landing-v2.css + lv2-pages.css (mismas reglas, mismos valores), bajo .lv2.
 */
export const LV2_MIN_CSS = `
html:has(.lv2m), body:has(.lv2m) { background-color: #F6F1E7; }
.lv2 { --paper:#F6F1E7; --paper-2:#EEE7D9; --card:#FFFDF8; --ink:#1C1915; --ink-2:#4E473E; --ink-3:#685F53; --line:#DAD0BF;
  --green:#047A65; --green-ink:#035E4E; --dot:#05C8A7; --bad:#A3261A; --bad-bg:#FBEDEA;
  --sans: var(--font-inter), 'Inter', system-ui, sans-serif; --serif: var(--font-serif), 'Instrument Serif', Georgia, serif;
  --gutter: 40px; --max: 1200px;
  position: relative; width: 100%; max-width: 100vw; min-height: 100vh; display: flex; flex-direction: column;
  background: var(--paper); color: var(--ink); font-family: var(--sans); font-size: 17px; line-height: 1.55; -webkit-font-smoothing: antialiased; overflow-x: clip; }
.lv2 *, .lv2 *::before, .lv2 *::after { box-sizing: border-box; margin: 0; padding: 0; }
.lv2 > main { flex: 1 0 auto; }
.lv2 a { color: inherit; }
.lv2 button { font: inherit; color: inherit; background: none; border: 0; cursor: pointer; }
.lv2 .wrap { max-width: calc(var(--max) + 2 * var(--gutter)); margin: 0 auto; padding: 0 var(--gutter); }
.lv2 a:focus-visible, .lv2 button:focus-visible { outline: 3px solid var(--green); outline-offset: 3px; border-radius: 6px; }
.lv2 .btn:focus-visible { border-radius: 12px; }
.lv2 h1 { font-family: var(--serif); font-weight: 400; color: inherit; text-wrap: balance; letter-spacing: 0; }
.lv2 .lead { font-size: 19px; line-height: 1.55; color: var(--ink-2); text-wrap: pretty; }
.lv2 .btn { display: inline-flex; align-items: center; justify-content: center; height: 52px; padding: 0 26px; border-radius: 12px; font-weight: 600; font-size: 16px; text-decoration: none; white-space: nowrap; transition: background-color .15s ease; }
.lv2 .btn-sm { height: 44px; padding: 0 18px; font-size: 15px; }
.lv2 .btn-primary { background: var(--green); color: #fff; }
.lv2 .btn-primary:hover { background: var(--green-ink); }
.lv2 .tlink { display: inline-flex; align-items: center; min-height: 44px; font-weight: 600; font-size: 16px; text-decoration: underline; text-decoration-thickness: 1.5px; text-underline-offset: 5px; }
.lv2 .nav { position: relative; z-index: 30; height: 72px; border-bottom: 1px solid var(--line); background: var(--paper); }
.lv2 .nav .wrap { height: 100%; display: flex; align-items: center; gap: 40px; }
.lv2 .logo { font-weight: 800; font-size: 20px; letter-spacing: .02em; text-decoration: none; display: inline-flex; align-items: center; gap: 5px; }
.lv2 .logo i { width: 7px; height: 7px; border-radius: 50%; background: var(--dot); margin-top: 6px; }
.lv2 .nav-links { display: flex; gap: 32px; font-size: 15px; font-weight: 500; color: var(--ink-2); }
.lv2 .nav-links a { text-decoration: none; }
.lv2 .nav-links a:hover { color: var(--ink); }
.lv2 .nav-right { margin-left: auto; display: flex; align-items: center; gap: 24px; }
.lv2 .nav-phone { font-size: 15px; font-weight: 600; text-decoration: none; font-variant-numeric: tabular-nums; }
.lv2 .menu-btn { display: none; width: 44px; height: 44px; border-radius: 12px; border: 1px solid var(--line); align-items: center; justify-content: center; color: var(--ink); }
.lv2 .menu-panel { position: absolute; top: 100%; left: 0; right: 0; background: var(--paper); border-bottom: 1px solid var(--line); box-shadow: 0 24px 40px -24px rgba(28,25,21,.28); padding: 6px 16px 18px; }
.lv2 .menu-panel[hidden] { display: none; }
.lv2 .menu-panel ul { list-style: none; }
.lv2 .menu-panel li a { display: flex; align-items: center; min-height: 52px; border-bottom: 1px solid var(--line); font-size: 17px; font-weight: 600; text-decoration: none; }
.lv2 .nav-min .wrap { justify-content: space-between; }
.lv2 .lost { padding: 80px 0 120px; }
.lv2 .lost-grid { display: grid; grid-template-columns: 6fr 6fr; gap: 56px; align-items: center; }
.lv2 .lost-grid > * { min-width: 0; }
.lv2 .lost-grid.one { grid-template-columns: 1fr; max-width: 680px; gap: 28px; }
.lv2 .lost .big { font-family: var(--serif); font-size: 320px; line-height: .78; letter-spacing: -0.04em; color: var(--ink); }
.lv2 .lost h1 { font-size: 72px; line-height: 1; margin-top: 24px; }
.lv2 .lost .lead { margin-top: 16px; max-width: 38ch; }
.lv2 .lost .row { display: flex; align-items: center; gap: 28px; margin-top: 32px; flex-wrap: wrap; }
.lv2 .lost .ref { margin-top: 22px; font: 500 14px/1.4 ui-monospace, Consolas, monospace; color: var(--ink-3); }
.lv2 .err-ico { width: 64px; height: 64px; border-radius: 18px; background: var(--bad-bg); color: var(--bad); display: flex; align-items: center; justify-content: center; }
.lv2 .foot { border-top: 1px solid var(--line); padding: 64px 0 max(40px, env(safe-area-inset-bottom)); }
.lv2 .foot-grid { display: grid; grid-template-columns: 5fr 2fr 2fr 2fr; gap: 40px; }
.lv2 .foot h2 { font-family: var(--sans); font-size: 13px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--ink-3); line-height: 1.55; }
.lv2 .foot ul { list-style: none; margin-top: 16px; display: grid; gap: 10px; font-size: 15px; }
.lv2 .foot ul a { text-decoration: none; color: var(--ink-2); }
.lv2 .foot ul a:hover { color: var(--ink); text-decoration: underline; }
.lv2 .foot .talk .tel { display: block; width: fit-content; font-size: 28px; font-weight: 650; letter-spacing: -0.03em; margin-top: 14px; text-decoration: none; font-variant-numeric: tabular-nums; }
.lv2 .foot .talk p { color: var(--ink-2); font-size: 15px; margin-top: 4px; }
.lv2 .foot .talk p a { text-decoration: none; }
.lv2 .foot-bottom { margin-top: 56px; padding-top: 24px; border-top: 1px solid var(--line); display: flex; justify-content: space-between; align-items: center; font-size: 14px; color: var(--ink-3); }
.lv2 .lang { display: inline; white-space: nowrap; }
.lv2 .lang b { color: var(--ink); }
.lv2 .lang button { display: inline-block; padding: 12px 14px 12px 10px; margin: -12px -14px -12px -10px; line-height: 20px; font-size: 14px; color: var(--ink-3); text-decoration: underline; text-underline-offset: 3px; }
.lv2 .foot-min { padding: 24px 0 max(24px, env(safe-area-inset-bottom)); border-top: 1px solid var(--line); font-size: 14px; color: var(--ink-3); }
.lv2 .foot-min .wrap { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.lv2 .foot-min a { color: var(--ink-2); text-decoration: underline; text-underline-offset: 3px; }
@media (max-width: 1100px) {
  .lv2 { --gutter: 32px; }
  .lv2 .nav-links { display: none; }
  .lv2 .lost-grid { grid-template-columns: 1fr; gap: 8px; }
  .lv2 .lost .big { font-size: 240px; }
  .lv2 .foot-grid { grid-template-columns: 1fr 1fr 1fr; }
  .lv2 .foot-grid .talk { grid-column: 1 / -1; }
}
@media (max-width: 640px) {
  .lv2 { --gutter: 16px; font-size: 16px; }
  .lv2 .lead { font-size: 17px; }
  .lv2 .nav { height: 64px; }
  .lv2 .nav .wrap { gap: 10px; }
  .lv2 .nav:not(.nav-min) .nav-phone { display: none; }
  .lv2 .nav-right { gap: 8px; }
  .lv2 .menu-btn { display: inline-flex; }
  .lv2 .lost { padding: 32px 0 72px; }
  .lv2 .lost .big { font-size: 150px; }
  .lv2 .lost h1 { font-size: 44px; margin-top: 18px; }
  .lv2 .lost .row { flex-direction: column; align-items: stretch; gap: 6px; }
  .lv2 .lost .row .tlink { align-self: flex-start; }
  .lv2 .foot { padding-top: 48px; }
  .lv2 .foot-grid { grid-template-columns: 1fr 1fr 1fr; gap: 24px 12px; }
  .lv2 .foot ul { gap: 6px; font-size: 14px; margin-top: 10px; }
  .lv2 .foot h2 { font-size: 12px; }
  .lv2 .foot-bottom { flex-direction: column; align-items: flex-start; gap: 10px; margin-top: 40px; }
}
@media (prefers-reduced-motion: reduce) { .lv2 * { transition: none !important; } }
`;
