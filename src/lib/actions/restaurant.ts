"use server";

import { afterResponse } from "@/lib/server/after-response";
import { createAdminClient } from "@/lib/supabase/admin";
import { chooseDriverToken, type CurrentDriverToken } from "@/lib/orders/driver-token";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { revalidatePublicMenu } from "@/lib/revalidate-public-menu";
import { createClient } from "@/lib/supabase/server";
import { getDeviceSession, isDeviceSession } from "@/lib/auth/device-session";
import { sanitizeText, sanitizeMultiline } from "@/lib/sanitize";
import { normalizeHour } from "@/lib/option-hours";
import { ORDER_INCIDENTS, type OrderIncident, type CustomerFlag } from "@/lib/customer-incidents";
import { captureError } from "@/lib/error-reporting";
import { createLogger } from "@/lib/logger";
import type {
  CreateRestaurantInput,
  CategoryInput,
  ProductInput,
  TableInput,
} from "@/lib/validations";

const logger = createLogger("action-restaurant");
import {
  VALID_TRANSITIONS,
  ALL_STATUSES,
  canTransition,
  REVENUE_STATUSES,
  isRevenueStatus,
} from "@/lib/order-state";
import { getStartOfDayUTC } from "@/lib/date-utils";
import { broadcastOrderUpdate } from "@/lib/realtime/broadcast-order";

/**
 * order_status_history solo tiene política de LECTURA para el dueño: con el
 * cliente de sesión los INSERT fallaban en silencio (0 filas en prod) y la
 * tablet (sesión de dispositivo) no podía leerlo. Se usa el admin SIEMPRE
 * después de verificar que el pedido pertenece al restaurante autenticado.
 */
function historyDb() {
  return createAdminClient();
}

const EN_CURRENCIES = new Set(["USD", "GBP", "CAD", "AUD", "NZD"]);
function inferLocale(currency: string): string {
  return EN_CURRENCIES.has(currency) ? "en" : "es";
}

