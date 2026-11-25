import { describe, it, expect } from 'vitest';
import type Stripe from 'stripe';
import { usablePaymentMethods, onlinePaymentsAllowedByPlan } from '@/lib/payments/online-ready';
import { summarizeConnectAccount } from '@/lib/payments/connect-account';
import { crossesMidnight, dayHoursError, isOpenAt } from '@/lib/orders/business-hours';

const NOW = new Date('2026-11-25T12:00:00Z');
const stripeReady = { stripe_account_id: 'connected', stripe_onboarding_complete: true, currency: 'USD' };

describe('onlinePaymentsAllowedByPlan (same rule as /api/orders)', () => {
  it('no subscription → not allowed; commission_plan → allowed', () => {
    expect(onlinePaymentsAllowedByPlan(false, null, NOW)).toBe(false);
    expect(onlinePaymentsAllowedByPlan(true, null, NOW)).toBe(true);
  });
  it('active, valid trial, past_due in grace → allowed', () => {
    expect(onlinePaymentsAllowedByPlan(false, { status: 'active' }, NOW)).toBe(true);
    expect(onlinePaymentsAllowedByPlan(false, { status: 'trialing', trial_end: '2026-12-01T00:00:00Z' }, NOW)).toBe(true);
    expect(onlinePaymentsAllowedByPlan(false, { status: 'past_due', past_due_since: '2026-11-22T00:00:00Z' }, NOW)).toBe(true);
  });
  it('trial ended (canceled by the cron) or past_due after grace → not allowed', () => {
    expect(onlinePaymentsAllowedByPlan(false, { status: 'canceled', trial_end: '2026-11-20T00:00:00Z' }, NOW)).toBe(false);
    expect(onlinePaymentsAllowedByPlan(false, { status: 'trialing', trial_end: '2026-11-20T00:00:00Z' }, NOW)).toBe(false);
    expect(onlinePaymentsAllowedByPlan(false, { status: 'past_due', past_due_since: '2026-11-01T00:00:00Z' }, NOW)).toBe(false);
  });
});

describe('usablePaymentMethods with the plan gate', () => {
  it('plan allows online + Stripe ready → card offered', () => {
    expect(usablePaymentMethods({ ...stripeReady, payment_methods_enabled: ['cash', 'online'], online_payments_allowed: true }))
      .toEqual(['cash', 'online']);
  });
  it('plan without online payments → card hidden even with Stripe ready', () => {
    expect(usablePaymentMethods({ ...stripeReady, payment_methods_enabled: ['cash', 'online'], online_payments_allowed: false }))
      .toEqual(['cash']);
  });
  it('plan gate also applies to Wompi (COP)', () => {
    const wompi = { currency: 'COP', wompi_connected: true, payment_methods_enabled: ['cash', 'online'] as const };
    expect(usablePaymentMethods({ ...wompi, payment_methods_enabled: [...wompi.payment_methods_enabled], online_payments_allowed: false })).toEqual(['cash']);
    expect(usablePaymentMethods({ ...wompi, payment_methods_enabled: [...wompi.payment_methods_enabled], online_payments_allowed: true })).toEqual(['cash', 'online']);
  });
  it('plan not evaluated (undefined) → no plan gate (legal page, demos)', () => {
    expect(usablePaymentMethods({ ...stripeReady, payment_methods_enabled: ['cash', 'online'] })).toEqual(['cash', 'online']);
  });
  it('online-only store that cannot charge → empty list (checkout blocks, never sends cash)', () => {
    expect(usablePaymentMethods({ ...stripeReady, payment_methods_enabled: ['online'], online_payments_allowed: false })).toEqual([]);
    expect(usablePaymentMethods({ stripe_account_id: 'connected', stripe_onboarding_complete: false, payment_methods_enabled: ['online'], online_payments_allowed: true })).toEqual([]);
  });
  it('nothing configured → cash', () => {
    expect(usablePaymentMethods({ payment_methods_enabled: null, online_payments_allowed: false })).toEqual(['cash']);
  });
});

type AccountInput = Parameters<typeof summarizeConnectAccount>[0];
function account(over: {
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  details_submitted?: boolean;
  card?: 'active' | 'inactive' | 'pending';
  transfers?: 'active' | 'inactive' | 'pending';
  currently_due?: string[];
  past_due?: string[];
  pending_verification?: string[];
  disabled_reason?: Stripe.Account.Requirements.DisabledReason | null;
  current_deadline?: number | null;
}): AccountInput {
  return {
    charges_enabled: over.charges_enabled ?? false,
    payouts_enabled: over.payouts_enabled ?? false,
    details_submitted: over.details_submitted ?? false,
    capabilities: { card_payments: over.card ?? 'inactive', transfers: over.transfers ?? 'inactive' },
    requirements: {
      alternatives: [],
      current_deadline: over.current_deadline ?? null,
      currently_due: over.currently_due ?? [],
      disabled_reason: over.disabled_reason ?? null,
      errors: [],
      eventually_due: [],
      past_due: over.past_due ?? [],
      pending_verification: over.pending_verification ?? [],
    },
  } as AccountInput;
}

