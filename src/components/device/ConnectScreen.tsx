'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { generateQRDataUrl } from '@/lib/styled-qr';

type Locale = 'es' | 'en';
type Phase = 'loading' | 'ready' | 'connected' | 'error';

const T = {
  es: {
    eyebrow: 'Conectar esta tablet',
    titleA: 'Recibe los pedidos de tu restaurante ',
    titleB: 'aquí, en tiempo real.',
    titlePhone: 'Conecta este dispositivo a tu restaurante',
    renews: 'Código nuevo en',
    renewsTail: '· se renueva solo',
    step1a: 'Escanea el código con tu celular, o abre ',
    step2a: 'Entra con la cuenta ',
    step2b: 'del dueño',
    step2c: ' del restaurante.',
    step3a: 'Toca ',
    step3b: 'Conectar',
    step3c: '. Esta tablet abre el Counter sola, y no vuelve a pedir login.',
    qrPhone: 'Escanéalo con otro teléfono, o abre',
    qrPhoneTail: 'y escribe el código.',
    preferPassword: '¿Prefieres tu contraseña?',
    emailLogin: 'Entrar con email',
    connected: 'Tablet conectada',
    opening: 'Abriendo el Counter',
    of: 'de',
    error: 'No pudimos generar un código.',
    errorHint: 'Revisa el WiFi. Reintentamos solos en unos segundos.',
    computerTitle: '¿Estás en tu computadora?',
    computerBody: 'Este código es para la tablet del mostrador. Si lo apruebas, esta computadora quedará limitada al Counter. Para conectar la tablet, abre la app MENIUS Counter en ella.',
  },
  en: {
    eyebrow: 'Connect this tablet',
    titleA: 'Get your restaurant’s orders ',
    titleB: 'right here, in real time.',
    titlePhone: 'Connect this device to your restaurant',
    renews: 'New code in',
    renewsTail: '· renews by itself',
    step1a: 'Scan the code with your phone, or open ',
    step2a: 'Sign in with the restaurant ',
    step2b: 'owner’s',
    step2c: ' account.',
    step3a: 'Tap ',
    step3b: 'Connect',
    step3c: '. This tablet opens the Counter by itself and never asks to sign in again.',
    qrPhone: 'Scan it with another phone, or open',
    qrPhoneTail: 'and type the code.',
    preferPassword: 'Prefer your password?',
    emailLogin: 'Sign in with email',
    connected: 'Tablet connected',
    opening: 'Opening the Counter',
    of: 'for',
    error: 'We couldn’t create a code.',
    errorHint: 'Check the Wi-Fi. We’ll retry by ourselves in a few seconds.',
    computerTitle: 'On your computer?',
    computerBody: 'This code is for the counter tablet. If you approve this code, this computer will be limited to the Counter. To connect the tablet, open the MENIUS Counter app on it.',
  },
} as const;

const POLL_MS = 2000;
const SHORT_URL = 'menius.app/link';

interface Pairing {
  code: string;
  secret: string;
  expiresAt: number;
  ttl: number;
}

