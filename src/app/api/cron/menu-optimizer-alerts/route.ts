export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendEmail,
  buildMenuOptimizerAlertEmail,
} from "@/lib/notifications/email";
import { createLogger } from "@/lib/logger";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { OptimizerInsight } from "@/app/api/ai/menu-optimizer/route";

const logger = createLogger("cron:menu-optimizer-alerts");

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://menius.app";
  const now = new Date();
  const monthAgo = new Date(
    now.getTime() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const counters = { checked: 0, alerted: 0, skipped: 0, errors: 0 };

  try {
    // Obtener restaurantes activos con plan active o trialing, con email del owner
    const { data: activeRestaurants } = await supabase
      .from("subscriptions")
      .select(
        "restaurant_id, restaurants(id, name, locale, currency, notification_email)",
      )
      .in("status", ["active", "trialing"])
      .not("restaurants.notification_email", "is", null);

    if (!activeRestaurants || activeRestaurants.length === 0) {
      logger.info("No active restaurants found for menu optimizer alerts");
      return NextResponse.json({ ok: true, ...counters });
    }

    // Filtrar restaurants con >10 órdenes en los últimos 30 días (en lote)
    const restIds = activeRestaurants
      .map((s) => (s.restaurants as unknown as { id: string } | null)?.id)
      .filter((id): id is string => !!id);

    const { data: orderCounts } = await supabase
      .from("orders")
      .select("restaurant_id")
      .in("restaurant_id", restIds)
      .in("status", ["completed", "delivered", "ready"])
      .gte("created_at", monthAgo);

    const orderCountByRest = new Map<string, number>();
    for (const o of orderCounts ?? []) {
      orderCountByRest.set(
        o.restaurant_id,
        (orderCountByRest.get(o.restaurant_id) ?? 0) + 1,
      );
    }

    const eligibleRestaurants = activeRestaurants.filter((sub) => {
      const rest = sub.restaurants as unknown as {
        id: string;
        notification_email: string | null;
      } | null;
      if (!rest?.id || !rest?.notification_email) return false;
      return (orderCountByRest.get(rest.id) ?? 0) > 10;
    });

    counters.checked = eligibleRestaurants.length;
    logger.info("Menu optimizer alerts: eligible restaurants", {
      count: counters.checked,
    });

    // Procesar de a 3 en paralelo
    const BATCH = 3;
    for (let i = 0; i < eligibleRestaurants.length; i += BATCH) {
      const batch = eligibleRestaurants.slice(i, i + BATCH);

      const batchOutcomes = await Promise.allSettled(
        batch.map(async (sub) => {
          const rest = sub.restaurants as unknown as {
            id: string;
            name: string;
            locale: string;
            currency: string;
            notification_email: string;
          } | null;
          if (!rest) return false;

          const restaurantId = rest.id;

          // Mismas queries que menu-optimizer/route.ts
          const [
            { data: categories },
            { data: products },
            { data: monthOrders },
          ] = await Promise.all([
            supabase
              .from("categories")
              .select("id, name, is_active")
              .eq("restaurant_id", restaurantId),
            supabase
              .from("products")
              .select(
                "id, name, price, cost_price, image_url, is_active, is_featured, popularity_rank, orders_last_7d, category_id",
              )
              .eq("restaurant_id", restaurantId)
              .eq("is_active", true),
            supabase
              .from("orders")
              .select("id, total, status")
              .eq("restaurant_id", restaurantId)
              .gte("created_at", monthAgo)
              .in("status", ["completed", "delivered", "ready"]),
          ]);

          if (!products || products.length === 0) return false;

          const productIds = products.map((p) => p.id);
          const { data: orderItems } = await supabase
            .from("order_items")
            .select("product_id, qty, line_total")
            .gte("created_at", monthAgo)
            .in("product_id", productIds)
            .limit(1000);

          const productStats: Record<string, { qty: number; revenue: number }> =
            {};
          for (const item of orderItems ?? []) {
            if (!productStats[item.product_id])
              productStats[item.product_id] = { qty: 0, revenue: 0 };
            productStats[item.product_id].qty += item.qty;
            productStats[item.product_id].revenue += Number(item.line_total);
          }

          const totalRevenue = (monthOrders ?? []).reduce(
            (s, o) => s + Number(o.total),
            0,
          );
          const avgTicket =
            monthOrders && monthOrders.length > 0
              ? totalRevenue / monthOrders.length
              : 0;
          const locale = rest.locale ?? "es";
          const currency = rest.currency ?? "MXN";

          const productContext = products.map((p) => {
            const stats = productStats[p.id] ?? { qty: 0, revenue: 0 };
            const cat = (categories ?? []).find((c) => c.id === p.category_id);
            const margin =
              p.cost_price != null && Number(p.cost_price) > 0
                ? Math.round(
                    ((Number(p.price) - Number(p.cost_price)) /
                      Number(p.price)) *
                      100,
                  )
                : null;
            return {
              id: p.id,
              name: p.name,
              price: Number(p.price),
              cost_price: p.cost_price != null ? Number(p.cost_price) : null,
              margin_pct: margin,
              has_image: !!p.image_url,
              is_featured: p.is_featured,
              orders_30d: stats.qty,
              revenue_30d: Math.round(stats.revenue),
              category: cat?.name ?? "sin categoría",
            };
          });

          const soldIds = new Set(
            Object.keys(productStats).filter(
              (id) => (productStats[id]?.qty ?? 0) > 0,
            ),
          );
          const noSalesProducts = productContext
            .filter((p) => !soldIds.has(p.id))
            .slice(0, 10);
          const topProducts = [...productContext]
            .sort((a, b) => b.revenue_30d - a.revenue_30d)
            .slice(0, 10);
          const noImageProducts = productContext
            .filter((p) => !p.has_image)
            .slice(0, 8);
          const lowMarginProducts = productContext
            .filter((p) => p.margin_pct !== null && p.margin_pct < 40)
            .slice(0, 8);

          const prompt = `Eres un consultor experto en restaurantes y menús digitales. Analiza los datos de este restaurante y genera insights accionables y específicos.

RESTAURANTE: ${rest.name}
MONEDA: ${currency}
IDIOMA DE RESPUESTA: ${locale === "en" ? "English" : "Español"}

MÉTRICAS 30 DÍAS:
- Total órdenes completadas: ${monthOrders?.length ?? 0}
- Revenue total: ${currency} ${totalRevenue.toFixed(2)}
- Ticket promedio: ${currency} ${avgTicket.toFixed(2)}

TOP 10 PRODUCTOS POR REVENUE:
${topProducts.map((p) => `  - ${p.name}: ${p.orders_30d} pedidos, ${currency} ${p.revenue_30d} revenue, margen: ${p.margin_pct !== null ? p.margin_pct + "%" : "desconocido"}, imagen: ${p.has_image ? "sí" : "NO"}, destacado: ${p.is_featured ? "sí" : "no"}`).join("\n")}

PRODUCTOS SIN VENTAS (30d):
${noSalesProducts.length > 0 ? noSalesProducts.map((p) => `  - ${p.name} (${p.category}, $${p.price})`).join("\n") : "  Ninguno"}

PRODUCTOS SIN IMAGEN:
${noImageProducts.length > 0 ? noImageProducts.map((p) => `  - ${p.name}`).join("\n") : "  Todos tienen imagen"}

PRODUCTOS CON MARGEN BAJO (<40%):
${lowMarginProducts.length > 0 ? lowMarginProducts.map((p) => `  - ${p.name}: $${p.price}, costo $${p.cost_price}, margen ${p.margin_pct}%`).join("\n") : "  Ninguno con margen conocido bajo"}

Genera exactamente 4-6 insights en formato JSON. Cada insight debe ser:
1. Muy específico (menciona el nombre del producto)
2. Accionable (dice exactamente qué hacer)
3. Con impacto estimado en revenue o conversión

Tipos disponibles: "hidden_gem" (producto popular con margen alto, no destacado), "dead_weight" (sin ventas en 30d), "price_opportunity" (subir precio por alta demanda), "missing_image" (sin foto = -30% conversión), "low_margin" (bajar costo o subir precio), "upsell_gap" (complemento faltante)

Responde SOLO con JSON válido:
{
  "insights": [
    {
      "type": "hidden_gem|dead_weight|price_opportunity|missing_image|low_margin|upsell_gap",
      "priority": "high|medium|low",
      "title": "Título corto (máx 8 palabras)",
      "description": "Explicación específica con datos del restaurante (2-3 oraciones)",
      "action": "Acción concreta y específica que el restaurantero debe hacer HOY",
      "product_ids": ["id1", "id2"]
    }
  ],
  "summary": "Resumen ejecutivo de 1-2 oraciones sobre el estado general del menú y la oportunidad más grande"
}`;

          const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
          const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

          const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.4,
            },
          });

          let parsed: { insights: OptimizerInsight[]; summary: string };
          try {
            parsed = JSON.parse(result.response.text());
          } catch {
            logger.error("Failed to parse Gemini response for restaurant", {
              restaurantId,
            });
            return false;
          }

          if (!Array.isArray(parsed.insights)) return false;

          const highInsights = parsed.insights.filter(
            (i) => i.priority === "high",
          );
          if (highInsights.length === 0) return false; // sin spam

          const dashboardUrl = `${appUrl}/app/menu/optimizer`;

          const sent = await sendEmail({
            to: rest.notification_email,
            subject:
              locale === "en"
                ? `Your menu has opportunities this week — ${rest.name}`
                : `Tu menú tiene oportunidades esta semana — ${rest.name}`,
            html: buildMenuOptimizerAlertEmail({
              to: rest.notification_email,
              restaurantName: rest.name,
              insights: highInsights.slice(0, 3),
              dashboardUrl,
              locale,
            }),
          });

          return sent;
        }),
      );

      for (const outcome of batchOutcomes) {
        if (outcome.status === "fulfilled") {
          if (outcome.value === true) counters.alerted++;
          else counters.skipped++;
        } else {
          counters.errors++;
          logger.error("Menu optimizer alert failed for restaurant in batch", {
            reason: String(outcome.reason),
          });
        }
      }
    }

    logger.info("Menu optimizer alerts completed", counters);
    return NextResponse.json({ ok: true, ...counters });
  } catch (err) {
    logger.error("Menu optimizer alerts cron failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
