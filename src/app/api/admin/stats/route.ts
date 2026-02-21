export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/logger';

const logger = createLogger('admin-stats');

async function verifyAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || user.email !== adminEmail) return null;

  return { supabase, user };
}

export async function GET() {
  try {
    const auth = await verifyAdmin();
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

    const { supabase } = auth;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

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
      supabase.from('restaurants').select('id, name, slug, created_at, owner_user_id'),
      supabase.from('subscriptions').select('restaurant_id, plan_id, status, trial_end'),
      supabase.from('orders').select('id', { count: 'exact', head: true }),
      supabase.from('orders').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
      supabase.from('orders').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo),
      supabase.from('restaurants').select('id, name, slug, created_at').order('created_at', { ascending: false }).limit(20),
    ]);

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
      return {
        id: r.id,
        name: r.name,
        slug: r.slug,
        created_at: r.created_at,
        plan: sub?.plan_id ?? 'none',
        status: sub?.status ?? 'none',
        trial_end: sub?.trial_end ?? null,
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

    return NextResponse.json({
      totalRestaurants: totalRestaurants ?? 0,
      totalOrders: totalOrders ?? 0,
      todayOrders: todayOrders ?? 0,
      weekOrders: weekOrders ?? 0,
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
