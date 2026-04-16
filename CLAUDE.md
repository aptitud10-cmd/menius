# MENIUS — Guía completa para agentes de IA

## ¿Qué es Menius?
SaaS de menús digitales y punto de venta para restaurantes en Latinoamérica. Cada restaurante tiene su propio URL en `menius.app/[slug]`. Los clientes escanean QR, ordenan y pagan desde su celular. Los dueños gestionan todo desde un dashboard web.

**Repo**: `github.com/aptitud10-cmd/menius` (rama: `main`)
**Producción**: `https://menius.app` (Vercel auto-deploy en push a main)
**Admin dev tool**: `https://menius.app/admin/dev`

---

## Stack Técnico

| Capa | Tecnología |
|------|------------|
| Framework | Next.js 14 App Router, TypeScript strict |
| Base de datos | Supabase (Postgres 17, Auth, Storage, Realtime) |
| Pagos subscripciones | Stripe Billing + Stripe Connect (pagos restaurante→cliente) |
| Pagos alternativos | Wompi (Colombia) |
| Email | Resend (noreply@menius.app) |
| AI generativa | Gemini (imagen + chat), fal.ai (Flux Pro), OpenRouter |
| AI Dev Tool | Anthropic Claude (agente), Voyage AI (embeddings), Tavily (web search) |
| Estado cliente | Zustand (carrito persistido, favoritos) |
| Estilos | Tailwind CSS + patrones shadcn/ui |
| Animaciones | framer-motion |
| Error tracking | Sentry |
| Analytics | PostHog |
| Rate limiting | Upstash Redis (fallback: in-memory) |
| Facturación MX | Facturama (CFDI) |
| WhatsApp | Meta Cloud API |
| SMS | Twilio |
| Push notifications | VAPID (web push) |
| Deployment | Vercel (serverless + edge) |

---

## Estructura de Directorios

```
src/
  app/
    [slug]/               # Menú público del restaurante
      page.tsx            # Server component — ISR 5min — fetchMenuData
      menu-data.ts        # fetchMenuDataFromDB() con unstable_cache 1h
      loading.tsx         # Skeleton UI (aspect-square para evitar CLS)
    app/                  # Dashboard del restaurante (requiere auth)
      dashboard/          # Resumen, analytics, KPIs
      menu/               # Gestión de productos, categorías
      orders/             # Gestión de pedidos
      tables/             # Gestión de mesas y QR
      settings/           # Configuración del restaurante
      billing/            # Subscripción y pagos
      staff/              # Gestión de equipo
      loyalty/            # Programa de lealtad
      crm/                # CRM de clientes
      kds/                # Kitchen Display System (embed)
    admin/                # Super-admin panel (requiere ADMIN_EMAIL)
      dev/                # AI Dev Tool (chat + editor + deploy)
        page.tsx          # Server wrapper con auth
        DevTool.tsx       # Client component — UI principal
        setup/            # Setup wizard (DB + env vars check)
    kds/                  # Kitchen Display System (pantalla de cocina)
    counter/              # Vista de caja/mostrador
    api/                  # Route handlers (server-side ONLY)
      orders/             # Creación y gestión de pedidos
      tenant/             # CRUD del restaurante (requiere getTenant)
      billing/            # Stripe subscripciones
      payments/           # Stripe Connect, Wompi
      connect/            # Stripe Connect onboarding
      ai/                 # IA: chat, imágenes, importar menú
      admin/              # Endpoints de super-admin
      admin/dev/          # AI Dev Tool APIs
      cron/               # Jobs automáticos (bearer CRON_SECRET)
      public/             # Endpoints públicos sin auth
      driver/             # App de repartidores
      v1/                 # API pública (autenticada con api_keys)
  components/
    public/               # Componentes del menú cliente
      MenuShell.tsx       # Componente principal ~2200 líneas
      ProductCard.tsx     # Router mobile/desktop (mobile-first SSR)
      ProductCardMobile.tsx
      ProductCardDesktop.tsx
      CustomizationSheet.tsx  # Carga lazy de modificadores
    menu/                 # Dashboard — gestión de menú
    dashboard/            # Dashboard — componentes generales
    ui/                   # Primitivos compartidos (Button, Sheet, etc.)
  lib/
    supabase/
      browser.ts          # createBrowserClient() — componentes cliente
      server.ts           # createServerClient() — server components/routes
      admin.ts            # createAdminClient() — service role, bypasa RLS
    auth/
      get-tenant.ts       # getTenant() → { userId, restaurantId } | null
      verify-admin.ts     # verifyAdmin() → { supabase, user } | null
      check-plan.ts       # hasPlanAccess(), getEffectivePlanId()
      order-token.ts      # verifyOrderToken() — valida token de pedido
    plans.ts              # PLANS config, PlanId, limits, features
    store-overrides.ts    # Feature flags por tienda (slug → config)
    store-config-context.tsx  # React context para overrides
    notifications/
      email.ts            # sendEmail() via Resend
      order-notifications.ts  # notifyNewOrder(), buildOrderEmail()
    error-reporting.ts    # captureError(), captureWarning() → Sentry
    logger.ts             # createLogger('namespace') — structured logs
    rate-limit.ts         # Rate limiting con Redis/memory
    env.ts                # Validación de env vars
  store/
    cartStore.ts          # Zustand cart (persistido en localStorage)
    favoritesStore.ts     # Zustand favoritos
  types/
    index.ts              # Todas las interfaces TypeScript
supabase/
  migration.sql           # Schema base (tablas core)
  migration-*.sql         # Migraciones adicionales (57+)
  MIGRATIONS.md           # Orden exacto de aplicación
  migrations/
    20260407_dev_tool.sql # Tables dev_tool (code_embeddings, dev_conversations)
```

