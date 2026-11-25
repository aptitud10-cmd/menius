import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Android puede suspender el AudioContext a mitad de turno (otra app toma el
 * audio, cambia la salida). Antes: la alerta "sonaba" muda, ningún `onended`
 * llegaba y todos los avisos quedaban en cola para siempre.
 */
class FakeSource {
  buffer: unknown = null;
  onended: (() => void) | null = null;
  started = false;
  connect() {}
  start() { this.started = true; }
  stop() {}
}

class FakeCtx {
  static last: FakeCtx | null = null;
  state: 'running' | 'suspended' = 'suspended';
  currentTime = 0;
  destination = {};
  sources: FakeSource[] = [];
  resume = vi.fn(async () => {});
  constructor() { FakeCtx.last = this; }
  createGain() { return { gain: { value: 1, setValueAtTime() {} }, connect() {} }; }
  createBufferSource() { const s = new FakeSource(); this.sources.push(s); return s; }
  createOscillator() { return { connect() {}, frequency: {}, start() {}, stop() {} }; }
  createBuffer() { return {}; }
  async decodeAudioData() { return { duration: 1.2 }; }
}

describe('Counter: sonido con el AudioContext suspendido', () => {
  beforeEach(() => {
    vi.resetModules();
    (globalThis as { window?: unknown }).window = { AudioContext: FakeCtx };
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete (globalThis as { window?: unknown }).window;
  });

  it('la alerta intenta reanudar el contexto y no deja los avisos trabados en cola', async () => {
    const audio = await import('@/components/orders/counter/audio');
    const { soundUrls } = await import('@/lib/sound-themes');
    await audio.loadTheme('firma');
    const ctx = FakeCtx.last!;
    expect(audio.isAudioRunning()).toBe(false);

    audio.playRing('alert');
    expect(ctx.resume).toHaveBeenCalled();

    // El contexto vuelve: un aviso suena en el acto (antes quedaba en cola
    // detrás de una alerta "sonando" que nunca terminaba).
    ctx.state = 'running';
    const before = ctx.sources.length;
    expect(await audio.playEvent('cancelled')).toBe(true);
    const evSrc = ctx.sources[ctx.sources.length - 1];
    expect(ctx.sources.length).toBe(before + 1);
    expect(evSrc.started).toBe(true);
    expect(evSrc.buffer).toBeTruthy();
    expect(soundUrls('firma').events.cancelled).toBeTruthy();
  });

  it('con el contexto corriendo, la alerta sí se anota y un aviso espera a que termine', async () => {
    const audio = await import('@/components/orders/counter/audio');
    await audio.loadTheme('firma');
    const ctx = FakeCtx.last!;
    ctx.state = 'running';
    audio.playRing('alert');
    const ring = ctx.sources[ctx.sources.length - 1];
    const before = ctx.sources.length;
    await audio.playEvent('cancelled');
    expect(ctx.sources.length).toBe(before); // en cola
    ring.onended?.();
    audio.setAlertActive(true);
    audio.setAlertActive(false); // vacía la cola
    await new Promise((r) => setTimeout(r, 0));
    expect(ctx.sources.length).toBe(before + 1);
  });
});
