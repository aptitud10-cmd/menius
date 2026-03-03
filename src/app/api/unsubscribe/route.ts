export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createLogger } from '@/lib/logger';

const logger = createLogger('unsubscribe');

/**
 * GET /api/unsubscribe?id=<customerId>
 * One-click unsubscribe for marketing emails. No auth required — customer ID acts as the token
 * (UUIDs are unguessable). Adds the 'unsubscribed' tag to the customer record.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get('id');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';

  if (!customerId || !/^[0-9a-f-]{36}$/i.test(customerId)) {
    return new NextResponse(unsubscribePage('error', appUrl), {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  try {
    const supabase = createAdminClient();

    const { data: customer, error } = await supabase
      .from('customers')
      .select('id, tags')
      .eq('id', customerId)
      .maybeSingle();

    if (error || !customer) {
      return new NextResponse(unsubscribePage('not_found', appUrl), {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    if ((customer.tags ?? []).includes('unsubscribed')) {
      return new NextResponse(unsubscribePage('already', appUrl), {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    const newTags = [...(customer.tags ?? []).filter((t: string) => t !== 'reactivation_sent'), 'unsubscribed'];
    await supabase.from('customers').update({ tags: newTags }).eq('id', customerId);

    logger.info('Customer unsubscribed', { customerId });

    return new NextResponse(unsubscribePage('success', appUrl), {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (err) {
    logger.error('Unsubscribe failed', { error: err instanceof Error ? err.message : String(err) });
    return new NextResponse(unsubscribePage('error', appUrl), {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}

function unsubscribePage(state: 'success' | 'already' | 'not_found' | 'error', appUrl: string): string {
  const messages = {
    success: {
      icon: '✅',
      title: 'Te has dado de baja',
      body: 'Ya no recibirás emails de marketing de este restaurante. Las notificaciones de pedidos no se verán afectadas.',
    },
    already: {
      icon: '✓',
      title: 'Ya estabas dado de baja',
      body: 'Tu dirección de correo ya estaba en la lista de exclusión. No recibirás más emails.',
    },
    not_found: {
      icon: '🔍',
      title: 'Link no encontrado',
      body: 'El link de baja ya no es válido o ha expirado.',
    },
    error: {
      icon: '⚠️',
      title: 'Error inesperado',
      body: 'No pudimos procesar tu solicitud. Por favor intenta de nuevo o contacta soporte.',
    },
  };
  const m = messages[state];
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Baja de emails — MENIUS</title>
  <style>
    body{margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;}
    .card{background:#fff;border-radius:16px;box-shadow:0 1px 8px rgba(0,0,0,.08);padding:40px 32px;max-width:420px;text-align:center;}
    .icon{font-size:48px;margin-bottom:16px;}
    h1{font-size:20px;font-weight:800;color:#111827;margin:0 0 8px;}
    p{font-size:15px;color:#6b7280;line-height:1.6;margin:0 0 24px;}
    a{color:#10b981;font-weight:600;text-decoration:none;}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${m.icon}</div>
    <h1>${m.title}</h1>
    <p>${m.body}</p>
    <a href="${appUrl}">Volver a MENIUS</a>
  </div>
</body>
</html>`;
}