export function ConnectScreen({ locale }: { locale: Locale }) {
  const t = T[locale];
  const [phase, setPhase] = useState<Phase>('loading');
  const [pairing, setPairing] = useState<Pairing | null>(null);
  const [qr, setQr] = useState<string>('');
  const [now, setNow] = useState(() => Date.now());
  const [restaurantName, setRestaurantName] = useState<string | null>(null);
  const [generation, setGeneration] = useState(0); // bumps on every new code → re-runs the flip
  const startingRef = useRef(false);
  // Mouse + hover = a computer, not the counter tablet. Pedro's first test paired
  // his computer by accident; warn instead of blocking (some places run a laptop).
  const [onComputer, setOnComputer] = useState(false);
  useEffect(() => {
    const inApp = !!(window as unknown as { MeniusAndroid?: unknown }).MeniusAndroid;
    setOnComputer(!inApp && window.matchMedia('(hover: hover) and (pointer: fine)').matches);
  }, []);

  const requestCode = useCallback(async () => {
    if (startingRef.current) return;
    startingRef.current = true;
    try {
      const res = await fetch('/api/devices/pair/start', { method: 'POST', cache: 'no-store' });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { code: string; secret: string; expiresAt: string };
      const expiresAt = new Date(data.expiresAt).getTime();
      setPairing({ code: data.code, secret: data.secret, expiresAt, ttl: Math.max(1, expiresAt - Date.now()) });
      setGeneration((g) => g + 1);
      setPhase('ready');
      const origin = window.location.origin;
      setQr(await generateQRDataUrl(`${origin}/link?code=${data.code}`, 360));
    } catch {
      setPhase('error');
    } finally {
      startingRef.current = false;
    }
  }, []);

  // First code.
  useEffect(() => { void requestCode(); }, [requestCode]);

  // Error → retry by itself (a till tablet has nobody to press "retry").
  useEffect(() => {
    if (phase !== 'error') return;
    const id = window.setTimeout(() => void requestCode(), 5000);
    return () => window.clearTimeout(id);
  }, [phase, requestCode]);

  // Clock for the countdown ring; renew the code when it runs out.
  useEffect(() => {
    if (phase !== 'ready') return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [phase]);
  useEffect(() => {
    if (phase === 'ready' && pairing && now >= pairing.expiresAt) void requestCode();
  }, [now, phase, pairing, requestCode]);

  // Poll for approval.
  useEffect(() => {
    if (phase !== 'ready' || !pairing) return;
    let stopped = false;
    const tick = async () => {
      try {
        const res = await fetch('/api/devices/pair/poll', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: pairing.code, secret: pairing.secret }),
          cache: 'no-store',
        });
        const data = (await res.json()) as { status?: string; restaurantName?: string | null };
        if (stopped) return;
        if (data.status === 'connected') {
          stopped = true;
          setRestaurantName(data.restaurantName ?? null);
          setPhase('connected');
          try { (window as unknown as { MeniusAndroid?: { vibrateNewOrder?: () => void } }).MeniusAndroid?.vibrateNewOrder?.(); } catch { /* not in app */ }
          window.setTimeout(() => window.location.replace('/counter'), 1400);
        } else if (data.status === 'expired') {
          stopped = true;
          void requestCode();
        }
      } catch {
        /* transient network error — next tick retries */
      }
    };
    const id = window.setInterval(tick, POLL_MS);
    return () => { stopped = true; window.clearInterval(id); };
  }, [phase, pairing, requestCode]);

  const remainingMs = pairing ? Math.max(0, pairing.expiresAt - now) : 0;
  const mm = Math.floor(remainingMs / 60000);
  const ss = Math.floor((remainingMs % 60000) / 1000).toString().padStart(2, '0');
  const progress = pairing ? remainingMs / pairing.ttl : 1;
  const chars = (pairing?.code ?? '······').split('');

  return (
    <main className="cx-root" data-phase={phase}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="cx-grain" aria-hidden />

      {phase === 'connected' ? (
        <section className="cx-ok" role="status" aria-live="polite">
          <div className="cx-aurora cx-aurora-ok" aria-hidden />
          <div className="cx-badge" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="#032019" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" className="cx-check" /></svg>
          </div>
          <h1 className="font-display cx-ok-title">{t.connected}</h1>
          <p className="cx-ok-sub">
            {t.opening}{restaurantName ? <> {t.of} <b>{restaurantName}</b></> : null}…
          </p>
          <div className="cx-bar" aria-hidden><i /></div>
        </section>
      ) : (
        <div className="cx-grid">
          <section className="cx-stage">
            <div className="cx-aurora" aria-hidden />
            <div className="cx-aurora cx-aurora-b" aria-hidden />
            <Brand />

            <div className="cx-center">
              <p className="cx-eyebrow">{t.eyebrow}</p>
              <h1 className="font-display cx-title cx-title-wide">{t.titleA}<span>{t.titleB}</span></h1>
              <h1 className="font-display cx-title cx-title-narrow">{t.titlePhone}</h1>

              {phase === 'error' ? (
                <div className="cx-error" role="alert">
                  <b>{t.error}</b>
                  <span>{t.errorHint}</span>
                </div>
              ) : (
                <>
                  <div className="cx-code font-display" aria-label={pairing?.code ?? ''} aria-live="polite" key={generation}>
                    {chars.map((ch, i) => (
                      <span key={i} className="cx-code-group">
                        {i === 3 && <span className="cx-sep" aria-hidden />}
                        <span className={`cx-tile ${phase === 'loading' ? 'is-loading' : ''}`} style={{ animationDelay: `${i * 70}ms` }}>{ch}</span>
                      </span>
                    ))}
                  </div>
                  <div className="cx-meta">
                    <svg className="cx-ring" viewBox="0 0 36 36" aria-hidden>
                      <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="3" />
                      <circle cx="18" cy="18" r="15" fill="none" stroke="#05c8a7" strokeWidth="3" strokeLinecap="round"
                        strokeDasharray="94.25" strokeDashoffset={94.25 * (1 - progress)} transform="rotate(-90 18 18)" />
                    </svg>
                    <span>{t.renews} <b>{mm}:{ss}</b> <span className="cx-hide-narrow">{t.renewsTail}</span></span>
                  </div>
                </>
              )}

              {onComputer && phase !== 'error' && (
                <div className="cx-warn" role="note">
                  <b>{t.computerTitle}</b>
                  <span>{t.computerBody}</span>
                </div>
              )}

              {/* Phone layout: compact QR card under the code */}
              <div className="cx-qrmini">
                <div className="cx-qrmini-img">{qr && <img src={qr} alt="" />}</div>
                <p>{t.qrPhone} <b>{SHORT_URL}</b> {t.qrPhoneTail}</p>
              </div>
            </div>

            <div className="cx-foot">
              <span className="cx-hide-narrow">{t.preferPassword}</span>
              <a href="/login?next=%2Fcounter">{t.emailLogin}</a>
            </div>
          </section>

          <aside className="cx-side">
            <div className="cx-qr">{qr ? <img src={qr} alt="" /> : <div className="cx-qr-skel" />}</div>
            <ol className="cx-steps">
              <li><span className="cx-num">1</span><span>{t.step1a}<span className="cx-url font-display">{SHORT_URL}</span></span></li>
              <li><span className="cx-num">2</span><span>{t.step2a}<b>{t.step2b}</b>{t.step2c}</span></li>
              <li><span className="cx-num">3</span><span>{t.step3a}<b>{t.step3b}</b>{t.step3c}</span></li>
            </ol>
          </aside>
        </div>
      )}
    </main>
  );
}

