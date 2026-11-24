export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createLogger } from '@/lib/logger';
import { verifyCustomerSig } from '@/lib/marketing/unsubscribe-token';
import { OPT_IN_TAG, UNSUBSCRIBED_TAG } from '@/lib/marketing/lifecycle';

const logger = createLogger('unsubscribe');

/**
 * Baja de los emails de marketing y pedidos de reseña de UN restaurante.
 *
 *  GET  /api/unsubscribe?c=<id>&s=<firma>  → página que confirma la baja.
 *       La baja la hace la página con un POST, no el GET: los antivirus del
 *       correo (Outlook, Gmail) abren los links solos y daban de baja a gente
 *       que nunca tocó nada.
 *  POST mismo URL                          → baja (o "deshacer" con
 *       action=resubscribe). Es también el one-click RFC 8058 que mandan
 *       Gmail/Yahoo desde el header List-Unsubscribe.
 *
 * Links viejos (?id=<uuid>, sin firma) siguen dando de baja; volver a
 * suscribir exige firma.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type State = 'confirm' | 'unsubscribed' | 'resubscribed' | 'invalid' | 'error';

interface Target {
  customerId: string;
  signed: boolean;
}

function readTarget(url: URL): Target | null {
  const c = url.searchParams.get('c') ?? url.searchParams.get('id');
  if (!c || !UUID_RE.test(c)) return null;
  return { customerId: c, signed: verifyCustomerSig(c, url.searchParams.get('s')) };
}

async function loadCustomer(customerId: string) {
  const db = createAdminClient();
  const { data: customer, error } = await db
    .from('customers')
    .select('id, tags, restaurant_id')
    .eq('id', customerId)
    .maybeSingle();
  if (error || !customer) return { db, customer: null, restaurant: null };
  const { data: restaurant } = await db
    .from('restaurants')
    .select('name, locale, slug')
    .eq('id', customer.restaurant_id)
    .maybeSingle();
  return { db, customer, restaurant };
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const target = readTarget(url);
  if (!target) return page('invalid', null, url);
  try {
    const { customer, restaurant } = await loadCustomer(target.customerId);
    if (!customer) return page('invalid', null, url);
    return page('confirm', restaurant, url, target.signed);
  } catch (err) {
    logger.error('Unsubscribe page failed', { error: err instanceof Error ? err.message : String(err) });
    return page('error', null, url);
  }
}

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const wantsJson = url.searchParams.get('format') === 'json';
  const target = readTarget(url);
  let action = 'unsubscribe';
  try {
    const form = await request.formData();
    if (form.get('action') === 'resubscribe') action = 'resubscribe';
  } catch {
    /* one-click sin cuerpo legible: es una baja */
  }

  const reply = (state: State, restaurant: { name: string; locale: string | null; slug: string } | null, status = 200) =>
    wantsJson ? NextResponse.json({ state }, { status }) : page(state, restaurant, url, target?.signed ?? false, status);

  if (!target) return reply('invalid', null, 400);
  if (action === 'resubscribe' && !target.signed) return reply('invalid', null, 403);

  try {
    const { db, customer, restaurant } = await loadCustomer(target.customerId);
    if (!customer) return reply('invalid', null, 404);
    const tags = (customer.tags ?? []) as string[];
    let next: string[];
    if (action === 'resubscribe') {
      next = tags.filter((t) => t !== UNSUBSCRIBED_TAG);
      if (!next.includes(OPT_IN_TAG)) next.push(OPT_IN_TAG);
    } else {
      next = tags.filter((t) => t !== OPT_IN_TAG && t !== 'reactivation_sent');
      if (!next.includes(UNSUBSCRIBED_TAG)) next.push(UNSUBSCRIBED_TAG);
    }
    const changed = next.length !== tags.length || next.some((t, i) => t !== tags[i]);
    if (changed) {
      const { error } = await db.from('customers').update({ tags: next }).eq('id', customer.id);
      if (error) throw new Error(error.message);
      logger.info(action === 'resubscribe' ? 'Customer resubscribed' : 'Customer unsubscribed', { customerId: customer.id });
    }
    return reply(action === 'resubscribe' ? 'resubscribed' : 'unsubscribed', restaurant);
  } catch (err) {
    logger.error('Unsubscribe failed', { error: err instanceof Error ? err.message : String(err) });
    return reply('error', null, 500);
  }
}

// ── Página ────────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const COPY = {
  en: {
    title: 'Email preferences',
    working: 'Unsubscribing…',
    unsubscribed: (r: string) => `You won't get offers from ${r} anymore`,
    unsubscribedBody: 'Emails about orders you place (receipt, pickup time) still arrive as usual.',
    undo: 'Undo — keep me subscribed',
    resubscribed: (r: string) => `You're subscribed to ${r} again`,
    resubscribedBody: "You'll hear from us now and then, never more than once a week.",
    invalid: 'This link is no longer valid',
    invalidBody: 'If you keep getting emails you didn’t ask for, reply to one of them and the restaurant will remove you.',
    error: 'Something went wrong',
    errorBody: 'Please try again in a moment.',
    retry: 'Try again',
    confirm: 'Unsubscribe',
    back: (r: string) => `Back to ${r}`,
  },
  es: {
    title: 'Preferencias de email',
    working: 'Dándote de baja…',
    unsubscribed: (r: string) => `Ya no recibirás ofertas de ${r}`,
    unsubscribedBody: 'Los emails de los pedidos que hagas (recibo, hora para recoger) siguen llegando como siempre.',
    undo: 'Deshacer, quiero seguir recibiéndolas',
    resubscribed: (r: string) => `Volviste a suscribirte a ${r}`,
    resubscribedBody: 'Te escribiremos de vez en cuando, nunca más de una vez por semana.',
    invalid: 'Este link ya no es válido',
    invalidBody: 'Si te siguen llegando emails que no pediste, responde a uno y el restaurante te quitará de la lista.',
    error: 'Algo salió mal',
    errorBody: 'Inténtalo de nuevo en un momento.',
    retry: 'Intentar de nuevo',
    confirm: 'Darme de baja',
    back: (r: string) => `Volver a ${r}`,
  },
};