// ---- Restaurant ----
export async function createRestaurant(data: CreateRestaurantInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };
  if (await isDeviceSession(supabase)) return { error: "No disponible en la tablet" };

  // Check slug is unique
  const { data: existing } = await supabase
    .from("restaurants")
    .select("id")
    .eq("slug", data.slug)
    .maybeSingle();

  if (existing) return { error: "Ese slug ya está en uso" };

  const locale = data.locale ?? inferLocale(data.currency);

  // Atomic transaction: creates restaurant + subscription + profile link in a single DB call.
  // If any step fails, the entire transaction rolls back — no orphaned records.
  const { data: rpcResult, error } = await supabase.rpc(
    "create_restaurant_with_subscription",
    {
      p_name: data.name,
      p_slug: data.slug,
      p_owner_user_id: user.id,
      p_timezone: data.timezone,
      p_currency: data.currency,
      p_locale: locale,
      p_plan_id: "pro", // trial de 14 días del único plan a la venta
      p_notification_email: user.email ?? null,
    },
  );

  if (error) {
    captureError(new Error(error.message), {
      route: "createRestaurant",
      userId: user.id,
    });
    return { error: error.message };
  }

  const restaurant = rpcResult as {
    id: string;
    name: string;
    slug: string;
    owner_user_id: string;
    timezone: string;
    currency: string;
    locale: string;
    created_at: string;
  };

  if (data.country_code) {
    const { error: countryUpdateError } = await supabase
      .from("restaurants")
      .update({ country_code: data.country_code })
      .eq("id", restaurant.id);
    if (countryUpdateError) {
      logger.error("Failed to set country_code on new restaurant", {
        restaurantId: restaurant.id,
        error: countryUpdateError.message,
      });
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://menius.app";

  // Seed example data so the menu is not empty on first visit
  try {
    const { seedRestaurant } = await import("@/lib/seed-restaurant");
    await seedRestaurant(
      supabase,
      restaurant.id,
      restaurant.slug,
      appUrl,
      locale,
    );
  } catch {
    // Seed failure should not block onboarding
  }

  // Welcome email to new restaurant owner
  if (user.email) {
    try {
      const { sendEmail, buildWelcomeEmail } =
        await import("@/lib/notifications/email");
      const en = locale === "en";
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
      }).catch((err: unknown) => {
        logger.warn("Welcome email failed to send", {
          userId: user.id,
          error: err instanceof Error ? err.message : String(err),
        });
      });
    } catch {
      // Email failure should not block onboarding
    }
  }

  // Notify SaaS admin about new registration
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    logger.warn("ADMIN_EMAIL env var is not set — admin notification skipped");
  } else {
    try {
      const { sendEmail } = await import("@/lib/notifications/email");
      const escHtml = (s: string) =>
        String(s)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");
      const sent = await sendEmail({
        to: adminEmail,
        subject: `🚀 Nuevo restaurante registrado: ${data.name}`,
        html: `
          <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px;">
            <h2 style="color:#7c3aed;margin:0 0 16px;">Nuevo registro en MENIUS</h2>
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Restaurante</td><td style="padding:8px 0;font-size:14px;font-weight:600;">${escHtml(data.name)}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Slug</td><td style="padding:8px 0;font-size:14px;">${escHtml(data.slug)}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Email</td><td style="padding:8px 0;font-size:14px;">${escHtml(user.email ?? "")}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Nombre</td><td style="padding:8px 0;font-size:14px;">${escHtml(user.user_metadata?.full_name || "N/A")}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Moneda</td><td style="padding:8px 0;font-size:14px;">${escHtml(data.currency)}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Timezone</td><td style="padding:8px 0;font-size:14px;">${escHtml(data.timezone)}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Fecha</td><td style="padding:8px 0;font-size:14px;">${new Date().toLocaleString("es")}</td></tr>
            </table>
            <div style="margin-top:20px;">
              <a href="${appUrl}/${data.slug}" style="display:inline-block;padding:10px 20px;background:#7c3aed;color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">Ver menú</a>
              <a href="${appUrl}/admin/users" style="display:inline-block;padding:10px 20px;background:#059669;color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;margin-left:8px;">Admin Panel</a>
            </div>
          </div>`,
      });
      if (!sent) {
        logger.error(
          "Admin notification email failed to send — check RESEND_API_KEY and domain verification",
        );
      }
    } catch (e) {
      logger.error("Admin notification error", {
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  // Pre-generate the public menu page immediately so the first visitor never
  // hits a cold ISR start (10 s blank page). This is the same pattern used by
  // high-traffic restaurant platforms: page is warm before anyone visits it.
  revalidatePublicMenu(restaurant.slug);

  return {
    success: true as const,
    slug: restaurant.slug,
    restaurantId: restaurant.id,
  };
}

// ---- Re-seed ----
export async function reseedMyRestaurant() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };
  if (await isDeviceSession(supabase)) return { error: "No disponible en la tablet" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("default_restaurant_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile?.default_restaurant_id)
    return { error: "Sin restaurante vinculado" };
  const restaurantId = profile.default_restaurant_id;

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("slug, owner_user_id, currency")
    .eq("id", restaurantId)
    .maybeSingle();

  if (!restaurant || restaurant.owner_user_id !== user.id)
    return { error: "No autorizado" };

  const { count: productCount } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId);

  if ((productCount ?? 0) > 0) {
    return {
      error: "Tu restaurante ya tiene productos. Edítalos desde el menú.",
    };
  }

  const { seedRestaurant } = await import("@/lib/seed-restaurant");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://menius.app";
  const locale = inferLocale(restaurant.currency ?? "MXN");
  await seedRestaurant(supabase, restaurantId, restaurant.slug, appUrl, locale);

  revalidatePath("/app");
  revalidatePublicMenu(restaurant.slug);
  return { success: true };
}

// ---- Categories ----
export async function createCategory(data: CategoryInput) {
  const {
    supabase,
    restaurantId,
    restaurantSlug,
    error: authErr,
  } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  // Enforce category limit using effective plan (respects is_legacy_free for grandfathered restaurants)
  const { getEffectivePlanLimits } = await import("@/lib/auth/check-plan");
  const { isWithinLimit } = await import("@/lib/plans");
  const { count: catCount } = await supabase
    .from("categories")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId);
  const effective = await getEffectivePlanLimits(restaurantId);
  if (!isWithinLimit((catCount ?? 0) + 1, effective.limits.maxCategories)) {
    return {
      error: `Tu plan permite hasta ${effective.limits.maxCategories} categorías. Actualiza tu plan para agregar más.`,
      limitReached: true,
      limitType: "categories" as const,
      suggestedPlan: "starter" as const,
    };
  }

  const { data: created, error } = await supabase
    .from("categories")
    .insert({
      restaurant_id: restaurantId,
      name: sanitizeText(data.name, 100),
      sort_order: data.sort_order,
      is_active: data.is_active,
      available_from: data.available_from || null,
      available_to: data.available_to || null,
    })
    .select("id, name")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/app/menu/categories");
  revalidatePublicMenu(restaurantSlug);
  return { success: true, id: created?.id, name: created?.name };
}

/**
 * allowDevice: solo las acciones que usa el Counter lo pasan en true. Una tablet
 * vinculada con código no puede editar menú, mesas, ni nada fuera del Counter.
 */
async function getAuthenticatedRestaurant(
  opts: { allowDevice?: boolean } = {},
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return {
      error: "No autenticado" as const,
      supabase,
      restaurantId: "",
      restaurantSlug: "",
    };

  const [{ data: profile }, device] = await Promise.all([
    supabase
      .from("profiles")
      .select("default_restaurant_id")
      .eq("user_id", user.id)
      .maybeSingle(),
    getDeviceSession(supabase),
  ]);

  if (device.isDevice && !opts.allowDevice)
    return {
      error: "No disponible en la tablet" as const,
      supabase,
      restaurantId: "",
      restaurantSlug: "",
    };

  // La tablet sigue a la tienda a la que se vinculó, no a la elegida en el panel.
  const restaurantId = device.restaurantId ?? profile?.default_restaurant_id;
  if (!restaurantId)
    return {
      error: "Sin restaurante" as const,
      supabase,
      restaurantId: "",
      restaurantSlug: "",
    };

  const { data: rest } = await supabase
    .from("restaurants")
    .select("slug")
    .eq("id", restaurantId)
    .maybeSingle();

  return {
    supabase,
    restaurantId,
    restaurantSlug: rest?.slug ?? "",
    error: null,
  };
}

export async function updateCategory(id: string, data: CategoryInput) {
  const {
    supabase,
    restaurantId,
    restaurantSlug,
    error: authErr,
  } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const payload: Record<string, unknown> = {
    name: sanitizeText(data.name, 100),
    sort_order: data.sort_order,
    is_active: data.is_active,
  };
  if (data.translations !== undefined) payload.translations = data.translations;
  if (data.image_url !== undefined) payload.image_url = data.image_url;
  if (data.available_from !== undefined)
    payload.available_from = data.available_from || null;
  if (data.available_to !== undefined)
    payload.available_to = data.available_to || null;
  if (data.send_to_kitchen !== undefined)
    payload.send_to_kitchen = data.send_to_kitchen;

  const { error } = await supabase
    .from("categories")
    .update(payload)
    .eq("id", id)
    .eq("restaurant_id", restaurantId);

  if (error) return { error: error.message };
  revalidatePath("/app/menu/categories");
  revalidatePublicMenu(restaurantSlug);
  return { success: true };
}

export async function deleteCategory(id: string) {
  const {
    supabase,
    restaurantId,
    restaurantSlug,
    error: authErr,
  } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("restaurant_id", restaurantId);
  if (error) return { error: error.message };
  revalidatePath("/app/menu/categories");
  revalidatePublicMenu(restaurantSlug);
  return { success: true };
}

export async function reorderCategories(orderedIds: string[]) {
  const {
    supabase,
    restaurantId,
    restaurantSlug,
    error: authErr,
  } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const updates = orderedIds.map((id, i) =>
    supabase
      .from("categories")
      .update({ sort_order: i })
      .eq("id", id)
      .eq("restaurant_id", restaurantId),
  );
  await Promise.all(updates);
  revalidatePath("/app/menu/categories");
  revalidatePublicMenu(restaurantSlug);
  return { success: true };
}

export async function reorderProducts(orderedIds: string[]) {
  const {
    supabase,
    restaurantId,
    restaurantSlug,
    error: authErr,
  } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const updates = orderedIds.map((id, i) =>
    supabase
      .from("products")
      .update({ sort_order: i })
      .eq("id", id)
      .eq("restaurant_id", restaurantId),
  );
  await Promise.all(updates);
  revalidatePath("/app/menu/products");
  revalidatePublicMenu(restaurantSlug);
  return { success: true };
}

// ---- Products ----
export async function createProduct(
  data: ProductInput & { image_url?: string },
) {
  const {
    supabase,
    restaurantId,
    restaurantSlug,
    error: authErr,
  } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const { getEffectivePlanLimits } = await import("@/lib/auth/check-plan");
  const { isWithinLimit } = await import("@/lib/plans");
  const { count: productCount } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId);
  const effective = await getEffectivePlanLimits(restaurantId);
  if (!isWithinLimit((productCount ?? 0) + 1, effective.limits.maxProducts)) {
    return {
      error: `Tu plan permite hasta ${effective.limits.maxProducts} productos. Actualiza tu plan para agregar más.`,
      limitReached: true,
      limitType: "products" as const,
      suggestedPlan: "starter" as const,
    };
  }

  const { data: created, error } = await supabase
    .from("products")
    .insert({
      restaurant_id: restaurantId,
      category_id: data.category_id,
      name: sanitizeText(data.name, 150),
      description: sanitizeMultiline(data.description, 500),
      price: data.price,
      is_active: data.is_active,
      ...(data.is_featured != null && { is_featured: data.is_featured }),
      ...(data.is_new != null && { is_new: data.is_new }),
      ...(data.dine_in_only != null && { dine_in_only: data.dine_in_only }),
      ...(data.hide_image != null && { hide_image: data.hide_image }),
      ...(data.dietary_tags && { dietary_tags: data.dietary_tags }),
      ...(data.image_url && { image_url: data.image_url }),
      ...(data.prep_time_minutes != null && {
        prep_time_minutes: data.prep_time_minutes,
      }),
      ...(data.cost_price != null && { cost_price: data.cost_price }),
      available_from: normalizeHour(data.available_from),
      available_until: normalizeHour(data.available_until),
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/app/menu/products");
  revalidatePublicMenu(restaurantSlug);
  return { success: true, id: created?.id };
}

// Trae las relaciones completas (variants, extras, modifier groups + options) de
// UN producto, on-demand. Se usa al DUPLICAR: la lista del dashboard ya no carga
// estas relaciones para todos los productos (payload slim), así que el duplicado
// las pide solo del producto elegido. Valida ownership del tenant.
export async function getProductForDuplication(productId: string) {
  const {
    supabase,
    restaurantId,
    error: authErr,
  } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const { data: product, error } = await supabase
    .from("products")
    .select(
      "id, product_variants(name, price_delta, sort_order), product_extras(name, price, sort_order), modifier_groups(name, selection_type, min_select, max_select, is_required, sort_order, modifier_options(name, price_delta, is_default, sort_order))",
    )
    .eq("id", productId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!product) return { error: "No encontrado" };

  return {
    success: true as const,
    variants: (product.product_variants ?? []).sort(
      (a, b) => a.sort_order - b.sort_order,
    ),
    extras: (product.product_extras ?? []).sort(
      (a, b) => a.sort_order - b.sort_order,
    ),
    modifier_groups: (product.modifier_groups ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((g) => ({
        ...g,
        options: (g.modifier_options ?? []).sort(
          (a, b) => a.sort_order - b.sort_order,
        ),
      })),
  };
}

export async function updateProduct(
  id: string,
  data: Partial<ProductInput> & { image_url?: string },
) {
  const {
    supabase,
    restaurantId,
    restaurantSlug,
    error: authErr,
  } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const sanitized = { ...data };
  if (sanitized.name) sanitized.name = sanitizeText(sanitized.name, 150);
  // Horario: solo "HH:MM" o null llegan a la base.
  if ("available_from" in sanitized) sanitized.available_from = normalizeHour(sanitized.available_from);
  if ("available_until" in sanitized) sanitized.available_until = normalizeHour(sanitized.available_until);
  if (sanitized.description)
    sanitized.description = sanitizeMultiline(sanitized.description, 500);
  const { error } = await supabase
    .from("products")
    .update(sanitized)
    .eq("id", id)
    .eq("restaurant_id", restaurantId);

  if (error) return { error: error.message };
  revalidatePath("/app/menu/products");
  revalidatePublicMenu(restaurantSlug);
  return { success: true };
}

export async function toggleProductStock(id: string, inStock: boolean) {
  const {
    supabase,
    restaurantId,
    restaurantSlug,
    error: authErr,
  } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const { error } = await supabase
    .from("products")
    .update({ in_stock: inStock })
    .eq("id", id)
    .eq("restaurant_id", restaurantId);

  if (error) return { error: error.message };
  revalidatePath("/app/menu/products");
  revalidatePublicMenu(restaurantSlug);
  return { success: true };
}

export async function deleteProduct(id: string) {
  const {
    supabase,
    restaurantId,
    restaurantSlug,
    error: authErr,
  } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", id)
    .eq("restaurant_id", restaurantId);
  if (error) return { error: error.message };
  revalidatePath("/app/menu/products");
  revalidatePublicMenu(restaurantSlug);
  return { success: true };
}


// ---- Modifier Groups ----

/** Locales the dashboard can translate content into. */
const TRANSLATABLE_LOCALES = new Set(["es", "en"]);

/**
 * Normalizes a modifier translations blob before it reaches the DB.
 *
 * Locale keys are whitelisted and names sanitized, so a crafted payload can't
 * store arbitrary keys or markup in a jsonb column that the public menu renders.
 * Returns null when nothing survives, which reads as "fall back to the base
 * name" everywhere downstream.
 */
function sanitizeTranslations(
  input: Record<string, { name?: string }> | null | undefined,
): Record<string, { name: string }> | null {
  if (!input || typeof input !== "object") return null;
  const out: Record<string, { name: string }> = {};
  for (const [locale, value] of Object.entries(input)) {
    if (!TRANSLATABLE_LOCALES.has(locale)) continue;
    const name = sanitizeText(value?.name ?? "", 100).trim();
    if (name) out[locale] = { name };
  }
  return Object.keys(out).length > 0 ? out : null;
}

/**
 * Whether a modifier option belongs to the given product.
 *
 * Guards conditional groups: `depends_on_option_id` is deliberately not a
 * foreign key (a FK here broke the PostgREST embed — see
 * 20260805_modifier_groups_conditional.sql), so nothing at the DB level stops a
 * group from depending on an option of a different product, or a different
 * restaurant. Checked here instead.
 */
async function optionBelongsToProduct(
  supabase: Awaited<ReturnType<typeof createClient>>,
  optionId: string,
  productId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("modifier_options")
    .select("id, modifier_groups!inner(product_id)")
    .eq("id", optionId)
    .eq("modifier_groups.product_id", productId)
    .maybeSingle();
  return !!data;
}

/**
 * Normalizes a conditional dependency into the two stored columns.
 *
 * depends_on_option_ids ("any of these") is the source of truth; the legacy
 * depends_on_option_id mirrors its first element so a client from before the
 * list existed still applies the old one-option rule. A caller that only sends
 * the single id (an older form) gets a one-element list — otherwise a stale
 * list would silently override the edit.
 */
async function resolveDependency(
  supabase: Awaited<ReturnType<typeof createClient>>,
  productId: string,
  data: { depends_on_option_id?: string | null; depends_on_option_ids?: string[] | null },
): Promise<
  | { ok: true; depends_on_option_id: string | null; depends_on_option_ids: string[] | null }
  | { ok: false }
> {
  const raw =
    data.depends_on_option_ids !== undefined
      ? (data.depends_on_option_ids ?? [])
      : data.depends_on_option_id
        ? [data.depends_on_option_id]
        : [];
  const ids = Array.from(new Set(raw.filter((x): x is string => typeof x === "string" && !!x))).slice(0, 50);
  for (const id of ids) {
    if (!(await optionBelongsToProduct(supabase, id, productId))) return { ok: false };
  }
  return {
    ok: true,
    depends_on_option_id: ids[0] ?? null,
    depends_on_option_ids: ids.length > 0 ? ids : null,
  };
}

type SharedGroupRow = {
  id: string;
  product_id: string;
  shared_origin_id: string | null;
};

/**
 * Every row that shares content with `row` — its origin plus all siblings,
 * excluding the row itself.
 *
 * A link is always one hop: the origin's own shared_origin_id is null, so the
 * family is `origin ∪ {rows pointing at origin}` and there are no chains.
 */
async function sharedSiblingIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  row: SharedGroupRow,
): Promise<string[]> {
  const originId = row.shared_origin_id ?? row.id;
  const { data } = await supabase
    .from("modifier_groups")
    .select("id")
    .or(`id.eq.${originId},shared_origin_id.eq.${originId}`);
  return (data ?? []).map((g) => g.id).filter((gid) => gid !== row.id);
}

/**
 * Mirrors a group edit onto its shared siblings.
 *
 * Only the fields that define the group's *content* travel; anything
 * per-product (position, conditional dependency) stays put. No-op for a
 * standalone group, which is the overwhelmingly common case.
 */
async function fanOutGroupEdit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  row: SharedGroupRow,
  patch: Record<string, unknown>,
): Promise<void> {
  const siblings = await sharedSiblingIds(supabase, row);
  if (siblings.length === 0) return;
  await supabase.from("modifier_groups").update(patch).in("id", siblings);
}

/**
 * Coerces a cost input to a storable value.
 *
 * Anything empty, negative or non-finite becomes null — "not tracked" — rather
 * than 0, because a zero cost would read as "this add-on is free" and silently
 * inflate the reported margin.
 */
function normalizeCost(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value) || value < 0) return null;
  return value;
}

