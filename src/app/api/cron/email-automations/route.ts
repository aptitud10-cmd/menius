export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/notifications/email";
import { buildReviewEmail } from "@/lib/notifications/customer-email";
import { loadCustomerEmailOrder, sendCustomerEmail } from "@/lib/notifications/customer-email-data";
import { createLogger } from "@/lib/logger";

const logger = createLogger("email-automations");

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const results = {
    welcome: 0,
    reactivation: 0,
    review_request: 0,
    platform_trial: 0,
    platform_setup: 0,
    platform_inactive: 0,
    onboarding_d1: 0,
    onboarding_d3: 0,
    onboarding_d7: 0,
    monthly_report: 0,
    errors: 0,
    query_errors: 0,
  };

  // Every section below reads a list and mails it. A failed read looks exactly
  // like an empty list, so the cron used to report ok:true after doing nothing.
  // Not sending is the safe failure here — but it must be visible.
  function noteQueryError(section: string, error: { message: string } | null) {
    if (!error) return;
    results.query_errors++;
    logger.error("Automations query failed", { section, error: error.message });
  }

  // Restaurant cache to avoid N+1 queries across all sections
  const restaurantCache = new Map<
    string,
    { name: string; slug: string; locale: string; notification_email?: string }
  >();
  async function getRestaurant(id: string) {
    if (restaurantCache.has(id)) return restaurantCache.get(id)!;
    const { data } = await supabase
      .from("restaurants")
      .select("name, slug, locale, notification_email")
      .eq("id", id)
      .maybeSingle();
    if (data) restaurantCache.set(id, data);
    return data;
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://menius.app";

    // 1–2. Bienvenida y "te extrañamos" automáticos: APAGADOS (2026-11-10).
    // Son publicidad y el cliente nunca aceptó recibirla (CAN-SPAM). Vuelven
    // cuando el checkout tenga una casilla de consentimiento de marketing.

    // 3. Pedido de reseña: pedidos cerrados hace 2–26 h (el cron corre una vez
    // al día, así cada pedido entra una sola vez), en el idioma del cliente y
    // como mucho UNO por cliente cada 7 días (antes llegaban 3 iguales juntos).
    const nowMs = Date.now();
    const { data: closedOrders, error: closedError } = await supabase
      .from("orders")
      .select("id, customer_email, customer_id")
      .in("status", ["delivered", "completed"])
      .not("customer_email", "is", null)
      .neq("customer_email", "")
      .gte("updated_at", new Date(nowMs - 26 * 3600_000).toISOString())
      .lt("updated_at", new Date(nowMs - 2 * 3600_000).toISOString())
      // Cerrados solos por el cron: no sabemos si el cliente lo recibió.
      .or("cancellation_reason.is.null,cancellation_reason.neq.auto_closed")
      .order("updated_at", { ascending: false })
      .limit(40);
    noteQueryError("review_request", closedError);

    const closed = (closedOrders ?? []) as { id: string; customer_email: string; customer_id: string | null }[];
    if (closed.length > 0) {
      const ids = closed.map((o) => o.id);
      const customerIds = closed.map((o) => o.customer_id).filter((x): x is string => !!x);
      const sevenDaysAgo = new Date(nowMs - 7 * 24 * 3600_000).toISOString();
      const [{ data: reviewed }, { data: alreadyAsked }, { data: recentAsks }, { data: customerRows }] = await Promise.all([
        supabase.from("reviews").select("order_id").in("order_id", ids),
        supabase.from("order_notification_log").select("order_id").eq("event", "review_request_email").in("order_id", ids),
        supabase.from("order_notification_log").select("order_id").eq("event", "review_request_email").gte("created_at", sevenDaysAgo).limit(1000),
        customerIds.length
          ? supabase.from("customers").select("id, tags").in("id", customerIds)
          : Promise.resolve({ data: [] as { id: string; tags: string[] | null }[] }),
      ]);
      const skipOrder = new Set<string>([
        ...((reviewed ?? []).map((r) => r.order_id).filter(Boolean) as string[]),
        ...((alreadyAsked ?? []).map((r) => r.order_id).filter(Boolean) as string[]),
      ]);
      const unsubscribed = new Set(
        ((customerRows ?? []) as { id: string; tags: string[] | null }[])
          .filter((c) => (c.tags ?? []).includes("unsubscribed"))
          .map((c) => c.id),
      );
      // Emails a los que ya se pidió reseña esta semana (de cualquier pedido).
      const askedEmails = new Set<string>();
      const recentOrderIds = (recentAsks ?? []).map((r) => r.order_id).filter(Boolean) as string[];
      if (recentOrderIds.length) {
        const { data: recentOrders } = await supabase.from("orders").select("customer_email").in("id", recentOrderIds.slice(0, 1000));
        (recentOrders ?? []).forEach((o) => o.customer_email && askedEmails.add(String(o.customer_email).toLowerCase()));
      }

      for (const order of closed) {
        const email = order.customer_email.toLowerCase();
        if (skipOrder.has(order.id) || askedEmails.has(email)) continue;
        if (order.customer_id && unsubscribed.has(order.customer_id)) continue;
        try {
          const full = await loadCustomerEmailOrder(order.id);
          if (!full?.customerEmail || !full.notificationsOn) continue;
          const reviewUrl = `${full.ctx.menuUrl}/review/${order.id}`;
          const unsubscribeUrl = full.customerId ? `${appUrl}/api/unsubscribe?id=${full.customerId}` : null;
          const sent = await sendCustomerEmail(full, buildReviewEmail(full.ctx, { reviewUrl, unsubscribeUrl }));
          if (sent) {
            askedEmails.add(email);
            results.review_request++;
            await supabase.from("order_notification_log").insert({
              order_id: order.id,
              restaurant_id: full.restaurantId,
              event: "review_request_email",
              channel: "email",
              success: true,
            });
          } else {
            logger.warn("Review request email failed to send", { order_id: order.id });
          }
        } catch (err) {
          results.errors++;
          logger.error("Review request failed", { order_id: order.id, error: err instanceof Error ? err.message : String(err) });
        }
      }
    }

    // ═══════════════════════════════════════════════════════════
    // PLATFORM → RESTAURANT OWNER automations (MENIUS marketing)
    // ═══════════════════════════════════════════════════════════

    // 4. Trial expiring — handled by dedicated cron at /api/cron/trial-ending-reminders
    // (removed to avoid duplicate emails to the same restaurant on the same day)

    // 5. Setup incomplete: restaurants created 2+ days ago with no products
    const twoDaysAgoSetup = new Date(
      Date.now() - 2 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const sevenDaysAgoSetup = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const { data: newRestaurants, error: newRestaurantsError } = await supabase
      .from("restaurants")
      .select("id, name, notification_email, slug, locale, tags")
      .lte("created_at", twoDaysAgoSetup)
      .gte("created_at", sevenDaysAgoSetup)
      .not("notification_email", "is", null)
      .limit(50);
    noteQueryError("platform_setup", newRestaurantsError);

    const setupOutcomes = await Promise.allSettled(
      (newRestaurants ?? []).map(async (restaurant) => {
        if (!restaurant.notification_email) return false;
        if ((restaurant.tags ?? []).includes("setup_email_sent")) return false;

        const { count } = await supabase
          .from("products")
          .select("id", { count: "exact", head: true })
          .eq("restaurant_id", restaurant.id);

        if ((count ?? 0) > 0) return false;

        const en = restaurant.locale === "en";
        const setupUrl = `${appUrl}/app/menu/products`;

        const sent = await sendEmail({
          to: restaurant.notification_email,
          subject: en
            ? `🍽️ ${restaurant.name}: your menu is empty — set it up in minutes`
            : `🍽️ ${restaurant.name}: tu menú está vacío — configúralo en minutos`,
          html: buildSetupIncompleteEmail(restaurant.name, setupUrl, en),
        });

        if (sent) {
          try {
            await supabase.rpc("append_restaurant_tag", {
              p_restaurant_id: restaurant.id,
              p_tag: "setup_email_sent",
            });
          } catch {
            /* non-blocking */
          }
          return true;
        }
        return false;
      }),
    );
    results.platform_setup = setupOutcomes.filter(
      (r) => r.status === "fulfilled" && r.value === true,
    ).length;
    results.errors += setupOutcomes.filter(
      (r) => r.status === "rejected",
    ).length;

    // 6. No orders nudge: restaurants with products but 0 orders in last 14 days
    const { data: activeRestaurants, error: activeRestaurantsError } = await supabase
      .from("restaurants")
      .select("id, name, notification_email, slug, locale, tags")
      .eq("is_active", true)
      .not("notification_email", "is", null)
      .limit(100);
    noteQueryError("platform_inactive", activeRestaurantsError);

    if (activeRestaurants && activeRestaurants.length > 0) {
      const restIds = activeRestaurants.map((r) => r.id);
      const fourteenDaysAgo = new Date(
        Date.now() - 14 * 24 * 60 * 60 * 1000,
      ).toISOString();

      const [{ data: productsPerRest }, { data: recentOrders }] =
        await Promise.all([
          supabase
            .from("products")
            .select("restaurant_id")
            .eq("is_active", true)
            .in("restaurant_id", restIds),
          supabase
            .from("orders")
            .select("restaurant_id")
            .in("restaurant_id", restIds)
            .gte("created_at", fourteenDaysAgo),
        ]);

      const hasProducts = new Set(
        (productsPerRest ?? []).map((p) => p.restaurant_id),
      );
      const hasRecentOrders = new Set(
        (recentOrders ?? []).map((o) => o.restaurant_id),
      );

      const inactiveOutcomes = await Promise.allSettled(
        activeRestaurants.map(async (restaurant) => {
          if (!restaurant.notification_email) return false;
          if (!hasProducts.has(restaurant.id)) return false;
          if (hasRecentOrders.has(restaurant.id)) return false;
          if ((restaurant.tags ?? []).includes("no_orders_email_sent"))
            return false;

          const en = restaurant.locale === "en";
          const tipsUrl = `${appUrl}/app`;

          const sent = await sendEmail({
            to: restaurant.notification_email,
            subject: en
              ? `📊 Tips to get your first order at ${restaurant.name}`
              : `📊 Tips para recibir tu primer pedido en ${restaurant.name}`,
            html: buildNoOrdersEmail(
              restaurant.name,
              `${appUrl}/${restaurant.slug}`,
              tipsUrl,
              en,
            ),
          });

          if (sent) {
            try {
              await supabase.rpc("append_restaurant_tag", {
                p_restaurant_id: restaurant.id,
                p_tag: "no_orders_email_sent",
              });
            } catch {
              /* non-blocking */
            }
            return true;
          }
          return false;
        }),
      );
      results.platform_inactive = inactiveOutcomes.filter(
        (r) => r.status === "fulfilled" && r.value === true,
      ).length;
      results.errors += inactiveOutcomes.filter(
        (r) => r.status === "rejected",
      ).length;
    }

    // ═══════════════════════════════════════════════════════════
    // ONBOARDING SEQUENCE (Day 1, 3, 7)
    // ═══════════════════════════════════════════════════════════

    const onboardingDays = [
      {
        days: 1,
        key: "onboarding_d1" as const,
        tag: "onboarding_d1_sent",
        builder: buildOnboardingDay1Email,
      },
      {
        days: 3,
        key: "onboarding_d3" as const,
        tag: "onboarding_d3_sent",
        builder: buildOnboardingDay3Email,
      },
      {
        days: 7,
        key: "onboarding_d7" as const,
        tag: "onboarding_d7_sent",
        builder: buildOnboardingDay7Email,
      },
    ];

    const onboardingStepOutcomes = await Promise.allSettled(
      onboardingDays.map(async (step) => {
        const targetDate = new Date(
          Date.now() - step.days * 24 * 60 * 60 * 1000,
        );
        const dayStart = new Date(
          targetDate.getFullYear(),
          targetDate.getMonth(),
          targetDate.getDate(),
        );
        const dayEnd = new Date(dayStart);
        dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

        const { data: targetRestaurants } = await supabase
          .from("restaurants")
          .select("id, name, slug, notification_email, locale, tags")
          .gte("created_at", dayStart.toISOString())
          .lt("created_at", dayEnd.toISOString())
          .not("notification_email", "is", null)
          .limit(50);

        const perRestOutcomes = await Promise.allSettled(
          (targetRestaurants ?? []).map(async (restaurant) => {
            if (!restaurant.notification_email) return false;
            if ((restaurant.tags ?? []).includes(step.tag)) return false;

            const en = restaurant.locale === "en";
            const dashUrl = `${appUrl}/app`;
            const menuUrl = `${appUrl}/${restaurant.slug}`;

            const sent = await sendEmail({
              to: restaurant.notification_email,
              subject: step.builder(
                "subject",
                restaurant.name,
                undefined,
                undefined,
                en,
              ),
              html: step.builder("html", restaurant.name, dashUrl, menuUrl, en),
            });

            if (sent) {
              try {
                await supabase.rpc("append_restaurant_tag", {
                  p_restaurant_id: restaurant.id,
                  p_tag: step.tag,
                });
              } catch {}
              return true;
            }
            return false;
          }),
        );

        return {
          key: step.key,
          sent: perRestOutcomes.filter(
            (r) => r.status === "fulfilled" && r.value === true,
          ).length,
          errors: perRestOutcomes.filter((r) => r.status === "rejected").length,
        };
      }),
    );
    for (const outcome of onboardingStepOutcomes) {
      if (outcome.status === "fulfilled") {
        results[outcome.value.key] = outcome.value.sent;
        results.errors += outcome.value.errors;
      }
    }

    // ═══════════════════════════════════════════════════════════
    // MONTHLY REPORT (1st of month)
    // ═══════════════════════════════════════════════════════════

    const today = new Date();
    if (today.getDate() === 1) {
      // Build idempotency tag for this specific month (e.g. "monthly_report_2026_03")
      // getMonth() is 0-indexed so add 1 to get the correct month number
      const reportMonthTag = `monthly_report_${today.getFullYear()}_${String(today.getMonth() + 1).padStart(2, "0")}`;

      const monthStart = new Date(
        today.getFullYear(),
        today.getMonth() - 1,
        1,
      ).toISOString();
      const monthEnd = new Date(
        today.getFullYear(),
        today.getMonth(),
        1,
      ).toISOString();

      const { data: activeRests, error: activeRestsError } = await supabase
        .from("restaurants")
        .select("id, name, notification_email, slug, locale, tags")
        .eq("is_active", true)
        .not("notification_email", "is", null)
        .limit(200);
      noteQueryError("monthly_report", activeRestsError);

      if (activeRests && activeRests.length > 0) {
        const restIds = activeRests.map((r) => r.id);

        const [{ data: monthOrders }, { data: monthCustomers }] =
          await Promise.all([
            supabase
              .from("orders")
              .select("restaurant_id, total")
              .in("restaurant_id", restIds)
              .gte("created_at", monthStart)
              .lt("created_at", monthEnd),
            supabase
              .from("customers")
              .select("restaurant_id")
              .in("restaurant_id", restIds)
              .gte("created_at", monthStart)
              .lt("created_at", monthEnd),
          ]);

        const ordersByRest = new Map<
          string,
          { count: number; revenue: number }
        >();
        for (const o of monthOrders ?? []) {
          const entry = ordersByRest.get(o.restaurant_id) ?? {
            count: 0,
            revenue: 0,
          };
          entry.count++;
          entry.revenue += Number(o.total ?? 0);
          ordersByRest.set(o.restaurant_id, entry);
        }

        const customersByRest = new Map<string, number>();
        for (const c of monthCustomers ?? []) {
          customersByRest.set(
            c.restaurant_id,
            (customersByRest.get(c.restaurant_id) ?? 0) + 1,
          );
        }

        const monthlyOutcomes = await Promise.allSettled(
          activeRests.map(async (restaurant) => {
            if (!restaurant.notification_email) return false;

            // Skip if already sent for this month (idempotency)
            if ((restaurant.tags ?? []).includes(reportMonthTag)) return false;

            const en = restaurant.locale === "en";
            const stats = ordersByRest.get(restaurant.id) ?? {
              count: 0,
              revenue: 0,
            };
            const newCustCount = customersByRest.get(restaurant.id) ?? 0;
            const dashUrl = `${appUrl}/app/analytics`;

            const sent = await sendEmail({
              to: restaurant.notification_email,
              subject: en
                ? `📊 Monthly report for ${restaurant.name} — MENIUS`
                : `📊 Resumen mensual de ${restaurant.name} — MENIUS`,
              html: buildMonthlyReportEmail(
                restaurant.name,
                stats.count,
                newCustCount,
                stats.revenue,
                dashUrl,
                en,
              ),
            });

            if (sent) {
              try {
                await supabase.rpc("append_restaurant_tag", {
                  p_restaurant_id: restaurant.id,
                  p_tag: reportMonthTag,
                });
              } catch {
                /* non-blocking */
              }
              return true;
            } else {
              logger.warn("Monthly report email failed to send", {
                restaurant_id: restaurant.id,
              });
              return false;
            }
          }),
        );
        results.monthly_report = monthlyOutcomes.filter(
          (r) => r.status === "fulfilled" && r.value === true,
        ).length;
        results.errors += monthlyOutcomes.filter(
          (r) => r.status === "rejected",
        ).length;
      }
    }

    logger.info("Automations completed", results);
    return NextResponse.json({ ok: true, ...results });
  } catch (err) {
    logger.error("Automations failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

function buildTrialExpiringEmail(
  restaurantName: string,
  daysLeft: number,
  billingUrl: string,
  en = false,
): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#050505;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="font-size:22px;font-weight:800;color:#7c3aed;margin:0;">MENIUS</h1>
    </div>
    <div style="background:#0a0a0a;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.06);padding:32px 24px;">
      <p style="margin:0 0 16px;font-size:16px;color:#f3f4f6;line-height:1.6;font-weight:600;">${en ? `⏰ Your free trial ends in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}` : `⏰ Tu prueba gratuita termina en ${daysLeft} día${daysLeft !== 1 ? "s" : ""}`}</p>
      <p style="margin:0 0 12px;font-size:15px;color:#9ca3af;line-height:1.6;">${en ? `Hi, your trial for <strong style="color:#f3f4f6;">${restaurantName}</strong> on MENIUS is about to end.` : `Hola, el periodo de prueba de <strong style="color:#f3f4f6;">${restaurantName}</strong> en MENIUS está por terminar.`}</p>
      <p style="margin:0 0 12px;font-size:15px;color:#9ca3af;line-height:1.6;">${en ? "If you don't subscribe, your account moves to the Free plan: your menu stays online, but you lose pickup, delivery and online payments. Subscribe to Pro to keep everything — you keep your remaining trial days." : "Si no te suscribes, tu cuenta pasa al plan Gratis: tu menú sigue en línea, pero pierdes pickup, delivery y pagos online. Suscríbete a Pro para conservar todo — mantienes los días de prueba que te quedan."}</p>
      <p style="margin:0 0 12px;font-size:15px;color:#9ca3af;line-height:1.6;">${en ? 'Pro: <strong style="color:#f3f4f6;">$79/mo</strong> or $790/yr. Cancel anytime.' : 'Pro: <strong style="color:#f3f4f6;">$79/mes</strong> o $790/año. Cancela cuando quieras.'}</p>
      <a href="${billingUrl}" style="display:block;margin-top:24px;padding:14px;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;text-align:center;border-radius:12px;font-weight:600;font-size:15px;text-decoration:none;">
        ${en ? "Subscribe to Pro" : "Suscribirme a Pro"}
      </a>
    </div>
    <p style="text-align:center;font-size:11px;color:#4b5563;margin-top:20px;">
      MENIUS — ${en ? "Digital menu for restaurants" : "Menú digital para restaurantes"}
    </p>
  </div>
</body>
</html>`;
}

function buildSetupIncompleteEmail(
  restaurantName: string,
  setupUrl: string,
  en = false,
): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#050505;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="font-size:22px;font-weight:800;color:#7c3aed;margin:0;">MENIUS</h1>
    </div>
    <div style="background:#0a0a0a;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.06);padding:32px 24px;">
      <p style="margin:0 0 16px;font-size:16px;color:#f3f4f6;line-height:1.6;font-weight:600;">${en ? "🍽️ Your menu is waiting" : "🍽️ Tu menú está esperando"}</p>
      <p style="margin:0 0 12px;font-size:15px;color:#9ca3af;line-height:1.6;">${en ? `You created <strong style="color:#f3f4f6;">${restaurantName}</strong> on MENIUS but haven't added any products to your menu yet.` : `Creaste <strong style="color:#f3f4f6;">${restaurantName}</strong> en MENIUS pero aún no has agregado productos a tu menú.`}</p>
      <p style="margin:0 0 12px;font-size:15px;color:#9ca3af;line-height:1.6;">${en ? '<strong style="color:#f3f4f6;">It\'s super fast:</strong> take a photo of your physical menu and our AI imports everything with categories, prices, and images in seconds.' : '<strong style="color:#f3f4f6;">Es súper rápido:</strong> toma una foto de tu menú físico y nuestra IA lo importa completo con categorías, precios e imágenes en segundos.'}</p>
      <a href="${setupUrl}" style="display:block;margin-top:24px;padding:14px;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;text-align:center;border-radius:12px;font-weight:600;font-size:15px;text-decoration:none;">
        ${en ? "Set up my menu" : "Configurar mi menú"}
      </a>
    </div>
    <p style="text-align:center;font-size:11px;color:#4b5563;margin-top:20px;">
      MENIUS — ${en ? "Digital menu for restaurants" : "Menú digital para restaurantes"}
    </p>
  </div>
</body>
</html>`;
}

function buildOnboardingDay1Email(
  type: "subject" | "html",
  restaurantName: string,
  dashUrl?: string,
  menuUrl?: string,
  en = false,
): string {
  if (type === "subject")
    return en
      ? `🎉 Welcome to MENIUS, ${restaurantName}!`
      : `🎉 ¡Bienvenido a MENIUS, ${restaurantName}!`;
  return `
<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#050505;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;"><h1 style="font-size:22px;font-weight:800;color:#7c3aed;margin:0;">MENIUS</h1></div>
    <div style="background:#0a0a0a;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.06);padding:32px 24px;">
      <p style="margin:0 0 16px;font-size:16px;color:#f3f4f6;font-weight:600;">${en ? "Hello! Your digital menu is ready 🎉" : "¡Hola! Tu menú digital está listo 🎉"}</p>
      <p style="margin:0 0 12px;font-size:15px;color:#9ca3af;line-height:1.6;">${en ? `You just created <strong style="color:#f3f4f6;">${restaurantName}</strong> on MENIUS. Here are your first steps:` : `Acabas de crear <strong style="color:#f3f4f6;">${restaurantName}</strong> en MENIUS. Estos son tus primeros pasos:`}</p>
      <div style="margin:16px 0;padding:16px;background:rgba(124,58,237,0.08);border-radius:12px;border:1px solid rgba(124,58,237,0.15);">
        <p style="margin:0 0 8px;font-size:14px;color:#c4b5fd;">1. <strong>${en ? "Add your products" : "Agrega tus productos"}</strong> — ${en ? "manually or with photo + AI" : "manual o con foto + IA"}</p>
        <p style="margin:0 0 8px;font-size:14px;color:#c4b5fd;">2. <strong>${en ? "Customize your menu" : "Personaliza tu menú"}</strong> — ${en ? "logo, colors, hours" : "logo, colores, horarios"}</p>
        <p style="margin:0;font-size:14px;color:#c4b5fd;">3. <strong>${en ? "Share the link" : "Comparte el link"}</strong> — ${en ? "on social media, WhatsApp, or QR" : "en redes, WhatsApp o con QR"}</p>
      </div>
      <p style="margin:12px 0;font-size:13px;color:#6b7280;">${en ? "Your menu" : "Tu menú"}: <a href="${menuUrl}" style="color:#7c3aed;">${menuUrl}</a></p>
      <a href="${dashUrl}" style="display:block;margin-top:20px;padding:14px;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;text-align:center;border-radius:12px;font-weight:600;font-size:15px;text-decoration:none;">${en ? "Go to my dashboard" : "Ir a mi dashboard"}</a>
    </div>
    <p style="text-align:center;font-size:11px;color:#4b5563;margin-top:20px;">MENIUS — ${en ? "Digital menu for restaurants" : "Menú digital para restaurantes"}</p>
  </div>
</body></html>`;
}

function buildOnboardingDay3Email(
  type: "subject" | "html",
  restaurantName: string,
  dashUrl?: string,
  _menuUrl?: string,
  en = false,
): string {
  if (type === "subject")
    return en
      ? `💡 3 tips for ${restaurantName} to get more orders`
      : `💡 3 tips para que ${restaurantName} reciba más pedidos`;
  return `
<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#050505;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;"><h1 style="font-size:22px;font-weight:800;color:#7c3aed;margin:0;">MENIUS</h1></div>
    <div style="background:#0a0a0a;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.06);padding:32px 24px;">
      <p style="margin:0 0 16px;font-size:16px;color:#f3f4f6;font-weight:600;">${en ? `Tips to maximize ${restaurantName} 💡` : `Tips para maximizar ${restaurantName} 💡`}</p>
      <p style="margin:0 0 16px;font-size:15px;color:#9ca3af;line-height:1.6;">${en ? "You've been on MENIUS for 3 days. These tips will help you get the most out of it:" : "Ya llevas 3 días con MENIUS. Estos tips te ayudarán a sacarle el máximo:"}</p>
      <div style="margin:0 0 12px;padding:14px;background:rgba(124,58,237,0.08);border-radius:10px;border-left:3px solid #7c3aed;">
        <p style="margin:0;font-size:14px;color:#c4b5fd;"><strong>${en ? "📸 Add photos" : "📸 Agrega fotos"}</strong> — ${en ? "Products with photos sell up to 30% more" : "Los productos con foto venden hasta 30% más"}</p>
      </div>
      <div style="margin:0 0 12px;padding:14px;background:rgba(124,58,237,0.08);border-radius:10px;border-left:3px solid #7c3aed;">
        <p style="margin:0;font-size:14px;color:#c4b5fd;"><strong>${en ? "🤖 Import with AI" : "🤖 Importa con IA"}</strong> — ${en ? "Take a photo of your physical menu and AI digitizes it completely" : "Toma una foto de tu menú físico y la IA lo digitaliza completo"}</p>
      </div>
      <div style="margin:0 0 12px;padding:14px;background:rgba(124,58,237,0.08);border-radius:10px;border-left:3px solid #7c3aed;">
        <p style="margin:0;font-size:14px;color:#c4b5fd;"><strong>${en ? "🔔 Enable notifications" : "🔔 Activa notificaciones"}</strong> — ${en ? "Never miss an order" : "Nunca pierdas un pedido"}</p>
      </div>
      <a href="${dashUrl}" style="display:block;margin-top:20px;padding:14px;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;text-align:center;border-radius:12px;font-weight:600;font-size:15px;text-decoration:none;">${en ? "Set up now" : "Configurar ahora"}</a>
    </div>
    <p style="text-align:center;font-size:11px;color:#4b5563;margin-top:20px;">MENIUS — ${en ? "Digital menu for restaurants" : "Menú digital para restaurantes"}</p>
  </div>
</body></html>`;
}

function buildOnboardingDay7Email(
  type: "subject" | "html",
  restaurantName: string,
  dashUrl?: string,
  _menuUrl?: string,
  en = false,
): string {
  if (type === "subject")
    return en
      ? `🚀 ${restaurantName}: advanced tips to grow with MENIUS`
      : `🚀 ${restaurantName}: tips avanzados para crecer con MENIUS`;
  return `
<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#050505;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;"><h1 style="font-size:22px;font-weight:800;color:#7c3aed;margin:0;">MENIUS</h1></div>
    <div style="background:#0a0a0a;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.06);padding:32px 24px;">
      <p style="margin:0 0 16px;font-size:16px;color:#f3f4f6;font-weight:600;">${en ? "One week with MENIUS 🚀" : "Una semana con MENIUS 🚀"}</p>
      <p style="margin:0 0 16px;font-size:15px;color:#9ca3af;line-height:1.6;">${en ? "You've been here a week! Time to use the advanced tools:" : "¡Ya llevas una semana! Es hora de usar las herramientas avanzadas:"}</p>
      <div style="margin:0 0 12px;padding:14px;background:rgba(124,58,237,0.08);border-radius:10px;border-left:3px solid #7c3aed;">
        <p style="margin:0;font-size:14px;color:#c4b5fd;"><strong>${en ? "📧 Email marketing" : "📧 Email marketing"}</strong> — ${en ? "Send AI-powered campaigns to your customers" : "Envía campañas a tus clientes con IA"}</p>
      </div>
      <div style="margin:0 0 12px;padding:14px;background:rgba(124,58,237,0.08);border-radius:10px;border-left:3px solid #7c3aed;">
        <p style="margin:0;font-size:14px;color:#c4b5fd;"><strong>📊 Analytics</strong> — ${en ? "Review your order and customer metrics" : "Revisa tus métricas de pedidos y clientes"}</p>
      </div>
      <div style="margin:0 0 12px;padding:14px;background:rgba(124,58,237,0.08);border-radius:10px;border-left:3px solid #7c3aed;">
        <p style="margin:0;font-size:14px;color:#c4b5fd;"><strong>${en ? "🎯 Promotions" : "🎯 Promociones"}</strong> — ${en ? "Create discount codes to attract customers" : "Crea códigos de descuento para atraer clientes"}</p>
      </div>
      <div style="margin:16px 0;padding:12px;background:rgba(245,158,11,0.08);border-radius:10px;border:1px solid rgba(245,158,11,0.15);">
        <p style="margin:0;font-size:13px;color:#fbbf24;">💡 <strong>${en ? "Did you know?" : "¿Sabías?"}</strong> ${en ? "With the Pro plan ($79/mo or $790/yr) you get pickup, delivery, online card payments (0% MENIUS commission) and up to 5 users." : "Con el plan Pro ($79/mes o $790/año) tienes pickup, delivery, pagos online con tarjeta (0% de comisión de MENIUS) y hasta 5 usuarios."}</p>
      </div>
      <a href="${dashUrl}/billing" style="display:block;margin-top:20px;padding:14px;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;text-align:center;border-radius:12px;font-weight:600;font-size:15px;text-decoration:none;">${en ? "View Pro plan" : "Ver plan Pro"}</a>
    </div>
    <p style="text-align:center;font-size:11px;color:#4b5563;margin-top:20px;">MENIUS — ${en ? "Digital menu for restaurants" : "Menú digital para restaurantes"}</p>
  </div>
</body></html>`;
}

function buildMonthlyReportEmail(
  restaurantName: string,
  orders: number,
  newCustomers: number,
  revenue: number,
  dashUrl: string,
  en = false,
): string {
  return `
<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#050505;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;"><h1 style="font-size:22px;font-weight:800;color:#7c3aed;margin:0;">MENIUS</h1></div>
    <div style="background:#0a0a0a;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.06);">
      <div style="background:linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%);padding:28px 24px;text-align:center;">
        <p style="color:rgba(255,255,255,0.7);font-size:12px;margin:0 0 4px;">${en ? "Monthly summary" : "Resumen mensual"}</p>
        <h2 style="color:#fff;font-size:20px;font-weight:700;margin:0;">${restaurantName}</h2>
      </div>
      <div style="padding:28px 24px;">
        <div style="display:flex;gap:12px;margin-bottom:20px;">
          <div style="flex:1;background:rgba(124,58,237,0.08);border-radius:12px;padding:16px;text-align:center;">
            <p style="font-size:24px;font-weight:800;color:#7c3aed;margin:0;">${orders}</p>
            <p style="font-size:11px;color:#9ca3af;margin:4px 0 0;">${en ? "Orders" : "Pedidos"}</p>
          </div>
          <div style="flex:1;background:rgba(16,185,129,0.08);border-radius:12px;padding:16px;text-align:center;">
            <p style="font-size:24px;font-weight:800;color:#10b981;margin:0;">${newCustomers}</p>
            <p style="font-size:11px;color:#9ca3af;margin:4px 0 0;">${en ? "New customers" : "Nuevos clientes"}</p>
          </div>
          <div style="flex:1;background:rgba(245,158,11,0.08);border-radius:12px;padding:16px;text-align:center;">
            <p style="font-size:24px;font-weight:800;color:#f59e0b;margin:0;">$${revenue.toFixed(0)}</p>
            <p style="font-size:11px;color:#9ca3af;margin:4px 0 0;">Revenue</p>
          </div>
        </div>
        ${
          orders === 0
            ? `<p style="margin:0 0 16px;font-size:14px;color:#9ca3af;line-height:1.6;">${en ? "You haven't received any orders this month yet. Share your menu on social media and WhatsApp to start receiving them." : "Aún no has recibido pedidos este mes. Comparte tu menú en redes sociales y WhatsApp para empezar a recibir."}</p>`
            : `<p style="margin:0 0 16px;font-size:14px;color:#9ca3af;line-height:1.6;">${en ? "Great job! Check your analytics to see trends and growth opportunities." : "¡Buen trabajo! Revisa tu analytics para ver tendencias y oportunidades de crecimiento."}</p>`
        }
        <a href="${dashUrl}" style="display:block;margin-top:16px;padding:14px;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;text-align:center;border-radius:12px;font-weight:600;font-size:15px;text-decoration:none;">${en ? "View full analytics" : "Ver analytics completo"}</a>
      </div>
    </div>
    <p style="text-align:center;font-size:11px;color:#4b5563;margin-top:20px;">MENIUS — ${en ? "Digital menu for restaurants" : "Menú digital para restaurantes"}</p>
  </div>
</body></html>`;
}

function buildNoOrdersEmail(
  restaurantName: string,
  menuUrl: string,
  dashUrl: string,
  en = false,
): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#050505;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="font-size:22px;font-weight:800;color:#7c3aed;margin:0;">MENIUS</h1>
    </div>
    <div style="background:#0a0a0a;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.06);padding:32px 24px;">
      <p style="margin:0 0 16px;font-size:16px;color:#f3f4f6;line-height:1.6;font-weight:600;">${en ? "📊 Tips to get your first orders" : "📊 Tips para recibir tus primeros pedidos"}</p>
      <p style="margin:0 0 12px;font-size:15px;color:#9ca3af;line-height:1.6;">${en ? `Your digital menu for <strong style="color:#f3f4f6;">${restaurantName}</strong> is ready, but you haven't received any orders yet. Here are some tips:` : `Tu menú digital de <strong style="color:#f3f4f6;">${restaurantName}</strong> está listo, pero aún no has recibido pedidos. Aquí van algunos tips:`}</p>
      <div style="margin:16px 0;padding:16px;background:rgba(124,58,237,0.08);border-radius:12px;border:1px solid rgba(124,58,237,0.15);">
        <p style="margin:0 0 8px;font-size:14px;color:#c4b5fd;">1. <strong>${en ? "Share your menu" : "Comparte tu menú"}</strong> ${en ? "on social media and WhatsApp" : "en redes sociales y WhatsApp"}</p>
        <p style="margin:0 0 8px;font-size:14px;color:#c4b5fd;">2. <strong>${en ? "Print QR codes" : "Imprime QR codes"}</strong> ${en ? "for your restaurant tables" : "para las mesas de tu restaurante"}</p>
        <p style="margin:0 0 8px;font-size:14px;color:#c4b5fd;">3. <strong>${en ? "Add photos" : "Agrega fotos"}</strong> ${en ? "to your products — they sell up to 30% more" : "a tus productos — venden hasta 30% más"}</p>
        <p style="margin:0;font-size:14px;color:#c4b5fd;">4. <strong>${en ? "Enable notifications" : "Activa notificaciones"}</strong> ${en ? "so you never miss an order" : "para no perder ningún pedido"}</p>
      </div>
      <p style="margin:0 0 12px;font-size:13px;color:#6b7280;line-height:1.6;">${en ? "Your menu" : "Tu menú"}: <a href="${menuUrl}" style="color:#7c3aed;">${menuUrl}</a></p>
      <a href="${dashUrl}" style="display:block;margin-top:16px;padding:14px;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;text-align:center;border-radius:12px;font-weight:600;font-size:15px;text-decoration:none;">
        ${en ? "Go to my dashboard" : "Ir a mi dashboard"}
      </a>
    </div>
    <p style="text-align:center;font-size:11px;color:#4b5563;margin-top:20px;">
      MENIUS — ${en ? "Digital menu for restaurants" : "Menú digital para restaurantes"}
    </p>
  </div>
</body>
</html>`;
}