function page(
  state: State,
  restaurant: { name: string; locale: string | null; slug: string } | null,
  url: URL,
  signed = false,
  status = 200,
): NextResponse {
  const en = restaurant ? restaurant.locale === 'en' : true;
  const t = en ? COPY.en : COPY.es;
  const rName = esc(restaurant?.name || 'MENIUS');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';
  const backHref = restaurant?.slug ? `${appUrl}/${encodeURIComponent(restaurant.slug)}` : appUrl;
  const postUrl = `${url.pathname}?${url.searchParams.toString()}`;
  const jsonUrl = `${postUrl}${postUrl.includes('?') ? '&' : '?'}format=json`;

  const views: Record<string, string> = {
    working: `<h1 id="h">${t.working}</h1>`,
    unsubscribed: `<h1>${t.unsubscribed(rName)}</h1><p>${t.unsubscribedBody}</p>${signed ? `<form method="post" action="${esc(postUrl)}"><input type="hidden" name="action" value="resubscribe"><button class="ghost" type="submit">${t.undo}</button></form>` : ''}<a class="back" href="${esc(backHref)}">${t.back(rName)}</a>`,
    resubscribed: `<h1>${t.resubscribed(rName)}</h1><p>${t.resubscribedBody}</p><a class="back" href="${esc(backHref)}">${t.back(rName)}</a>`,
    invalid: `<h1>${t.invalid}</h1><p>${t.invalidBody}</p>`,
    error: `<h1>${t.error}</h1><p>${t.errorBody}</p><form method="post" action="${esc(postUrl)}"><button type="submit">${t.retry}</button></form>`,
  };

  const body = state === 'confirm'
    ? `<div id="v">${views.working}<noscript><form method="post" action="${esc(postUrl)}"><button type="submit">${t.confirm}</button></form></noscript></div>
<template id="t-unsubscribed">${views.unsubscribed}</template>
<template id="t-error">${views.error}</template>
<template id="t-invalid">${views.invalid}</template>
<script>
(function(){
  var v=document.getElementById('v');
  function show(s){var tp=document.getElementById('t-'+s)||document.getElementById('t-error');v.innerHTML=tp.innerHTML;}
  fetch(${JSON.stringify(jsonUrl)},{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'action=unsubscribe'})
    .then(function(r){return r.json();}).then(function(d){show(d&&d.state?d.state:'error');})
    .catch(function(){show('error');});
})();
</script>`
    : views[state] ?? views.error;

  const html = `<!DOCTYPE html>
<html lang="${en ? 'en' : 'es'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex">
<meta name="color-scheme" content="light dark">
<title>${t.title} · ${rName}</title>
<style>
:root{--bg:#F2F4F3;--card:#FFFFFE;--ink:#0E1412;--sub:#55605C;--line:#E1E6E3;--btn:#05C8A7;--btnfg:#04241E;--link:#047A67}
@media (prefers-color-scheme:dark){:root{--bg:#0B0F0E;--card:#161B19;--ink:#F1F4F2;--sub:#A3ADA9;--line:#2A322F;--link:#5BE3C9}}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px max(16px,env(safe-area-inset-right)) max(24px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left));background:var(--bg);font-family:Inter,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:var(--ink);-webkit-text-size-adjust:100%}
.card{width:100%;max-width:440px;background:var(--card);border-radius:18px;padding:28px 24px 24px}
.brand{font-size:13px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:var(--sub);margin:0 0 14px}
h1{font-size:24px;line-height:1.2;letter-spacing:-.4px;margin:0 0 10px}
p{font-size:15px;line-height:1.55;color:var(--sub);margin:0 0 20px}
button{width:100%;min-height:48px;border:0;border-radius:12px;background:var(--btn);color:var(--btnfg);font-family:inherit;font-size:16px;font-weight:700;line-height:1;cursor:pointer}
button.ghost{background:transparent;color:var(--ink);border:1px solid var(--line)}
form{margin:0 0 12px}
.back{display:block;text-align:center;padding:12px 0 0;color:var(--link);font-weight:600;font-size:15px;text-decoration:none}
.foot{margin:18px 0 0;font-size:11px;color:var(--sub);text-align:center}
</style>
</head>
<body>
<main class="card">
<div class="brand">${rName}</div>
${body}
<div class="foot">${en ? 'Online ordering by' : 'Pedidos en línea con'} <b>MENIUS</b></div>
</main>
</body>
</html>`;
  return new NextResponse(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
  });
}