type OwnedOptionRow = {
  id: string;
  group_id: string;
  sort_order: number;
  modifier_groups: SharedGroupRow | SharedGroupRow[];
};

/**
 * Applies an option write to the matching option of every shared sibling group.
 *
 * Siblings are matched by `sort_order`: options are created in lockstep across
 * a shared family, so position — not id — is what identifies "the same option"
 * on another dish. No-op for standalone groups.
 */
async function fanOutOptionWrite(
  supabase: Awaited<ReturnType<typeof createClient>>,
  owned: OwnedOptionRow,
  apply: (siblingGroupIds: string[], position: number) => Promise<void>,
): Promise<void> {
  // PostgREST returns an embedded row as an object or a single-element array
  // depending on how the relationship is inferred; normalize both.
  const group = Array.isArray(owned.modifier_groups)
    ? owned.modifier_groups[0]
    : owned.modifier_groups;
  if (!group) return;
  const siblings = await sharedSiblingIds(supabase, group);
  if (siblings.length === 0) return;
  await apply(siblings, owned.sort_order);
}

export async function createModifierGroup(
  productId: string,
  data: {
    name: string;
    selection_type: "single" | "multi";
    min_select: number;
    max_select: number;
    is_required: boolean;
    sort_order: number;
    display_type?: "list" | "grid";
    depends_on_option_id?: string | null;
    depends_on_option_ids?: string[] | null;
    translations?: Record<string, { name?: string }> | null;
  },
) {
  const {
    supabase,
    restaurantId,
    restaurantSlug,
    error: authErr,
  } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const { data: product } = await supabase
    .from("products")
    .select("id")
    .eq("id", productId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();
  if (!product) return { error: "No encontrado" };

  // A conditional group may only hang off options of the SAME product.
  // Without this check a forged id could point at another restaurant's option,
  // which would leak that the option exists and permanently hide the group.
  const dep = await resolveDependency(supabase, productId, data);
  if (!dep.ok) return { error: "Opción inválida" };

  const { data: group, error } = await supabase
    .from("modifier_groups")
    .insert({
      product_id: productId,
      name: sanitizeText(data.name, 100),
      selection_type: data.selection_type,
      min_select: data.min_select,
      max_select: data.max_select,
      is_required: data.is_required,
      sort_order: data.sort_order,
      display_type: data.display_type ?? "list",
      depends_on_option_id: dep.depends_on_option_id,
      depends_on_option_ids: dep.depends_on_option_ids,
      translations: sanitizeTranslations(data.translations),
    })
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath("/app/menu/products");
  revalidatePublicMenu(restaurantSlug);
  return { success: true, group: { ...group, options: [] } };
}

/** modifier_groups.ticket_layout (check en la base). */
const TICKET_LAYOUTS = ["line", "indent", "inline"];

export async function updateModifierGroup(
  id: string,
  data: {
    name: string;
    selection_type: "single" | "multi";
    min_select: number;
    max_select: number;
    is_required: boolean;
    sort_order: number;
    display_type?: "list" | "grid";
    depends_on_option_id?: string | null;
    depends_on_option_ids?: string[] | null;
    translations?: Record<string, { name?: string }> | null;
    /** Cómo sale en el ticket (lib/modifier-lines). Sin el campo = no se toca. */
    ticket_label?: string | null;
    ticket_layout?: string;
  },
) {
  const {
    supabase,
    restaurantId,
    restaurantSlug,
    error: authErr,
  } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  if (data.ticket_layout !== undefined && !TICKET_LAYOUTS.includes(data.ticket_layout)) {
    return { error: "Formato de ticket inválido" };
  }
  // Solo si vino en el pedido: los otros guardados del editor (lista/grilla) no lo mandan.
  const ticket: Record<string, unknown> = {};
  if (data.ticket_label !== undefined) ticket.ticket_label = data.ticket_label?.trim() ? sanitizeText(data.ticket_label, 80) : null;
  if (data.ticket_layout !== undefined) ticket.ticket_layout = data.ticket_layout;

  const { data: owned } = await supabase
    .from("modifier_groups")
    .select("id, product_id, shared_origin_id, products!inner(restaurant_id)")
    .eq("id", id)
    .eq("products.restaurant_id", restaurantId)
    .maybeSingle();
  if (!owned) return { error: "No encontrado" };

  const dep = await resolveDependency(
    supabase,
    (owned as { product_id: string }).product_id,
    data,
  );
  if (!dep.ok) return { error: "Opción inválida" };

  const { error } = await supabase
    .from("modifier_groups")
    .update({
      name: sanitizeText(data.name, 100),
      selection_type: data.selection_type,
      min_select: data.min_select,
      max_select: data.max_select,
      is_required: data.is_required,
      sort_order: data.sort_order,
      display_type: data.display_type ?? "list",
      depends_on_option_id: dep.depends_on_option_id,
      depends_on_option_ids: dep.depends_on_option_ids,
      translations: sanitizeTranslations(data.translations),
      ...ticket,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  // Shared groups: mirror the edit onto every sibling.
  //
  // `sort_order` and `depends_on_option_id` are deliberately NOT fanned out —
  // both are per-product. Position is whatever each dish needs, and a
  // dependency points at an option of its own product, so copying one across
  // would make siblings depend on a foreign option and hide them forever.
  await fanOutGroupEdit(supabase, owned as SharedGroupRow, {
    name: sanitizeText(data.name, 100),
    selection_type: data.selection_type,
    min_select: data.min_select,
    max_select: data.max_select,
    is_required: data.is_required,
    display_type: data.display_type ?? "list",
    translations: sanitizeTranslations(data.translations),
    ...ticket,
  });

  revalidatePath("/app/menu/products");
  revalidatePublicMenu(restaurantSlug);
  return { success: true };
}

export async function deleteModifierGroup(id: string) {
  const {
    supabase,
    restaurantId,
    restaurantSlug,
    error: authErr,
  } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const { data: owned } = await supabase
    .from("modifier_groups")
    .select("id, product_id, shared_origin_id, products!inner(restaurant_id)")
    .eq("id", id)
    .eq("products.restaurant_id", restaurantId)
    .maybeSingle();
  if (!owned) return { error: "No encontrado" };

  // Deleting a shared group only removes it from THIS dish. The siblings on
  // other dishes stay — "delete" here means "this dish no longer offers it",
  // not "wipe this group off the menu". Unlinking is handled separately.
  const row = owned as SharedGroupRow;
  if (!row.shared_origin_id) {
    // The origin is going away: promote one sibling so the family keeps its
    // content instead of every remaining row pointing at a dead id.
    const siblings = await sharedSiblingIds(supabase, row);
    if (siblings.length > 0) {
      const [heir, ...rest] = siblings;
      await supabase
        .from("modifier_groups")
        .update({ shared_origin_id: null })
        .eq("id", heir);
      if (rest.length > 0) {
        await supabase
          .from("modifier_groups")
          .update({ shared_origin_id: heir })
          .in("id", rest);
      }
    }
  }

  const { error } = await supabase
    .from("modifier_groups")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/app/menu/products");
  revalidatePublicMenu(restaurantSlug);
  return { success: true };
}

// ---- Modifier Options ----
/**
 * Hours of an option (Grits 5:30–11 AM). Only written when the caller sends
 * them, so an older form that knows nothing about hours cannot wipe them.
 * Content of the option: fans out to shared siblings like the price.
 */
function optionHoursPatch(data: { available_from?: string | null; available_until?: string | null }) {
  const out: { available_from?: string | null; available_until?: string | null } = {};
  if (data.available_from !== undefined) out.available_from = normalizeHour(data.available_from);
  if (data.available_until !== undefined) out.available_until = normalizeHour(data.available_until);
  return out;
}

export async function createModifierOption(
  groupId: string,
  data: {
    name: string;
    price_delta: number;
    is_default: boolean;
    sort_order: number;
    cost_price?: number | null;
    translations?: Record<string, { name?: string }> | null;
    /** "HH:MM" local, or null = always. Omitted = leave as is. */
    available_from?: string | null;
    available_until?: string | null;
  },
) {
  const {
    supabase,
    restaurantId,
    restaurantSlug,
    error: authErr,
  } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const { data: group } = await supabase
    .from("modifier_groups")
    .select("id, product_id, shared_origin_id, products!inner(restaurant_id)")
    .eq("id", groupId)
    .eq("products.restaurant_id", restaurantId)
    .maybeSingle();
  if (!group) return { error: "No encontrado" };

  // Position is derived from the highest existing sort_order, NOT from the
  // client's count. Deleting a middle option leaves a gap (0,1,3), so a count
  // of 3 would hand the new option sort_order 3 — colliding with the one
  // already there. That matters beyond ordering: shared groups pair their
  // options across dishes BY sort_order, so a duplicate makes one edit rewrite
  // two different options on every linked dish.
  const { data: last } = await supabase
    .from("modifier_options")
    .select("sort_order")
    .eq("group_id", groupId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSort = last ? Number(last.sort_order) + 1 : 0;

  const payload = {
    name: sanitizeText(data.name, 100),
    price_delta: data.price_delta,
    is_default: data.is_default,
    sort_order: nextSort,
    cost_price: normalizeCost(data.cost_price),
    translations: sanitizeTranslations(data.translations),
    ...optionHoursPatch(data),
  };

  const { data: option, error } = await supabase
    .from("modifier_options")
    .insert({ group_id: groupId, ...payload })
    .select()
    .single();

  if (error) return { error: error.message };

  // Shared groups: the option has to appear on every sibling too, otherwise
  // adding "Bacon" to a linked group would only show up on one dish.
  const siblings = await sharedSiblingIds(supabase, group as SharedGroupRow);
  if (siblings.length > 0) {
    await supabase
      .from("modifier_options")
      .insert(siblings.map((gid) => ({ group_id: gid, ...payload })));
  }

  revalidatePath("/app/menu/products");
  revalidatePublicMenu(restaurantSlug);
  return { success: true, option };
}

export async function updateModifierOption(
  id: string,
  data: {
    name: string;
    price_delta: number;
    is_default: boolean;
    sort_order: number;
    cost_price?: number | null;
    translations?: Record<string, { name?: string }> | null;
    /** "HH:MM" local, or null = always. Omitted = leave as is. */
    available_from?: string | null;
    available_until?: string | null;
  },
) {
  const {
    supabase,
    restaurantId,
    restaurantSlug,
    error: authErr,
  } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const { data: owned } = await supabase
    .from("modifier_options")
    .select(
      "id, group_id, sort_order, modifier_groups!inner(id, product_id, shared_origin_id, products!inner(restaurant_id))",
    )
    .eq("id", id)
    .eq("modifier_groups.products.restaurant_id", restaurantId)
    .maybeSingle();
  if (!owned) return { error: "No encontrado" };

  const payload = {
    name: sanitizeText(data.name, 100),
    price_delta: data.price_delta,
    is_default: data.is_default,
    cost_price: normalizeCost(data.cost_price),
    translations: sanitizeTranslations(data.translations),
    ...optionHoursPatch(data),
  };

  const { error } = await supabase
    .from("modifier_options")
    .update({ ...payload, sort_order: data.sort_order })
    .eq("id", id);

  if (error) return { error: error.message };

  await fanOutOptionWrite(
    supabase,
    owned as OwnedOptionRow,
    async (siblingGroupIds, position) => {
      await supabase
        .from("modifier_options")
        .update(payload)
        .in("group_id", siblingGroupIds)
        .eq("sort_order", position);
    },
  );

  revalidatePath("/app/menu/products");
  revalidatePublicMenu(restaurantSlug);
  return { success: true };
}

export async function deleteModifierOption(id: string) {
  const {
    supabase,
    restaurantId,
    restaurantSlug,
    error: authErr,
  } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const { data: owned } = await supabase
    .from("modifier_options")
    .select(
      "id, group_id, sort_order, modifier_groups!inner(id, product_id, shared_origin_id, products!inner(restaurant_id))",
    )
    .eq("id", id)
    .eq("modifier_groups.products.restaurant_id", restaurantId)
    .maybeSingle();
  if (!owned) return { error: "No encontrado" };

  const { error } = await supabase
    .from("modifier_options")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };

  await fanOutOptionWrite(
    supabase,
    owned as OwnedOptionRow,
    async (siblingGroupIds, position) => {
      await supabase
        .from("modifier_options")
        .delete()
        .in("group_id", siblingGroupIds)
        .eq("sort_order", position);
    },
  );

  // Close the gap the delete just opened, across the whole shared family.
  // sort_order is what pairs an option with its counterpart on another dish,
  // so leaving holes (0,1,3) lets positions drift apart over time.
  const ownedRow = owned as OwnedOptionRow;
  const ownedGroup = Array.isArray(ownedRow.modifier_groups)
    ? ownedRow.modifier_groups[0]
    : ownedRow.modifier_groups;
  if (ownedGroup) {
    const family = [
      ownedRow.group_id,
      ...(await sharedSiblingIds(supabase, ownedGroup)),
    ];
    await Promise.all(family.map((gid) => compactOptionOrder(supabase, gid)));
  }

  revalidatePath("/app/menu/products");
  revalidatePublicMenu(restaurantSlug);
  return { success: true };
}

/**
 * Renumbers a group's options to 0..n-1, preserving their current order.
 *
 * Only writes the rows whose position actually changed, so the common case
 * (deleting the last option) costs nothing.
 */
async function compactOptionOrder(
  supabase: Awaited<ReturnType<typeof createClient>>,
  groupId: string,
): Promise<void> {
  const { data } = await supabase
    .from("modifier_options")
    .select("id, sort_order")
    .eq("group_id", groupId)
    .order("sort_order", { ascending: true });

  const rows = data ?? [];
  await Promise.all(
    rows
      .map((row, index) => ({ row, index }))
      .filter(({ row, index }) => Number(row.sort_order) !== index)
      .map(({ row, index }) =>
        supabase
          .from("modifier_options")
          .update({ sort_order: index })
          .eq("id", row.id),
      ),
  );
}

export async function reorderModifierGroups(
  productId: string,
  orderedIds: string[],
) {
  const {
    supabase,
    restaurantId,
    error: authErr,
  } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const { data: product } = await supabase
    .from("products")
    .select("id")
    .eq("id", productId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();
  if (!product) return { error: "No encontrado" };

  await Promise.all(
    orderedIds.map((id, i) =>
      supabase
        .from("modifier_groups")
        .update({ sort_order: i })
        .eq("id", id)
        .eq("product_id", productId),
    ),
  );
  revalidatePath("/app/menu/products");
  return { success: true };
}

export async function reorderModifierOptions(
  groupId: string,
  orderedIds: string[],
) {
  const {
    supabase,
    restaurantId,
    error: authErr,
  } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const { data: owned } = await supabase
    .from("modifier_groups")
    .select("id, product_id, shared_origin_id, products!inner(restaurant_id)")
    .eq("id", groupId)
    .eq("products.restaurant_id", restaurantId)
    .maybeSingle();
  if (!owned) return { error: "No encontrado" };

  await Promise.all(
    orderedIds.map((id, i) =>
      supabase
        .from("modifier_options")
        .update({ sort_order: i })
        .eq("id", id)
        .eq("group_id", groupId),
    ),
  );

  // Shared groups: siblings must be reordered too. Their options are separate
  // rows paired only by position, so reordering one dish alone would leave the
  // family misaligned and later edits would land on the wrong option.
  // Matched by name, the one stable identifier siblings share.
  const siblings = await sharedSiblingIds(supabase, owned as SharedGroupRow);
  if (siblings.length > 0) {
    const { data: sourceOptions } = await supabase
      .from("modifier_options")
      .select("name, sort_order")
      .eq("group_id", groupId);
    const positionByName = new Map(
      (sourceOptions ?? []).map((o) => [o.name as string, Number(o.sort_order)]),
    );

    const { data: siblingOptions } = await supabase
      .from("modifier_options")
      .select("id, group_id, name, sort_order")
      .in("group_id", siblings);

    await Promise.all(
      (siblingOptions ?? [])
        .map((o) => ({ o, target: positionByName.get(o.name as string) }))
        .filter(
          ({ o, target }) => target !== undefined && Number(o.sort_order) !== target,
        )
        .map(({ o, target }) =>
          supabase
            .from("modifier_options")
            .update({ sort_order: target })
            .eq("id", o.id),
        ),
    );
  }

  return { success: true };
}

// ---- Reusing modifier groups across products ----

/**
 * Every modifier group of this restaurant that lives on some OTHER product,
 * for the "copy from another item" and "add existing" pickers.
 *
 * Only origin rows are offered (`shared_origin_id is null`): a linked row is
 * just a mirror, so listing it too would show the same group several times and
 * let the owner link to a mirror instead of the real origin.
 */
export async function listReusableModifierGroups(excludeProductId: string) {
  const { supabase, restaurantId, error: authErr } =
    await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr, groups: [] };

  const { data, error } = await supabase
    .from("modifier_groups")
    .select(
      `id, product_id, name, selection_type, min_select, max_select,
       is_required, sort_order, display_type, shared_origin_id, translations,
       products!inner(id, name, restaurant_id),
       modifier_options ( id, group_id, name, price_delta, is_default, sort_order, cost_price, translations )`,
    )
    .eq("products.restaurant_id", restaurantId)
    .is("shared_origin_id", null)
    .neq("product_id", excludeProductId)
    .order("sort_order", { ascending: true });

  if (error) return { error: error.message, groups: [] };

  const groups = (data ?? []).map((g) => {
    const product = Array.isArray(g.products) ? g.products[0] : g.products;
    return {
      id: g.id as string,
      name: g.name as string,
      product_id: g.product_id as string,
      product_name: (product as { name?: string })?.name ?? "",
      selection_type: g.selection_type as "single" | "multi",
      is_required: g.is_required as boolean,
      option_count: ((g.modifier_options ?? []) as unknown[]).length,
    };
  });

  return { success: true, groups };
}

/**
 * How many dishes each of this product's groups is shared with, keyed by the
 * group's own id.
 *
 * Counted server-side because the siblings live on OTHER products: the editor's
 * own list can never see them. Crucially this also covers the ORIGIN group,
 * whose shared_origin_id is NULL — standing on the dish where the group was
 * first created must still warn that edits fan out, which is precisely the case
 * where an owner would least expect it.
 *
 * Returns only groups shared with at least one other dish; anything absent from
 * the map is standalone.
 */
export async function getSharedGroupCounts(productId: string) {
  const { supabase, restaurantId, error: authErr } =
    await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr, counts: {} as Record<string, number> };

  const { data: mine } = await supabase
    .from("modifier_groups")
    .select("id, shared_origin_id, products!inner(restaurant_id)")
    .eq("product_id", productId)
    .eq("products.restaurant_id", restaurantId);

  const rows = (mine ?? []) as unknown as SharedGroupRow[];
  if (rows.length === 0) return { success: true, counts: {} };

  // One family per origin; a group is its own origin when it isn't linked.
  const originByGroup = new Map<string, string>();
  for (const g of rows) originByGroup.set(g.id, g.shared_origin_id ?? g.id);
  const origins = Array.from(new Set(originByGroup.values()));

  const { data: family } = await supabase
    .from("modifier_groups")
    .select("id, product_id, shared_origin_id")
    .or(
      `id.in.(${origins.join(",")}),shared_origin_id.in.(${origins.join(",")})`,
    );

  // Distinct dishes per family — two groups of the same family on one dish
  // would still be a single place the change shows up.
  const dishesByOrigin = new Map<string, Set<string>>();
  for (const row of (family ?? []) as SharedGroupRow[]) {
    const origin = row.shared_origin_id ?? row.id;
    const set = dishesByOrigin.get(origin) ?? new Set<string>();
    set.add(row.product_id);
    dishesByOrigin.set(origin, set);
  }

  const counts: Record<string, number> = {};
  for (const [groupId, origin] of Array.from(originByGroup.entries())) {
    const total = dishesByOrigin.get(origin)?.size ?? 1;
    if (total > 1) counts[groupId] = total;
  }

  return { success: true, counts };
}

/** Content of a group, minus everything that is per-product. */
type GroupContent = {
  name: string;
  selection_type: "single" | "multi";
  min_select: number;
  max_select: number;
  is_required: boolean;
  display_type: "list" | "grid";
  translations: Record<string, { name: string }> | null;
  options: {
    name: string;
    price_delta: number;
    is_default: boolean;
    sort_order: number;
    cost_price: number | null;
    translations: Record<string, { name: string }> | null;
    available_from: string | null;
    available_until: string | null;
  }[];
};

/**
 * Reads the content of source groups, verifying they belong to this restaurant.
 *
 * `depends_on_option_id` is deliberately dropped: it points at an option of the
 * source product, and carrying it over would make the new group depend on an
 * option that its own product does not have — the group would never appear.
 */
async function readGroupContents(
  supabase: Awaited<ReturnType<typeof createClient>>,
  restaurantId: string,
  groupIds: string[],
): Promise<GroupContent[]> {
  const { data } = await supabase
    .from("modifier_groups")
    .select(
      `id, name, selection_type, min_select, max_select, is_required,
       display_type, sort_order, translations,
       products!inner(restaurant_id),
       modifier_options ( name, price_delta, is_default, sort_order, cost_price, translations,
         available_from, available_until )`,
    )
    .in("id", groupIds)
    .eq("products.restaurant_id", restaurantId)
    .order("sort_order", { ascending: true });

  return (data ?? []).map((g) => ({
    name: g.name as string,
    selection_type: g.selection_type as "single" | "multi",
    min_select: g.min_select as number,
    max_select: g.max_select as number,
    is_required: g.is_required as boolean,
    display_type: (g.display_type ?? "list") as "list" | "grid",
    translations: (g.translations ?? null) as Record<
      string,
      { name: string }
    > | null,
    options: ((g.modifier_options ?? []) as Record<string, unknown>[])
      .map((o) => ({
        name: o.name as string,
        price_delta: Number(o.price_delta ?? 0),
        is_default: !!o.is_default,
        sort_order: Number(o.sort_order ?? 0),
        cost_price: normalizeCost(o.cost_price as number | null),
        translations: (o.translations ?? null) as Record<
          string,
          { name: string }
        > | null,
        // El horario es contenido de la opción (Grits 5:30–11): viaja con la copia.
        available_from: (o.available_from as string | null) ?? null,
        available_until: (o.available_until as string | null) ?? null,
      }))
      .sort((a, b) => a.sort_order - b.sort_order),
  }));
}

/**
 * Attaches groups from other products to `productId`.
 *
 * Two modes, mirroring how Toast splits this:
 *   'copy' — independent clones; editing them later touches nothing else.
 *   'link' — the new rows point at the source as their shared origin, so
 *            later edits fan out across every linked dish.
 *
 * Either way the target product gets its own real rows, so /api/orders and
 * /api/product-modifiers — which filter by product_id — keep working untouched.
 */
export async function attachModifierGroups(
  productId: string,
  sourceGroupIds: string[],
  mode: "copy" | "link",
) {
  const {
    supabase,
    restaurantId,
    restaurantSlug,
    error: authErr,
  } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  if (sourceGroupIds.length === 0) return { error: "Nada para copiar" };

  const { data: product } = await supabase
    .from("products")
    .select("id")
    .eq("id", productId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();
  if (!product) return { error: "No encontrado" };

  // Ownership of the sources is enforced inside readGroupContents via the
  // products!inner(restaurant_id) filter: ids from another restaurant simply
  // come back empty rather than being copied.
  const contents = await readGroupContents(
    supabase,
    restaurantId,
    sourceGroupIds,
  );
  if (contents.length === 0) return { error: "No encontrado" };

  const { count } = await supabase
    .from("modifier_groups")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId);
  let nextSort = count ?? 0;

  let created = 0;
  for (let i = 0; i < contents.length; i++) {
    const content = contents[i];
    const sourceId = sourceGroupIds[i];

    const { data: group, error } = await supabase
      .from("modifier_groups")
      .insert({
        product_id: productId,
        name: content.name,
        selection_type: content.selection_type,
        min_select: content.min_select,
        max_select: content.max_select,
        is_required: content.is_required,
        display_type: content.display_type,
        translations: content.translations,
        sort_order: nextSort++,
        // A copy stands alone; a link mirrors the source from then on.
        shared_origin_id: mode === "link" ? sourceId : null,
      })
      .select("id")
      .single();

    if (error || !group) continue;

    if (content.options.length > 0) {
      await supabase.from("modifier_options").insert(
        content.options.map((o, idx) => ({
          group_id: group.id,
          name: o.name,
          price_delta: o.price_delta,
          is_default: o.is_default,
          cost_price: o.cost_price,
          translations: o.translations,
          available_from: o.available_from,
          available_until: o.available_until,
          // Renumbered densely: sort_order is what pairs an option with its
          // sibling on another dish, so gaps in the source must not travel.
          sort_order: idx,
        })),
      );
    }
    created++;
  }

  if (created === 0) return { error: "No se pudo copiar" };

  revalidatePath("/app/menu/products");
  revalidatePublicMenu(restaurantSlug);
  return { success: true, count: created };
}

/**
 * Detaches a linked group from its shared family, keeping its current content
 * as a standalone group on this product. The other dishes are untouched.
 */
export async function unlinkModifierGroup(id: string) {
  const {
    supabase,
    restaurantId,
    restaurantSlug,
    error: authErr,
  } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const { data: owned } = await supabase
    .from("modifier_groups")
    .select("id, product_id, shared_origin_id, products!inner(restaurant_id)")
    .eq("id", id)
    .eq("products.restaurant_id", restaurantId)
    .maybeSingle();
  if (!owned) return { error: "No encontrado" };

  const row = owned as SharedGroupRow;
  const siblings = await sharedSiblingIds(supabase, row);
  if (siblings.length === 0) return { error: "Este grupo no está enlazado" };

  if (row.shared_origin_id) {
    // A linked copy: just cut its own pointer.
    const { error } = await supabase
      .from("modifier_groups")
      .update({ shared_origin_id: null })
      .eq("id", id);
    if (error) return { error: error.message };
  } else {
    // The ORIGIN is leaving the family. Its siblings point at it, so one of
    // them is promoted and the rest re-pointed; otherwise they would keep
    // mirroring a group that no longer considers itself shared.
    const [heir, ...rest] = siblings;
    const { error } = await supabase
      .from("modifier_groups")
      .update({ shared_origin_id: null })
      .eq("id", heir);
    if (error) return { error: error.message };
    if (rest.length > 0) {
      await supabase
        .from("modifier_groups")
        .update({ shared_origin_id: heir })
        .in("id", rest);
    }
  }

  revalidatePath("/app/menu/products");
  revalidatePublicMenu(restaurantSlug);
  return { success: true };
}

// ---- Tables ----
export async function createTable(data: TableInput) {
  const {
    supabase,
    restaurantId,
    error: authErr,
  } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const [restaurantRes, tablesCountRes] = await Promise.all([
    supabase
      .from("restaurants")
      .select("slug")
      .eq("id", restaurantId)
      .maybeSingle(),
    supabase
      .from("tables")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", restaurantId),
  ]);

  if (!restaurantRes.data?.slug) return { error: "Restaurante no encontrado" };

  const currentCount = tablesCountRes.count ?? 0;
  const { getEffectivePlanLimits } = await import("@/lib/auth/check-plan");
  const { isWithinLimit } = await import("@/lib/plans");
  const effective = await getEffectivePlanLimits(restaurantId);
  if (!isWithinLimit(currentCount + 1, effective.limits.maxTables)) {
    const targetCount = currentCount + 1;
    let suggestedPlan: "starter" | "pro" | "business" = "starter";
    if (targetCount > 15) suggestedPlan = "pro";
    if (targetCount > 50) suggestedPlan = "business";
    return {
      error: `Tu plan permite hasta ${effective.limits.maxTables} mesas. Actualiza tu plan para agregar más.`,
      limitReached: true,
      limitType: "tables" as const,
      suggestedPlan,
    };
  }

  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL || "https://menius.app"
  ).replace(/\/$/, "");
  const tableName = sanitizeText(data.name, 50);
  const qrValue = `${appUrl}/${restaurantRes.data.slug}?table=${encodeURIComponent(tableName)}`;

  const { error } = await supabase.from("tables").insert({
    restaurant_id: restaurantId,
    name: tableName,
    qr_code_value: qrValue,
  });

  if (error) return { error: error.message };
  revalidatePath("/app/tables");
  return { success: true };
}

export async function updateTable(id: string, newName: string) {
  const {
    supabase,
    restaurantId,
    error: authErr,
  } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("slug")
    .eq("id", restaurantId)
    .maybeSingle();

  if (!restaurant?.slug) return { error: "Restaurante no encontrado" };

  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL || "https://menius.app"
  ).replace(/\/$/, "");
  const name = sanitizeText(newName, 50);
  const qrValue = `${appUrl}/${restaurant.slug}?table=${encodeURIComponent(name)}`;

  const { error } = await supabase
    .from("tables")
    .update({ name, qr_code_value: qrValue })
    .eq("id", id)
    .eq("restaurant_id", restaurantId);

  if (error) return { error: error.message };
  revalidatePath("/app/tables");
  return { success: true };
}

