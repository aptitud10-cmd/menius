'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { SignupInput, LoginInput } from '@/lib/validations';

export async function signup(data: SignupInput) {
  const supabase = createClient();

  const { error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: { full_name: data.full_name },
    },
  });

  if (error) return { error: error.message };

  redirect('/onboarding/create-restaurant');
}

export async function login(data: LoginInput) {
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
    .single();

  if (profile?.default_restaurant_id) {
    redirect('/app');
  }
  redirect('/onboarding/create-restaurant');
}

export async function logout() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
