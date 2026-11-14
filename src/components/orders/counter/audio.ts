// Motor de audio del Counter (antes vivía dentro de CounterView.tsx; mismo
// motor, extendido con temas, volumen, urgente y aceptadas variadas).
//
// Estrategia (sin cambios): Web Audio API. Los MP3 se decodifican a
// AudioBuffers; una vez que el AudioContext se reanudó con un toque, los
// BufferSource creados desde timers suenan sin bloqueo — incluso en iOS Safari.
// En la app Android el WebView permite sonar sin gesto
// (mediaPlaybackRequiresUserGesture = false), así que ahí se desbloquea solo.

import { soundUrls, FALLBACK_SOUNDS, type SoundThemeId } from '@/lib/sound-themes';

// ─── Lógica pura (testeable) ─────────────────────────────────────────────────

/** Cada cuánto se repite la alerta: 3.5 s, o lo que dure el clip + 0.4 s si es más largo (que no se pisen). */
export const RING_EVERY_MS = 3500;
export function loopIntervalMs(clipSeconds: number | null | undefined): number {
  const clip = clipSeconds && Number.isFinite(clipSeconds) ? clipSeconds * 1000 + 400 : 0;
  return Math.max(RING_EVERY_MS, Math.round(clip));
}

/** alert o urgent según cuánto lleva esperando el pedido pendiente más viejo. */
export function ringKind(oldestWaitingMs: number | null, urgentAfterSeconds: number): 'alert' | 'urgent' {
  return oldestWaitingMs != null && oldestWaitingMs >= urgentAfterSeconds * 1000 ? 'urgent' : 'alert';
}

/** Elige una aceptada al azar entre las disponibles, sin repetir la anterior (si hay más de una). */
export function pickAcceptedIndex(available: number[], previous: number | null, rand: () => number = Math.random): number | null {
  if (available.length === 0) return null;
  const pool = available.length > 1 ? available.filter((i) => i !== previous) : available;
  return pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))];
}

// ─── Estado del motor (uno por página) ───────────────────────────────────────

let _ctx: AudioContext | null = null;
let _gain: GainNode | null = null;
let _volume = 0.8;
let _theme: SoundThemeId = 'firma';
let _lastAccepted: number | null = null;
const _buffers = new Map<string, AudioBuffer>();
const _loading = new Map<string, Promise<AudioBuffer | null>>();
/** Lo que está sonando de la alerta: se corta al aceptar. */
const _ringing = new Set<AudioBufferSourceNode>();
let _lastRingAt = 0;
let _lastRingDur = 0;

export function getAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!_ctx) {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      _ctx = new Ctx();
      _gain = _ctx.createGain();
      _gain.gain.value = _volume;
      _gain.connect(_ctx.destination);
    } catch { return null; }
  }
  return _ctx;
}

function out(ctx: AudioContext): AudioNode {
  return _gain ?? ctx.destination;
}

/** Volumen 0–100 (GainNode). */
export function setVolume(v: number) {
  _volume = Math.max(0, Math.min(100, v)) / 100;
  if (_gain && _ctx) {
    try { _gain.gain.setValueAtTime(_volume, _ctx.currentTime); } catch { _gain.gain.value = _volume; }
  }
}

/** Reanuda el contexto (iOS lo suspende al volver de segundo plano). */
export function resumeAudio() {
  const ctx = getAudioCtx();
  if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {});
}

/** Toque silencioso dentro de un gesto: deja el contexto desbloqueado para siempre. */
export function unlockWithGesture() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  try {
    const src = ctx.createBufferSource();
    src.buffer = ctx.createBuffer(1, 1, 22050);
    src.connect(ctx.destination);
    src.start(0);
  } catch { /* ignore */ }
}

export function loadBuffer(url: string): Promise<AudioBuffer | null> {
  const hit = _buffers.get(url);
  if (hit) return Promise.resolve(hit);
  const pending = _loading.get(url);
  if (pending) return pending;
  const ctx = getAudioCtx();
  if (!ctx) return Promise.resolve(null);
  const p = (async () => {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const buf = await ctx.decodeAudioData(await res.arrayBuffer());
      _buffers.set(url, buf);
      return buf;
    } catch { return null; }
    finally { _loading.delete(url); }
  })();
  _loading.set(url, p);
  return p;
}