const VALID_TABLE_STATUSES = ["available", "occupied", "reserved"] as const;

export async function updateTableMeta(
  id: string,
  data: { status?: string; capacity?: number },
) {
  const {
    supabase,
    restaurantId,
    error: authErr,
  } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const payload: Record<string, unknown> = {};
  if (data.status) {
    if (
      !VALID_TABLE_STATUSES.includes(
        data.status as (typeof VALID_TABLE_STATUSES)[number],
      )
    ) {
      return { error: "Estado de mesa inválido" };
    }
    payload.status = data.status;
  }
  if (data.capacity !== undefined) {
    const cap = Math.round(data.capacity);
    if (cap < 1 || cap > 200) return { error: "Capacidad inválida (1–200)" };
    payload.capacity = cap;
  }

  const { error } = await supabase
    .from("tables")
    .update(payload)
    .eq("id", id)
    .eq("restaurant_id", restaurantId);

  if (error) return { error: error.message };
  revalidatePath("/app/tables");
  return { success: true };
}

export async function deleteTable(id: string) {
  const {
    supabase,
    restaurantId,
    error: authErr,
  } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  const { error } = await supabase
    .from("tables")
    .delete()
    .eq("id", id)
    .eq("restaurant_id", restaurantId);
  if (error) return { error: error.message };
  revalidatePath("/app/tables");
  return { success: true };
}

