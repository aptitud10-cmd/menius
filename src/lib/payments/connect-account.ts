import type Stripe from 'stripe';

/**
 * ¿La cuenta Connect del restaurante ya puede cobrar con tarjeta?
 * Una sola regla para /api/connect/status (al abrir Configuración) y para el
 * webhook de Connect (cuando Stripe avisa un cambio), así no se contradicen.
 *
 * Se mira lo mismo que mira Stripe para dejar cobrar: charges_enabled, más las
 * dos capacidades que usa un destination charge (card_payments por
 * on_behalf_of, transfers por transfer_data). Antes también exigía
 * `currently_due` vacío: cuando Stripe pide un dato nuevo con plazo, sigue
 * dejando cobrar hasta la fecha límite, y nosotros apagábamos la tarjeta en el
 * acto. Si el plazo vence, Stripe apaga charges_enabled y el webhook lo refleja.
 */
export function isConnectAccountReady(
  account: Pick<Stripe.Account, 'charges_enabled' | 'capabilities'>,
): boolean {
  return account.charges_enabled === true
    && account.capabilities?.card_payments === 'active'
    && account.capabilities?.transfers === 'active';
}

export type ConnectAccountState = 'not_connected' | 'incomplete' | 'in_review' | 'rejected' | 'active';

export interface ConnectAccountSummary {
  state: ConnectAccountState;
  /** ISO date by which `currently_due` must be provided (Stripe disables the account after it). */
  requirements_deadline: string | null;
  /** Fields Stripe still needs (currently_due + past_due), even while the account can charge. */
  requirements_due_count: number;
}

type AccountForState = Pick<
  Stripe.Account,
  'charges_enabled' | 'payouts_enabled' | 'details_submitted' | 'requirements' | 'capabilities'
>;

/**
 * Owner-facing state of a Connect account, from the fields Stripe exposes.
 * Precedence: rejected > active > incomplete > in_review.
 * "active" uses the same readiness rule as checkout (isConnectAccountReady)
 * plus payouts_enabled, so the panel never says "active" while cards are off.
 */
export function summarizeConnectAccount(account: AccountForState | null): ConnectAccountSummary {
  if (!account) return { state: 'not_connected', requirements_deadline: null, requirements_due_count: 0 };

  const req = account.requirements;
  const due = new Set([...(req?.currently_due ?? []), ...(req?.past_due ?? [])]);
  const deadline = due.size > 0 && req?.current_deadline
    ? new Date(req.current_deadline * 1000).toISOString()
    : null;
  const base = { requirements_deadline: deadline, requirements_due_count: due.size };

  if (req?.disabled_reason?.startsWith('rejected')) return { state: 'rejected', ...base };
  if (isConnectAccountReady(account) && account.payouts_enabled === true) return { state: 'active', ...base };
  if (due.size > 0 || !account.details_submitted) return { state: 'incomplete', ...base };
  // Nothing left for the owner: Stripe is verifying (pending_verification,
  // under_review, capabilities still pending, payouts not enabled yet).
  return { state: 'in_review', ...base };
}
