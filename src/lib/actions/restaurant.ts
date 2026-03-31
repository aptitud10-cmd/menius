'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { revalidatePublicMenu } from '@/lib/revalidate-public-menu';
import { createClient } from '@/lib/supabase/server';
import { sanitizeText, sanitizeMultiline } from '@/lib/sanitize';
import { captureError } from '@/lib/error-reporting';
import type { CreateRestaurantInput, CategoryInput, ProductInput, TableInput } from '@/lib/validations';
import { sendWhatsApp } from '@/lib/notifications/whatsapp';
import { sendSMS, resolveChannel } from '@/lib/notifications/sms';

const EN_CURRENCIES = new Set(['USD', 'GBP', 'CAD', 'AUD', 'NZD']);
function inferLocale(currency: string): string {
  return EN_CURRENCIES.has(currency) ? 'en' : 'es';
}

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
    .maybeSingle();

  if (existing) return { error: 'Ese slug ya está en uso' };

  const locale = data.locale ?? inferLocale(data.currency);

  // Atomic transaction: creates restaurant + subscription + profile link in a single DB call.
  // If any step fails, the entire transaction rolls back — no orphaned records.
  const { data: rpcResult, error } = await supabase.rpc('create_restaurant_with_subscription', {
    p_name: data.name,
    p_slug: data.slug,
    p_owner_user_id: user.id,
    p_timezone: data.timezone,
    p_currency: data.currency,
    p_locale: locale,
    p_plan_id: 'starter',
  });

  if (error) {
    captureError(new Error(error.message), { route: 'createRestaurant', userId: user.id });
    return { error: error.message };
  }

  const restaurant = rpcResult as {
    id: string; name: string; slug: string; owner_user_id: string;
    timezone: string; currency: string; locale: string; created_at: string;
  };

  // Set owner's email as default notification_email so they receive order alerts immediately
  if (user.email) {
    await supabase
      .from('restaurants')
      .update({ notification_email: user.email, notifications_enabled: true })
      .eq('id', restaurant.id);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';

  // Seed example data so the menu is not empty on first visit
  try {
    const { seedRestaurant } = await import('@/lib/seed-restaurant');
    await seedRestaurant(supabase, restaurant.id, restaurant.slug, appUrl, locale);
  } catch {
    // Seed failure should not block onboarding
  }

  // Welcome email to new restaurant owner
  if (user.email) {
    try {
      const { sendEmail, buildWelcomeEmail } = await import('@/lib/notifications/email');
      const en = locale === 'en';
      const html = buildWelcomeEmail({
        ownerName: user.user_metadata?.full_name || data.name,
        restaurantName: data.name,
        dashboardUrl: `${appUrl}/app`,
        menuUrl: `${appUrl}/${data.slug}`,
        locale,
      });
      sendEmail({
        to: user.email!,
        subject: en
          ? `Welcome to MENIUS! — ${data.name} now has a digital menu`
          : `¡Bienvenido a MENIUS! — ${data.name} ya tiene su menú digital`,
        html,
      }).catch(() => {});
    } catch {
      // Email failure should not block onboarding
    }
  }

  // Notify SaaS admin about new registration
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.warn('[createRestaurant] ADMIN_EMAIL env var is not set — admin notification skipped');
  } else {
    try {
      const { sendEmail } = await import('@/lib/notifications/email');
      const sent = await sendEmail({
        to: adminEmail,
        subject: `🚀 Nuevo restaurante registrado: ${data.name}`,
        html: `
          <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px;">
            <h2 style="color:#7c3aed;margin:0 0 16px;">Nuevo registro en MENIUS</h2>
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Restaurante</td><td style="padding:8px 0;font-size:14px;font-weight:600;">${data.name}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Slug</td><td style="padding:8px 0;font-size:14px;">${data.slug}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Email</td><td style="padding:8px 0;font-size:14px;">${user.email}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Nombre</td><td style="padding:8px 0;font-size:14px;">${user.user_metadata?.full_name || 'N/A'}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Moneda</td><td style="padding:8px 0;font-size:14px;">${data.currency}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Timezone</td><td style="padding:8px 0;font-size:14px;">${data.timezone}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Fecha</td><td style="padding:8px 0;font-size:14px;">${new Date().toLocaleString('es')}</td></tr>
            </table>
            <div style="margin-top:20px;">
              <a href="${appUrl}/${data.slug}" style="display:inline-block;padding:10px 20px;background:#7c3aed;color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">Ver menú</a>
              <a href="${appUrl}/admin/users" style="display:inline-block;padding:10px 20px;background:#059669;color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;margin-left:8px;">Admin Panel</a>
            </div>
          </div>`,
      });
      if (!sent) {
        console.error('[createRestaurant] Admin notification email failed to send — check RESEND_API_KEY and domain verification');
      }
    } catch (e) {
      console.error('[createRestaurant] Admin notification error:', e);
    }
  }

  return { success: true as const, slug: restaurant.slug, restaurantId: restaurant.id };
}

