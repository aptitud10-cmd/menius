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
    .maybeSingle();

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

  // Link profile to restaurant — upsert guarantees it works even if profile doesn't exist yet
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      user_id: user.id,
      full_name: user.user_metadata?.full_name || '',
      role: 'owner',
      default_restaurant_id: restaurant.id,
    }, { onConflict: 'user_id' });

  if (profileError) {
    return { error: 'Restaurante creado pero hubo un error al vincular tu cuenta. Intenta cerrar sesión y volver a entrar.' };
  }

  // Create trial subscription (14 days) — must complete before redirect
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 14);
  await supabase.from('subscriptions').upsert({
    restaurant_id: restaurant.id,
    plan_id: 'basic',
    status: 'trialing',
    trial_end: trialEnd.toISOString(),
  }, { onConflict: 'restaurant_id' });

  // Seed example data — runs before redirect (batch inserts, ~1-2s)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';
  try {
    const { seedRestaurant } = await import('@/lib/seed-restaurant');
    await seedRestaurant(supabase, restaurant.id, restaurant.slug, appUrl);
  } catch {
    // Seed failure should not block onboarding
  }

  // Welcome email to new restaurant owner
  if (user.email) {
    try {
      const { sendEmail, buildWelcomeEmail } = await import('@/lib/notifications/email');
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
    } catch {
      // Email failure should not block onboarding
    }
  }

  // Notify SaaS admin about new registration
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail) {
    try {
      const { sendEmail } = await import('@/lib/notifications/email');
      sendEmail({
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
              <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Fecha</td><td style="padding:8px 0;font-size:14px;">${new Date().toLocaleString('es')}</td></tr>
            </table>
            <div style="margin-top:20px;">
              <a href="${appUrl}/r/${data.slug}" style="display:inline-block;padding:10px 20px;background:#7c3aed;color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">Ver menú</a>
              <a href="${appUrl}/admin" style="display:inline-block;padding:10px 20px;background:#059669;color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;margin-left:8px;">Admin Panel</a>
            </div>
          </div>`,
      }).catch(() => {});
    } catch {
      // Admin notification failure should not block onboarding
    }
  }

  redirect('/app');
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
    .select('slug, owner_user_id')
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
  await seedRestaurant(supabase, restaurantId, restaurant.slug, appUrl);

  revalidatePath('/app');
  revalidatePath(`/r/${restaurant.slug}`);
  return { success: true };
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
    .maybeSingle();

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

async function getAuthenticatedRestaurant() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' as const, supabase, restaurantId: '' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('default_restaurant_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile?.default_restaurant_id) return { error: 'Sin restaurante' as const, supabase, restaurantId: '' };

  return { supabase, restaurantId: profile.default_restaurant_id, error: null };
}

export async function updateCategory(id: string, data: CategoryInput) {
  const { supabase, restaurantId, error: authErr } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const { error } = await supabase
    .from('categories')
    .update({ name: sanitizeText(data.name, 100), sort_order: data.sort_order, is_active: data.is_active })
    .eq('id', id)
    .eq('restaurant_id', restaurantId);

  if (error) return { error: error.message };
  revalidatePath('/app/menu/categories');
  return { success: true };
}

export async function deleteCategory(id: string) {
  const { supabase, restaurantId, error: authErr } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const { error } = await supabase.from('categories').delete().eq('id', id).eq('restaurant_id', restaurantId);
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
    .maybeSingle();

  if (!profile?.default_restaurant_id) return { error: 'Sin restaurante' };

  const { data: created, error } = await supabase.from('products').insert({
    restaurant_id: profile.default_restaurant_id,
    category_id: data.category_id,
    name: sanitizeText(data.name, 150),
    description: sanitizeMultiline(data.description, 500),
    price: data.price,
    is_active: data.is_active,
    ...(data.dietary_tags && { dietary_tags: data.dietary_tags }),
  }).select('id').single();

  if (error) return { error: error.message };
  revalidatePath('/app/menu/products');
  return { success: true, id: created?.id };
}

export async function updateProduct(id: string, data: Partial<ProductInput> & { image_url?: string }) {
  const { supabase, restaurantId, error: authErr } = await getAuthenticatedRestaurant();
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
  return { success: true };
}

export async function deleteProduct(id: string) {
  const { supabase, restaurantId, error: authErr } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const { error } = await supabase.from('products').delete().eq('id', id).eq('restaurant_id', restaurantId);
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
  const { supabase, error: authErr } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

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
  const { supabase, error: authErr } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const { error } = await supabase.from('product_extras').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/app/menu/products');
  return { success: true };
}

// ---- Modifier Groups ----
export async function createModifierGroup(productId: string, data: { name: string; selection_type: 'single' | 'multi'; min_select: number; max_select: number; is_required: boolean; sort_order: number }) {
  const supabase = createClient();
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
    })
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath('/app/menu/products');
  return { success: true, group: { ...group, options: [] } };
}

export async function updateModifierGroup(id: string, data: { name: string; selection_type: 'single' | 'multi'; min_select: number; max_select: number; is_required: boolean; sort_order: number }) {
  const supabase = createClient();
  const { error } = await supabase
    .from('modifier_groups')
    .update({
      name: sanitizeText(data.name, 100),
      selection_type: data.selection_type,
      min_select: data.min_select,
      max_select: data.max_select,
      is_required: data.is_required,
      sort_order: data.sort_order,
    })
    .eq('id', id);

  if (error) return { error: error.message };
  revalidatePath('/app/menu/products');
  return { success: true };
}

export async function deleteModifierGroup(id: string) {
  const { supabase, error: authErr } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const { error } = await supabase.from('modifier_groups').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/app/menu/products');
  return { success: true };
}

// ---- Modifier Options ----
export async function createModifierOption(groupId: string, data: { name: string; price_delta: number; is_default: boolean; sort_order: number }) {
  const supabase = createClient();
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
  return { success: true, option };
}

export async function updateModifierOption(id: string, data: { name: string; price_delta: number; is_default: boolean; sort_order: number }) {
  const supabase = createClient();
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
  return { success: true };
}

export async function deleteModifierOption(id: string) {
  const { supabase, error: authErr } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const { error } = await supabase.from('modifier_options').delete().eq('id', id);
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
    .maybeSingle();

  if (!profile?.default_restaurant_id) return { error: 'Sin restaurante' };
  const restaurantId = profile.default_restaurant_id;

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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';
  const tableName = sanitizeText(data.name, 50);
  const qrValue = `${appUrl}/r/${restaurantRes.data.slug}?table=${encodeURIComponent(tableName)}`;

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
    .maybeSingle();

  if (!profile?.default_restaurant_id) return { error: 'Sin restaurante' };

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('slug')
    .eq('id', profile.default_restaurant_id)
    .maybeSingle();

  if (!restaurant?.slug) return { error: 'Restaurante no encontrado' };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';
  const name = sanitizeText(newName, 50);
  const qrValue = `${appUrl}/r/${restaurant.slug}?table=${encodeURIComponent(name)}`;

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
  const { supabase, restaurantId, error: authErr } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const { error } = await supabase.from('tables').delete().eq('id', id).eq('restaurant_id', restaurantId);
  if (error) return { error: error.message };
  revalidatePath('/app/tables');
  return { success: true };
}

// ---- Orders ----
export async function updateOrderStatus(orderId: string, status: string) {
  const { supabase, restaurantId, error: authErr } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) return { error: 'Estado inválido' };

  const { data: order } = await supabase
    .from('orders')
    .select('id, order_number, restaurant_id, customer_name, customer_email, customer_phone, restaurants ( slug )')
    .eq('id', orderId)
    .eq('restaurant_id', restaurantId)
    .maybeSingle();

  if (!order) return { error: 'Orden no encontrada' };

  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .eq('restaurant_id', restaurantId);

  if (error) return { error: error.message };

  if (['confirmed', 'preparing', 'ready', 'delivered', 'cancelled'].includes(status)) {
    import('@/lib/notifications/order-notifications').then(({ notifyStatusChange }) => {
      notifyStatusChange({
        orderNumber: order.order_number,
        restaurantId: order.restaurant_id,
        status,
        customerName: order.customer_name,
        customerEmail: order.customer_email || undefined,
        customerPhone: order.customer_phone || undefined,
      });
    }).catch(() => {});

    const pushMessages: Record<string, { title: string; body: string }> = {
      confirmed: { title: 'Pedido confirmado', body: `Tu pedido #${order.order_number} fue confirmado` },
      preparing: { title: 'Preparando tu pedido', body: `Tu pedido #${order.order_number} se esta preparando` },
      ready: { title: '¡Tu pedido esta listo!', body: `Pedido #${order.order_number} listo para recoger` },
      delivered: { title: '¡Buen provecho!', body: `Pedido #${order.order_number} entregado` },
      cancelled: { title: 'Pedido cancelado', body: `Tu pedido #${order.order_number} fue cancelado` },
    };

    const msg = pushMessages[status];
    if (msg) {
      const slug = (order as any).restaurants?.slug;
      import('@/lib/notifications/push').then(({ sendPushToOrder }) => {
        sendPushToOrder(orderId, {
          ...msg,
          url: slug ? `/r/${slug}/orden/${order.order_number}` : '/',
        });
      }).catch(() => {});
    }
  }

  revalidatePath('/app/orders');
  return { success: true };
}
