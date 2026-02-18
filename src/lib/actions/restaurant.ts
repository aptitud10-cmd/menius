'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { sanitizeText, sanitizeMultiline } from '@/lib/sanitize';
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

  // Update profile with default restaurant — create profile if it doesn't exist
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ default_restaurant_id: restaurant.id })
    .eq('user_id', user.id);

  if (updateError) {
    // Profile might not exist (trigger failed) — try to create it
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        user_id: user.id,
        full_name: user.user_metadata?.full_name || '',
        role: 'owner',
        default_restaurant_id: restaurant.id,
      });

    if (insertError) {
      return { error: 'Restaurante creado pero hubo un error al vincular tu cuenta. Intenta cerrar sesión y volver a entrar.' };
    }
  }

  // Seed with example data so the new owner sees a populated menu
  const { seedRestaurant } = await import('@/lib/seed-restaurant');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';
  await seedRestaurant(supabase, restaurant.id, restaurant.slug, appUrl);

  // Create trial subscription (14 days)
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 14);
  await supabase.from('subscriptions').upsert({
    restaurant_id: restaurant.id,
    plan_id: 'starter',
    status: 'trialing',
    trial_end: trialEnd.toISOString(),
  }, { onConflict: 'restaurant_id' }).then(() => {});

  // Send welcome email (non-blocking)
  if (user.email) {
    import('@/lib/notifications/email').then(({ sendEmail, buildWelcomeEmail }) => {
      const html = buildWelcomeEmail({
        ownerName: user.user_metadata?.full_name || data.name,
        restaurantName: data.name,
        dashboardUrl: `${appUrl}/app`,
        menuUrl: `${appUrl}/r/${data.slug}`,
      });
      sendEmail({
        to: user.email!,
        subject: `¡Bienvenido a MENIUS! — ${data.name} ya tiene su menú digital`,
        html,
      }).catch(() => {});
    });
  }

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

  const { data: created, error } = await supabase.from('categories').insert({
    restaurant_id: profile.default_restaurant_id,
    name: sanitizeText(data.name, 100),
    sort_order: data.sort_order,
    is_active: data.is_active,
  }).select('id, name').single();

  if (error) return { error: error.message };
  revalidatePath('/app/menu/categories');
  return { success: true, id: created?.id, name: created?.name };
}

export async function updateCategory(id: string, data: CategoryInput) {
  const supabase = createClient();
  const { error } = await supabase
    .from('categories')
    .update({ name: sanitizeText(data.name, 100), sort_order: data.sort_order, is_active: data.is_active })
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
    name: sanitizeText(data.name, 150),
    description: sanitizeMultiline(data.description, 500),
    price: data.price,
    is_active: data.is_active,
  });

  if (error) return { error: error.message };
  revalidatePath('/app/menu/products');
  return { success: true };
}

export async function updateProduct(id: string, data: Partial<ProductInput> & { image_url?: string }) {
  const supabase = createClient();
  const sanitized = { ...data };
  if (sanitized.name) sanitized.name = sanitizeText(sanitized.name, 150);
  if (sanitized.description) sanitized.description = sanitizeMultiline(sanitized.description, 500);
  const { error } = await supabase
    .from('products')
    .update(sanitized)
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

// ---- Variants ----
export async function createVariant(productId: string, data: { name: string; price_delta: number; sort_order: number }) {
  const supabase = createClient();
  const { data: variant, error } = await supabase
    .from('product_variants')
    .insert({
      product_id: productId,
      name: sanitizeText(data.name, 100),
      price_delta: data.price_delta,
      sort_order: data.sort_order,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath('/app/menu/products');
  return { success: true, variant };
}

export async function updateVariant(id: string, data: { name: string; price_delta: number; sort_order: number }) {
  const supabase = createClient();
  const { error } = await supabase
    .from('product_variants')
    .update({
      name: sanitizeText(data.name, 100),
      price_delta: data.price_delta,
      sort_order: data.sort_order,
    })
    .eq('id', id);

  if (error) return { error: error.message };
  revalidatePath('/app/menu/products');
  return { success: true };
}

export async function deleteVariant(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('product_variants').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/app/menu/products');
  return { success: true };
}

// ---- Extras ----
export async function createExtra(productId: string, data: { name: string; price: number; sort_order: number }) {
  const supabase = createClient();
  const { data: extra, error } = await supabase
    .from('product_extras')
    .insert({
      product_id: productId,
      name: sanitizeText(data.name, 100),
      price: data.price,
      sort_order: data.sort_order,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath('/app/menu/products');
  return { success: true, extra };
}

export async function updateExtra(id: string, data: { name: string; price: number; sort_order: number }) {
  const supabase = createClient();
  const { error } = await supabase
    .from('product_extras')
    .update({
      name: sanitizeText(data.name, 100),
      price: data.price,
      sort_order: data.sort_order,
    })
    .eq('id', id);

  if (error) return { error: error.message };
  revalidatePath('/app/menu/products');
  return { success: true };
}

export async function deleteExtra(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('product_extras').delete().eq('id', id);
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
  const restaurantId = profile.default_restaurant_id;

  const [restaurantRes, tablesCountRes, subscriptionRes] = await Promise.all([
    supabase.from('restaurants').select('slug').eq('id', restaurantId).single(),
    supabase.from('tables').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId),
    supabase.from('subscriptions').select('plan_id').eq('restaurant_id', restaurantId).single(),
  ]);

  const currentCount = tablesCountRes.count ?? 0;
  const planId = subscriptionRes.data?.plan_id ?? 'starter';

  const { getPlan, isWithinLimit } = await import('@/lib/plans');
  const plan = getPlan(planId);
  if (plan && !isWithinLimit(currentCount + 1, plan.limits.maxTables)) {
    return { error: `Tu plan ${plan.name} permite hasta ${plan.limits.maxTables} mesas. Actualiza tu plan para agregar más.` };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';
  const tableName = sanitizeText(data.name, 50);
  const qrValue = `${appUrl}/r/${restaurantRes.data?.slug}?table=${encodeURIComponent(tableName)}`;

  const { error } = await supabase.from('tables').insert({
    restaurant_id: restaurantId,
    name: tableName,
    qr_code_value: qrValue,
  });

  if (error) return { error: error.message };
  revalidatePath('/app/tables');
  return { success: true };
}

export async function updateTable(id: string, newName: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('default_restaurant_id')
    .eq('user_id', user.id)
    .single();

  if (!profile?.default_restaurant_id) return { error: 'Sin restaurante' };

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('slug')
    .eq('id', profile.default_restaurant_id)
    .single();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';
  const name = sanitizeText(newName, 50);
  const qrValue = `${appUrl}/r/${restaurant?.slug}?table=${encodeURIComponent(name)}`;

  const { error } = await supabase
    .from('tables')
    .update({ name, qr_code_value: qrValue })
    .eq('id', id)
    .eq('restaurant_id', profile.default_restaurant_id);

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

  const { data: order } = await supabase
    .from('orders')
    .select('id, order_number, restaurant_id, customer_name')
    .eq('id', orderId)
    .single();

  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId);

  if (error) return { error: error.message };

  if (order && ['confirmed', 'preparing', 'ready', 'delivered', 'cancelled'].includes(status)) {
    import('@/lib/notifications/order-notifications').then(({ notifyStatusChange }) => {
      notifyStatusChange({
        orderNumber: order.order_number,
        restaurantId: order.restaurant_id,
        status,
        customerName: order.customer_name,
      });
    }).catch(() => {});
  }

  revalidatePath('/app/orders');
  return { success: true };
}