---

## Patrones de Autenticación

### Cliente público
Sin auth. Los menús son completamente públicos. Rate limiting por IP.

### Dueño de restaurante (tenant)
```typescript
const tenant = await getTenant(); // { userId, restaurantId } | null
if (!tenant) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
```
Basado en Supabase Auth Session + `profiles.default_restaurant_id`.

### Super-admin
```typescript
const auth = await verifyAdmin(); // { supabase, user } | null
if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
```
Verifica que el email del usuario esté en `ADMIN_EMAIL` (env var, puede ser CSV: `admin1@x.com,admin2@x.com`).

### Cron jobs
```typescript
const cronSecret = process.env.CRON_SECRET;
if (authHeader !== `Bearer ${cronSecret}`) return 401;
```

### API pública v1
```typescript
// Header: x-api-key o Authorization: Bearer <key>
// Validado con validateApiKey() → restaurantId
```

### IMPORTANTE: `admin/regenerate-images/route.ts`
Aunque está bajo `/admin/`, usa `getTenant()` (tenant-only), no `verifyAdmin()`.

---

## Acceso a Base de Datos

| Contexto | Cliente | Cuándo usar |
|----------|---------|-------------|
| Componentes cliente | `createBrowserClient()` | En `'use client'` components |
| Server components / Route handlers | `createServerClient()` | Para datos del usuario actual (respeta RLS) |
| Route handlers que necesitan bypass RLS | `createAdminClient()` | Operaciones admin, service role |

**Regla**: NUNCA usar service role key en componentes cliente.
**Regla**: SIEMPRE `createAdminClient()` en route handlers de orders, billing, cron.

---

## Planes de Suscripción

```typescript
type PlanId = 'free' | 'starter' | 'pro' | 'business';
```

| Plan | Precio | Órdenes/mes | Mesas | Usuarios | Delivery | Comisión pagos online |
|------|--------|------------|-------|----------|----------|-----------------------|
| free | $0 | 50 | 5 | 1 | ❌ | ❌ (solo efectivo) |
| starter | $39/mes | ilimitado | 15 | 2 | ❌ | 0% (Stripe Connect) |
| pro | $79/mes | ilimitado | 50 | 5 | ✅ | 0% |
| business | $149/mes | ilimitado | ilimitado | ilimitado | ✅ | 0% |

