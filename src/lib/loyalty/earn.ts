'use server';

import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Earn loyalty points for a customer when an order is completed.
 * Called after order status becomes 'delivered' or 'completed'.
 * Non-blocking — all errors are caught internally.
 */
export async function earnLoyaltyPoints({
  restaurantId,
  customerName,
  customerPhone,
  customerEmail,
  orderTotal,
  orderId,
}: {
  restaurantId: string;
  customerName: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  orderTotal: number;
  orderId: string;
}) {
  try {
    const adminDb = createAdminClient();

    // Check if loyalty is enabled for this restaurant
    const { data: config } = await adminDb
      .from('loyalty_config')
      .select('enabled, points_per_peso, min_redeem_points, welcome_points')
      .eq('restaurant_id', restaurantId)
      .maybeSingle();

    if (!config?.enabled) return;

    const pointsPerPeso = Number(config.points_per_peso) || 1;
    const earnedPoints = Math.floor(orderTotal * pointsPerPeso);
    if (earnedPoints <= 0) return;

    // Prevent double-earn: check if points already credited for this order
    const { data: existing } = await adminDb
      .from('loyalty_transactions')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('reference_id', orderId)
      .maybeSingle();

    if (existing) return; // Already credited

    // Upsert loyalty account
    const { data: account, error: accErr } = await adminDb
      .from('loyalty_accounts')
      .upsert({
        restaurant_id: restaurantId,
        customer_name: customerName,
        customer_phone: customerPhone || null,
        customer_email: customerEmail || null,
        points: earnedPoints,
        lifetime_points: earnedPoints,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'restaurant_id,customer_phone',
        ignoreDuplicates: false,
      })
      .select('id, points, lifetime_points')
      .single();

    if (accErr || !account) {
      // Try upsert by email if phone failed
      if (customerEmail) {
        const { data: acctByEmail } = await adminDb
          .from('loyalty_accounts')
          .select('id, points, lifetime_points')
          .eq('restaurant_id', restaurantId)
          .eq('customer_email', customerEmail)
          .maybeSingle();

        if (acctByEmail) {
          await adminDb
            .from('loyalty_accounts')
            .update({
              points: acctByEmail.points + earnedPoints,
              lifetime_points: acctByEmail.lifetime_points + earnedPoints,
              updated_at: new Date().toISOString(),
            })
            .eq('id', acctByEmail.id);

          // Record transaction
          await adminDb.from('loyalty_transactions').insert({
            restaurant_id: restaurantId,
            account_id: acctByEmail.id,
            type: 'earn',
            points: earnedPoints,
            reference_id: orderId,
            notes: `Order #${orderId.slice(-6).toUpperCase()}`,
            created_at: new Date().toISOString(),
          });
        }
      }
      return;
    }

    // Record transaction
    await adminDb.from('loyalty_transactions').insert({
      restaurant_id: restaurantId,
      account_id: account.id,
      type: 'earn',
      points: earnedPoints,
      reference_id: orderId,
      notes: `Order #${orderId.slice(-6).toUpperCase()}`,
      created_at: new Date().toISOString(),
    });
  } catch {
    // Non-critical — never throw
  }
}