// ---- Re-seed ----
export async function reseedMyRestaurant() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('default_restaurant_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile?.default_restaurant_id) return { error: 'Sin restaurante vinculado' };
  const restaurantId = profile.default_restaurant_id;

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('slug, owner_user_id, currency')
    .eq('id', restaurantId)
    .maybeSingle();

  if (!restaurant || restaurant.owner_user_id !== user.id) return { error: 'No autorizado' };

  const { count: productCount } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId);

  if ((productCount ?? 0) > 0) {
    return { error: 'Tu restaurante ya tiene productos. Edítalos desde el menú.' };
  }

  const { seedRestaurant } = await import('@/lib/seed-restaurant');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';
  const locale = inferLocale(restaurant.currency ?? 'MXN');
  await seedRestaurant(supabase, restaurantId, restaurant.slug, appUrl, locale);

  revalidatePath('/app');
  revalidatePublicMenu(restaurant.slug);
  return { success: true };
}

// ---- Categories ----
export async function createCategory(data: CategoryInput) {
  const { supabase, restaurantId, restaurantSlug, error: authErr } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  // Enforce plan category limit
  const [{ count: catCount }, { data: subRow }] = await Promise.all([
    supabase.from('categories').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId),
    supabase.from('subscriptions').select('plan_id').eq('restaurant_id', restaurantId).maybeSingle(),
  ]);
  const { getPlan, isWithinLimit } = await import('@/lib/plans');
  const plan = getPlan(subRow?.plan_id ?? 'starter');
  if (plan && !isWithinLimit((catCount ?? 0) + 1, plan.limits.maxCategories)) {
    return { error: `Tu plan ${plan.name} permite hasta ${plan.limits.maxCategories} categorías. Actualiza tu plan para agregar más.`, limitReached: true };
  }

  const { data: created, error } = await supabase.from('categories').insert({
    restaurant_id: restaurantId,
    name: sanitizeText(data.name, 100),
    sort_order: data.sort_order,
    is_active: data.is_active,
    available_from: data.available_from || null,
    available_to: data.available_to || null,
  }).select('id, name').single();

  if (error) return { error: error.message };
  revalidatePath('/app/menu/categories');
  revalidatePublicMenu(restaurantSlug);
  return { success: true, id: created?.id, name: created?.name };
}

async function getAuthenticatedRestaurant() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' as const, supabase, restaurantId: '', restaurantSlug: '' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('default_restaurant_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile?.default_restaurant_id) return { error: 'Sin restaurante' as const, supabase, restaurantId: '', restaurantSlug: '' };

  const { data: rest } = await supabase
    .from('restaurants')
    .select('slug')
    .eq('id', profile.default_restaurant_id)
    .maybeSingle();

  return { supabase, restaurantId: profile.default_restaurant_id, restaurantSlug: rest?.slug ?? '', error: null };
}

export async function updateCategory(id: string, data: CategoryInput) {
  const { supabase, restaurantId, restaurantSlug, error: authErr } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const payload: Record<string, unknown> = {
    name: sanitizeText(data.name, 100),
    sort_order: data.sort_order,
    is_active: data.is_active,
  };
  if (data.translations !== undefined) payload.translations = data.translations;
  if (data.image_url !== undefined) payload.image_url = data.image_url;
  if (data.available_from !== undefined) payload.available_from = data.available_from || null;
  if (data.available_to !== undefined) payload.available_to = data.available_to || null;

  const { error } = await supabase
    .from('categories')
    .update(payload)
    .eq('id', id)
    .eq('restaurant_id', restaurantId);

  if (error) return { error: error.message };
  revalidatePath('/app/menu/categories');
  revalidatePublicMenu(restaurantSlug);
  return { success: true };
}

export async function deleteCategory(id: string) {
  const { supabase, restaurantId, restaurantSlug, error: authErr } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const { error } = await supabase.from('categories').delete().eq('id', id).eq('restaurant_id', restaurantId);
  if (error) return { error: error.message };
  revalidatePath('/app/menu/categories');
  revalidatePublicMenu(restaurantSlug);
  return { success: true };
}

export async function reorderCategories(orderedIds: string[]) {
  const { supabase, restaurantId, restaurantSlug, error: authErr } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const updates = orderedIds.map((id, i) =>
    supabase.from('categories').update({ sort_order: i }).eq('id', id).eq('restaurant_id', restaurantId)
  );
  await Promise.all(updates);
  revalidatePath('/app/menu/categories');
  revalidatePublicMenu(restaurantSlug);
  return { success: true };
}

