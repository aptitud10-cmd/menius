export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTenant } from '@/lib/auth/get-tenant';
import { checkRateLimitAsync } from '@/lib/rate-limit';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createLogger } from '@/lib/logger';

const logger = createLogger('menu-optimizer');

export interface OptimizerInsight {
  type: 'hidden_gem' | 'dead_weight' | 'price_opportunity' | 'missing_image' | 'low_margin' | 'upsell_gap';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action: string;
  product_ids?: string[];
}

export interface OptimizerResponse {
  insights: OptimizerInsight[];
  summary: string;
  generated_at: string;
}

export async function POST() {
  const tenant = await getTenant();
  if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await checkRateLimitAsync(`menu-optimizer:${tenant.userId}`, { limit: 5, windowSec: 3600 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit: máx 5 análisis por hora' }, { status: 429 });
  }

  const supabase = await createClient();
  const now = new Date();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: restaurant },
    { data: categories },
    { data: products },
    { data: monthOrders },
  ] = await Promise.all([
    supabase.from('restaurants').select('name, currency, locale').eq('id', tenant.restaurantId).maybeSingle(),
    supabase.from('categories').select('id, name, is_active').eq('restaurant_id', tenant.restaurantId),
    supabase.from('products').select('id, name, price, cost_price, image_url, is_active, is_featured, popularity_rank, orders_last_7d, category_id').eq('restaurant_id', tenant.restaurantId).eq('is_active', true),
    supabase.from('orders').select('id, total, status').eq('restaurant_id', tenant.restaurantId).gte('created_at', monthAgo).in('status', ['completed', 'delivered', 'ready']),
  ]);

  if (!restaurant || !products || products.length === 0) {
    return NextResponse.json({ error: 'No hay datos suficientes para analizar' }, { status: 400 });
  }

  // Fetch order_items separately (products list is now available)
  const productIds = products.map((p) => p.id);
  const { data: orderItems } = await supabase
    .from('order_items')
    .select('product_id, qty, line_total')
    .gte('created_at', monthAgo)
    .in('product_id', productIds)
    .limit(1000);

  // Build product stats
  const productStats: Record<string, { qty: number; revenue: number }> = {};
  for (const item of orderItems ?? []) {
    if (!productStats[item.product_id]) productStats[item.product_id] = { qty: 0, revenue: 0 };
    productStats[item.product_id].qty += item.qty;
    productStats[item.product_id].revenue += Number(item.line_total);
  }

  const totalRevenue = (monthOrders ?? []).reduce((s, o) => s + Number(o.total), 0);
  const avgTicket = monthOrders && monthOrders.length > 0 ? totalRevenue / monthOrders.length : 0;

  const productContext = products.map(p => {
    const stats = productStats[p.id] ?? { qty: 0, revenue: 0 };
    const cat = (categories ?? []).find(c => c.id === p.category_id);
    const margin = p.cost_price != null && Number(p.cost_price) > 0
      ? Math.round(((Number(p.price) - Number(p.cost_price)) / Number(p.price)) * 100)
      : null;
    return {
      id: p.id,
      name: p.name,
      price: Number(p.price),
      cost_price: p.cost_price != null ? Number(p.cost_price) : null,
      margin_pct: margin,
      has_image: !!p.image_url,
      is_featured: p.is_featured,
      popularity_rank: p.popularity_rank,
      orders_30d: stats.qty,
      revenue_30d: Math.round(stats.revenue),
      category: cat?.name ?? 'sin categoría',
    };
  });

  const soldIds = new Set(Object.keys(productStats).filter(id => (productStats[id]?.qty ?? 0) > 0));
  const noSalesProducts = productContext.filter(p => !soldIds.has(p.id)).slice(0, 10);
  const topProducts = [...productContext].sort((a, b) => b.revenue_30d - a.revenue_30d).slice(0, 10);
  const noImageProducts = productContext.filter(p => !p.has_image).slice(0, 8);
  const lowMarginProducts = productContext.filter(p => p.margin_pct !== null && p.margin_pct < 40).slice(0, 8);

  const locale = restaurant.locale ?? 'es';
  const currency = restaurant.currency ?? 'MXN';

  const prompt = `Eres un consultor experto en restaurantes y menús digitales. Analiza los datos de este restaurante y genera insights accionables y específicos.

RESTAURANTE: ${restaurant.name}
MONEDA: ${currency}
IDIOMA DE RESPUESTA: ${locale === 'en' ? 'English' : 'Español'}

MÉTRICAS 30 DÍAS:
- Total órdenes completadas: ${monthOrders?.length ?? 0}
- Revenue total: ${currency} ${totalRevenue.toFixed(2)}
- Ticket promedio: ${currency} ${avgTicket.toFixed(2)}

TOP 10 PRODUCTOS POR REVENUE:
${topProducts.map(p => `  - ${p.name}: ${p.orders_30d} pedidos, ${currency} ${p.revenue_30d} revenue, margen: ${p.margin_pct !== null ? p.margin_pct + '%' : 'desconocido'}, imagen: ${p.has_image ? 'sí' : 'NO'}, destacado: ${p.is_featured ? 'sí' : 'no'}`).join('\n')}

PRODUCTOS SIN VENTAS (30d):
${noSalesProducts.length > 0 ? noSalesProducts.map(p => `  - ${p.name} (${p.category}, $${p.price})`).join('\n') : '  Ninguno'}

PRODUCTOS SIN IMAGEN:
${noImageProducts.length > 0 ? noImageProducts.map(p => `  - ${p.name}`).join('\n') : '  Todos tienen imagen'}

PRODUCTOS CON MARGEN BAJO (<40%):
${lowMarginProducts.length > 0 ? lowMarginProducts.map(p => `  - ${p.name}: $${p.price}, costo $${p.cost_price}, margen ${p.margin_pct}%`).join('\n') : '  Ninguno con margen conocido bajo'}

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

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.4 },
    });

    const text = result.response.text();
    let parsed: { insights: OptimizerInsight[]; summary: string };
    try {
      parsed = JSON.parse(text);
    } catch {
      logger.error('Failed to parse Gemini response', { text: text.slice(0, 200) });
      return NextResponse.json({ error: 'Error procesando respuesta de IA' }, { status: 500 });
    }

    if (!Array.isArray(parsed.insights)) {
      return NextResponse.json({ error: 'Respuesta de IA inválida' }, { status: 500 });
    }

    return NextResponse.json<OptimizerResponse>({
      insights: parsed.insights.slice(0, 6),
      summary: parsed.summary ?? '',
      generated_at: now.toISOString(),
    });
  } catch (err) {
    logger.error('menu-optimizer error', { err });
    return NextResponse.json({ error: 'Error generando análisis' }, { status: 500 });
  }
}
