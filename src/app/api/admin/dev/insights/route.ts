export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth/verify-admin';
import { createAdminClient } from '@/lib/supabase/admin';

export interface StoreInsight {
  type: 'inactive' | 'new_store' | 'high_cancellations' | 'no_products' | 'alert' | 'tip';
  severity: 'critical' | 'warning' | 'info';
  store_slug?: string;
  store_name?: string;
  title: string;
  description: string;
  prompt: string; // suggested chat prompt to analyze
}

export async function GET() {
  const auth = await verifyAdmin();
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const db = createAdminClient();
  const insights: StoreInsight[] = [];

  try {
    // 1. Stores with subscription but no orders in last 7 days
    const { data: inactive } = await db.rpc('exec_readonly_sql', {
      query: `
        SELECT r.name, r.slug
        FROM restaurants r
        WHERE r.stripe_subscription_status = 'active'
          AND NOT EXISTS (
            SELECT 1 FROM orders o
            WHERE o.restaurant_id = r.id
              AND o.created_at >= NOW() - INTERVAL '7 days'
          )
          AND EXISTS (
            SELECT 1 FROM orders o2
            WHERE o2.restaurant_id = r.id
              AND o2.created_at >= NOW() - INTERVAL '60 days'
          )
        LIMIT 5
      `,
    });
    for (const s of (inactive as Array<{name:string;slug:string}>) ?? []) {
      insights.push({
        type: 'inactive',
        severity: 'warning',
        store_slug: s.slug,
        store_name: s.name,
        title: `${s.name} sin órdenes en 7 días`,
        description: 'Esta tienda tiene suscripción activa pero no ha recibido pedidos recientemente.',
        prompt: `Audita la tienda "${s.slug}": revisa si hay problemas de configuración, productos sin precio, el menú público funciona bien en menius.app/${s.slug} , y sugiere mejoras para reactivar pedidos.`,
      });
    }

    // 2. New stores (registered in last 14 days) – onboarding check
    const { data: newStores } = await db.rpc('exec_readonly_sql', {
      query: `
        SELECT r.name, r.slug, r.created_at,
               (SELECT count(*) FROM products p WHERE p.restaurant_id = r.id) AS product_count,
               (SELECT count(*) FROM categories c WHERE c.restaurant_id = r.id) AS category_count
        FROM restaurants r
        WHERE r.created_at >= NOW() - INTERVAL '14 days'
        ORDER BY r.created_at DESC
        LIMIT 5
      `,
    });
    for (const s of (newStores as Array<{name:string;slug:string;product_count:number;category_count:number}>) ?? []) {
      if (Number(s.product_count) < 3 || Number(s.category_count) === 0) {
        insights.push({
          type: 'new_store',
          severity: 'info',
          store_slug: s.slug,
          store_name: s.name,
          title: `${s.name} recién registrada — onboarding incompleto`,
          description: `Tiene ${s.product_count} productos y ${s.category_count} categorías. Puede necesitar ayuda para configurar su menú.`,
          prompt: `La tienda "${s.slug}" es nueva y tiene pocos productos (${s.product_count}). Revisa su menú en menius.app/${s.slug} y sugiere qué falta para que esté lista para recibir pedidos.`,
        });
      }
    }

    // 3. High cancellation rate last 24h
    const { data: highCancel } = await db.rpc('exec_readonly_sql', {
      query: `
        SELECT r.name, r.slug, count(*) as cancelled
        FROM orders o
        JOIN restaurants r ON r.id = o.restaurant_id
        WHERE o.status = 'cancelled'
          AND o.created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY r.id, r.name, r.slug
        HAVING count(*) >= 3
        ORDER BY count(*) DESC
        LIMIT 3
      `,
    });
    for (const s of (highCancel as Array<{name:string;slug:string;cancelled:number}>) ?? []) {
      insights.push({
        type: 'high_cancellations',
        severity: 'critical',
        store_slug: s.slug,
        store_name: s.name,
        title: `${s.name}: ${s.cancelled} cancelaciones en 24h`,
        description: 'Alto volumen de cancelaciones puede indicar problemas de disponibilidad o configuración.',
        prompt: `La tienda "${s.slug}" tiene ${s.cancelled} cancelaciones en las últimas 24 horas. Investiga en la base de datos el motivo (razón de cancelación si la hay), analiza si hay un patrón, y sugiere cómo resolver esto.`,
      });
    }

    // 4. Active alerts from dev_alerts table
    const { data: activeAlerts } = await db
      .from('dev_alerts')
      .select('title, description, severity, store_slug, source')
      .is('resolved_at', null)
      .order('created_at', { ascending: false })
      .limit(3);
    for (const a of activeAlerts ?? []) {
      insights.push({
        type: 'alert',
        severity: a.severity as 'critical' | 'warning' | 'info',
        store_slug: a.store_slug ?? undefined,
        title: a.title,
        description: a.description ?? '',
        prompt: `Analiza este problema y propón un fix: ${a.title}. ${a.description ?? ''}${a.store_slug ? ` Tienda afectada: ${a.store_slug}` : ''}`,
      });
    }

    // 5. General tip if no issues found
    if (insights.length === 0) {
      insights.push({
        type: 'tip',
        severity: 'info',
        title: 'Todo en orden',
        description: 'No se detectaron problemas en las tiendas activas.',
        prompt: 'Dame un resumen de las métricas de Menius: cuántas tiendas activas, revenue del mes, y qué feature tendría más ROI agregar ahora.',
      });
    }

    return NextResponse.json({ insights, generatedAt: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json({ error: String(err), insights: [] }, { status: 500 });
  }
}