describe('summarizeConnectAccount', () => {
  it('no account → not_connected', () => {
    expect(summarizeConnectAccount(null).state).toBe('not_connected');
  });
  it('abandoned halfway → incomplete', () => {
    const a = account({ details_submitted: false, currently_due: ['business_profile.url', 'external_account'], disabled_reason: 'requirements.past_due' });
    expect(summarizeConnectAccount(a)).toEqual({ state: 'incomplete', requirements_deadline: null, requirements_due_count: 2 });
  });
  it('submitted but Stripe asks for a document → incomplete', () => {
    const a = account({ details_submitted: true, past_due: ['individual.verification.document'] });
    expect(summarizeConnectAccount(a).state).toBe('incomplete');
  });
  it('everything sent, Stripe verifying → in_review', () => {
    const a = account({ details_submitted: true, pending_verification: ['individual.id_number'], disabled_reason: 'requirements.pending_verification', card: 'pending', transfers: 'pending' });
    expect(summarizeConnectAccount(a).state).toBe('in_review');
  });
  it('charges off with nothing due → in_review', () => {
    const a = account({ details_submitted: true, disabled_reason: 'under_review' });
    expect(summarizeConnectAccount(a).state).toBe('in_review');
  });
  it('can charge but payouts not enabled yet → in_review', () => {
    const a = account({ details_submitted: true, charges_enabled: true, card: 'active', transfers: 'active', payouts_enabled: false });
    expect(summarizeConnectAccount(a).state).toBe('in_review');
  });
  it('rejected wins over everything', () => {
    const a = account({ details_submitted: true, disabled_reason: 'rejected.fraud', currently_due: ['x'] });
    expect(summarizeConnectAccount(a).state).toBe('rejected');
    expect(summarizeConnectAccount(account({ disabled_reason: 'rejected.terms_of_service' })).state).toBe('rejected');
  });
  it('fully enabled → active', () => {
    const a = account({ details_submitted: true, charges_enabled: true, payouts_enabled: true, card: 'active', transfers: 'active' });
    expect(summarizeConnectAccount(a)).toEqual({ state: 'active', requirements_deadline: null, requirements_due_count: 0 });
  });
  it('active with a field due before a deadline → active + deadline', () => {
    const deadline = Date.UTC(2026, 11, 10) / 1000;
    const a = account({ details_submitted: true, charges_enabled: true, payouts_enabled: true, card: 'active', transfers: 'active', currently_due: ['company.tax_id'], current_deadline: deadline });
    expect(summarizeConnectAccount(a)).toEqual({ state: 'active', requirements_deadline: '2026-12-10T00:00:00.000Z', requirements_due_count: 1 });
  });
  it('charges and payouts on but card capability inactive → not active (cards would be off)', () => {
    const a = account({ details_submitted: true, charges_enabled: true, payouts_enabled: true, card: 'inactive', transfers: 'active' });
    expect(summarizeConnectAccount(a).state).toBe('in_review');
  });
});

describe('overnight business hours (Settings validation)', () => {
  // 2026-11-13 is a Friday; getters are restaurant-local.
  const at = (day: number, hh: number, mm = 0) => new Date(2026, 10, day, hh, mm);

  it('close before open crosses midnight and is accepted', () => {
    expect(crossesMidnight('18:00', '02:00')).toBe(true);
    expect(dayHoursError('18:00', '02:00')).toBeNull();
  });
  it('normal hours are accepted and do not cross midnight', () => {
    expect(crossesMidnight('09:00', '22:00')).toBe(false);
    expect(dayHoursError('09:00', '22:00')).toBeNull();
  });
  it('same open and close time is rejected', () => {
    expect(dayHoursError('10:00', '10:00')).toBe('same_time');
  });
  it('what Settings saves is honored by the order check: Friday 18:00–02:00 open Saturday 01:30', () => {
    const hours = { friday: { open: '18:00', close: '02:00' } };
    expect(isOpenAt(hours, at(13, 23))).toBe(true);
    expect(isOpenAt(hours, at(14, 1, 30))).toBe(true);
    expect(isOpenAt(hours, at(14, 2))).toBe(false);
  });
});