> **Nota**: WhatsApp y SMS fueron eliminados del producto. Las notificaciones a dueños se envían únicamente por email.

**Modelo de comisiones (CRÍTICO):**
- **Efectivo**: siempre 0% en todos los planes.
- **Pagos online con tarjeta (Stripe Connect)**: Starter 0%, Pro 0%, Business 0%.
- **Trial (14 días)**: 0% comisión en pagos online sin importar el plan.
- **Wompi (Colombia/COP)**: 0% comisión MENIUS — Wompi cobra sus propias tarifas al restaurante.
- **Free**: no admite pagos online con tarjeta.

**CRÍTICO**: `free` NUNCA se guarda en `subscriptions.plan_id`. La DB solo acepta `starter|pro|business`.
`free` es inferido por `getEffectivePlanId()` cuando no hay subscripción activa.

```typescript
// SIEMPRE usar esto para verificar plan:
const planId = await getEffectivePlanId(restaurantId);
// o
const hasAccess = await hasPlanAccess(restaurantId, 'pro');
```

**Aliases legacy**: `basic` → `starter`, `enterprise` → `business` (usar `resolvePlanId()`).

**Trial**: 14 días gratis al crear cuenta (plan `starter` en estado `trialing`).
El cron `billing-reconciliation` crea la row de subscripción automáticamente.

### Plan por Comisión (`commission_plan`)

Alternativa a la suscripción mensual: el restaurante paga **4% por cada orden online** en lugar de cuota fija.

- **Column**: `restaurants.commission_plan boolean DEFAULT false`
- **Feature access**: equivalente a `business` (ver `getEffectivePlanId()`)
- **Comisión Stripe**: `application_fee_amount = 4%` del total en cada pago online
- **Activación**: manual vía admin SQL — `UPDATE restaurants SET commission_plan = true WHERE slug = '...'`
- **Sin subscripción**: `getEffectivePlanId()` retorna `'business'` directamente, sin consultar `subscriptions`

**Rutas que aplican el 4%:** `/api/orders`, `/api/payments/checkout`, `/api/payments/intent`

| Modelo | Comisión online |
|--------|-----------------|
| `free` (sin sub) | ❌ no permite |
| `starter` activo | 1% |
| `pro` / `business` activo | 0% |
| `commission_plan = true` | **4%** |
| Trial activo | 0% |

**Country gating (política de activación, no runtime check):**
- ✅ Disponible: MX, CL, PE, EC, US, CA, GB, AU (Stripe Connect con splits automáticos)
- ❌ Colombia (CO): solo suscripciones — Wompi no soporta `application_fee_amount`
- ⏳ Argentina (AR): suspendido — controles de cambio (no activar)

La activación es manual (admin SQL). El código no necesita verificar país en runtime.

---

## Flujo de Órdenes

### Estados de orden
```typescript
type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
// La API v1 también acepta: 'accepted' | 'delivering' | 'completed'
```

### Flujo completo
1. **Cliente** carga menú → `[slug]/page.tsx` (SSR + ISR 5min)
2. **Cliente** agrega al carrito (Zustand, persistido)
3. **POST /api/orders** — validación completa:
   - Rate limit por IP
   - Idempotency-Key (evita doble submit)
   - Honeypot anti-bot (`_hp` field)
   - `verifyOrderToken` (token del menú)
   - Zod schema (`publicOrderSchema`)
   - Restaurante activo + horarios
   - Límite free tier (50/mes)
   - FK validation para modificadores
   - INSERT en `orders`, `order_items`, `order_item_modifiers`
4. **notifyNewOrder()** — WhatsApp/email al dueño (no bloquea respuesta)
5. **Dashboard** del restaurante → polling / Realtime → cambia estado
6. **Cliente** trackea en `/track/[orderNumber]` (RPC `get_order_tracking`)