// ---- Orders ----
/**
 * Revert an order to its previous status (KDS "undo" within its 5s window).
 * The forward state machine has no backward edges, so a plain
 * updateOrderStatus(prev) always failed with "Transición inválida" — the undo
 * button never worked. This validates the INVERSE instead: reverting to
 * `toStatus` is legal only if `toStatus → current` is a valid forward
 * transition (i.e. we're undoing exactly the step that just happened).
 * Deliberately skips customer notifications — undoing a mis-tap should not
 * email anyone.
 */
export async function undoOrderStatus(orderId: string, toStatus: string) {
  const {
    supabase,
    restaurantId,
    error: authErr,
  } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };

  if (!ALL_STATUSES.includes(toStatus as never))
    return { error: "Estado inválido" };

  const { data: order } = await supabase
    .from("orders")
    .select("id, status, driver_tracking_token")
    .eq("id", orderId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (!order) return { error: "Orden no encontrada" };

  const current = order.status as string;
  if (current === toStatus) return {};
  if (!canTransition(toStatus as never, current as never)) {
    return { error: `No se puede deshacer: ${current} → ${toStatus}` };
  }

  const { error } = await supabase
    .from("orders")
    .update({ status: toStatus })
    .eq("id", orderId)
    .eq("restaurant_id", restaurantId);

  if (error) return { error: error.message };

  void broadcastOrderUpdate(orderId, toStatus);

  // El pedido vuelve a estar abierto: la caché del token se invalida para que
  // el GPS del repartidor se acepte otra vez.
  const undoToken = (order as { driver_tracking_token?: string | null }).driver_tracking_token;
  if (undoToken) {
    const { evictTokenCache } = await import("@/lib/tracking/token-cache");
    evictTokenCache(undoToken.slice(0, 16)).catch(() => {});
  }

  const { error: histErr } = await historyDb().from("order_status_history").insert({
    order_id: orderId,
    from_status: current,
    to_status: toStatus,
    note: "undo",
  });
  if (histErr) logger.warn("history insert failed (undo)", { orderId, error: histErr.message });

  return {};
}

