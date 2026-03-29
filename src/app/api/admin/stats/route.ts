export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import { verifyAdmin } from '@/lib/auth/verify-admin';
import { createAdminClient } from '@/lib/supabase/admin';

const logger = createLogger('admin-stats');

export async function GET() {
  try {
    const auth = await verifyAdmin();
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

    const { supabase } = auth;
    const adminClient = createAdminClient();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [
      { count: totalRestaurants },
      { data: restaurants },
      { data: subscriptions },
      { count: totalOrders },
      { count: todayOrders },
      { count: weekOrders },
      { data: recentRestaurants },
    ] = await Promise.all([
      supabase.from('restaurants').select('id', { count: 'exact', head: true }),
      supabase.from('restaurants').select('id, name, slug, created_at, owner_user_id, currency, notification_email'),
      supabase.from('subscriptions').select('restaurant_id, plan_id, status, trial_end'),
      supabase.from('orders').select('id', { count: 'exact', head: true }),
      supabase.from('orders').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
      supabase.from('orders').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo),
      supabase.from('restaurants').select('id, name, slug, created_at, owner_user_id, currency, notification_email').order('created_at', { ascending: false }).limit(50),
    ]);

    // Fetch auth users to get emails and names (requires service role)
    const ownerIds = [...new Set((recentRestaurants ?? []).map(r => r.owner_user_id).filter(Boolean))];
    const userMap = new Map<string, { email: string; full_name: string }>();
    if (ownerIds.length > 0) {
      try {
        const { data: usersPage } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
        for (const u of usersPage?.users ?? []) {
          userMap.set(u.id, {
            email: u.email ?? '',
            full_name: (u.user_metadata?.full_name as string) ?? (u.user_metadata?.name as string) ?? '',
          });
        }
      } catch {
        // Non-critical — list proceeds without owner info
      }
    }

    const subMap = new Map((subscriptions ?? []).map(s => [s.restaurant_id, s]));

    const planCounts: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};
    let trialExpiringSoon = 0;

    for (const sub of subscriptions ?? []) {
      planCounts[sub.plan_id] = (planCounts[sub.plan_id] || 0) + 1;
      statusCounts[sub.status] = (statusCounts[sub.status] || 0) + 1;

      if (sub.status === 'trialing' && sub.trial_end) {
        const daysLeft = Math.ceil((new Date(sub.trial_end).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysLeft <= 3 && daysLeft >= 0) trialExpiringSoon++;
      }
    }

    const restaurantList = (recentRestaurants ?? []).map(r => {
      const sub = subMap.get(r.id);
      const owner = userMap.get(r.owner_user_id ?? '');
      return {
        id: r.id,
        name: r.name,
        slug: r.slug,
        created_at: r.created_at,
        plan: sub?.plan_id ?? 'none',
        status: sub?.status ?? 'none',
        trial_end: sub?.trial_end ?? null,
        currency: r.currency ?? '',
        owner_email: owner?.email ?? r.notification_email ?? '',
        owner_name: owner?.full_name ?? '',
      };
    });

    // Restaurants created per week (last 4 weeks)
    const weeklySignups: { week: string; count: number }[] = [];
    for (let i = 0; i < 4; i++) {
      const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const count = (restaurants ?? []).filter(r => {
        const d = new Date(r.created_at);
        return d >= weekStart && d < weekEnd;
      }).length;
      weeklySignups.unshift({
        week: weekStart.toLocaleDateString('es', { day: 'numeric', month: 'short' }),
        count,
      });
    }

    // New this week
    const newThisWeek = (restaurants ?? []).filter(r => new Date(r.created_at) >= new Date(weekAgo));

    return NextResponse.json({
      totalRestaurants: totalRestaurants ?? 0,
      totalOrders: totalOrders ?? 0,
      todayOrders: todayOrders ?? 0,
      weekOrders: weekOrders ?? 0,
      newThisWeek: newThisWeek.length,
      planCounts,
      statusCounts,
      trialExpiringSoon,
      weeklySignups,
      restaurants: restaurantList,
    });
  } catch (err) {
    logger.error('GET failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