### Datos de órdenes
- `orders.updated_at` — timestamp de último cambio de estado (columna existe)
- `order_status_history` — log de todas las transiciones
- `order_notification_log` — log de notificaciones enviadas

---

## Caching Strategy

```typescript
// ISR páginas de menú:
export const revalidate = 300; // 5 minutos

// Cache de datos de menú:
unstable_cache(fetchFn, ['menu-data', slug], {
  tags: ['menu-data', `menu-data:${slug}`],
  revalidate: 3600 // 1 hora
});

// Invalidar cuando el restaurante edita:
revalidateTag(`menu-data:${slug}`);
```

**Prerenderizado**: `generateStaticParams()` pre-construye todas las páginas de restaurante en build.

---

## Producto Data Flow (Patrón Importante)

```
menu-data.ts          → fetchMenuDataFromDB() carga productos COMPLETOS (con modifier_groups)
[slug]/page.tsx       → SLIMEA los productos antes de pasarlos a MenuShell:
                         modifier_groups: [], variants: [], extras: []
                         + has_modifiers: boolean (flag)
MenuShell.tsx         → Recibe productos slim
CustomizationSheet    → Cuando usuario abre un producto con has_modifiers=true:
                         lazy fetch a GET /api/product-modifiers?productId=xxx
```

Esto reduce el RSC payload de ~2MB a ~200KB para catálogos grandes (ej: Buccaneer con 250 productos).

---

## Per-Store Overrides

```typescript
// src/lib/store-overrides.ts
const OVERRIDES: Record<string, StoreOverrides> = {
  'buccaneer': { optimizeImages: true },
  // Agregar overrides nuevos aquí
};
```

Accesible en cualquier componente cliente con:
```typescript
const config = useStoreConfig(); // hook del context
if (config.optimizeImages) { /* ... */ }
```

---

## Imágenes

- **Pipeline**: todas las imágenes pasan por Sharp: 1200×1200 WebP calidad 82
- **Upload**: `POST /api/tenant/upload`
- **AI-generated**: también optimizadas con Sharp antes de subir
- **Bucket Supabase**: `product-images`
- **Tiendas con optimización Next.js**: `buccaneer` (via store-overrides)

---

## Sistema de Email (Resend)

```typescript
// Transport: src/lib/notifications/email.ts
await sendEmail({
  to: 'cliente@email.com',
  subject: 'Tu pedido está listo',
  html: '<p>...</p>',
});
// From: "MENIUS <noreply@menius.app>"
```

**Emails que se envían:**
- Nueva orden al dueño (order-notifications.ts)
- Confirmación al cliente
- Cambio de estado de orden
- Bienvenida (cron email-automations)
- Reactivación (cron email-automations)
- Reporte mensual (cron email-automations)
- Alertas de billing (billing/webhook)
- Setup request de leads (setup-request)
- Soporte (support/contact)
- Campañas (tenant/campaigns, admin/campaigns)

---

## Cron Jobs (Vercel Cron + CRON_SECRET)

| Path | Schedule | Qué hace |
|------|----------|----------|
| `/api/cron/email-automations` | `0 10 * * *` (diario 10am UTC) | Welcome, reactivación, drips onboarding, reportes mensuales |
| `/api/cron/billing-reconciliation` | `0 * * * *` (cada hora) | Sync subscripciones Stripe, crear trials, orphaned restaurants |
| `/api/cron/auto-complete-pickup` | `*/3 * * * *` (cada 3 min) | preparing→ready (cuando vence ETA), ready→delivered (después de 10 min) |
| `/api/cron/activate-scheduled` | `*/5 * * * *` (cada 5 min) | Activa órdenes programadas |
| `/api/cron/auto-cancel-reservations` | `0 * * * *` (cada hora) | Cancela reservaciones sin confirmar |
| `/api/cron/social-posts` | `0 9 * * 2,4,6` (Mar/Jue/Sáb) | Posts automáticos de redes sociales |
| `/api/cron/health-alerts` | `0 8 * * *` (diario 8am UTC) | Email de salud de plataforma al admin |
| `/api/cron/cleanup-demo-images` | `0 3 * * 0` (domingos 3am) | Limpieza de imágenes demo |