export async function updateOrderStatus(
  orderId: string,
  status: string,
  cancellationReason?: string,
  /** Aceptar: el tiempo de preparación va en la MISMA escritura que 'preparing'
   *  (antes eran dos server actions en serie y la tarjeta rebotaba a Nuevos). */
  opts?: {
    etaMinutes?: number;
    /** Cancelado por culpa del cliente: no lo recibió / no vino, o no pagó.
     *  Marca al cliente (customers.incident_count) para su próximo pedido. */
    incident?: OrderIncident;
  },
) {
  const {
    supabase,
    restaurantId,
    error: authErr,
  } = await getAuthenticatedRestaurant({ allowDevice: true });
  if (authErr) return { error: authErr };

  if (!ALL_STATUSES.includes(status as never))
    return { error: "Estado inválido" };
  const incident = opts?.incident;
  if (incident && (status !== "cancelled" || !ORDER_INCIDENTS.includes(incident)))
    return { error: "Incidente inválido" };

  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, status, payment_status, order_number, restaurant_id, customer_id, customer_name, customer_email, customer_phone, order_type, delivery_address, estimated_ready_minutes, driver_tracking_token, restaurants ( slug, name )",
    )
    .eq("id", orderId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (!order) return { error: "Orden no encontrada" };
  // Solo un pedido para llevar o delivery puede quedar sin recibir o sin pagar
  // por el cliente; en el salón la mesa está ahí.
  if (
    incident &&
    (!["delivery", "pickup"].includes(order.order_type as string) ||
      !["ready", "out_for_delivery"].includes(order.status as string))
  )
    return { error: "Incidente inválido" };

  // Enforce valid state transitions via the shared state machine
  const currentStatus = order.status as string;
  if (!canTransition(currentStatus, status)) {
    return { error: `Transición inválida: ${currentStatus} → ${status}` };
  }

  // A paid order must be refunded, not silently cancelled — otherwise the
  // customer's money stays captured with no signal to anyone. The refund
  // endpoint (/api/payments/refund) refunds AND cancels atomically.
  if (status === "cancelled" && (order as any).payment_status === "paid") {
    return {
      error: "PAID_ORDER_NEEDS_REFUND",
    };
  }

  // updated_at = hora del último cambio de estado. En prod no hay trigger que
  // la mantenga: sin esto quedaba igual a created_at para siempre y el Counter
  // ("esperando N min" en Listos) contaba desde la creación del pedido.
  const updatePayload: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (status === "cancelled" && incident) {
    // Sin texto de motivo: cancellation_reason le llega al cliente en el aviso
    // de cancelación, y "no pagó" no es algo para mandarle por email.
    updatePayload.incident = incident;
    if (order.order_type === "delivery" && incident === "not_received") {
      updatePayload.delivery_failed_at = new Date().toISOString();
      updatePayload.delivery_failure_reason = incident;
    }
  } else if (status === "cancelled" && cancellationReason) {
    updatePayload.cancellation_reason = cancellationReason;
  }
  // Record when the order entered 'preparing' so cron/auto-complete-pickup
  // measures elapsed time independently of other row updates (ETA edits, etc.)
  if (status === "preparing") {
    updatePayload.prepared_at = new Date().toISOString();
  }
  const etaMinutes = opts?.etaMinutes != null && Number.isFinite(opts.etaMinutes)
    ? Math.max(1, Math.min(240, Math.round(opts.etaMinutes)))
    : null;
  if (etaMinutes != null) updatePayload.estimated_ready_minutes = etaMinutes;
  // Pedido cerrado con repartidor: se invalida la caché del token (abajo) para
  // que /api/driver/location vuelva a leer el pedido y rechace el GPS de un
  // pedido cerrado. El enlace NO se vence: el repartidor tiene que poder
  // recargar su página, ver "entregado"/"cancelado" y subir la foto, y un
  // "deshacer" del KDS tiene que dejarlo funcionando.
  const driverToken = (order as { driver_tracking_token?: string | null }).driver_tracking_token ?? null;
  const isFinal = ["delivered", "completed", "cancelled"].includes(status);

  const { error } = await supabase
    .from("orders")
    .update(updatePayload)
    .eq("id", orderId)
    .eq("restaurant_id", restaurantId);

  if (error) return { error: error.message };

  // El cliente queda marcado desde el primer incidente (decisión de Pedro).
  const customerId = (order as { customer_id?: string | null }).customer_id ?? null;
  if (incident && customerId) {
    const { data: cust } = await supabase
      .from("customers")
      .select("incident_count")
      .eq("id", customerId)
      .eq("restaurant_id", restaurantId)
      .maybeSingle();
    if (cust) {
      const { error: custErr } = await supabase
        .from("customers")
        .update({
          incident_count: (cust.incident_count ?? 0) + 1,
          last_incident: incident,
          last_incident_at: new Date().toISOString(),
        })
        .eq("id", customerId)
        .eq("restaurant_id", restaurantId);
      if (custErr) logger.warn("customer incident update failed", { orderId, error: custErr.message });
    }
  }

  if (isFinal && driverToken) {
    const { evictTokenCache } = await import("@/lib/tracking/token-cache");
    evictTokenCache(driverToken.slice(0, 16)).catch(() => {});
  }

  // Broadcast to customer tracking page.
  // Static import ensures the module is ready — fire-and-forget so status
  // changes feel instant in the Counter without waiting for the HTTP call.
  // The 5-second polling in OrderTracker is the safety net if this fails.
  void broadcastOrderUpdate(orderId, status);

  // Log the transition to order_status_history — después de responder, pero
  // con waitUntil: un `void` suelto se cortaba al terminar la server action.
  afterResponse(async () => {
    try {
      const { error: histErr } = await historyDb()
        .from("order_status_history")
        .insert({
          order_id: orderId,
          from_status: currentStatus,
          to_status: status,
          note: cancellationReason ?? null,
        });
      if (histErr) logger.warn("history insert failed", { orderId, error: histErr.message });
    } catch {
      /* best-effort */
    }
  });

  // Send transactional notification to customer via email.
  // notifyStatusChange internally fires the push notification — no duplicate call needed here.
  let notificationResult: {
    channel: string;
    success: boolean;
    error?: string;
  } = { channel: "none", success: false };
  if (
    ["confirmed", "preparing", "ready", "out_for_delivery", "cancelled", "delivered"].includes(
      status,
    )
  ) {
    // El aviso al cliente sale DESPUÉS de responder: el botón del Counter ya no
    // espera a Resend (~150–500 ms por toque). Los fallos quedan en el log y
    // Sentry (sendEmail); el Counter ya no recibe "falló" en vivo.
    const o = order as any;
    afterResponse(async () => {
      const { notifyStatusChange } =
        await import("@/lib/notifications/order-notifications");
      const result = await notifyStatusChange({
        orderId,
        orderNumber: o.order_number,
        restaurantId: o.restaurant_id,
        status,
        customerName: o.customer_name,
        customerEmail: o.customer_email || undefined,
        customerPhone: o.customer_phone || undefined,
        orderType: o.order_type || undefined,
        deliveryAddress: o.delivery_address || undefined,
        estimatedMinutes: etaMinutes ?? o.estimated_ready_minutes ?? undefined,
      });
      if (result && !result.success && result.channel !== "none") {
        logger.warn("status notification failed", { orderId, status, channel: result.channel, error: result.error });
      }
    });
    notificationResult = { channel: "queued", success: true };
  }

  // Auto-earn loyalty points when order is delivered/completed
  if (["delivered", "completed"].includes(status)) {
    afterResponse(async () => {
      try {
        const { data: fullOrder } = await supabase
          .from("orders")
          .select("total, customer_name, customer_phone, customer_email")
          .eq("id", orderId)
          .maybeSingle();
        if (fullOrder) {
          const { earnLoyaltyPoints } = await import("@/lib/loyalty/earn");
          await earnLoyaltyPoints({
            restaurantId,
            customerName: fullOrder.customer_name,
            customerPhone: fullOrder.customer_phone,
            customerEmail: fullOrder.customer_email,
            orderTotal: Number(fullOrder.total),
            orderId,
          });
        }
      } catch {
        /* non-critical */
      }
    });
  }

  // Sin revalidatePath: en una server action hace que la respuesta traiga el
  // árbol RSC entero de la página actual (el Counter: hasta 200 pedidos con
  // joins) y lo descarta. Counter, KDS y panel se actualizan por realtime.
  return { success: true, notification: notificationResult };
}

