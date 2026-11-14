import { describe, it, expect } from 'vitest';
import { hashPin, verifyPin, isValidPin, panelUnlockUntil, PANEL_UNLOCK_MINUTES } from '@/lib/panel-pin';

describe('PIN del panel', () => {
  it('acepta solo 4 a 6 dígitos', () => {
    expect(isValidPin('1234')).toBe(true);
    expect(isValidPin('123456')).toBe(true);
    expect(isValidPin('123')).toBe(false);
    expect(isValidPin('1234567')).toBe(false);
    expect(isValidPin('12a4')).toBe(false);
    expect(isValidPin(1234)).toBe(false);
  });

  it('el hash no contiene el PIN, usa sal y verifica', async () => {
    const a = await hashPin('4821');
    const b = await hashPin('4821');
    expect(a).not.toContain('4821');
    expect(a).not.toBe(b); // sal distinta
    expect(a.startsWith('scrypt$')).toBe(true);
    expect(await verifyPin('4821', a)).toBe(true);
    expect(await verifyPin('4822', a)).toBe(false);
    expect(await verifyPin('482', a)).toBe(false);
  });

  it('un hash roto o de otro formato nunca abre', async () => {
    expect(await verifyPin('4821', '')).toBe(false);
    expect(await verifyPin('4821', 'bcrypt$x$y')).toBe(false);
    expect(await verifyPin('4821', 'scrypt$16384$8$1$AAAA$AAAA')).toBe(false);
  });

  it('el panel dura 10 min desde ahora', () => {
    const t = Date.UTC(2026, 10, 13, 12, 0, 0);
    expect(panelUnlockUntil(t)).toBe(new Date(t + PANEL_UNLOCK_MINUTES * 60_000).toISOString());
    expect(PANEL_UNLOCK_MINUTES).toBe(10);
  });
});
