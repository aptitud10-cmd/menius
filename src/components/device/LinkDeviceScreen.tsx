'use client';

import { useEffect, useRef, useState } from 'react';
import { PAIRING_ALPHABET, PAIRING_CODE_LENGTH } from '@/lib/device-pairing-alphabet';

type Locale = 'es' | 'en';
type State = 'idle' | 'sending' | 'done' | 'error';

const T = {
  es: {
    cancel: 'Cancelar',
    title: 'Conecta una tablet',
    sub: 'Escribe el código que aparece en la pantalla de la tablet.',
    willSee: 'La tablet entrará con tu cuenta de dueño y verá los pedidos de este restaurante.',
    fromApp: 'App MENIUS Counter',
    askMine: '¿Es la tablet que tienes delante?',
    notApp: 'Este código NO viene de la app MENIUS Counter. Si alguien te lo envió por mensaje o teléfono, no lo conectes: le darías acceso a tu cuenta.',
    unknownPlace: 'Ubicación desconocida',
    ctaMine: 'Sí, conectar esta tablet',
    cta: 'Conectar tablet',
    sending: 'Conectando…',
    fine: 'Solo conecta tablets que tengas delante. MENIUS nunca te pedirá un código por teléfono o mensaje.',
    doneTitle: 'Listo',
    doneSub: 'La tablet ya está abriendo el Counter. Puedes cerrar esta pantalla.',
    another: 'Conectar otra tablet',
    notFound: 'Ese código venció o no existe. Mira el de la tablet: se renueva cada 5 minutos.',
    rateLimited: 'Demasiados intentos. Espera un par de minutos.',
    generic: 'No pudimos conectar la tablet. Intenta de nuevo.',
    notOwner: 'Solo el dueño del restaurante puede conectar tablets. Pídele que abra esta pantalla desde su cuenta.',
    back: 'Volver al panel',
  },
  en: {
    cancel: 'Cancel',
    title: 'Connect a tablet',
    sub: 'Type the code shown on the tablet’s screen.',
    willSee: 'The tablet will sign in with your owner account and see this restaurant’s orders.',
    fromApp: 'MENIUS Counter app',
    askMine: 'Is this the tablet in front of you?',
    notApp: 'This code does NOT come from the MENIUS Counter app. If someone sent it to you by message or phone, don’t connect it — it would give them access to your account.',
    unknownPlace: 'Unknown location',
    ctaMine: 'Yes, connect this tablet',
    cta: 'Connect tablet',
    sending: 'Connecting…',
    fine: 'Only connect tablets that are right in front of you. MENIUS will never ask you for a code by phone or message.',
    doneTitle: 'Done',
    doneSub: 'The tablet is opening the Counter now. You can close this screen.',
    another: 'Connect another tablet',
    notFound: 'That code expired or doesn’t exist. Check the one on the tablet — it renews every 5 minutes.',
    rateLimited: 'Too many attempts. Wait a couple of minutes.',
    generic: 'We couldn’t connect the tablet. Please try again.',
    notOwner: 'Only the restaurant owner can connect tablets. Ask them to open this screen from their account.',
    back: 'Back to dashboard',
  },
} as const;

function clean(raw: string): string {
  let out = '';
  for (const ch of raw.toUpperCase()) {
    if (PAIRING_ALPHABET.includes(ch)) out += ch;
    if (out.length === PAIRING_CODE_LENGTH) break;
  }
  return out;
}

