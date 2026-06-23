/**
 * Resuelve el usuario autenticado de un request del driver.
 *
 * La app nativa guarda la sesión en AsyncStorage (no cookies) y manda el JWT en
 * el header `Authorization: Bearer <access_token>`. El web (dashboard) usa cookie.
 * Este helper soporta ambos: prioriza el header Bearer, cae a la cookie.
 *
 * Usa el admin client SOLO para validar el JWT (getUser(token) no expone datos);
 * la autorización fina (qué driver es) la hace el endpoint con auth_user_id.
 */

import type { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export interface DriverAuthUser {
  id: string;
  email: string | null;
}

export async function getDriverAuthUser(req: NextRequest): Promise<DriverAuthUser | null> {
  // 1. Header Bearer (app nativa)
  const authHeader = req.headers.get('authorization') ?? req.headers.get('Authorization');
  const bearer = authHeader?.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : null;

  if (bearer) {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.getUser(bearer);
    if (!error && data.user) {
      return { id: data.user.id, email: data.user.email ?? null };
    }
    return null;
  }

  // 2. Cookie (web)
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
}
