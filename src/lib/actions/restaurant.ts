'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { CreateRestaurantInput, CategoryInput, ProductInput, TableInput } from '@/lib/validations';

// ---- Restaurant ----
export async function createRestaurant(data: CreateRestaurantInput) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' };

  // Check slug is unique
  const { data: existing } = await supabase
    .from('restaurants')
    .select('id')
    .eq('slug', data.slug)
    .single();

  if (existing) return { error: 'Ese slug ya está en uso' };

  const { data: restaurant, error } = await supabase
    .from('restaurants')
    .insert({
      name: data.name,
      slug: data.slug,
      owner_user_id: user.id,
      timezone: data.timezone,
      currency: data.currency,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  // Update profile with default restaurant
  await supabase
    .from('profiles')
    .update({ default_restaurant_id: restaurant.id })
    .eq('user_id', user.id);

  redirect('/app');
}

// ---- Categories ----
export async function createCategory(data: CategoryInput) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('default_restaurant_id')
    .eq('user_id', user.id)
    .single();

  if (!profile?.default_restaurant_id) return { error: 'Sin restaurante' };

  const { error } = await supabase.from('categories').insert({
    restaurant_id: profile.default_restaurant_id,
    name: data.name,
    sort_order: data.sort_order,
    is_active: data.is_active,
  });

  if (error) return { error: error.message };
  revalidatePath('/app/menu/categories');
  return { success: true };
}

export async function updateCategory(id: string, data: CategoryInput) {
  const supabase = createClient();
  const { error } = await supabase
    .from('categories')
    .update({ name: data.name, sort_order: data.sort_order, is_active: data.is_active })
    .eq('id', id);

  if (error) return { error: error.message };
  revalidatePath('/app/menu/categories');
  return { success: true };
}

export async function deleteCategory(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/app/menu/categories');
  return { success: true };
}

// ---- Products ----
export async function createProduct(data: ProductInput) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('default_restaurant_id')
    .eq('user_id', user.id)
    .single();

  if (!profile?.default_restaurant_id) return { error: 'Sin restaurante' };

  const { error } = await supabase.from('products').insert({
    restaurant_id: profile.default_restaurant_id,
    category_id: data.category_id,
    name: data.name,
    description: data.description,
    price: data.price,
    is_active: data.is_active,
  });

  if (error) return { error: error.message };
  revalidatePath('/app/menu/products');
  return { success: true };
}

export async function updateProduct(id: string, data: Partial<ProductInput> & { image_url?: string }) {
  const supabase = createClient();
  const { error } = await supabase
    .from('products')
    .update(data)
    .eq('id', id);

  if (error) return { error: error.message };
  revalidatePath('/app/menu/products');
  return { success: true };
}

export async function deleteProduct(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/app/menu/products');
  return { success: true };
}

// ---- Tables ----
export async function createTable(data: TableInput) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('default_restaurant_id')
    .eq('user_id', user.id)
    .single();

  if (!profile?.default_restaurant_id) return { error: 'Sin restaurante' };

  // Get restaurant slug for QR
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('slug')
    .eq('id', profile.default_restaurant_id)
    .single();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.vercel.app';
  const qrValue = `${appUrl}/r/${restaurant?.slug}?table=${data.name}`;

  const { error } = await supabase.from('tables').insert({
    restaurant_id: profile.default_restaurant_id,
    name: data.name,
    qr_code_value: qrValue,
  });

  if (error) return { error: error.message };
  revalidatePath('/app/tables');
  return { success: true };
}

export async function deleteTable(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('tables').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/app/tables');
  return { success: true };
}

// ---- Orders ----
export async function updateOrderStatus(orderId: string, status: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId);

  if (error) return { error: error.message };
  revalidatePath('/app/orders');
  return { success: true };
}
