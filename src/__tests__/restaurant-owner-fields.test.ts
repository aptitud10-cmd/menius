import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ownerOnlyChanges, stripRestaurantSecrets } from '@/lib/restaurant-owner-fields';

const saved = {
  payment_methods_enabled: ['cash', 'online'],
  mp_access_token: null,
  mp_enabled: false,
  tax_rate: 8.875,
  tax_included: false,
  tax_label: 'Sales tax',
  currency: 'USD',
  country_code: 'US',
  custom_domain: null,
  fiscal_rfc: null,
  fiscal_razon_social: null,
  fiscal_regimen_fiscal: null,
  fiscal_lugar_expedicion: null,
};

// Lo que manda el formulario de Configuración al guardar, sin tocar nada de cobros.
const formAsIs = {
  name: 'Buccaneer Diner',
  operating_hours: { mon: { open: '06:00', close: '23:00' } },
  payment_methods_enabled: ['online', 'cash'],
  tax_rate: 8.875,
  tax_included: false,
  tax_label: 'Sales tax',
  currency: 'USD',
  country_code: 'US',
  custom_domain: null,
};

describe('campos de cobro que una tablet no cambia', () => {
  it('guardar el formulario sin tocar cobros no cuenta como cambio (aunque cambie el orden)', () => {
    expect(ownerOnlyChanges(saved, formAsIs)).toEqual([]);
    expect(ownerOnlyChanges(saved, { ...formAsIs, tax_rate: '8.875', custom_domain: '' })).toEqual([]);
  });

  it('detecta impuesto, tarjeta apagada, moneda y dominio', () => {
    expect(ownerOnlyChanges(saved, { ...formAsIs, tax_rate: 0 })).toEqual(['tax_rate']);
    expect(ownerOnlyChanges(saved, { ...formAsIs, payment_methods_enabled: ['cash'] })).toEqual(['payment_methods_enabled']);
    expect(ownerOnlyChanges(saved, { ...formAsIs, currency: 'MXN', custom_domain: 'pedidos.x.com' })).toEqual(['currency', 'custom_domain']);
  });

  it('mandar un token de Mercado Pago, o vaciar uno guardado, es un cambio', () => {
    expect(ownerOnlyChanges(saved, { mp_access_token: 'APP_USR-otro' })).toEqual(['mp_access_token']);
    expect(ownerOnlyChanges({ ...saved, mp_access_token: 'APP_USR-x' }, { mp_access_token: '' })).toEqual(['mp_access_token']);
    expect(ownerOnlyChanges(saved, { mp_access_token: '' })).toEqual([]);
  });

  it('valores vacíos en la base equivalen a lo que muestra el formulario', () => {
    const empty = { ...saved, currency: null, tax_rate: null, tax_label: null, payment_methods_enabled: null };
    expect(ownerOnlyChanges(empty, { currency: 'USD', tax_rate: 0, tax_label: 'Tax', payment_methods_enabled: ['cash'] })).toEqual([]);
  });

  it('stripRestaurantSecrets saca el token y los secretos de Wompi', () => {
    const row = { id: 'r1', name: 'X', mp_access_token: 'APP_USR-x', wompi_integrity_secret_enc: 'a', wompi_events_secret_enc: 'b', wompi_public_key: 'pub' };
    const safe = stripRestaurantSecrets(row);
    expect(JSON.stringify(safe)).not.toContain('APP_USR');
    expect(safe).toEqual({ id: 'r1', name: 'X', wompi_public_key: 'pub', has_mp_token: true });
  });
});

// ── Ruta PATCH /api/tenant/restaurant ──
const state = { isTablet: false, current: { ...saved } as Record<string, unknown>, updates: [] as Record<string, unknown>[] };
vi.mock('@/lib/auth/get-tenant', () => ({
  getTenant: vi.fn(async () => ({ userId: 'u1', restaurantId: 'r1', isDevice: false })),
}));
vi.mock('@/lib/auth/device-session', () => ({
  getDeviceSession: vi.fn(async () => ({ isDevice: false, isTablet: state.isTablet, panelUnlocked: state.isTablet, restaurantId: null, sessionId: null })),
}));
vi.mock('@/lib/auth/check-plan', () => ({ hasPlanAccess: vi.fn(async () => true) }));
vi.mock('@/lib/revalidate-public-menu', () => ({ revalidatePublicMenuForRestaurant: vi.fn(async () => {}) }));
vi.mock('@/lib/error-reporting', () => ({ captureError: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: state.current, error: null }) }) }),
      update: (u: Record<string, unknown>) => {
        state.updates.push(u);
        return { eq: () => ({ select: () => ({ single: async () => ({ data: { id: 'r1', slug: 'x', ...u, mp_access_token: 'APP_USR-secreto' }, error: null }) }) }) };
      },
    }),
  }),
}));

function patch(body: Record<string, unknown>) {
  return new Request('http://localhost/api/tenant/restaurant', {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
}

describe('PATCH /api/tenant/restaurant desde una tablet con PIN', () => {
  beforeEach(() => { state.isTablet = true; state.updates = []; state.current = { ...saved }; });

  it('cambiar el impuesto o apagar la tarjeta → 403 OWNER_ONLY y no se escribe nada', async () => {
    const { PATCH } = await import('@/app/api/tenant/restaurant/route');
    for (const body of [{ ...formAsIs, tax_rate: 0 }, { ...formAsIs, payment_methods_enabled: ['cash'] }, { mp_access_token: 'APP_USR-otro' }]) {
      const res = await PATCH(patch(body) as never);
      expect(res.status).toBe(403);
      expect((await res.json()).error).toBe('OWNER_ONLY');
    }
    expect(state.updates).toHaveLength(0);
  });

  it('guardar horarios con el resto igual pasa, sin reescribir los campos de cobro', async () => {
    const { PATCH } = await import('@/app/api/tenant/restaurant/route');
    const res = await PATCH(patch(formAsIs) as never);
    expect(res.status).toBe(200);
    expect(state.updates[0]).toEqual({ name: 'Buccaneer Diner', operating_hours: formAsIs.operating_hours });
    expect(JSON.stringify(await res.json())).not.toContain('APP_USR');
  });

  it('el dueño desde su celular sí cambia el impuesto', async () => {
    state.isTablet = false;
    const { PATCH } = await import('@/app/api/tenant/restaurant/route');
    const res = await PATCH(patch({ ...formAsIs, tax_rate: 0 }) as never);
    expect(res.status).toBe(200);
    expect(state.updates[0].tax_rate).toBe(0);
  });
});

describe('PATCH /api/tenant/restaurant: país y moneda con Stripe activo', () => {
  beforeEach(() => { state.isTablet = false; state.updates = []; state.current = { ...saved, stripe_onboarding_complete: true }; });

  it('con el alta de Stripe completa no se cambia la moneda ni el país (ni el dueño)', async () => {
    const { PATCH } = await import('@/app/api/tenant/restaurant/route');
    const res = await PATCH(patch({ ...formAsIs, currency: 'MXN', country_code: 'MX' }) as never);
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ error: 'REGION_LOCKED', fields: ['currency', 'country_code'] });
    expect(state.updates).toHaveLength(0);
  });

  it('guardar el formulario con el mismo país pasa; sin alta completa se puede corregir', async () => {
    const { PATCH } = await import('@/app/api/tenant/restaurant/route');
    expect((await PATCH(patch(formAsIs) as never)).status).toBe(200);
    state.current = { ...saved, stripe_onboarding_complete: false };
    expect((await PATCH(patch({ ...formAsIs, currency: 'MXN', country_code: 'MX' }) as never)).status).toBe(200);
  });
});