function Brand() {
  return (
    <div className="cx-brand font-display">
      <span className="cx-mark">M<i /></span>
      MENIUS <small>Counter</small>
    </div>
  );
}

/* Scoped styles: this screen lives outside the dashboard and needs motion the
   Tailwind config doesn't define (flip, spring badge). Everything is prefixed cx-. */
const CSS = `
.cx-root{--bg:#050505;--ink:#fafafa;--mute:#8a8a8a;--line:rgba(255,255,255,.08);--teal:#05c8a7;
  position:fixed;inset:0;background:var(--bg);color:var(--ink);font-family:var(--font-inter),system-ui,sans-serif;
  overflow:hidden;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;
  padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)}
.cx-grain{position:absolute;inset:0;pointer-events:none;opacity:.07;mix-blend-mode:overlay;z-index:1;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")}
.cx-grid{position:relative;height:100%;display:grid;grid-template-columns:1.45fr 1fr}
.cx-stage{position:relative;padding:clamp(28px,4.5vw,56px) clamp(24px,5vw,64px);display:flex;flex-direction:column;min-height:0;overflow:hidden}
.cx-aurora{position:absolute;width:900px;height:900px;left:-260px;top:-180px;border-radius:50%;pointer-events:none;
  background:radial-gradient(closest-side,rgba(5,200,167,.30),rgba(5,200,167,.08) 45%,transparent 70%);animation:cx-drift 18s ease-in-out infinite alternate}
.cx-aurora-b{width:520px;height:520px;left:auto;right:-120px;top:auto;bottom:-160px;background:radial-gradient(closest-side,rgba(29,228,192,.14),transparent 70%);animation-duration:24s}
@keyframes cx-drift{to{transform:translate(60px,40px) scale(1.06)}}
.cx-brand{position:relative;z-index:2;display:flex;align-items:center;gap:12px;font-weight:800;font-size:20px;letter-spacing:-.04em}
.cx-brand small{font-family:var(--font-inter),sans-serif;font-weight:500;font-size:13px;color:var(--mute);letter-spacing:0;margin-left:6px;padding-left:12px;border-left:1px solid var(--line)}
.cx-mark{width:34px;height:34px;border-radius:10px;background:#111;border:1px solid var(--line);position:relative;display:grid;place-items:center;font-size:19px}
.cx-mark i{position:absolute;width:9px;height:9px;border-radius:50%;background:var(--teal);right:-3px;top:-3px;box-shadow:0 0 0 3px var(--bg);animation:cx-beat 2.4s ease-in-out infinite}
@keyframes cx-beat{0%,100%{transform:scale(1)}50%{transform:scale(1.25)}}
.cx-center{position:relative;z-index:2;margin:auto 0;display:flex;flex-direction:column;gap:clamp(18px,3vh,30px)}
.cx-eyebrow{font-size:13px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--teal)}
.cx-title{font-size:clamp(32px,4.1vw,52px);line-height:1.02;font-weight:800;letter-spacing:-.035em;max-width:620px}
.cx-title span{color:var(--mute)}
.cx-title-narrow{display:none}
.cx-code{display:flex;align-items:center;gap:clamp(7px,1.1vw,14px);perspective:600px}
.cx-code-group{display:contents}
.cx-tile{width:clamp(48px,7.5vw,96px);height:clamp(64px,9.7vw,124px);border-radius:clamp(14px,1.7vw,22px);display:grid;place-items:center;
  font-size:clamp(36px,5.9vw,76px);font-weight:700;letter-spacing:-.02em;color:var(--ink);
  background:linear-gradient(180deg,rgba(255,255,255,.075),rgba(255,255,255,.02));border:1px solid rgba(255,255,255,.10);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 20px 40px rgba(0,0,0,.35);
  animation:cx-flip .62s cubic-bezier(.34,1.56,.64,1) both;transform-origin:50% 50%}
.cx-tile.is-loading{color:transparent;animation:cx-shimmer 1.4s ease-in-out infinite}
@keyframes cx-flip{from{transform:rotateX(-90deg);opacity:0}to{transform:rotateX(0);opacity:1}}
@keyframes cx-shimmer{50%{background:linear-gradient(180deg,rgba(255,255,255,.12),rgba(255,255,255,.04))}}
.cx-sep{width:14px;height:4px;border-radius:2px;background:rgba(255,255,255,.18);margin:0 4px}
.cx-meta{display:flex;align-items:center;gap:14px;color:var(--mute);font-size:15px}
.cx-meta b{color:var(--ink);font-weight:600;font-variant-numeric:tabular-nums}
.cx-ring{width:26px;height:26px;flex:none}
.cx-ring circle:last-child{transition:stroke-dashoffset .25s linear}
.cx-error{display:flex;flex-direction:column;gap:6px;border:1px solid rgba(245,165,36,.3);background:rgba(245,165,36,.08);border-radius:18px;padding:16px 18px;max-width:520px}
.cx-error b{font-size:17px}.cx-error span{color:#cfcfcf;font-size:14px}
.cx-warn{display:flex;flex-direction:column;gap:4px;border:1px solid rgba(245,165,36,.35);background:rgba(245,165,36,.08);border-radius:16px;padding:14px 16px;max-width:560px;user-select:text;-webkit-user-select:text}
.cx-warn b{font-size:15px;color:#f3d9a8}.cx-warn span{color:#cfcfcf;font-size:14px;line-height:1.45}
.cx-foot{position:relative;z-index:2;display:flex;gap:20px;align-items:center;color:var(--mute);font-size:14px;padding-top:16px}
.cx-foot a{color:var(--ink);text-decoration:underline;text-decoration-color:rgba(255,255,255,.3);text-underline-offset:6px;min-height:44px;display:inline-flex;align-items:center}
.cx-foot a:active{color:var(--teal);border-color:var(--teal)}
.cx-side{position:relative;z-index:2;border-left:1px solid var(--line);background:linear-gradient(180deg,#0b0b0b,#070707);
  padding:clamp(28px,4.5vw,56px) clamp(24px,4vw,52px);display:flex;flex-direction:column;justify-content:center;gap:34px}
.cx-qr{align-self:flex-start;background:#fff;border-radius:26px;padding:18px;box-shadow:0 30px 70px rgba(0,0,0,.5),0 0 0 8px rgba(5,200,167,.10)}
.cx-qr img,.cx-qr-skel{width:clamp(150px,15vw,188px);height:clamp(150px,15vw,188px);display:block}
.cx-qr-skel{border-radius:10px;background:#eee}
.cx-steps{list-style:none;display:flex;flex-direction:column;gap:20px;margin:0;padding:0}
.cx-steps li{display:grid;grid-template-columns:34px 1fr;gap:14px;align-items:start;font-size:16px;line-height:1.45;color:#cfcfcf}
.cx-steps b{color:var(--ink);font-weight:600}
.cx-num{width:34px;height:34px;border-radius:50%;border:1px solid var(--line);display:grid;place-items:center;font-size:13px;font-weight:700;color:var(--teal)}
.cx-url{font-weight:700;color:var(--ink);background:rgba(5,200,167,.12);padding:2px 8px;border-radius:7px;white-space:nowrap}
.cx-qrmini{display:none}

/* Connected */
.cx-ok{position:relative;z-index:2;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:26px;text-align:center;padding:24px}
.cx-aurora-ok{left:50%;top:50%;transform:translate(-50%,-55%);animation:none}
.cx-badge{position:relative;width:132px;height:132px;border-radius:40px;background:var(--teal);display:grid;place-items:center;
  box-shadow:0 0 0 14px rgba(5,200,167,.12),0 0 0 32px rgba(5,200,167,.05),0 30px 90px rgba(5,200,167,.35);
  animation:cx-pop .7s cubic-bezier(.34,1.56,.64,1) both}
.cx-badge svg{width:64px;height:64px}
.cx-check{stroke-dasharray:24;stroke-dashoffset:24;animation:cx-draw .45s .25s ease-out forwards}
@keyframes cx-pop{from{transform:scale(.4) rotate(-12deg);border-radius:66px;opacity:0}to{transform:none;opacity:1}}
@keyframes cx-draw{to{stroke-dashoffset:0}}
.cx-ok-title{position:relative;font-size:clamp(36px,5vw,56px);font-weight:800;letter-spacing:-.035em;line-height:1;animation:cx-rise .5s .15s cubic-bezier(.2,.8,.2,1) both}
.cx-ok-sub{position:relative;font-size:18px;color:var(--mute);animation:cx-rise .5s .25s cubic-bezier(.2,.8,.2,1) both}
.cx-ok-sub b{color:var(--ink)}
@keyframes cx-rise{from{transform:translateY(12px);opacity:0}to{transform:none;opacity:1}}
.cx-bar{position:relative;width:220px;height:4px;border-radius:2px;background:rgba(255,255,255,.08);overflow:hidden}
.cx-bar i{position:absolute;inset:0;background:var(--teal);border-radius:2px;transform-origin:left;animation:cx-fill 1.3s cubic-bezier(.6,0,.2,1) forwards}
@keyframes cx-fill{from{transform:scaleX(0)}to{transform:scaleX(1)}}

/* Portrait / phone: one column, compact QR card under the code */
@media (max-width: 899px), (orientation: portrait) and (max-width: 1100px) {
  .cx-grid{grid-template-columns:1fr}
  .cx-side{display:none}
  .cx-title-wide{display:none}.cx-title-narrow{display:block}
  .cx-hide-narrow{display:none}
  .cx-eyebrow{display:none}
  .cx-center{margin:auto 0}
  .cx-title-narrow{font-size:clamp(30px,6.2vw,52px)}
  .cx-tile{width:clamp(46px,12.5vw,104px);height:clamp(60px,16vw,134px);font-size:clamp(34px,9.5vw,84px);border-radius:clamp(14px,2.6vw,24px)}
  .cx-sep{width:clamp(8px,1.6vw,14px)}
  .cx-qrmini{display:flex;gap:16px;align-items:center;border:1px solid var(--line);border-radius:20px;padding:14px;background:rgba(255,255,255,.02);max-width:520px}
  .cx-qrmini-img{width:clamp(92px,17vw,150px);height:clamp(92px,17vw,150px);background:#fff;border-radius:12px;padding:7px;flex:none}
  .cx-qrmini-img img{width:100%;height:100%;display:block}
  .cx-qrmini p{font-size:clamp(14px,2.2vw,18px);line-height:1.45;color:#cfcfcf;margin:0}
  .cx-qrmini{max-width:640px}
  .cx-foot{justify-content:center}
}
@media (prefers-reduced-motion: reduce){
  .cx-root *{animation:none!important;transition:none!important}
  .cx-check{stroke-dashoffset:0}
}
`;
