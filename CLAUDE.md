# MENIUS

SaaS de menús digitales + POS para restaurantes en LatAm.
Repo: `github.com/aptitud10-cmd/menius` (main) · Prod: `menius.app` (Vercel auto-deploy)
Stack: Next.js 14 App Router · Supabase · Stripe Connect · Resend

> Detalles extendidos (schema DB, env vars, clientes, crons, dev tool, stack extra) viven en memorias on-demand en `~/.claude/projects/c--Users-willi-menius/memory/`. Pedime lo que necesites.

## Auth — patrones que NO son derivables
- Tenant: `getTenant()` → `{ userId, restaurantId } | null`
- Admin: `verifyAdmin()` (usa `ADMIN_EMAIL` env, soporta CSV: `a@x.com,b@x.com`)
- Cron: header `Authorization: Bearer ${CRON_SECRET}`
- API pública v1: `validateApiKey()` — header `x-api-key` o `Authorization: Bearer`
- **Excepción**: `admin/regenerate-images/route.ts` usa `getTenant()`, NO `verifyAdmin()`

## Supabase clients
- `createBrowserClient()` — client components
- `createServerClient()` — server components/route handlers (respeta RLS)
- `createAdminClient()` — service role, bypasa RLS
- Regla: service role NUNCA en cliente. Usar admin client en orders/billing/cron.

## Planes y comisiones (CRÍTICO)
Tipos: `'free' | 'starter' | 'pro' | 'business'`
- **`free` NUNCA se guarda en DB** — solo acepta `starter|pro|business`
- `free` lo infiere `getEffectivePlanId()` cuando no hay subscripción activa
- Siempre usar `getEffectivePlanId(rid)` o `hasPlanAccess(rid, 'pro')` para chequear
- Aliases legacy: `basic`→`starter`, `enterprise`→`business` (`resolvePlanId()`)
- Trial: 14 días, plan `starter` estado `trialing`

Comisiones online (pagos con tarjeta):
- free: no permite online
- starter/pro/business activos: **0%**
- trial: 0%
- Wompi (Colombia): 0% MENIUS (Wompi cobra aparte)

Plan Comisión 4% (INTERNO — no público desde 2026-04-29):
- Columna `restaurants.commission_plan = true` → cobra 4% por orden online + features tier "starter"
- Activación SOLO desde `/admin/restaurant?id=XXX` (botón "Activar plan 4%")
- Endpoint admin: `/api/admin/toggle-commission-plan` (verifyAdmin + UUID validation)
- Country gating: bloqueado en Colombia (Wompi no soporta application_fee)
- Toda la lógica de cobro 4% sigue activa en `/api/orders`, `/api/payments/checkout`, `/api/payments/intent` y `/api/billing/commissions`
- NO mostrar este plan en landing, FAQ, signup ni dashboard del cliente — uso solo para clientes especiales

## Órdenes
Estados DB: `pending|confirmed|preparing|ready|delivered|cancelled`
(API v1 además: `accepted|delivering|completed`)
- **Idempotency-Key obligatorio** en `/api/orders` → mismo key = misma orden
- **FK modifiers**: validar `group_id`/`option_id` ANTES de insertar
- `notifyNewOrder()` no bloquea la respuesta

## Product slim pattern (no romper)
`[slug]/page.tsx` SLIMEA productos antes de pasarlos a `MenuShell`:
- `modifier_groups: []`, `variants: []`, `extras: []`
- agrega flag `has_modifiers: boolean`
- lazy fetch en `CustomizationSheet` → `GET /api/product-modifiers?productId=xxx`

Reduce RSC payload de ~2MB → ~200KB en catálogos grandes (ej: Buccaneer).
**No añadir `modifier_groups` al prop sin actualizar el patrón de lazy load.**

## Caching
- ISR menús: `export const revalidate = 300`
- `unstable_cache` de datos del menú: 1h, tags `menu-data:${slug}`
- **Al editar menú**: `revalidateTag('menu-data:' + slug)`
- No uses `Date.now()` en queries (rompe cache)

## Convenciones código
- TS strict — no `any` (usar `unknown` en catch)
- Route handlers POST: `export const dynamic = 'force-dynamic'`
- Validar args (Zod o manual) ANTES de cualquier DB call
- Errores: `logger.error()` + `captureError()` a Sentry en casos críticos
- **Migraciones aplicadas son inmutables** — crear archivo nuevo
- `.maybeSingle()` cuando el resultado puede ser null

## Store overrides
`src/lib/store-overrides.ts` → feature flags por slug
Uso en client: `const config = useStoreConfig()`
Activos: `buccaneer` (`optimizeImages: true`)

## Large catalog mode
Se activa auto si `productos > 80 || categorías > 12`.
Filtros por categoría + layout distinto de ProductCard.

## Reglas que NO romper
1. RLS — distinguir admin client vs server client
2. Idempotency en `/api/orders`
3. Cache invalidation al editar menú
4. Webhook idempotency (tabla `processed_webhook_events`)
5. FK modificadores
6. Plan IDs en DB: nunca `free`
7. Migraciones inmutables
8. Stripe webhooks: verificar signature + 200 rápido
9. Product slim pattern (arriba)
10. `ADMIN_EMAIL` puede ser CSV
11. **Columnas en select explícito**: Si un query usa columnas específicas (no `select('*')`), CADA columna debe tener su migración en `supabase/migrations/`. Antes de hacer un select explícito, verificar que todas las columnas existen buscando en las migraciones. Un select explícito que incluya una columna inexistente en prod rompe TODAS las tiendas (error 42703 → notFound()).

## Android Counter app
`apps/menius-counter-android/` — APK único para todos los restaurantes.
- WebView carga `menius.app` (login → Counter); misma sesión que web
- Impresión térmica ESC/POS vía Bluetooth (`MeniusAndroid.printReceipt(json)`)
- Config: `AppConfig.kt` — URL base + START_PATH
- Build: Android Studio Hedgehog+, JDK 17, API 26+
- Multi-tenant: cada restaurante inicia sesión con su cuenta MENIUS

## Qué NO está aquí (lo leo del repo cuando hace falta)
- Estructura de directorios → el repo
- Schema DB completo → `supabase/migration*.sql`
- Env vars → `.env.local` + `src/lib/env.ts`
- Precios/límites de planes → `src/lib/plans.ts`
- Cron schedules → `vercel.json`
- Clientes activos → query a `restaurants`
- Stack extendido (Gemini, fal.ai, Twilio, etc.) → `package.json` + env