---

## Schema de Base de Datos (Tablas Principales)

### `restaurants`
`id, name, slug (UNIQUE), owner_user_id, timezone, currency, locale, logo_url, cover_image_url, description, address, phone, email, is_active, operating_hours (JSONB), notification_whatsapp, notification_email, notifications_enabled, order_types_enabled (text[]), payment_methods_enabled (text[]), delivery_fee, delivery_radius_km, estimated_delivery_minutes, stripe_account_id, stripe_onboarding_complete, fiscal_rfc, fiscal_razon_social, tax_rate, country_code, created_at`

### `profiles`
`user_id (FK auth.users), full_name, role ('super_admin'|'owner'|'staff'), default_restaurant_id (FK restaurants)`

### `categories`
`id, restaurant_id, name, sort_order, is_active, translations (JSONB), available_from (HH:MM), available_to (HH:MM), image_url, created_at`

### `products`
`id, restaurant_id, category_id, name, description, price, image_url, is_active, in_stock, is_featured, is_new, sort_order, translations (JSONB), dietary_tags (text[]), prep_time_minutes, created_at`

### `modifier_groups`
`id, product_id, name, selection_type ('single'|'multi'), min_select, max_select, is_required, sort_order, display_type ('list'|'grid')`

### `modifier_options`
`id, group_id, name, price_delta, is_default, sort_order`

### `orders`
`id, restaurant_id, table_id, order_number, status (CHECK: pending|confirmed|preparing|ready|delivered|cancelled), customer_name, customer_email, customer_phone, notes, total, tax_amount, tip_amount, delivery_fee, discount_amount, order_type ('dine_in'|'pickup'|'delivery'), payment_method ('cash'|'online'|'wallet'), payment_status, payment_intent_id, delivery_address, table_name, include_utensils, idempotency_key, scheduled_for, promo_code, loyalty_discount, loyalty_points_redeemed, driver_name, driver_phone, driver_assigned_at, driver_lat, driver_lng, driver_updated_at, driver_picked_up_at, driver_at_door_at, driver_delivered_at, delivery_photo_url, driver_tracking_token, driver_token_expires_at, estimated_ready_minutes, cancellation_reason, payment_breakdown (JSONB), utensils, created_at, updated_at`

### `order_items`
`id, order_id, product_id, variant_id, qty, unit_price, line_total, notes`

### `order_item_modifiers`
`id, order_item_id, group_id, option_id, name, price_delta`

### `subscriptions`
`id, restaurant_id (UNIQUE), stripe_customer_id, stripe_subscription_id, stripe_price_id, plan_id (CHECK: starter|pro|business), status (trialing|active|past_due|canceled|unpaid|incomplete), current_period_start, current_period_end, trial_start, trial_end, canceled_at, updated_at`

### `customers`
`id, restaurant_id, customer_name, customer_phone, customer_email, points, lifetime_points, created_at, updated_at`

### `loyalty_accounts`
`id, restaurant_id, customer_id, points, lifetime_points`

### `loyalty_config`
`id, restaurant_id, points_per_peso, min_points_redeem, peso_value_per_point, is_active`

### `promotions`
`id, restaurant_id, code, discount_type, discount_value, min_order, max_uses, current_uses, is_active, expires_at`

### `reviews`
`id, restaurant_id, order_id, customer_name, rating, comment, status ('pending'|'approved'|'rejected'), created_at`

### `reservations`
`id, restaurant_id, customer_name, customer_phone, party_size, reserved_at, status, notes`

### `kds_stations`
`id, restaurant_id, name, category_ids (text[]), is_active`

