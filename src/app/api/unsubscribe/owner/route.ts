export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createLogger } from '@/lib/logger';
import { OWNER_MARKETING_OFF_TAG, verifyOwnerSig } from '@/lib/marketing/owner-marketing';

const logger = createLogger('unsubscribe-owner');

/**
 * Owner unsubscribe from MENIUS tips and offers (lib/marketing/owner-marketing).
 *
 *  GET  ?r=<restaurant>&s=<signature> → page with a button. Mail scanners open
 *       links by themselves, so a GET never unsubscribes.
 *  POST same URL → unsubscribes. Also the RFC 8058 one-click from Gmail/Yahoo.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type State = 'confirm' | 'done' | 'invalid' | 'error';

function target(url: URL): string | null {
  const r = url.searchParams.get('r');
  if (!r || !UUID_RE.test(r)) return null;
  return verifyOwnerSig(r, url.searchParams.get('s')) ? r : null;
}

async function loadRestaurant(id: string) {
  const db = createAdminClient();
  const { data } = await db.from('restaurants').select('id, name, locale, tags').eq('id', id).maybeSingle();
  return { db, restaurant: data as { id: string; name: string; locale: string | null; tags: unknown } | null };
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const id = target(url);
  if (!id) return page('invalid', null, url);
  try {
    const { restaurant } = await loadRestaurant(id);
    return restaurant ? page('confirm', restaurant, url) : page('invalid', null, url);
  } catch (err) {
    logger.error('Owner unsubscribe page failed', { error: err instanceof Error ? err.message : String(err) });
    return page('error', null, url);
  }
}

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const id = target(url);
  if (!id) return page('invalid', null, url, 400);
  try {
    const { db, restaurant } = await loadRestaurant(id);
    if (!restaurant) return page('invalid', null, url, 404);
    const tags = Array.isArray(restaurant.tags) ? (restaurant.tags as string[]) : [];
    if (!tags.includes(OWNER_MARKETING_OFF_TAG)) {
      const { error } = await db.rpc('append_restaurant_tag', { p_restaurant_id: id, p_tag: OWNER_MARKETING_OFF_TAG });
      if (error) throw new Error(error.message);
      logger.info('Owner unsubscribed from MENIUS marketing', { restaurantId: id });
    }
    return page('done', restaurant, url);
  } catch (err) {
    logger.error('Owner unsubscribe failed', { error: err instanceof Error ? err.message : String(err) });
    return page('error', null, url, 500);
  }
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const COPY = {
  en: {
    title: 'Email preferences',
    confirm: (r: string) => `Stop MENIUS tips and offers for ${r}?`,
    confirmBody: 'Order alerts, billing and account emails keep arriving.',
    button: 'Unsubscribe',
    done: 'You’re unsubscribed',
    doneBody: 'You won’t get MENIUS tips or offers anymore. Order alerts, billing and account emails keep arriving.',
    invalid: 'This link is no longer valid',
    invalidBody: 'Reply to any MENIUS email and we’ll take you off the list.',
    error: 'Something went wrong',
    errorBody: 'Please try again in a moment.',
    retry: 'Try again',
  },
  es: {
    title: 'Preferencias de email',
    confirm: (r: string) => `¿Dejar de recibir consejos y ofertas de MENIUS para ${r}?`,
    confirmBody: 'Los avisos de pedidos, de facturación y de tu cuenta siguen llegando.',
    button: 'Darme de baja',
    done: 'Listo, te diste de baja',
    doneBody: 'Ya no recibirás consejos ni ofertas de MENIUS. Los avisos de pedidos, de facturación y de tu cuenta siguen llegando.',
    invalid: 'Este link ya no es válido',
    invalidBody: 'Responde a cualquier email de MENIUS y te quitamos de la lista.',
    error: 'Algo salió mal',
    errorBody: 'Inténtalo de nuevo en un momento.',
    retry: 'Intentar de nuevo',
  },
};

function page(
  state: State,
  restaurant: { name: string; locale: string | null } | null,
  url: URL,
  status = 200,
): NextResponse {
  const en = restaurant ? restaurant.locale === 'en' : true;
  const t = en ? COPY.en : COPY.es;
  const name = esc(restaurant?.name || 'MENIUS');
  const postUrl = esc(`${url.pathname}?${url.searchParams.toString()}`);
  const views: Record<State, string> = {
    confirm: `<h1>${t.confirm(name)}</h1><p>${t.confirmBody}</p><form method="post" action="${postUrl}"><button type="submit">${t.button}</button></form>`,
    done: `<h1>${t.done}</h1><p>${t.doneBody}</p>`,
    invalid: `<h1>${t.invalid}</h1><p>${t.invalidBody}</p>`,
    error: `<h1>${t.error}</h1><p>${t.errorBody}</p><form method="post" action="${postUrl}"><button type="submit">${t.retry}</button></form>`,
  };
  const html = `<!DOCTYPE html>
<html lang="${en ? 'en' : 'es'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex">
<title>${t.title} · MENIUS</title>
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f6f6f7;color:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:24px}
  main{max-width:420px;width:100%;background:#fff;border-radius:18px;padding:32px 28px;box-shadow:0 10px 30px rgba(0,0,0,.06);text-align:center}
  h1{font-size:20px;line-height:1.35;margin:0 0 10px}
  p{font-size:15px;line-height:1.55;color:#4b5563;margin:0 0 20px}
  button{min-height:48px;width:100%;border:0;border-radius:12px;background:#111827;color:#fff;font-size:16px;font-weight:600;cursor:pointer}
  button:focus-visible{outline:3px solid #05c8a7;outline-offset:2px}
  .brand{font-size:12px;font-weight:800;letter-spacing:.08em;color:#9ca3af;margin-bottom:18px}
</style>
</head>
<body><main><div class="brand">MENIUS</div>${views[state]}</main></body>
</html>`;
  return new NextResponse(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}
