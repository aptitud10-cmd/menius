import { createClient } from '@/lib/supabase/server';
import { getDeviceSession } from '@/lib/auth/device-session';

export interface TenantInfo {
  userId: string;
  restaurantId: string;
  email?: string;
  /** Sesión de una tablet vinculada con código (solo Counter). */
  isDevice: boolean;
}

export interface GetTenantOptions {
  /**
   * Solo las rutas que usa el Counter pasan true. Por defecto una sesión de
   * tablet recibe null (401): cobros, reembolsos, llaves, menú, configuración.
   */
  allowDevice?: boolean;
  /**
   * Lo delicado: cobros, Stripe, llaves, reembolsos, cuenta, staff y tablets.
   * Ninguna tablet pasa, ni siquiera con el panel abierto por PIN (quien vio al
   * dueño poner el PIN en la tablet compartida no toca la plata). Para eso el
   * dueño usa su celular o su computadora.
   */
  ownerOnly?: boolean;
}

/**
 * Get the authenticated user's tenant (restaurant) info.
 * Used in all tenant-scoped API routes to avoid repeating auth + profile queries.
 * Returns null if not authenticated or no restaurant is linked.
 *
 * Ownership is re-verified against restaurants.owner_user_id on every call —
 * profiles.default_restaurant_id alone is NOT proof of ownership. Roughly 16
 * routes act on the returned restaurantId with the service-role client (which
 * bypasses RLS): refunds, Wompi key writes, account deletion. If that column
 * could ever point at someone else's restaurant, all of them would operate on
 * it. The DB policy blocks writing a foreign id (see
 * migration-profiles-owner-check.sql); this check is the second layer, and the
 * one that also covers rows written before that policy existed.
 */
export async function getTenant(opts: GetTenantOptions = {}): Promise<TenantInfo | null> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, device] = await Promise.all([
    supabase
      .from('profiles')
      .select('default_restaurant_id')
      .eq('user_id', user.id)
      .maybeSingle(),
    getDeviceSession(supabase),
  ]);
  const isDevice = device.isDevice;

  if (isDevice && !opts.allowDevice) return null;
  if (opts.ownerOnly && device.isTablet) return null;
  // La tablet sigue a la tienda a la que se vinculó, no a la elegida en el panel.
  const restaurantId = device.restaurantId ?? profile?.default_restaurant_id;
  if (!restaurantId) return null;

  const { data: owned } = await supabase
    .from('restaurants')
    .select('id')
    .eq('id', restaurantId)
    .eq('owner_user_id', user.id)
    .maybeSingle();

  if (!owned) return null;

  return {
    userId: user.id,
    restaurantId,
    email: user.email,
    isDevice,
  };
}