export async function reorderProducts(orderedIds: string[]) {
  const { supabase, restaurantId, restaurantSlug, error: authErr } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const updates = orderedIds.map((id, i) =>
    supabase.from('products').update({ sort_order: i }).eq('id', id).eq('restaurant_id', restaurantId)
  );
  await Promise.all(updates);
  revalidatePath('/app/menu/products');
  revalidatePublicMenu(restaurantSlug);
  return { success: true };
}

// ---- Products ----
export async function createProduct(data: ProductInput & { image_url?: string }) {
  const { supabase, restaurantId, restaurantSlug, error: authErr } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const [{ count: productCount }, { data: subRow }] = await Promise.all([
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId),
    supabase.from('subscriptions').select('plan_id').eq('restaurant_id', restaurantId).maybeSingle(),
  ]);
  const { getPlan, isWithinLimit } = await import('@/lib/plans');
  const plan = getPlan(subRow?.plan_id ?? 'starter');
  if (plan && !isWithinLimit((productCount ?? 0) + 1, plan.limits.maxProducts)) {
    return { error: `Tu plan ${plan.name} permite hasta ${plan.limits.maxProducts} productos. Actualiza tu plan para agregar más.`, limitReached: true };
  }

  const { data: created, error } = await supabase.from('products').insert({
    restaurant_id: restaurantId,
    category_id: data.category_id,
    name: sanitizeText(data.name, 150),
    description: sanitizeMultiline(data.description, 500),
    price: data.price,
    is_active: data.is_active,
    ...(data.is_featured != null && { is_featured: data.is_featured }),
    ...(data.is_new != null && { is_new: data.is_new }),
    ...(data.dietary_tags && { dietary_tags: data.dietary_tags }),
    ...(data.image_url && { image_url: data.image_url }),
    ...(data.prep_time_minutes != null && { prep_time_minutes: data.prep_time_minutes }),
  }).select('id').single();

  if (error) return { error: error.message };
  revalidatePath('/app/menu/products');
  revalidatePublicMenu(restaurantSlug);
  return { success: true, id: created?.id };
}

export async function updateProduct(id: string, data: Partial<ProductInput> & { image_url?: string }) {
  const { supabase, restaurantId, restaurantSlug, error: authErr } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const sanitized = { ...data };
  if (sanitized.name) sanitized.name = sanitizeText(sanitized.name, 150);
  if (sanitized.description) sanitized.description = sanitizeMultiline(sanitized.description, 500);
  const { error } = await supabase
    .from('products')
    .update(sanitized)
    .eq('id', id)
    .eq('restaurant_id', restaurantId);

  if (error) return { error: error.message };
  revalidatePath('/app/menu/products');
  revalidatePublicMenu(restaurantSlug);
  return { success: true };
}

export async function toggleProductStock(id: string, inStock: boolean) {
  const { supabase, restaurantId, restaurantSlug, error: authErr } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const { error } = await supabase
    .from('products')
    .update({ in_stock: inStock })
    .eq('id', id)
    .eq('restaurant_id', restaurantId);

  if (error) return { error: error.message };
  revalidatePath('/app/menu/products');
  revalidatePublicMenu(restaurantSlug);
  return { success: true };
}

export async function deleteProduct(id: string) {
  const { supabase, restaurantId, restaurantSlug, error: authErr } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const { error } = await supabase.from('products').delete().eq('id', id).eq('restaurant_id', restaurantId);
  if (error) return { error: error.message };
  revalidatePath('/app/menu/products');
  revalidatePublicMenu(restaurantSlug);
  return { success: true };
}

// ---- Variants ----
export async function createVariant(productId: string, data: { name: string; price_delta: number; sort_order: number }) {
  const { supabase, restaurantId, restaurantSlug, error: authErr } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const { data: product } = await supabase
    .from('products')
    .select('id')
    .eq('id', productId)
    .eq('restaurant_id', restaurantId)
    .maybeSingle();
  if (!product) return { error: 'No encontrado' };

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
  revalidatePublicMenu(restaurantSlug);
  return { success: true, variant };
}

export async function updateVariant(id: string, data: { name: string; price_delta: number; sort_order: number }) {
  const { supabase, restaurantId, restaurantSlug, error: authErr } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const { data: owned } = await supabase
    .from('product_variants')
    .select('id, products!inner(restaurant_id)')
    .eq('id', id)
    .eq('products.restaurant_id', restaurantId)
    .maybeSingle();
  if (!owned) return { error: 'No encontrado' };

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
  revalidatePublicMenu(restaurantSlug);
  return { success: true };
}

export async function deleteVariant(id: string) {
  const { supabase, restaurantId, restaurantSlug, error: authErr } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const { data: owned } = await supabase
    .from('product_variants')
    .select('id, products!inner(restaurant_id)')
    .eq('id', id)
    .eq('products.restaurant_id', restaurantId)
    .maybeSingle();
  if (!owned) return { error: 'No encontrado' };

  const { error } = await supabase.from('product_variants').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/app/menu/products');
  revalidatePublicMenu(restaurantSlug);
  return { success: true };
}

