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

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('default_restaurant_id')
    .eq('user_id', user.id)
    .single();

  // If profile query failed or profile doesn't exist, send to onboarding
  if (profileError || !profile) {
    redirect('/onboarding/create-restaurant');
  }

  if (profile.default_restaurant_id) {
    redirect('/app');
  }
  redirect('/onboarding/create-restaurant');
}

export async function logout() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