### `staff_members`
`id, restaurant_id, user_id, role, permissions (JSONB), is_active`

### `api_keys`
`id, restaurant_id, key_hash, name, is_active, last_used_at, created_at`

### `campaigns`
`id, restaurant_id, name, type, subject, body_html, status, sent_at, recipient_count`

### `code_embeddings` (Dev Tool)
`id, file_path, chunk_index, content (text), embedding (vector(1024)), sha, indexed_at`

### `dev_conversations` (Dev Tool)
`id, user_id (default 'admin'), title, model, messages (JSONB), created_at, updated_at`

---

## Variables de Entorno Críticas

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY         # SOLO en servidor

# App
NEXT_PUBLIC_APP_URL               # https://menius.app
NEXT_PUBLIC_APP_DOMAIN            # menius.app

# Stripe
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_PRICE_STARTER_MONTHLY
STRIPE_PRICE_STARTER_ANNUAL
STRIPE_PRICE_PRO_MONTHLY
STRIPE_PRICE_PRO_ANNUAL
STRIPE_PRICE_BUSINESS_MONTHLY
STRIPE_PRICE_BUSINESS_ANNUAL

# Email
RESEND_API_KEY
RESEND_FROM_EMAIL                 # noreply@menius.app

# Auth
ORDER_TOKEN_SECRET                # token de menú
CRON_SECRET                       # jobs automáticos
ADMIN_EMAIL                       # super-admin (puede ser CSV)

# AI
GEMINI_API_KEY
FAL_API_KEY
ANTHROPIC_API_KEY
OPENROUTER_API_KEY
VOYAGE_API_KEY                    # embeddings código
TAVILY_API_KEY                    # búsqueda web

# Dev Tool
GITHUB_TOKEN                      # acceso repo
VERCEL_TOKEN                      # deploy status
VERCEL_PROJECT_ID                 # prj_pNFA4PgrneGbcu2KmhzkS6FWBwug
GITHUB_WEBHOOK_SECRET             # auto-indexado

# Monitoring
SENTRY_DSN
NEXT_PUBLIC_SENTRY_DSN
SENTRY_AUTH_TOKEN
SENTRY_ORG
SENTRY_PROJECT

# WhatsApp / Notificaciones
WHATSAPP_ACCESS_TOKEN
WHATSAPP_PHONE_NUMBER_ID
WHATSAPP_VERIFY_TOKEN
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_PHONE_NUMBER

# Push
VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
VAPID_SUBJECT

# Redis (rate limiting)
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN

# Analytics
NEXT_PUBLIC_POSTHOG_KEY
NEXT_PUBLIC_POSTHOG_HOST

# Facturama (CFDI México)
FACTURAMA_USER
FACTURAMA_PASSWORD