// ---- Extras ----
export async function createExtra(productId: string, data: { name: string; price: number; sort_order: number }) {
  const { supabase, restaurantId, restaurantSlug, error: authErr } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const { data: product } = await supabase
    .from('products')
    .select('id')
    .eq('id', productId)
    .eq('restaurant_id', restaurantId)
    .maybeSingle();
  if (!product) return { error: 'No encontrado' };

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
  revalidatePublicMenu(restaurantSlug);
  return { success: true, extra };
}

export async function updateExtra(id: string, data: { name: string; price: number; sort_order: number }) {
  const { supabase, restaurantId, restaurantSlug, error: authErr } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const { data: owned } = await supabase
    .from('product_extras')
    .select('id, products!inner(restaurant_id)')
    .eq('id', id)
    .eq('products.restaurant_id', restaurantId)
    .maybeSingle();
  if (!owned) return { error: 'No encontrado' };

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
  revalidatePublicMenu(restaurantSlug);
  return { success: true };
}

export async function deleteExtra(id: string) {
  const { supabase, restaurantId, restaurantSlug, error: authErr } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const { data: owned } = await supabase
    .from('product_extras')
    .select('id, products!inner(restaurant_id)')
    .eq('id', id)
    .eq('products.restaurant_id', restaurantId)
    .maybeSingle();
  if (!owned) return { error: 'No encontrado' };

  const { error } = await supabase.from('product_extras').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/app/menu/products');
  revalidatePublicMenu(restaurantSlug);
  return { success: true };
}

// ---- Modifier Groups ----
export async function createModifierGroup(productId: string, data: { name: string; selection_type: 'single' | 'multi'; min_select: number; max_select: number; is_required: boolean; sort_order: number; display_type?: 'list' | 'grid' }) {
  const { supabase, restaurantId, restaurantSlug, error: authErr } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const { data: product } = await supabase
    .from('products')
    .select('id')
    .eq('id', productId)
    .eq('restaurant_id', restaurantId)
    .maybeSingle();
  if (!product) return { error: 'No encontrado' };

  const { data: group, error } = await supabase
    .from('modifier_groups')
    .insert({
      product_id: productId,
      name: sanitizeText(data.name, 100),
      selection_type: data.selection_type,
      min_select: data.min_select,
      max_select: data.max_select,
      is_required: data.is_required,
      sort_order: data.sort_order,
      display_type: data.display_type ?? 'list',
    })
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath('/app/menu/products');
  revalidatePublicMenu(restaurantSlug);
  return { success: true, group: { ...group, options: [] } };
}

export async function updateModifierGroup(id: string, data: { name: string; selection_type: 'single' | 'multi'; min_select: number; max_select: number; is_required: boolean; sort_order: number; display_type?: 'list' | 'grid' }) {
  const { supabase, restaurantId, restaurantSlug, error: authErr } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const { data: owned } = await supabase
    .from('modifier_groups')
    .select('id, products!inner(restaurant_id)')
    .eq('id', id)
    .eq('products.restaurant_id', restaurantId)
    .maybeSingle();
  if (!owned) return { error: 'No encontrado' };

  const { error } = await supabase
    .from('modifier_groups')
    .update({
      name: sanitizeText(data.name, 100),
      selection_type: data.selection_type,
      min_select: data.min_select,
      max_select: data.max_select,
      is_required: data.is_required,
      sort_order: data.sort_order,
      display_type: data.display_type ?? 'list',
    })
    .eq('id', id);

  if (error) return { error: error.message };
  revalidatePath('/app/menu/products');
  revalidatePublicMenu(restaurantSlug);
  return { success: true };
}

export async function deleteModifierGroup(id: string) {
  const { supabase, restaurantId, restaurantSlug, error: authErr } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const { data: owned } = await supabase
    .from('modifier_groups')
    .select('id, products!inner(restaurant_id)')
    .eq('id', id)
    .eq('products.restaurant_id', restaurantId)
    .maybeSingle();
  if (!owned) return { error: 'No encontrado' };

  const { error } = await supabase.from('modifier_groups').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/app/menu/products');
  revalidatePublicMenu(restaurantSlug);
  return { success: true };
}

