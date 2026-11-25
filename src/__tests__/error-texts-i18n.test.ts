import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { paymentErrorText, refundErrorText } from '@/lib/payments/payment-errors';
import { formatPaymentStartError } from '@/lib/checkout-errors';
import {
  getSignupSchema, getLoginSchema, getCreateRestaurantSchema,
  signupSchema, createRestaurantSchema,
} from '@/lib/validations';

describe('payment error codes → diner text', () => {
  it('translates every code the payment routes send', () => {
    for (const code of [
      'rate_limited', 'invalid_request', 'order_not_found', 'cash_order', 'already_paid', 'order_closed',
      'invalid_amount', 'online_unavailable', 'wompi_only', 'wompi_unavailable', 'payment_start_failed',
    ]) {
      const en = paymentErrorText(code, 'en');
      const es = paymentErrorText(code, 'es');
      expect(en, code).toBeTruthy();
      expect(es, code).toBeTruthy();
      expect(en).not.toBe(es);
    }
  });

  it('unknown or missing code → null (caller keeps its fallback)', () => {
    expect(paymentErrorText(undefined, 'en')).toBeNull();
    expect(paymentErrorText('toString', 'en')).toBeNull();
    expect(paymentErrorText(42, 'en')).toBeNull();
  });

  it('formatPaymentStartError prefers the code over the Spanish legacy text', () => {
    expect(formatPaymentStartError(409, 'Este pedido se paga en efectivo.', 'en', 'cash_order'))
      .toBe('This order is paid in cash. Pay when you get your order.');
    expect(formatPaymentStartError(400, 'Monto inválido', 'en', 'invalid_amount'))
      .toBe("This order's total isn't valid. Please call the restaurant.");
    expect(formatPaymentStartError(409, 'Este pedido ya no acepta pagos.', 'es', 'order_closed'))
      .toBe('Este pedido ya no acepta pagos. Si necesitas ayuda, llama al restaurante.');
    // Without a code it behaves as before.
    expect(formatPaymentStartError(404, 'Orden no encontrada', 'en'))
      .toBe('We could not find this order. If you already paid, check your email or contact the restaurant.');
  });
});

describe('refund error codes → Counter text', () => {
  it('translates every code the refund route sends', () => {
    for (const code of [
      'unauthenticated', 'invalid_request', 'order_not_found', 'not_paid', 'already_cancelled',
      'cancel_failed', 'stripe_rejected', 'stripe_failed', 'refund_not_saved', 'internal_error',
    ]) {
      expect(refundErrorText(code, 'en'), code).toBeTruthy();
      expect(refundErrorText(code, 'es'), code).toBeTruthy();
    }
    expect(refundErrorText('stripe_rejected', 'en')).toMatch(/^Stripe declined the refund/);
    expect(refundErrorText('nope', 'en')).toBeNull();
  });

  it('every code the refund route returns has a text', () => {
    const src = readFileSync(join(process.cwd(), 'src/app/api/payments/refund/route.ts'), 'utf8');
    const codes = Array.from(src.matchAll(/code: '([a-z_]+)' satisfies RefundErrorCode/g), (m) => m[1]);
    expect(codes.length).toBeGreaterThanOrEqual(10);
    for (const c of codes) expect(refundErrorText(c, 'en'), c).toBeTruthy();
  });

  it('every code the diner payment routes return has a text', () => {
    for (const r of ['intent', 'checkout', 'wompi']) {
      const src = readFileSync(join(process.cwd(), `src/app/api/payments/${r}/route.ts`), 'utf8');
      const codes = Array.from(src.matchAll(/code: ["']([a-z_]+)["'] satisfies PaymentErrorCode/g), (m) => m[1]);
      expect(codes.length, r).toBeGreaterThan(3);
      for (const c of codes) expect(paymentErrorText(c, 'en'), `${r}:${c}`).toBeTruthy();
    }
  });
});

describe('/api/orders message language', () => {
  it("uses the diner's locale (body) before the restaurant's", () => {
    const src = readFileSync(join(process.cwd(), 'src/app/api/orders/route.ts'), 'utf8');
    expect(src).toContain('const en = customerLocale === "en";');
    expect(src).not.toMatch(/\n {4}const en = restaurant\.locale === "en";/);
  });
});

describe('signup / login / wizard schemas', () => {
  const firstMessage = (r: { success: boolean; error?: { errors: { message: string }[] } }) =>
    r.success ? null : r.error!.errors[0].message;

  it('English messages for the English interface', () => {
    expect(firstMessage(getSignupSchema('en').safeParse({ email: 'nope', password: '12345678' }))).toBe('Enter a valid email.');
    expect(firstMessage(getSignupSchema('en').safeParse({ email: 'a@b.co', password: '123' }))).toBe('Use at least 8 characters for your password.');
    expect(firstMessage(getLoginSchema('en').safeParse({ email: 'a@b.co', password: '' }))).toBe('Enter your password.');
    expect(firstMessage(getCreateRestaurantSchema('en').safeParse({ name: 'a@b.co', slug: 'ok' })))
      .toBe("Enter your restaurant's name, not an email.");
    expect(firstMessage(getCreateRestaurantSchema('en').safeParse({ name: 'Diner', slug: 'Bad Slug' })))
      .toBe('Use only lowercase letters, numbers and hyphens in the URL.');
  });

  it('Spanish by default (the exported schemas keep working as before)', () => {
    expect(firstMessage(signupSchema.safeParse({ email: 'nope', password: '12345678' }))).toBe('Ingresa un email válido.');
    expect(firstMessage(getSignupSchema('es').safeParse({ email: 'a@b.co', password: '1' }))).toBe('Usa al menos 8 caracteres en la contraseña.');
    const ok = createRestaurantSchema.safeParse({ name: 'Mi Restaurante', slug: 'mi-restaurante', locale: 'en' });
    expect(ok.success).toBe(true);
    // The schema's `locale` field is the menu language, unrelated to the message language.
    if (ok.success) expect(ok.data.locale).toBe('en');
  });
});

describe('onboardErrorText (Configuración → Pagos)', () => {
  it('traduce por código al idioma del panel y no inventa textos', async () => {
    const { onboardErrorText } = await import('@/lib/payments/payment-errors');
    expect(onboardErrorText('plan_required', 'en')).toMatch(/Pro plan/);
    expect(onboardErrorText('plan_required', 'es')).toMatch(/plan Pro/);
    expect(onboardErrorText('nope', 'es')).toBeNull();
    expect(onboardErrorText(undefined, 'en')).toBeNull();
  });
});
