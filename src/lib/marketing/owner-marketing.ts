import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Promotional emails from MENIUS to restaurant owners (campaigns, tips, "see
 * the Pro plan"). CAN-SPAM asks them to carry the sender's postal address and a
 * working unsubscribe. Account and billing emails (trial ending, receipts,
 * monthly report, order alerts) are transactional and are not affected.
 *
 * The opt-out is a tag on the restaurant (restaurants.tags, the same column the
 * automations already use to remember what they sent).
 */

export const OWNER_MARKETING_OFF_TAG = 'menius_marketing_off';

/** MENIUS LLC's address, as published in the terms (src/app/terms/page.tsx). */
export const MENIUS_POSTAL_ADDRESS = 'MENIUS LLC · 8401 Mayland Dr, Ste S, Henrico, VA 23294, USA';

function secret(): string {
  return process.env.UNSUBSCRIBE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
}

export function signOwner(restaurantId: string): string {
  const key = secret();
  if (!key) return '';
  return createHmac('sha256', key).update(`unsub-owner:${restaurantId}`).digest('base64url').slice(0, 24);
}

export function verifyOwnerSig(restaurantId: string, sig: string | null | undefined): boolean {
  if (!sig) return false;
  const expected = signOwner(restaurantId);
  if (!expected || expected.length !== sig.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
}

export function ownerUnsubscribeUrl(appUrl: string, restaurantId: string): string {
  return `${appUrl}/api/unsubscribe/owner?r=${encodeURIComponent(restaurantId)}&s=${encodeURIComponent(signOwner(restaurantId))}`;
}

/** RFC 8058 headers: Gmail/Yahoo show their own "Unsubscribe" button. */
export function ownerListUnsubscribeHeaders(appUrl: string, restaurantId: string): Record<string, string> {
  return {
    'List-Unsubscribe': `<${ownerUnsubscribeUrl(appUrl, restaurantId)}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}

export function ownerMarketingOff(tags: unknown): boolean {
  return Array.isArray(tags) && tags.includes(OWNER_MARKETING_OFF_TAG);
}

/** Footer for a promotional email: why it arrives, unsubscribe, postal address. */
export function ownerMarketingFooter(appUrl: string, restaurantId: string, en: boolean): string {
  const href = ownerUnsubscribeUrl(appUrl, restaurantId).replace(/&/g, '&amp;');
  const why = en
    ? 'You get this email because your restaurant has a MENIUS account.'
    : 'Recibes este email porque tu restaurante tiene una cuenta en MENIUS.';
  const unsub = en ? 'Unsubscribe from tips and offers' : 'Darme de baja de consejos y ofertas';
  const note = en
    ? 'Order alerts and billing emails keep arriving.'
    : 'Los avisos de pedidos y de facturación siguen llegando.';
  return `
    <div style="max-width:520px;margin:0 auto;padding:0 20px 32px;text-align:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <p style="font-size:11px;line-height:1.6;color:#6b7280;margin:0;">${why} <a href="${href}" style="color:#9ca3af;text-decoration:underline;">${unsub}</a>. ${note}</p>
      <p style="font-size:11px;line-height:1.6;color:#6b7280;margin:6px 0 0;">${MENIUS_POSTAL_ADDRESS}</p>
    </div>`;
}

/** Puts the footer right before </body> (or at the end if there is none). */
export function withOwnerMarketingFooter(html: string, appUrl: string, restaurantId: string, en: boolean): string {
  const footer = ownerMarketingFooter(appUrl, restaurantId, en);
  return html.includes('</body>') ? html.replace('</body>', `${footer}</body>`) : html + footer;
}