# Redes sociales
FACEBOOK_ACCESS_TOKEN
INSTAGRAM_ACCOUNT_ID
LINKEDIN_ACCESS_TOKEN
AUTO_PUBLISH_SOCIAL
```

---

## Convenciones de Código

### TypeScript
- Modo strict — NO `any` salvo casos extremos
- Todas las interfaces públicas en `src/types/index.ts`
- Tipos de retorno explícitos en funciones de utilidad
- Usar `unknown` en catch blocks, no `any`

### Next.js
- Route handlers: `export const dynamic = 'force-dynamic'` en todos los POST
- Server components: async/await directo, sin hooks
- Client components: `'use client'` al inicio
- No imports inline — siempre al tope del archivo

### API Routes
- Validar args con Zod o chequeos manuales antes de cualquier DB call
- Usar `createAdminClient()` para bypass de RLS en operaciones que lo requieran
- Respuesta consistente: `NextResponse.json({ error: msg }, { status: N })`
- No exponer detalles de stack traces en errores de producción

### Base de Datos
- NUNCA editar migraciones ya aplicadas — agregar archivos nuevos
- Usar `maybeSingle()` cuando el resultado puede ser null
- Indexes en lugar de `.filter()` para queries grandes
- `No Date.now()` en queries (rompe caching)

### Errores
```typescript
// Error handling patrón:
logger.error('contexto', { error: msg }); // siempre loggear
captureError(err, { route: '/api/...' }); // para Sentry en errores críticos
// throw para casos excepcionales, return null para casos esperados
```

### Commits
- Formato: `type: descripción breve` (fix, feat, refactor, chore)
- Un commit por cambio lógico
- Push a main → auto-deploy en Vercel

---

## Clientes Activos (Tiendas Reales)

| Slug | Características |
|------|----------------|
| `buccaneer` | 250+ productos, 26 categorías — large catalog mode, optimizeImages: true |
| `shelara-bloom` | Nuevo cliente — checkout bug fue arreglado |
| `hot-dogs-perrones` | Nuevo cliente |
| `el-sabor` | Nuevo cliente |
| `comedor-gardenia` | Nuevo cliente |

**Large Catalog Mode** activa automáticamente cuando `productos > 80 || categorías > 12`:
- Filtra por categoría (pills en móvil)
- Limita productos populares a 8
- Cambia layout de ProductCard

---

## Dev Tool Architecture

### Flujo del agente
1. Usuario escribe pregunta/tarea en chat
2. SSE streaming desde `/api/admin/dev/stream`
3. Claude (o modelo elegido) recibe system prompt de CLAUDE.md + historial
4. Claude usa tools: `search_code`, `read_file`, `list_files`, `search_web`, `write_file`, `query_database`
5. `search_code`: Voyage AI embeddings → pgvector similarity search → Voyage rerank
6. `write_file`: propone cambios (diff viewer) → usuario aprueba → `/api/admin/dev/apply`
7. `apply`: GitHub API commit → Vercel auto-deploy (~2 min)

### Modelos disponibles
| ID | Modelo | Proveedor | Notas |
|----|--------|-----------|-------|
| `claude-opus-4-5` | Claude Opus 4.5 | Anthropic | Mejor para tareas complejas |
| `claude-sonnet-4-5` | Claude Sonnet 4.5 | Anthropic | Balanceado (default) |
| `claude-haiku-3-5` | Claude Haiku 3.5 | Anthropic | Rápido y económico |
| `gemini-2.5-pro` | Gemini 2.5 Pro | Google | Contexto 1M tokens |
| `gemini-2.5-flash` | Gemini 2.5 Flash | Google | Rápido |
| `openai/o3` | OpenAI o3 | OpenRouter | Mejor razonamiento |
| `openai/gpt-4.5` | GPT-4.5 | OpenRouter | |
| `meta-llama/llama-4-maverick` | Llama 4 | OpenRouter | Open source |

### Tools disponibles
- `search_code(query, limit?)` — búsqueda semántica en el codebase indexado
- `read_file(path)` — leer cualquier archivo del repo
- `list_files(path)` — listar directorio
- `search_web(query)` — búsqueda web via Tavily
- `write_file(path, content, action, explanation?)` — proponer cambio de archivo
- `query_database(sql)` — SELECT de solo lectura en Supabase prod
- `query_stripe(query)` — métricas de negocio: revenue, subscripciones, MRR

### REGLA DE SELECCIÓN DE HERRAMIENTA (CRÍTICO)

**El agente DEBE elegir la herramienta correcta según el tipo de pregunta:**

| Tipo de pregunta | Herramienta correcta | ❌ NO usar |
|-----------------|---------------------|-----------|
| Datos en producción: tiendas, órdenes, usuarios, pedidos | `query_database` | search_code |
| Revenue, MRR, subscripciones, pagos | `query_stripe` | search_code |
| Cómo funciona el código, dónde está algo | `search_code` | query_database |
| Market research, tendencias, docs externas | `search_web` | search_code |
| Bug en screenshot | search_code para el componente | query_database |

**Ejemplos de queries SQL directos a usar:**
```sql
-- Tiendas registradas esta semana:
SELECT name, slug, created_at FROM restaurants
WHERE created_at >= NOW() - INTERVAL '7 days' ORDER BY created_at DESC LIMIT 20;

