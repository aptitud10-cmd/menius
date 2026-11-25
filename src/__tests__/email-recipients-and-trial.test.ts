import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resendErrorSummary, buildTrialEndingEmail } from '@/lib/notifications/email';
import { trialChargeNotice } from '@/lib/billing/trial-charge';

describe('sendEmail: varias direcciones y logs sin datos personales', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.stubEnv('RESEND_API_KEY', 're_test');
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  it('ADMIN_EMAIL "a@x.com, b@y.com" sale como dos destinatarios', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 'em_1' }) });
    const { sendEmail } = await import('@/lib/notifications/email');
    const ok = await sendEmail({ to: 'a@x.com, b@y.com', subject: 'Nuevo pedido — Ana', html: '<p>x</p>' });
    expect(ok).toBe(true);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).to).toEqual(['a@x.com', 'b@y.com']);
  });

  it('el log no lleva el asunto (trae nombres de clientes)', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 'em_1' }) });
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const spyI = vi.spyOn(console, 'info').mockImplementation(() => {});
    const { sendEmail } = await import('@/lib/notifications/email');
    await sendEmail({ to: 'ana@example.com', subject: 'Nuevo pedido #12 — Ana Pérez — $20', html: 'x', tags: [{ name: 'category', value: 'owner_new_order' }] });
    const logged = JSON.stringify([...spy.mock.calls, ...spyI.mock.calls]);
    expect(logged).not.toContain('Ana Pérez');
    expect(logged).not.toContain('ana@example.com');
    spy.mockRestore(); spyI.mockRestore();
  });

  it('sin destinatario no llama a Resend', async () => {
    const { sendEmail } = await import('@/lib/notifications/email');
    expect(await sendEmail({ to: ' , ', subject: 's', html: 'x' })).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('del error de Resend queda el tipo y el mensaje, con los emails tapados', () => {
    const body = JSON.stringify({ statusCode: 422, name: 'validation_error', message: 'Invalid `to` field: ana.perez@gmail.com' });
    const r = resendErrorSummary(body);
    expect(r).toContain('validation_error');
    expect(r).not.toContain('ana.perez@gmail.com');
    expect(resendErrorSummary('x'.repeat(500)).length).toBe(200);
  });
});

describe('aviso de fin de prueba', () => {
  it('quien ya se suscribió recibe fecha y monto del cobro, nunca "suscríbete" ni "plan Gratis"', async () => {
    vi.stubEnv('STRIPE_PRICE_PRO_MONTHLY', 'price_pro_m');
    vi.resetModules();
    const { trialChargeNotice: notice149 } = await import('@/lib/billing/trial-charge');
    const notice = notice149('2026-12-01T15:00:00Z', 'price_pro_m', false, 'America/New_York');
    vi.unstubAllEnvs();
    expect(notice.amountLabel).toBe('$149/mes');
    expect(notice.chargeDateLabel).toMatch(/1 de diciembre/);
    const html = buildTrialEndingEmail({ ownerName: 'Buccaneer', restaurantName: 'Buccaneer', daysLeft: 3, billingUrl: 'https://menius.app/app/billing', locale: 'es', subscribed: notice });
    expect(html).toContain('$149/mes');
    expect(html).not.toMatch(/Suscríbete|plan Gratis/);
  });

  it('sin precio conocido no inventa un monto', () => {
    expect(trialChargeNotice('2026-12-01T15:00:00Z', 'price_desconocido', true).amountLabel).toBe('your Pro plan');
  });

  it('quien no se suscribió sigue recibiendo el email de siempre', () => {
    const html = buildTrialEndingEmail({ ownerName: 'X', restaurantName: 'X', daysLeft: 3, billingUrl: 'u', locale: 'es' });
    expect(html).toContain('Suscribirme a Pro');
  });
});