/** Precarga los 5 archivos de un tema + los 2 de respaldo. */
export function loadTheme(id: SoundThemeId): Promise<void> {
  const u = soundUrls(id);
  return Promise.all([u.alert, u.urgent, ...u.accepted, FALLBACK_SOUNDS.alert, FALLBACK_SOUNDS.accepted].map(loadBuffer)).then(() => {});
}

/** Tema activo de las alertas (precarga en segundo plano). */
export function setSoundTheme(id: SoundThemeId) {
  if (_theme !== id) _lastAccepted = null;
  _theme = id;
  void loadTheme(id);
}

function play(buffer: AudioBuffer, track = false): number {
  const ctx = getAudioCtx();
  if (!ctx) return 0;
  try {
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(out(ctx));
    if (track) {
      _ringing.add(src);
      src.onended = () => { _ringing.delete(src); };
    }
    src.start(0);
    return buffer.duration;
  } catch { return 0; }
}

/** Último recurso si no cargó ningún MP3: el acorde sintetizado de siempre. */
function synthChime(): number {
  const ctx = getAudioCtx();
  if (!ctx) return 0;
  try {
    [523, 659, 784].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g); g.connect(out(ctx));
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.18;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.6, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.start(t); osc.stop(t + 0.55);
    });
  } catch { /* unavailable */ }
  return 0.9;
}

/**
 * Suena la alerta (o la urgente) del tema activo. Respaldo: urgente → alerta
 * del tema → new-order.mp3 → acorde sintetizado. Devuelve la duración (s).
 */
export function playRing(kind: 'alert' | 'urgent' = 'alert'): number {
  const u = soundUrls(_theme);
  const buf = (kind === 'urgent' ? _buffers.get(u.urgent) : undefined)
    ?? _buffers.get(u.alert)
    ?? _buffers.get(FALLBACK_SOUNDS.alert);
  let dur: number;
  if (buf) dur = play(buf, true);
  else { void loadTheme(_theme); dur = synthChime(); }
  _lastRingAt = Date.now();
  _lastRingDur = dur;
  return dur;
}

/** Cuánto falta para la próxima repetición si la última alerta sonó hace poco (que no se pisen). */
export function msUntilNextRing(now = Date.now()): number {
  return Math.max(0, loopIntervalMs(_lastRingDur) - (now - _lastRingAt));
}

/** Corta en seco la alerta que esté sonando. */
export function stopRing() {
  _ringing.forEach((s) => { try { s.stop(); } catch { /* ya terminó */ } });
  _ringing.clear();
}

/** Una aceptada del tema al azar, sin repetir la anterior. Respaldo: order-accepted.mp3. */
export function playAccepted(): number {
  const u = soundUrls(_theme);
  const available = u.accepted.map((url, i) => (_buffers.has(url) ? i : -1)).filter((i) => i >= 0);
  const idx = pickAcceptedIndex(available, _lastAccepted);
  if (idx != null) {
    _lastAccepted = idx;
    return play(_buffers.get(u.accepted[idx])!);
  }
  const fb = _buffers.get(FALLBACK_SOUNDS.accepted);
  if (fb) return play(fb);
  return synthChime();
}

/**
 * Vista previa de un tema en el panel: su alerta y, al terminar (mín. 1.5 s),
 * su accepted-1. No cambia el tema activo.
 */
export async function previewTheme(id: SoundThemeId): Promise<() => void> {
  resumeAudio();
  const u = soundUrls(id);
  const [alert, accepted] = await Promise.all([loadBuffer(u.alert), loadBuffer(u.accepted[0])]);
  const ctx = getAudioCtx();
  if (!ctx || !alert) return () => {};
  const srcs: AudioBufferSourceNode[] = [];
  const at = (buf: AudioBuffer, when: number) => {
    const s = ctx.createBufferSource();
    s.buffer = buf; s.connect(out(ctx)); s.start(ctx.currentTime + when);
    srcs.push(s);
  };
  at(alert, 0);
  if (accepted) at(accepted, Math.max(1.5, alert.duration + 0.2));
  return () => srcs.forEach((s) => { try { s.stop(); } catch { /* ya terminó */ } });
}

/** Un toque corto al mover el volumen (la alerta del tema activo, sin trackear). */
export function previewVolume() {
  resumeAudio();
  const buf = _buffers.get(soundUrls(_theme).accepted[0]) ?? _buffers.get(FALLBACK_SOUNDS.accepted);
  if (buf) play(buf);
  else synthChime();
}