-- Órdenes de hoy por estado:
SELECT status, count(*) FROM orders
WHERE created_at::date = CURRENT_DATE GROUP BY status;

-- Restaurantes activos (con suscripción):
SELECT name, slug, stripe_subscription_status FROM restaurants
WHERE stripe_subscription_status = 'active' ORDER BY name LIMIT 50;

-- Últimas órdenes de una tienda:
SELECT o.id, o.total, o.status, o.created_at FROM orders o
JOIN restaurants r ON r.id = o.restaurant_id
WHERE r.slug = '[slug]' ORDER BY o.created_at DESC LIMIT 10;
```

### Indexado
- Embeddings: `voyage-code-3` (1024 dims), reranking: `rerank-2`
- Tabla: `code_embeddings` (file_path, chunk_index, content, embedding, sha)
- Auto-indexado: webhook GitHub en cada push a main
- Función SQL: `search_code_embeddings(query_embedding, match_count, filter_path)`

---

## Patrones de Feature Gates

```typescript
// Verificar acceso a plan:
const hasAccess = await hasPlanAccess(restaurantId, 'pro');
if (!hasAccess) return NextResponse.json({ error: 'Plan Pro requerido' }, { status: 403 });

// AI chat: starter+
// AI imágenes avanzadas: starter+
// Delivery: starter+ (pero configuración en restaurant.order_types_enabled)
// WhatsApp notifications: pro+
// Analytics avanzado: pro+
// Campaña copy AI: pro+
// Multi-ubicación: business+
// API access: business+
```

---

## Pagos (Stripe Connect)

Los restaurantes pueden cobrar online a sus clientes directamente (Stripe Connect):
1. Restaurante se onboarda: `POST /api/connect/onboard`
2. `stripe_account_id` se guarda en `restaurants`
3. `stripe_onboarding_complete: true` cuando completo
4. Pagos de clientes van directo a la cuenta del restaurante
5. Webhook: `POST /api/connect/webhook`

---

## Multi-idioma

Los productos y categorías soportan traducciones:
```typescript
// En DB: translations JSONB { "en": { "name": "...", "description": "..." } }
// En código:
const name = getTranslation(product, 'name', locale) || product.name;
```
El restaurante puede tener `locale: 'es'|'en'` y `available_locales: string[]`.

---

## Cosas Importantes para No Romper

1. **RLS en Supabase**: Las tablas tienen Row Level Security. `createAdminClient()` la bypasa. `createServerClient()` respeta las políticas del usuario autenticado.

2. **Idempotency en órdenes**: Cada orden tiene `idempotency_key`. Reintento = misma orden, no duplicado.

3. **Cache invalidation**: Siempre llamar `revalidateTag(`menu-data:${slug}`)` cuando se modifique el menú.

4. **Webhook idempotency**: `processed_webhook_events` evita procesar el mismo evento Stripe dos veces.

5. **FK de modificadores**: `order_item_modifiers.group_id` y `option_id` deben existir en `modifier_groups` y `modifier_options`. Validar antes de insertar.

6. **Plan IDs en DB**: Solo `starter`, `pro`, `business`. Nunca guardar `free`.

7. **Migraciones**: NUNCA editar archivos de migración ya aplicados. Crear nuevo archivo.

8. **Stripe webhooks**: Siempre verificar `stripe-signature`. Siempre retornar 200 rápido.

9. **Productos slim**: `[slug]/page.tsx` slimea products antes de pasar a MenuShell. No añadir modifier_groups al prop sin actualizar el patrón de lazy loading.

10. **`ADMIN_EMAIL`**: Puede ser CSV (`email1,email2`). La función `verifyAdmin()` ya lo maneja.
