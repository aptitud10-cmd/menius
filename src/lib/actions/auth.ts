'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import type { SignupInput, LoginInput } from '@/lib/validations';

function getIPFromHeaders(): string {
  const h = headers();
  return h.get('x-forwarded-for')?.split(',')[0]?.trim()
    || h.get('x-real-ip')
    || '127.0.0.1';
}

export async function signup(data: SignupInput) {
  const ip = getIPFromHeaders();
  const { allowed } = checkRateLimit(`signup:${ip}`, { limit: 5, windowSec: 300 });
  if (!allowed) return { error: 'Demasiados intentos. Espera unos minutos.' };

  const supabase = createClient();

  const { data: signupData, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: { full_name: data.full_name },
    },
  });

  if (error) return { error: error.message };

  if (signupData?.user && !signupData.session) {
    return { success: 'confirm_email' };
  }

  redirect('/onboarding/create-restaurant');
}

export async function login(data: LoginInput) {
  const ip = getIPFromHeaders();
  const { allowed } = checkRateLimit(`login:${ip}`, { limit: 10, windowSec: 300 });
  if (!allowed) return { error: 'Demasiados intentos. Espera unos minutos.' };

  const supabase = createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  });

  if (error) return { error: error.message };

  // Check if user has a restaurant
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Error de autenticación' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('default_restaurant_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile) {
    redirect('/onboarding/create-restaurant');
  }

  if (profile.default_restaurant_id) {
    redirect('/app');
  }
  redirect('/onboarding/create-restaurant');
}

export async function requestPasswordReset(email: string) {
  const ip = getIPFromHeaders();
  const { allowed } = checkRateLimit(`reset:${ip}`, { limit: 3, windowSec: 300 });
  if (!allowed) return { error: 'Demasiados intentos. Espera unos minutos.' };

  const supabase = createClient();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/auth/callback?next=/reset-password`,
  });

  if (error) return { error: error.message };
  return { success: true };
}

export async function updatePassword(newPassword: string) {
  if (!newPassword || newPassword.length < 6) {
    return { error: 'La contraseña debe tener al menos 6 caracteres' };
  }

  const supabase = createClient();

  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) return { error: error.message };
  return { success: true };
}

export async function logout() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
