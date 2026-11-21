export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Aviso al dueño si la tablet del Counter se desconecta (auditoría Counter
 * 2026-11-21, Tanda 2). Corre cada 5 min.
 *
 * El Counter deja su señal en restaurants.counter_seen_at (cada ~1 min, vía
 * /api/counter/pause?counter=1). Se manda UN email por corte cuando:
 * - la última señal tiene entre 10 min y 3 h (más vieja = la tablet se apagó al
 *   cerrar y todavía no la prendieron; eso no es un corte),
 * - la tienda estaba abierta cuando se cortó y lo está ahora, sin cerrar en los
 *   próximos 30 min (apagar la tablet un rato antes del cierre no avisa),
 * - los pedidos no están pausados a propósito,
 * - hay notification_email y las notificaciones están prendidas.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createLogger } from '@/lib/logger';
import { captureError } from '@/lib/error-reporting';
import { createAlert } from '@/lib/dev-tool/alerts';
import { sendEmail, buildCounterOfflineEmail } from '@/lib/notifications/email';
import { isOpenAt, inTimeZone, type OperatingHours } from '@/lib/orders/business-hours';

const logger = createLogger('counter-offline');
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://menius.app';

const OFFLINE_AFTER_MIN = 10;
const LOOKBACK_H = 3;
const CLOSING_SOON_MIN = 30;

type Row = {
  id: string;
  name: string | null;
  slug: string | null;
  locale: string | null;
  timezone: string | null;
  operating_hours: OperatingHours | null;
  notification_email: string | null;
  notifications_enabled: boolean | null;
  orders_paused_until: string | null;
  counter_seen_at: string;
  counter_offline_alerted_at: string | null;
};

/** Abierta en ese instante y sin cerrar en los próximos 30 min. Sin horario cargado = siempre abierta. */
function openAndStaying(hours: OperatingHours | null, tz: string, at: number): boolean {
  if (!hours || Object.keys(hours).length === 0) return true;
  return isOpenAt(hours, inTimeZone(new Date(at), tz))
    && isOpenAt(hours, inTimeZone(new Date(at + CLOSING_SOON_MIN * 60_000), tz));
}

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = createAdminClient();
    const now = Date.now();
    const { data, error } = await db
      .from('restaurants')
      .select('id, name, slug, locale, timezone, operating_hours, notification_email, notifications_enabled, orders_paused_until, counter_seen_at, counter_offline_alerted_at')
      .gte('counter_seen_at', new Date(now - LOOKBACK_H * 3_600_000).toISOString())
      .lt('counter_seen_at', new Date(now - OFFLINE_AFTER_MIN * 60_000).toISOString())
      .limit(200);
    if (error) {
      logger.error('query failed', { error: error.message });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const sent: string[] = [];
    for (const r of (data ?? []) as Row[]) {
      const seen = new Date(r.counter_seen_at).getTime();
      if (r.counter_offline_alerted_at && new Date(r.counter_offline_alerted_at).getTime() >= seen) continue;
      if (!r.notification_email || r.notifications_enabled === false) continue;
      if (r.orders_paused_until && new Date(r.orders_paused_until).getTime() > now) continue;
      const tz = r.timezone || 'UTC';
      if (!openAndStaying(r.operating_hours, tz, seen) || !openAndStaying(r.operating_hours, tz, now)) continue;

      // Se marca antes de mandar (dos corridas a la vez no mandan dos emails);
      // si el envío falla se devuelve el valor anterior y la próxima corrida reintenta.
      const { data: claimed, error: claimErr } = await db
        .from('restaurants')
        .update({ counter_offline_alerted_at: new Date(now).toISOString() })
        .eq('id', r.id)
        .lt('counter_seen_at', new Date(now - OFFLINE_AFTER_MIN * 60_000).toISOString()) // sigue sin señal
        .or(`counter_offline_alerted_at.is.null,counter_offline_alerted_at.lt.${new Date(seen).toISOString()}`)
        .select('id');
      if (claimErr || !claimed?.length) continue;

      const locale = r.locale === 'en' ? 'en' : 'es';
      const since = new Date(seen).toLocaleTimeString(locale === 'en' ? 'en-US' : 'es', {
        timeZone: tz, hour: 'numeric', minute: '2-digit',
      });
      const name = r.name ?? r.slug ?? 'MENIUS';
      const { subject, html } = buildCounterOfflineEmail({
        restaurantName: name, since, ordersUrl: `${BASE_URL}/app/orders`, locale,
      });
      const ok = await sendEmail({ to: r.notification_email, subject, html });
      if (!ok) {
        await db.from('restaurants').update({ counter_offline_alerted_at: r.counter_offline_alerted_at }).eq('id', r.id);
        logger.warn('email failed', { restaurantId: r.id });
        continue;
      }
      sent.push(r.id);
      await createAlert({
        source: 'counter',
        severity: 'warning',
        title: `Counter desconectado · ${name}`,
        description: `Sin señal desde ${since} (${tz}). Se avisó al dueño por email.`,
        store_slug: r.slug ?? undefined,
      });
    }

    logger.info('counter-offline done', { candidates: data?.length ?? 0, sent: sent.length });
    return NextResponse.json({ ok: true, candidates: data?.length ?? 0, sent: sent.length });
  } catch (err) {
    logger.error('counter-offline failed', { error: err instanceof Error ? err.message : String(err) });
    captureError(err, { route: '/api/cron/counter-offline' });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