export function LinkDeviceScreen({
  locale,
  initialCode,
  restaurantName,
  isOwner,
}: {
  locale: Locale;
  initialCode: string;
  restaurantName: string | null;
  isOwner: boolean;
}) {
  const t = T[locale];
  const [code, setCode] = useState(clean(initialCode));
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const complete = code.length === PAIRING_CODE_LENGTH;
  // Where the request came from — shown before approving (anti-phishing).
  const [origin, setOrigin] = useState<{ place: string | null; fromApp: boolean } | null>(null);

  useEffect(() => {
    setOrigin(null);
    if (!complete || !isOwner) return;
    let cancelled = false;
    fetch('/api/devices/pair/info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 404) { setError(t.notFound); setState('error'); return; }
        if (!res.ok) return;
        const d = (await res.json()) as { city?: string | null; region?: string | null; country?: string | null; fromApp?: boolean };
        let country = d.country ?? null;
        try { if (country) country = new Intl.DisplayNames([locale], { type: 'region' }).of(country) ?? country; } catch { /* keep code */ }
        const place = [d.city, d.region, country].filter(Boolean).join(', ') || null;
        setOrigin({ place, fromApp: !!d.fromApp });
      })
      .catch(() => { /* preview is best-effort; approve still validates */ });
    return () => { cancelled = true; };
  }, [code, complete, isOwner, locale, t.notFound]);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!complete || state === 'sending') return;
    setState('sending');
    setError('');
    try {
      const res = await fetch('/api/devices/pair/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      if (res.ok) {
        setState('done');
        try { navigator.vibrate?.([30, 40, 30]); } catch { /* unsupported */ }
        return;
      }
      setError(res.status === 404 ? t.notFound : res.status === 429 ? t.rateLimited : t.generic);
      setState('error');
    } catch {
      setError(t.generic);
      setState('error');
    }
  }

  return (
    <main className="lk-root">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="lk-wrap">
        <header className="lk-top">
          <span className="lk-brand font-display"><span className="lk-mark">M<i /></span>MENIUS</span>
          <a href="/app" className="lk-cancel">{state === 'done' ? t.back : t.cancel}</a>
        </header>

        {!isOwner ? (
          <section className="lk-body">
            <h1 className="font-display lk-title">{t.title}</h1>
            <p className="lk-alert">{t.notOwner}</p>
          </section>
        ) : state === 'done' ? (
          <section className="lk-body lk-done" role="status">
            <div className="lk-badge" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="#032019" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
            </div>
            <h1 className="font-display lk-title">{t.doneTitle}</h1>
            <p className="lk-sub">{t.doneSub}</p>
            <button type="button" className="lk-ghost" onClick={() => { setCode(''); setState('idle'); inputRef.current?.focus(); }}>
              {t.another}
            </button>
          </section>
        ) : (
          <form className="lk-body" onSubmit={submit}>
            <h1 className="font-display lk-title">{t.title}</h1>
            <p className="lk-sub">{t.sub}</p>

            {/* One real input (keyboard, paste, autofill) under six painted boxes. */}
            <label className="lk-boxes font-display" onClick={() => inputRef.current?.focus()}>
              <input
                ref={inputRef}
                className="lk-input"
                value={code}
                onChange={(e) => { setCode(clean(e.target.value)); if (state === 'error') setState('idle'); }}
                inputMode="text"
                autoCapitalize="characters"
                autoComplete="one-time-code"
                autoCorrect="off"
                spellCheck={false}
                autoFocus={!initialCode}
                aria-label={t.sub}
                maxLength={12}
              />
              {Array.from({ length: PAIRING_CODE_LENGTH }).map((_, i) => (
                <span key={i} className={`lk-box ${i === code.length ? 'is-focus' : ''} ${state === 'error' ? 'is-error' : ''}`}>
                  {code[i] ?? ''}
                </span>
              ))}
            </label>

            {error && <p className="lk-alert" role="alert">{error}</p>}

            {origin && (
              <div className={`lk-origin ${origin.fromApp ? '' : 'is-warn'}`}>
                <span className="lk-origin-ic" aria-hidden>
                  {origin.fromApp
                    ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2.5" width="16" height="19" rx="3"/><path d="M10.5 18.5h3"/></svg>
                    : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l9.5 17h-19L12 3z"/><path d="M12 10v4.5M12 17.5v.01"/></svg>}
                </span>
                <span>
                  <b>{origin.place ?? t.unknownPlace}{origin.fromApp ? ` · ${t.fromApp}` : ''}</b>
                  {origin.fromApp ? t.askMine : t.notApp}
                </span>
              </div>
            )}

            {restaurantName && (
              <div className="lk-who">
                <span className="lk-av font-display">{restaurantName.trim().charAt(0).toUpperCase()}</span>
                <span><b>{restaurantName}</b>{t.willSee}</span>
              </div>
            )}

            <div className="lk-actions">
              <button type="submit" className={`lk-cta ${origin && !origin.fromApp ? 'is-warn' : ''}`} disabled={!complete || state === 'sending'}>
                {state === 'sending' ? t.sending : origin?.fromApp ? t.ctaMine : t.cta}
              </button>
              <p className="lk-fine">{t.fine}</p>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}

const CSS = `
.lk-root{--bg:#050505;--ink:#fafafa;--mute:#8a8a8a;--line:rgba(255,255,255,.08);--teal:#05c8a7;
  min-height:100dvh;background:var(--bg);color:var(--ink);font-family:var(--font-inter),system-ui,sans-serif;
  padding:max(20px,env(safe-area-inset-top)) max(20px,env(safe-area-inset-right)) max(24px,env(safe-area-inset-bottom)) max(20px,env(safe-area-inset-left));
  display:flex;justify-content:center;-webkit-tap-highlight-color:transparent}
.lk-wrap{width:100%;max-width:440px;display:flex;flex-direction:column;min-height:calc(100dvh - 48px)}
.lk-top{display:flex;justify-content:space-between;align-items:center;padding-top:12px}
.lk-brand{display:flex;align-items:center;gap:10px;font-weight:800;font-size:17px;letter-spacing:-.04em}
.lk-mark{width:28px;height:28px;border-radius:8px;background:#111;border:1px solid var(--line);position:relative;display:grid;place-items:center;font-size:15px}
.lk-mark i{position:absolute;width:8px;height:8px;border-radius:50%;background:var(--teal);right:-3px;top:-3px;box-shadow:0 0 0 3px var(--bg)}
.lk-cancel{color:var(--mute);font-size:14px;text-decoration:none;padding:12px 0 12px 12px}
.lk-cancel:active{color:var(--ink)}
.lk-body{flex:1;display:flex;flex-direction:column;padding-top:44px}
.lk-title{font-size:36px;font-weight:800;letter-spacing:-.035em;line-height:1.04}
.lk-sub{color:var(--mute);font-size:15px;line-height:1.5;margin-top:12px}
.lk-boxes{position:relative;display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-top:34px;cursor:text}
.lk-input{position:absolute;inset:0;opacity:0;font-size:16px;caret-color:transparent;color:transparent;background:transparent;border:0}
.lk-box{height:64px;border-radius:16px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);display:grid;place-items:center;
  font-size:30px;font-weight:700;transition:border-color .15s,box-shadow .15s,transform .2s cubic-bezier(.34,1.56,.64,1)}
.lk-boxes:focus-within .lk-box.is-focus{border-color:var(--teal);box-shadow:0 0 0 4px rgba(5,200,167,.18)}
.lk-boxes:focus-within .lk-box.is-focus:empty:after{content:"";width:2px;height:28px;background:var(--teal);border-radius:1px;animation:lk-caret 1s steps(1) infinite}
.lk-box.is-error{border-color:rgba(245,90,70,.6);animation:lk-shake .35s}
@keyframes lk-caret{50%{opacity:0}}
@keyframes lk-shake{25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
.lk-alert{margin-top:16px;border-radius:14px;border:1px solid rgba(245,165,36,.3);background:rgba(245,165,36,.08);color:#f3d9a8;font-size:14px;line-height:1.45;padding:12px 14px}
.lk-origin{margin-top:22px;border-radius:18px;border:1px solid rgba(5,200,167,.35);background:rgba(5,200,167,.07);padding:14px 16px;display:flex;gap:12px;align-items:flex-start;font-size:14px;color:#cfcfcf;line-height:1.45}
.lk-origin b{display:block;color:var(--ink);font-size:15px;margin-bottom:2px}
.lk-origin-ic{width:22px;height:22px;flex:none;color:var(--teal);margin-top:1px}
.lk-origin-ic svg{width:100%;height:100%}
.lk-origin.is-warn{border-color:rgba(245,90,70,.5);background:rgba(245,90,70,.08);color:#f3c9bf}
.lk-origin.is-warn .lk-origin-ic{color:#f5715a}
.lk-who{margin-top:14px;border-radius:18px;border:1px solid var(--line);padding:14px 16px;display:flex;gap:12px;align-items:center;font-size:14px;color:#cfcfcf;line-height:1.4}
.lk-who b{display:block;color:var(--ink);font-size:15px}
.lk-av{width:38px;height:38px;border-radius:12px;background:#151515;display:grid;place-items:center;font-weight:800;color:var(--teal);flex:none}
.lk-actions{margin-top:auto;padding-top:28px}
.lk-cta{width:100%;height:58px;border-radius:18px;border:0;background:var(--teal);color:#032019;font-weight:700;font-size:17px;
  transition:transform .15s cubic-bezier(.34,1.56,.64,1),opacity .15s,background .15s}
.lk-cta:active:not(:disabled){transform:scale(.97);background:#04b396}
.lk-cta:focus-visible{outline:2px solid #fff;outline-offset:3px}
.lk-cta:disabled{opacity:.35}
.lk-cta.is-warn{background:transparent;color:var(--ink);border:1px solid rgba(255,255,255,.2)}
.lk-cta.is-warn:active:not(:disabled){background:rgba(255,255,255,.06)}
.lk-fine{margin-top:14px;text-align:center;font-size:12.5px;color:#6b6b6b;line-height:1.5}
.lk-done{align-items:flex-start}
.lk-badge{width:88px;height:88px;border-radius:28px;background:var(--teal);display:grid;place-items:center;margin-bottom:28px;
  box-shadow:0 0 0 10px rgba(5,200,167,.12),0 24px 60px rgba(5,200,167,.3);animation:lk-pop .6s cubic-bezier(.34,1.56,.64,1) both}
.lk-badge svg{width:44px;height:44px}
@keyframes lk-pop{from{transform:scale(.5);opacity:0}to{transform:none;opacity:1}}
.lk-ghost{margin-top:auto;height:52px;border-radius:16px;border:1px solid var(--line);background:transparent;color:var(--ink);font-weight:600;font-size:15px}
.lk-ghost:active{background:rgba(255,255,255,.05)}
@media (prefers-reduced-motion: reduce){.lk-root *{animation:none!important;transition:none!important}}
`;