export async function sendOrderNotification(
  orderId: string,
  eventType: string,
) {
  const {
    supabase,
    restaurantId,
    error: authErr,
  } = await getAuthenticatedRestaurant({ allowDevice: true });
  if (authErr) return { error: authErr };

  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, order_number, customer_name, customer_email, customer_phone, restaurant_id, order_type, delivery_address, estimated_ready_minutes",
    )
    .eq("id", orderId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (!order) return { error: "Orden no encontrada" };

  try {
    const { notifyStatusChange } =
      await import("@/lib/notifications/order-notifications");
    const notification = await notifyStatusChange({
      allowRepeat: true,
      orderId: order.id,
      orderNumber: order.order_number,
      restaurantId: order.restaurant_id,
      status: eventType,
      customerName: order.customer_name,
      customerEmail: order.customer_email || undefined,
      customerPhone: order.customer_phone || undefined,
      orderType: (order as any).order_type || undefined,
      deliveryAddress: (order as any).delivery_address || undefined,
      estimatedMinutes: (order as any).estimated_ready_minutes ?? undefined,
    });
    return { success: true, notification };
  } catch {
    return { error: "Error al enviar notificación" };
  }
}

export async function updateOrderETA(orderId: string, etaMinutes: number) {
  const {
    supabase,
    restaurantId,
    error: authErr,
  } = await getAuthenticatedRestaurant({ allowDevice: true });
  if (authErr) return { error: authErr };

  const { data: before } = await supabase
    .from("orders")
    .select("id, status, estimated_ready_minutes, prepared_at, created_at, order_number, restaurant_id, customer_name, customer_email, customer_phone, order_type, delivery_address")
    .eq("id", orderId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();
  if (!before) return { error: "Orden no encontrada" };

  const { error } = await supabase
    .from("orders")
    .update({ estimated_ready_minutes: etaMinutes })
    .eq("id", orderId)
    .eq("restaurant_id", restaurantId);

  if (error) return { error: error.message };

  // El seguimiento del cliente se entera al instante (antes esperaba al sondeo).
  void broadcastOrderUpdate(orderId, before.status as string);

  // Si el pedido se demora 5 min o más, el cliente recibe el email "Nueva hora"
  // con la hora del reloj recalculada. Recortes no se avisan.
  const prev = Number(before.estimated_ready_minutes ?? 0);
  if (["confirmed", "preparing"].includes(before.status as string) && etaMinutes - prev >= 5) {
    const o = before as any;
    // El email dice "listo en ~N min" desde AHORA: lo que falta, no el total.
    // Se cuenta desde el mismo punto que el Counter (aceptación, o llegada si
    // no hay hora de aceptación).
    const startIso = o.prepared_at ?? o.created_at;
    const elapsed = startIso ? Math.max(0, Math.round((Date.now() - Date.parse(startIso)) / 60_000)) : 0;
    const remaining = Math.max(1, etaMinutes - elapsed);
    afterResponse(async () => {
      // Varios +5 seguidos = un solo email (el seguimiento en vivo ya muestra
      // el tiempo nuevo al instante).
      const { checkRateLimitAsync } = await import("@/lib/rate-limit");
      const rl = await checkRateLimitAsync(`eta-mail:${orderId}`, { limit: 1, windowSec: 180 });
      if (!rl.allowed) return;
      const { notifyStatusChange } = await import("@/lib/notifications/order-notifications");
      await notifyStatusChange({
        allowRepeat: true,
        // Sin hora previa no es "nueva hora": es la primera.
        etaUpdate: prev > 0,
        orderId,
        orderNumber: o.order_number,
        restaurantId: o.restaurant_id,
        status: "preparing",
        customerName: o.customer_name,
        customerEmail: o.customer_email || undefined,
        customerPhone: o.customer_phone || undefined,
        orderType: o.order_type || undefined,
        deliveryAddress: o.delivery_address || undefined,
        estimatedMinutes: remaining,
      });
    });
  }
  return { success: true };
}

export async function fetchOrderStatusHistory(orderId: string) {
  const {
    supabase,
    restaurantId,
    error: authErr,
  } = await getAuthenticatedRestaurant({ allowDevice: true });
  if (authErr) return { error: authErr };

  // Verify the order belongs to this restaurant before returning history
  const { data: order } = await supabase
    .from("orders")
    .select("id")
    .eq("id", orderId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();
  if (!order) return { error: "Not found" };

  const { data, error } = await historyDb()
    .from("order_status_history")
    .select("id, from_status, to_status, note, created_at")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  if (error) return { error: error.message };
  return { history: data ?? [] };
}

export async function updateOrderTip(orderId: string, tipAmount: number) {
  const {
    supabase,
    restaurantId,
    error: authErr,
  } = await getAuthenticatedRestaurant({ allowDevice: true });
  if (authErr) return { error: authErr };

  const tip = Math.max(0, Number(tipAmount) || 0);

  // Fetch current order to get existing total
  const { data: order } = await supabase
    .from("orders")
    .select("id, total, tip_amount")
    .eq("id", orderId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (!order) return { error: "Orden no encontrada" };

  const previousTip = Number(order.tip_amount) || 0;
  const baseTotal = Number(order.total) - previousTip;
  const newTotal = baseTotal + tip;

  const { error } = await supabase
    .from("orders")
    .update({ tip_amount: tip, total: newTotal })
    .eq("id", orderId)
    .eq("restaurant_id", restaurantId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function setPauseOrders(pausedUntil: string | null) {
  const {
    supabase,
    restaurantId,
    error: authErr,
  } = await getAuthenticatedRestaurant({ allowDevice: true });
  if (authErr) return { error: authErr };

  const { error } = await supabase
    .from("restaurants")
    .update({ orders_paused_until: pausedUntil })
    .eq("id", restaurantId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function assignDriver(
  orderId: string,
  driverName: string,
  driverPhone: string,
  // string = link to pool driver · null = unlink · undefined = leave untouched
  driverId?: string | null,
) {
  const {
    supabase,
    restaurantId,
    error: authErr,
  } = await getAuthenticatedRestaurant({ allowDevice: true });
  if (authErr) return { error: authErr };

  // Read current status so we can broadcast the right value after update
  const { data: current } = await supabase
    .from("orders")
    .select("status, driver_name, driver_tracking_token, driver_token_expires_at")
    .eq("id", orderId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  // Token del repartidor: ver chooseDriverToken (conserva el QR del ticket).
  const cur = current as CurrentDriverToken & { status?: string } | null;
  const { token, expiresAt: tokenExpiresAt, reused } = chooseDriverToken(driverName, cur, () => crypto.randomUUID());
  const oldToken = cur?.driver_tracking_token ?? null;

  const updatePayload: Record<string, unknown> = {
    driver_name: driverName.trim() || null,
    driver_phone: driverPhone.trim() || null,
    driver_assigned_at: driverName.trim() ? new Date().toISOString() : null,
    driver_tracking_token: token,
    driver_token_expires_at: tokenExpiresAt,
    updated_at: new Date().toISOString(),
    // Reset de GPS y progreso SOLO si cambió el repartidor (token nuevo). Si es
    // el mismo enlace —el repartidor que ya escaneó el QR y al que el cajero
    // recién le pone nombre— se conserva lo que ya marcó: antes se borraba y el
    // pedido retrocedía de "en camino" a "listo" (y "Salió" mandaba otro aviso).
    ...(reused ? {} : {
      driver_lat: null,
      driver_lng: null,
      driver_updated_at: null,
      driver_picked_up_at: null,
      driver_at_door_at: null,
      driver_delivered_at: null,
      // Repartidor nuevo = el pedido sale de la ruta del anterior.
      batch_id: null,
      batch_seq: null,
      // El status retrocede junto con los timestamps (si no, fila imposible:
      // out_for_delivery sin driver_picked_up_at para el repartidor nuevo).
      ...(current?.status === "out_for_delivery" ? { status: "ready" } : {}),
    }),
  };

  // Vincular driver_id si se proporciona (usado desde la app nativa)
  if (driverId !== undefined) {
    if (driverId) {
      // Validate driver belongs to this restaurant before writing
      const { data: driver } = await supabase
        .from("drivers")
        .select("id")
        .eq("id", driverId)
        .eq("restaurant_id", restaurantId)
        .maybeSingle();
      if (!driver) return { error: "Driver not found in this restaurant" };
    }
    updatePayload.driver_id = driverId || null;
  }

  const { error } = await supabase
    .from("orders")
    .update(updatePayload)
    .eq("id", orderId)
    .eq("restaurant_id", restaurantId);

  if (error) return { error: error.message };

  // La caché de tokens (Redis, 2 h) guarda el vencimiento: se invalida si el
  // token cambió (revocar al repartidor anterior) o si se extendió.
  if (oldToken) {
    const { evictTokenCache } = await import("@/lib/tracking/token-cache");
    evictTokenCache(oldToken.slice(0, 16)).catch(() => {});
  }

  // Notify customer tracker so it can refetch and show driver name/phone
  if (current?.status) {
    void broadcastOrderUpdate(orderId, current.status);
  }

  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL ?? "https://menius.app"
  ).replace(/\/$/, "");
  // Base URL without lang param — overridden with ?lang=en once locale is known
  const baseTrackingUrl = token ? `${appUrl}/driver/track/${token}` : null;

  return {
    success: true,
    trackingToken: token,
    trackingUrl: baseTrackingUrl,
  };
}

export async function updatePaymentBreakdown(
  orderId: string,
  breakdown: {
    cash?: number;
    card?: number;
    [key: string]: number | undefined;
  },
) {
  const {
    supabase,
    restaurantId,
    error: authErr,
  } = await getAuthenticatedRestaurant({ allowDevice: true });
  if (authErr) return { error: authErr };

  const { error } = await supabase
    .from("orders")
    .update({ payment_breakdown: breakdown })
    .eq("id", orderId)
    .eq("restaurant_id", restaurantId);

  if (error) return { error: error.message };
  return { success: true };
}

// ── Multi-store switcher ────────────────────────────────────────────────

export async function switchRestaurant(restaurantId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };
  if (await isDeviceSession(supabase)) return { error: "No disponible en la tablet" };

  // Verify the user owns this restaurant
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, name")
    .eq("id", restaurantId)
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (!restaurant) return { error: "Restaurante no encontrado" };

  const { error } = await supabase
    .from("profiles")
    .update({ default_restaurant_id: restaurantId })
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/app", "layout");
  return { success: true };
}

// ── Shifts (Cierre de Caja) ─────────────────────────────────────────────

export async function openShift(openingCash: number) {
  const {
    supabase,
    restaurantId,
    error: authErr,
  } = await getAuthenticatedRestaurant({ allowDevice: true });
  if (authErr) return { error: authErr };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Si ya hay un turno abierto (otro dispositivo, u otra pestaña), se usa ese.
  // Antes se cerraba en silencio —sin conteo ni reporte Z— y el primer
  // dispositivo seguía mostrando "turno abierto" sobre un turno ya cerrado.
  const { data: open, error: openErr } = await supabase
    .from("shifts")
    .select("id, opening_cash, opened_at")
    .eq("restaurant_id", restaurantId)
    .is("closed_at", null)
    .order("opened_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (openErr) return { error: openErr.message };
  if (open) return { success: true, shift: open, existing: true };

  const { data, error } = await supabase
    .from("shifts")
    .insert({
      restaurant_id: restaurantId,
      opened_by: user?.id,
      opening_cash: openingCash,
    })
    .select("id, opening_cash, opened_at")
    .single();

  if (error) return { error: error.message };
  return { success: true, shift: data };
}

export async function closeShift(closingCash: number, notes?: string) {
  const {
    supabase,
    restaurantId,
    error: authErr,
  } = await getAuthenticatedRestaurant({ allowDevice: true });
  if (authErr) return { error: authErr };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Find open shift
  const { data: shift, error: shiftErr } = await supabase
    .from("shifts")
    .select("id, opening_cash, opened_at")
    .eq("restaurant_id", restaurantId)
    .is("closed_at", null)
    .order("opened_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (shiftErr) return { error: shiftErr.message };
  // Ya lo cerró otro dispositivo: el Counter limpia su estado local.
  if (!shift) return { error: "No open shift found", noOpenShift: true as const };

  // Aggregate orders since shift opened
  const { data: orders } = await supabase
    .from("orders")
    .select("total, payment_method, payment_breakdown, order_type, driver_name")
    .eq("restaurant_id", restaurantId)
    // Misma definición de venta que home/analytics: antes solo 'delivered'
    // → pickup ('completed') y mesa ('served') no entraban a la caja.
    .in("status", REVENUE_STATUSES)
    .gte("created_at", shift.opened_at);

  const totalRevenue = (orders ?? []).reduce(
    (sum: number, o: any) => sum + Number(o.total ?? 0),
    0,
  );
  // Si la orden tiene desglose (pago mixto), manda el desglose para AMBOS
  // lados. Antes cada lado caía por separado a payment_method: un pago
  // "card" con desglose {cash: 10} sumaba 10 en efectivo Y el total en tarjeta.
  const split = (o: { total: unknown; payment_method: string | null; payment_breakdown: unknown }) => {
    const bd = o.payment_breakdown as { cash?: unknown; card?: unknown } | null;
    if (bd && (bd.cash != null || bd.card != null)) {
      return { cash: Number(bd.cash ?? 0) || 0, card: Number(bd.card ?? 0) || 0 };
    }
    const total = Number(o.total ?? 0) || 0;
    if (o.payment_method === "cash") return { cash: total, card: 0 };
    // wallet = Apple/Google Pay: es cobro con tarjeta. Sin esto quedaba fuera de
    // efectivo y de tarjeta y la suma no daba el total de ventas.
    if (o.payment_method === "online" || o.payment_method === "card" || o.payment_method === "wallet") return { cash: 0, card: total };
    return { cash: 0, card: 0 };
  };
  const totalCash = (orders ?? []).reduce((sum: number, o: any) => sum + split(o).cash, 0);
  const totalCard = (orders ?? []).reduce((sum: number, o: any) => sum + split(o).card, 0);

  // Efectivo de delivery por repartidor: cuánto le tiene que entregar cada uno a
  // la caja. Sin nombre (asignado sin "¿Quién eres?") va en "Sin repartidor" (null).
  const byDriver = new Map<string | null, { orders: number; cash: number }>();
  for (const o of (orders ?? []) as { order_type: string | null; driver_name: string | null; total: unknown; payment_method: string | null; payment_breakdown: unknown }[]) {
    if (o.order_type !== "delivery") continue;
    const cash = split(o).cash;
    if (cash <= 0) continue;
    const name = o.driver_name?.trim() || null;
    const row = byDriver.get(name) ?? { orders: 0, cash: 0 };
    row.orders += 1;
    row.cash += cash;
    byDriver.set(name, row);
  }
  const cashByDriver = Array.from(byDriver, ([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.cash - a.cash);

  const expectedCash = Number(shift.opening_cash) + totalCash;
  const cashDifference = closingCash - expectedCash;

  const { data: closed, error: closeErr } = await supabase
    .from("shifts")
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
    .eq("id", shift.id)
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
      cashByDriver,
    },
  };
}

/** Turno abierto de la tienda: la DB es la fuente de verdad (no el localStorage de cada tablet). */
export async function getActiveShift() {
  const {
    supabase,
    restaurantId,
    error: authErr,
  } = await getAuthenticatedRestaurant({ allowDevice: true });
  if (authErr) return { error: authErr };

  const { data, error } = await supabase
    .from("shifts")
    .select("id, opening_cash, opened_at")
    .eq("restaurant_id", restaurantId)
    .is("closed_at", null)
    .order("opened_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { error: error.message };
  return { shift: data ?? null };
}

/**
 * "Resumen de hoy" del Counter con la MISMA regla que el dashboard: desde la
 * medianoche en la zona del restaurante, sin pagos online sin cobrar, y venta
 * = REVENUE_STATUSES. El Counter lo calculaba con lo que tenía cargado (las
 * últimas 6 h, en la hora del dispositivo): de noche no coincidía.
 */
export async function getTodaySummary() {
  const {
    supabase,
    restaurantId,
    error: authErr,
  } = await getAuthenticatedRestaurant({ allowDevice: true });
  if (authErr) return { error: authErr };

  const { data: rest } = await supabase
    .from("restaurants")
    .select("timezone")
    .eq("id", restaurantId)
    .maybeSingle();
  const tz = (rest?.timezone as string | null) ?? "America/Mexico_City";

  const { data, error } = await supabase
    .from("orders")
    .select("total, status")
    .eq("restaurant_id", restaurantId)
    .or("status.neq.pending,payment_method.is.null,payment_method.not.in.(online,wallet),payment_status.eq.paid")
    .gte("created_at", getStartOfDayUTC(tz).toISOString());
  if (error) return { error: error.message };

  const rows = data ?? [];
  const sales = rows
    .filter((o) => isRevenueStatus(o.status as string))
    .reduce((sum, o) => sum + Number(o.total ?? 0), 0);
  return { orders: rows.length, sales };
}

/**
 * Clientes marcados del restaurante (customer-incidents): el Counter los cruza
 * con orders.customer_id para mostrar la alerta en el pedido.
 */
export async function getFlaggedCustomers(): Promise<
  { customers: ({ id: string } & CustomerFlag)[] } | { error: string }
> {
  const { supabase, restaurantId, error: authErr } = await getAuthenticatedRestaurant({
    allowDevice: true,
  });
  if (authErr) return { error: authErr };
  const { data, error } = await supabase
    .from("customers")
    .select("id, incident_count, last_incident, last_incident_at")
    .eq("restaurant_id", restaurantId)
    .gt("incident_count", 0)
    .limit(500);
  if (error) return { error: error.message };
  return { customers: (data ?? []) as ({ id: string } & CustomerFlag)[] };
}

/** "Fue un malentendido": desmarca al cliente. El historial queda en orders.incident. */
export async function clearCustomerIncidents(customerId: string) {
  if (typeof customerId !== "string" || !/^[0-9a-f-]{36}$/i.test(customerId))
    return { error: "Cliente inválido" };
  const { supabase, restaurantId, error: authErr } = await getAuthenticatedRestaurant();
  if (authErr) return { error: authErr };
  const { error } = await supabase
    .from("customers")
    .update({ incident_count: 0, last_incident: null, last_incident_at: null })
    .eq("id", customerId)
    .eq("restaurant_id", restaurantId);
  if (error) return { error: error.message };
  revalidatePath("/app/customers");
  return { ok: true };
}
