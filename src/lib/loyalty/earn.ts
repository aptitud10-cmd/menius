import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/notifications/email';

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

    // Notify customer via email — non-blocking, best-effort
    if (customerEmail) {
      const newBalance = currentPoints + earnedPoints;

      const { data: restaurant } = await adminDb
        .from('restaurants')
        .select('name')
        .eq('id', restaurantId)
        .maybeSingle();

      const restaurantName = restaurant?.name ?? 'tu restaurante';

      const html = buildLoyaltyEarnEmail({ customerName, restaurantName, earnedPoints, newBalance });
      sendEmail({
        to: customerEmail,
        from: `${restaurantName} <noreply@menius.app>`,
        subject: `+${earnedPoints} puntos en ${restaurantName} 🎉`,
        html,
      }).catch(() => {});
    }
  } catch {
    // Non-critical — never throw
  }
}

function buildLoyaltyEarnEmail({
  customerName,
  restaurantName,
  earnedPoints,
  newBalance,
}: {
  customerName: string;
  restaurantName: string;
  earnedPoints: number;
  newBalance: number;
}): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
  <tr><td style="background:#10b981;padding:28px 32px;text-align:center">
    <p style="margin:0;font-size:36px">🎉</p>
    <p style="margin:8px 0 0;color:#fff;font-size:22px;font-weight:700">¡Ganaste puntos!</p>
  </td></tr>
  <tr><td style="padding:32px">
    <p style="margin:0 0 16px;font-size:15px;color:#374151">Hola <strong>${esc(customerName)}</strong>,</p>
    <p style="margin:0 0 24px;font-size:15px;color:#374151">Gracias por tu compra en <strong>${esc(restaurantName)}</strong>. Acreditamos:</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
      <tr>
        <td style="background:#ecfdf5;border-radius:10px;padding:20px;text-align:center">
          <p style="margin:0;font-size:40px;font-weight:800;color:#10b981">+${earnedPoints}</p>
          <p style="margin:4px 0 0;font-size:13px;color:#6b7280">puntos ganados</p>
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:14px;color:#6b7280;text-align:center">
      Tu saldo total: <strong style="color:#111827">${newBalance} puntos</strong>
    </p>
  </td></tr>
  <tr><td style="padding:0 32px 28px;text-align:center">
    <p style="margin:0;font-size:12px;color:#9ca3af">Powered by <a href="https://menius.app" style="color:#9ca3af">MENIUS</a></p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
