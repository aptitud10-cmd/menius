import type { SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from '@/lib/logger';

const logger = createLogger('device-session');

/**
 * ¿La sesión de esta request nació de vincular una tablet con un código?
 *
 * Esas sesiones son del dueño (así el Counter, el realtime y el RLS funcionan sin
 * cambios), pero el servidor solo les deja usar el Counter: getTenant(),
 * getAuthenticatedRestaurant() y getDashboardContext() las rechazan salvo que la
 * ruta lo permita explícitamente, y el middleware las manda a /counter.
 *
 * La consulta lee el session_id del JWT ya verificado (función SQL
 * current_session_is_device), así que el cliente no puede elegir qué sesión se
 * consulta. Si la consulta falla, se asume tablet: fallar cerrado.
 */
export async function isDeviceSession(supabase: SupabaseClient): Promise<boolean> {
  const { data, error } = await supabase.rpc('current_session_is_device');
  if (error) {
    logger.error('current_session_is_device failed — treating as device', { message: error.message });
    return true;
  }
  return data === true;
}

/**
 * Sesión de tablet + la tienda a la que se vinculó (device_sessions.restaurant_id).
 *
 * Con varias tiendas, la tablet tiene que seguir a SU tienda y no a la que el
 * dueño tenga elegida en el panel (profiles.default_restaurant_id): antes, si
 * el dueño cambiaba de tienda, la tablet de la tienda A empezaba a recibir y
 * mover los pedidos de la B.
 *
 * Si la función SQL todavía no existe (migración 20261111a pendiente) o falla,
 * cae al comportamiento anterior: isDeviceSession (falla cerrado) y sin tienda.
 */
export interface DeviceSessionInfo {
  /** Tablet con el Counter y nada más (false si el dueño abrió el panel con su PIN). */
  isDevice: boolean;
  /** Es una tablet vinculada, tenga o no el panel abierto. */
  isTablet: boolean;
  /** Tablet con el panel del dueño desbloqueado por PIN (dura 10 min sin actividad). */
  panelUnlocked: boolean;
  restaurantId: string | null;
  /** session_id del JWT verificado; solo si es tablet. */
  sessionId: string | null;
}

/**
 * Tablet con el panel abierto (PIN del dueño, sección 7 del brief): pasa los gates
 * comunes como si fuera el dueño, pero sigue pegada a SU tienda. Lo delicado
 * (cobros, Stripe, llaves, reembolsos, cuenta, staff, tablets) pasa ownerOnly y
 * la sigue rechazando. Si la función nueva no existe todavía (migración 20261113f
 * pendiente), cae a current_device_restaurant_id y nunca hay panel abierto.
 */
export async function getDeviceSession(supabase: SupabaseClient): Promise<DeviceSessionInfo> {
  const none: DeviceSessionInfo = { isDevice: false, isTablet: false, panelUnlocked: false, restaurantId: null, sessionId: null };

  const cur = await supabase.rpc('current_device_session');
  if (!cur.error) {
    const row = (Array.isArray(cur.data) ? cur.data[0] : cur.data) as
      | { session_id?: unknown; restaurant_id?: unknown; panel_unlocked?: unknown }
      | null
      | undefined;
    const rid = typeof row?.restaurant_id === 'string' && row.restaurant_id ? row.restaurant_id : null;
    if (!rid) return none;
    const unlocked = row?.panel_unlocked === true;
    return {
      isDevice: !unlocked,
      isTablet: true,
      panelUnlocked: unlocked,
      restaurantId: rid,
      sessionId: typeof row?.session_id === 'string' ? row.session_id : null,
    };
  }
  if (cur.error.code !== 'PGRST202') {
    // Falla cerrado: tablet sin panel.
    logger.error('current_device_session failed', { message: cur.error.message });
  }

  const { data, error } = await supabase.rpc('current_device_restaurant_id');
  if (!error) {
    const rid = typeof data === 'string' && data ? data : null;
    return rid ? { ...none, isDevice: true, isTablet: true, restaurantId: rid } : none;
  }
  if (error.code !== 'PGRST202') {
    logger.error('current_device_restaurant_id failed', { message: error.message });
  }
  const isDevice = await isDeviceSession(supabase);
  return { ...none, isDevice, isTablet: isDevice };
}

/** session_id de un access token recién emitido por Supabase Auth (no verifica firma). */
export function sessionIdFromAccessToken(accessToken: string | undefined | null): string | null {
  if (!accessToken) return null;
  const payload = accessToken.split('.')[1];
  if (!payload) return null;
  try {
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))) as { session_id?: unknown };
    const sid = json.session_id;
    return typeof sid === 'string' && /^[0-9a-f-]{36}$/i.test(sid) ? sid : null;
  } catch {
    return null;
  }
}
