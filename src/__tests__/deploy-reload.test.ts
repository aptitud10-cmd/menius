import { describe, expect, it } from 'vitest';
import { IDLE_BEFORE_RELOAD_MS, shouldReloadForDeploy } from '@/hooks/use-deploy-reload';

const idle = IDLE_BEFORE_RELOAD_MS;

describe('shouldReloadForDeploy', () => {
  it('recarga con deploy nuevo, pantalla visible, sin uso y sin nada pendiente', () => {
    expect(shouldReloadForDeploy({ stale: true, visible: true, msSinceTouch: idle, busy: false })).toBe(true);
  });
  it('no recarga sin deploy nuevo', () => {
    expect(shouldReloadForDeploy({ stale: false, visible: true, msSinceTouch: idle * 10, busy: false })).toBe(false);
  });
  it('no recarga si alguien tocó la pantalla hace poco', () => {
    expect(shouldReloadForDeploy({ stale: true, visible: true, msSinceTouch: idle - 1, busy: false })).toBe(false);
  });
  it('no recarga con pedidos sin aceptar, un Deshacer o un diálogo abierto', () => {
    expect(shouldReloadForDeploy({ stale: true, visible: true, msSinceTouch: idle * 10, busy: true })).toBe(false);
  });
  it('no recarga con la pantalla oculta (se hará al volver)', () => {
    expect(shouldReloadForDeploy({ stale: true, visible: false, msSinceTouch: idle * 10, busy: false })).toBe(false);
  });
});
