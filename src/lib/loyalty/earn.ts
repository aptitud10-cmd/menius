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
      .select('enabled, points_per_peso')
      .eq('restaurant_id', restaurantId)
      .maybeSingle();

    if (!config?.enabled) return;

    const pointsPerPeso = Number(config.points_per_peso) || 1;
    const earnedPoints = Math.floor(orderTotal * pointsPerPeso);
    if (earnedPoints <= 0) return;

    // Require at least a phone or email to identify the customer
    if (!customerPhone && !customerEmail) return;

    // Prevent double-earn: check if points already credited for this order
    const { data: existing } = await adminDb
      .from('loyalty_transactions')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('order_id', orderId)
      .maybeSingle();

    if (existing) return; // Already credited

    // Find existing loyalty account (phone first, then email)
    let accountId: string | null = null;
    let currentPoints = 0;
    let currentLifetime = 0;

    if (customerPhone) {
      const { data: acct } = await adminDb
        .from('loyalty_accounts')
        .select('id, points, lifetime_points')
        .eq('restaurant_id', restaurantId)
        .eq('customer_phone', customerPhone)
        .maybeSingle();
      if (acct) { accountId = acct.id; currentPoints = acct.points; currentLifetime = acct.lifetime_points; }
    }

    if (!accountId && customerEmail) {
      const { data: acct } = await adminDb
        .from('loyalty_accounts')
        .select('id, points, lifetime_points')
        .eq('restaurant_id', restaurantId)
        .eq('customer_email', customerEmail)
        .maybeSingle();
      if (acct) { accountId = acct.id; currentPoints = acct.points; currentLifetime = acct.lifetime_points; }
    }

    if (accountId) {
      // Update existing account — add points
      await adminDb
        .from('loyalty_accounts')
        .update({
          points: currentPoints + earnedPoints,
          lifetime_points: currentLifetime + earnedPoints,
          updated_at: new Date().toISOString(),
        })
        .eq('id', accountId);
    } else {
      // Create new account — phone is required by DB constraint
      if (!customerPhone) return;

      const { data: newAcct, error: createErr } = await adminDb
        .from('loyalty_accounts')
        .insert({
          restaurant_id: restaurantId,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_email: customerEmail || null,
          points: earnedPoints,
          lifetime_points: earnedPoints,
        })
        .select('id')
        .single();

      if (createErr || !newAcct) return;
      accountId = newAcct.id;
    }

    if (!accountId) return;

    // Record transaction with correct column names (order_id, description)
    await adminDb.from('loyalty_transactions').insert({
      restaurant_id: restaurantId,
      account_id: accountId,
      order_id: orderId,
      type: 'earn',
      points: earnedPoints,
      description: `Auto-earn: order #${orderId.slice(-6).toUpperCase()}`,
    });
  } catch {
    // Non-critical — never throw
  }
}