// ---- Modifier Options ----
export async function createModifierOption(groupId: string, data: { name: string; price_delta: number; is_default: boolean; sort_order: number }) {
  const { supabase, restaurantId, restaurantSlug, error: authErr } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const { data: group } = await supabase
    .from('modifier_groups')
    .select('id, products!inner(restaurant_id)')
    .eq('id', groupId)
    .eq('products.restaurant_id', restaurantId)
    .maybeSingle();
  if (!group) return { error: 'No encontrado' };

  const { data: option, error } = await supabase
    .from('modifier_options')
    .insert({
      group_id: groupId,
      name: sanitizeText(data.name, 100),
      price_delta: data.price_delta,
      is_default: data.is_default,
      sort_order: data.sort_order,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath('/app/menu/products');
  revalidatePublicMenu(restaurantSlug);
  return { success: true, option };
}

export async function updateModifierOption(id: string, data: { name: string; price_delta: number; is_default: boolean; sort_order: number }) {
  const { supabase, restaurantId, restaurantSlug, error: authErr } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const { data: owned } = await supabase
    .from('modifier_options')
    .select('id, modifier_groups!inner(products!inner(restaurant_id))')
    .eq('id', id)
    .eq('modifier_groups.products.restaurant_id', restaurantId)
    .maybeSingle();
  if (!owned) return { error: 'No encontrado' };

  const { error } = await supabase
    .from('modifier_options')
    .update({
      name: sanitizeText(data.name, 100),
      price_delta: data.price_delta,
      is_default: data.is_default,
      sort_order: data.sort_order,
    })
    .eq('id', id);

  if (error) return { error: error.message };
  revalidatePath('/app/menu/products');
  revalidatePublicMenu(restaurantSlug);
  return { success: true };
}

export async function deleteModifierOption(id: string) {
  const { supabase, restaurantId, restaurantSlug, error: authErr } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const { data: owned } = await supabase
    .from('modifier_options')
    .select('id, modifier_groups!inner(products!inner(restaurant_id))')
    .eq('id', id)
    .eq('modifier_groups.products.restaurant_id', restaurantId)
    .maybeSingle();
  if (!owned) return { error: 'No encontrado' };

  const { error } = await supabase.from('modifier_options').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/app/menu/products');
  revalidatePublicMenu(restaurantSlug);
  return { success: true };
}

export async function reorderModifierGroups(productId: string, orderedIds: string[]) {
  const { supabase, restaurantId, error: authErr } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const { data: product } = await supabase
    .from('products')
    .select('id')
    .eq('id', productId)
    .eq('restaurant_id', restaurantId)
    .maybeSingle();
  if (!product) return { error: 'No encontrado' };

  await Promise.all(
    orderedIds.map((id, i) =>
      supabase.from('modifier_groups').update({ sort_order: i }).eq('id', id).eq('product_id', productId)
    )
  );
  revalidatePath('/app/menu/products');
  return { success: true };
}

export async function reorderModifierOptions(groupId: string, orderedIds: string[]) {
  const { supabase, restaurantId, error: authErr } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const { data: owned } = await supabase
    .from('modifier_groups')
    .select('id, products!inner(restaurant_id)')
    .eq('id', groupId)
    .eq('products.restaurant_id', restaurantId)
    .maybeSingle();
  if (!owned) return { error: 'No encontrado' };

  await Promise.all(
    orderedIds.map((id, i) =>
      supabase.from('modifier_options').update({ sort_order: i }).eq('id', id).eq('group_id', groupId)
    )
  );
  return { success: true };
}

// ---- Tables ----
export async function createTable(data: TableInput) {
  const { supabase, restaurantId, error: authErr } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const [restaurantRes, tablesCountRes, subscriptionRes] = await Promise.all([
    supabase.from('restaurants').select('slug').eq('id', restaurantId).maybeSingle(),
    supabase.from('tables').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId),
    supabase.from('subscriptions').select('plan_id').eq('restaurant_id', restaurantId).maybeSingle(),
  ]);

  if (!restaurantRes.data?.slug) return { error: 'Restaurante no encontrado' };

  const currentCount = tablesCountRes.count ?? 0;
  const planId = subscriptionRes.data?.plan_id ?? 'starter';

  const { getPlan, isWithinLimit } = await import('@/lib/plans');
  const plan = getPlan(planId);
  if (plan && !isWithinLimit(currentCount + 1, plan.limits.maxTables)) {
    return { error: `Tu plan ${plan.name} permite hasta ${plan.limits.maxTables} mesas. Actualiza tu plan para agregar más.` };
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app').replace(/\/$/, '');
  const tableName = sanitizeText(data.name, 50);
  const qrValue = `${appUrl}/${restaurantRes.data.slug}?table=${encodeURIComponent(tableName)}`;

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
  const { supabase, restaurantId, error: authErr } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('slug')
    .eq('id', restaurantId)
    .maybeSingle();

  if (!restaurant?.slug) return { error: 'Restaurante no encontrado' };

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app').replace(/\/$/, '');
  const name = sanitizeText(newName, 50);
  const qrValue = `${appUrl}/${restaurant.slug}?table=${encodeURIComponent(name)}`;

  const { error } = await supabase
    .from('tables')
    .update({ name, qr_code_value: qrValue })
    .eq('id', id)
    .eq('restaurant_id', restaurantId);

  if (error) return { error: error.message };
  revalidatePath('/app/tables');
  return { success: true };
}

export async function updateTableMeta(id: string, data: { status?: string; capacity?: number }) {
  const { supabase, restaurantId, error: authErr } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const payload: Record<string, unknown> = {};
  if (data.status) payload.status = data.status;
  if (data.capacity !== undefined) payload.capacity = data.capacity;

  const { error } = await supabase
    .from('tables')
    .update(payload)
    .eq('id', id)
    .eq('restaurant_id', restaurantId);

  if (error) return { error: error.message };
  revalidatePath('/app/tables');
  return { success: true };
}

export async function deleteTable(id: string) {
  const { supabase, restaurantId, error: authErr } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const { error } = await supabase.from('tables').delete().eq('id', id).eq('restaurant_id', restaurantId);
  if (error) return { error: error.message };
  revalidatePath('/app/tables');
  return { success: true };
}

// ---- Orders ----
// Valid state transitions — enforced server-side.
// Accept goes directly to 'preparing' (Uber-style simplified flow).
// 'confirmed' kept for backward compat with existing DB rows and auto-accept legacy.
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending:   ['confirmed', 'preparing', 'cancelled'],
  confirmed: ['preparing', 'ready', 'cancelled'],
  preparing: ['ready', 'delivered', 'cancelled'],
  ready:     ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

export async function updateOrderStatus(orderId: string, status: string, cancellationReason?: string) {
  const { supabase, restaurantId, error: authErr } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const validStatuses = Object.keys(VALID_TRANSITIONS);
  if (!validStatuses.includes(status)) return { error: 'Estado inválido' };

  const { data: order } = await supabase
    .from('orders')
    .select('id, status, order_number, restaurant_id, customer_name, customer_email, customer_phone, order_type, delivery_address, restaurants ( slug, name )')
    .eq('id', orderId)
    .eq('restaurant_id', restaurantId)
    .maybeSingle();

  if (!order) return { error: 'Orden no encontrada' };

  // Enforce valid state transitions
  const currentStatus = order.status as string;
  const allowed = VALID_TRANSITIONS[currentStatus] ?? [];
  if (!allowed.includes(status)) {
    return { error: `Transición inválida: ${currentStatus} → ${status}` };
  }

  const updatePayload: Record<string, unknown> = { status };
  if (status === 'cancelled' && cancellationReason) {
    updatePayload.cancellation_reason = cancellationReason;
  }

  const { error } = await supabase
    .from('orders')
    .update(updatePayload)
    .eq('id', orderId)
    .eq('restaurant_id', restaurantId);

  if (error) return { error: error.message };

  // Log the transition to order_status_history (non-blocking, graceful)
  void (async () => {
    try {
      await supabase
        .from('order_status_history')
        .insert({ order_id: orderId, from_status: currentStatus, to_status: status, note: cancellationReason ?? null });
    } catch { /* table may not exist yet — safe to ignore */ }
  })();

  // Send transactional notification to customer (WhatsApp primary, email fallback).
  // notifyStatusChange internally fires the push notification — no duplicate call needed here.
  let notificationResult: { channel: string; success: boolean; error?: string } = { channel: 'none', success: false };
  if (['confirmed', 'preparing', 'ready', 'cancelled', 'delivered'].includes(status)) {
    try {
      const { notifyStatusChange } = await import('@/lib/notifications/order-notifications');
      notificationResult = await notifyStatusChange({
        orderId,
        orderNumber: order.order_number,
        restaurantId: order.restaurant_id,
        status,
        customerName: order.customer_name,
        customerEmail: order.customer_email || undefined,
        customerPhone: order.customer_phone || undefined,
        orderType: (order as any).order_type || undefined,
        deliveryAddress: (order as any).delivery_address || undefined,
      });
    } catch {
      notificationResult = { channel: 'none', success: false, error: 'internal_error' };
    }
  }

  // Auto-earn loyalty points when order is delivered/completed
  if (['delivered', 'completed'].includes(status)) {
    void (async () => {
      try {
        const { data: fullOrder } = await supabase
          .from('orders')
          .select('total, customer_name, customer_phone, customer_email')
          .eq('id', orderId)
          .maybeSingle();
        if (fullOrder) {
          const { earnLoyaltyPoints } = await import('@/lib/loyalty/earn');
          await earnLoyaltyPoints({
            restaurantId,
            customerName: fullOrder.customer_name,
            customerPhone: fullOrder.customer_phone,
            customerEmail: fullOrder.customer_email,
            orderTotal: Number(fullOrder.total),
            orderId,
          });
        }
      } catch { /* non-critical */ }
    })();
  }

  revalidatePath('/app/orders');
  return { success: true, notification: notificationResult };
}

export async function sendOrderNotification(orderId: string, eventType: string) {
  const { supabase, restaurantId, error: authErr } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const { data: order } = await supabase
    .from('orders')
    .select('id, order_number, customer_name, customer_email, customer_phone, restaurant_id, order_type, delivery_address')
    .eq('id', orderId)
    .eq('restaurant_id', restaurantId)
    .maybeSingle();

  if (!order) return { error: 'Orden no encontrada' };

  try {
    const { notifyStatusChange } = await import('@/lib/notifications/order-notifications');
    const notification = await notifyStatusChange({
      orderId: order.id,
      orderNumber: order.order_number,
      restaurantId: order.restaurant_id,
      status: eventType,
      customerName: order.customer_name,
      customerEmail: order.customer_email || undefined,
      customerPhone: order.customer_phone || undefined,
      orderType: (order as any).order_type || undefined,
      deliveryAddress: (order as any).delivery_address || undefined,
    });
    return { success: true, notification };
  } catch {
    return { error: 'Error al enviar notificación' };
  }
}

export async function updateOrderETA(orderId: string, etaMinutes: number) {
  const { supabase, restaurantId, error: authErr } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const { error } = await supabase
    .from('orders')
    .update({ estimated_ready_minutes: etaMinutes })
    .eq('id', orderId)
    .eq('restaurant_id', restaurantId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function updateOrderTip(orderId: string, tipAmount: number) {
  const { supabase, restaurantId, error: authErr } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const tip = Math.max(0, Number(tipAmount) || 0);

  // Fetch current order to get existing total
  const { data: order } = await supabase
    .from('orders')
    .select('id, total, tip_amount')
    .eq('id', orderId)
    .eq('restaurant_id', restaurantId)
    .maybeSingle();

  if (!order) return { error: 'Orden no encontrada' };

  const previousTip = Number(order.tip_amount) || 0;
  const baseTotal = Number(order.total) - previousTip;
  const newTotal = baseTotal + tip;

  const { error } = await supabase
    .from('orders')
    .update({ tip_amount: tip, total: newTotal })
    .eq('id', orderId)
    .eq('restaurant_id', restaurantId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function setPauseOrders(pausedUntil: string | null) {
  const { supabase, restaurantId, error: authErr } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const { error } = await supabase
    .from('restaurants')
    .update({ orders_paused_until: pausedUntil })
    .eq('id', restaurantId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function assignDriver(
  orderId: string,
  driverName: string,
  driverPhone: string,
) {
  const { supabase, restaurantId, error: authErr } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  // Generate a unique tracking token for this delivery
  const token = driverName.trim() ? crypto.randomUUID() : null;

  const tokenExpiresAt = token
    ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    : null;

  const { error } = await supabase
    .from('orders')
    .update({
      driver_name: driverName.trim() || null,
      driver_phone: driverPhone.trim() || null,
      driver_assigned_at: driverName.trim() ? new Date().toISOString() : null,
      driver_tracking_token: token,
      driver_token_expires_at: tokenExpiresAt,
      // Reset GPS on new assignment
      driver_lat: null,
      driver_lng: null,
      driver_updated_at: null,
    })
    .eq('id', orderId)
    .eq('restaurant_id', restaurantId);

  if (error) return { error: error.message };

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://menius.app').replace(/\/$/, '');
  // Base URL without lang param — overridden with ?lang=en once locale is known
  const baseTrackingUrl = token ? `${appUrl}/driver/track/${token}` : null;

  // Auto-send WhatsApp/SMS to the driver with their tracking link
  if (token && driverPhone.trim() && baseTrackingUrl) {
    // Fetch order + restaurant for context (delivery address, locale, restaurant name)
    const { data: orderRow } = await supabase
      .from('orders')
      .select('delivery_address, order_number, restaurants(name, locale)')
      .eq('id', orderId)
      .maybeSingle();

    const restaurant = (orderRow as any)?.restaurants as { name: string; locale: string | null } | null;
    const locale = restaurant?.locale ?? 'es';
    const en = locale === 'en';
    const restaurantName = restaurant?.name ?? '';
    const address = (orderRow as any)?.delivery_address ?? '';
    const driverTrackingUrl = en ? `${baseTrackingUrl}?lang=en` : baseTrackingUrl;

    const driverMsg = en
      ? `${restaurantName ? `[${restaurantName}] ` : ''}New delivery assignment!\n📍 Address: ${address}\n\nOpen your driver page to start tracking:\n${driverTrackingUrl}`
      : `${restaurantName ? `[${restaurantName}] ` : ''}¡Tienes un nuevo envío!\n📍 Dirección: ${address}\n\nAbre tu página de repartidor para iniciar:\n${driverTrackingUrl}`;

    const channel = resolveChannel(driverPhone.trim());
    if (channel === 'sms') {
      sendSMS({ to: driverPhone.trim(), text: driverMsg }).catch(() => {});
    } else {
      sendWhatsApp({ to: driverPhone.trim(), text: driverMsg }).catch(() => {});
    }
  }

  return {
    success: true,
    trackingToken: token,
    trackingUrl: baseTrackingUrl,
  };
}

export async function updatePaymentBreakdown(
  orderId: string,
  breakdown: { cash?: number; card?: number; [key: string]: number | undefined },
) {
  const { supabase, restaurantId, error: authErr } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const { error } = await supabase
    .from('orders')
    .update({ payment_breakdown: breakdown })
    .eq('id', orderId)
    .eq('restaurant_id', restaurantId);

  if (error) return { error: error.message };
  return { success: true };
}

// ── Multi-store switcher ────────────────────────────────────────────────

export async function switchRestaurant(restaurantId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' };

  // Verify the user owns this restaurant
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, name')
    .eq('id', restaurantId)
    .eq('owner_user_id', user.id)
    .maybeSingle();

  if (!restaurant) return { error: 'Restaurante no encontrado' };

  const { error } = await supabase
    .from('profiles')
    .update({ default_restaurant_id: restaurantId })
    .eq('user_id', user.id);

  if (error) return { error: error.message };
  revalidatePath('/app', 'layout');
  return { success: true };
}

// ── Shifts (Cierre de Caja) ─────────────────────────────────────────────

export async function openShift(openingCash: number) {
  const { supabase, restaurantId, error: authErr } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const { data: { user } } = await supabase.auth.getUser();

  // Close any existing open shift for this restaurant first
  await supabase
    .from('shifts')
    .update({ closed_at: new Date().toISOString() })
    .eq('restaurant_id', restaurantId)
    .is('closed_at', null);

  const { data, error } = await supabase
    .from('shifts')
    .insert({
      restaurant_id: restaurantId,
      opened_by: user?.id,
      opening_cash: openingCash,
    })
    .select('id, opening_cash, opened_at')
    .single();

  if (error) return { error: error.message };
  return { success: true, shift: data };
}

export async function closeShift(closingCash: number, notes?: string) {
  const { supabase, restaurantId, error: authErr } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const { data: { user } } = await supabase.auth.getUser();

  // Find open shift
  const { data: shift, error: shiftErr } = await supabase
    .from('shifts')
    .select('id, opening_cash, opened_at')
    .eq('restaurant_id', restaurantId)
    .is('closed_at', null)
    .order('opened_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (shiftErr || !shift) return { error: 'No open shift found' };

  // Aggregate orders since shift opened
  const { data: orders } = await supabase
    .from('orders')
    .select('total, payment_method, payment_breakdown')
    .eq('restaurant_id', restaurantId)
    .eq('status', 'delivered')
    .gte('created_at', shift.opened_at);

  const totalRevenue = (orders ?? []).reduce((sum: number, o: any) => sum + Number(o.total ?? 0), 0);
  const totalCash = (orders ?? []).reduce((sum: number, o: any) => {
    const bd = o.payment_breakdown;
    if (bd?.cash) return sum + Number(bd.cash);
    if (o.payment_method === 'cash') return sum + Number(o.total ?? 0);
    return sum;
  }, 0);
  const totalCard = (orders ?? []).reduce((sum: number, o: any) => {
    const bd = o.payment_breakdown;
    if (bd?.card) return sum + Number(bd.card);
    if (o.payment_method === 'online' || o.payment_method === 'card') return sum + Number(o.total ?? 0);
    return sum;
  }, 0);

  const expectedCash = Number(shift.opening_cash) + totalCash;
  const cashDifference = closingCash - expectedCash;

  const { data: closed, error: closeErr } = await supabase
    .from('shifts')
    .update({
      closed_by: user?.id,
      closed_at: new Date().toISOString(),
      closing_cash: closingCash,
      expected_cash: expectedCash,
      cash_difference: cashDifference,
      total_orders: (orders ?? []).length,
      total_revenue: totalRevenue,
      total_cash: totalCash,
      total_card: totalCard,
      notes: notes ?? null,
    })
    .eq('id', shift.id)
    .select()
    .single();

  if (closeErr) return { error: closeErr.message };
  return {
    success: true,
    shift: closed,
    summary: {
      totalOrders: (orders ?? []).length,
      totalRevenue,
      totalCash,
      totalCard,
      expectedCash,
      cashDifference,
      openingCash: shift.opening_cash,
      closingCash,
    },
  };
}

export async function getActiveShift() {
  const { supabase, restaurantId, error: authErr } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const { data } = await supabase
    .from('shifts')
    .select('id, opening_cash, opened_at')
    .eq('restaurant_id', restaurantId)
    .is('closed_at', null)
    .order('opened_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return { shift: data ?? null };
}
