# Menius — Auditoría técnica integral

> **Pasada 1 — 2026-04-25.** Branch auditado: `main`. Foco: 10 áreas pedidas, hallazgos verificados con `file:line`.
> Lo que dice "verificar" es porque no leí el archivo entero (límite de tiempo/contexto), no porque sea ambiguo.

---

## 0. Resumen ejecutivo — Top 10

Calificación global: **8/10**. La base es sólida (idempotency, signature en webhooks, RLS habilitado, pricing recalculado server-side, Realtime con filtros y cleanup, headers de seguridad fuertes). Los riesgos reales son **operacionales** y de **calidad de código**, no de seguridad financiera.

| # | Severidad | Problema | Archivo |
|---|-----------|----------|---------|
| 1 | 🔴 | **`ORDER_TOKEN_SECRET` permisivo cuando no está seteado** — bypass de protección antibot | `src/lib/order-token.ts:44` |
| 2 | 🔴 | **CSP permite `'unsafe-eval'`** — vector de inyección si llegara XSS | `next.config.js:36` |
| 3 | 🔴 | **293 ocurrencias de `: any` / `as any`** concentradas en código de plata (orders, payments, MenuShell) | `src/components/orders/CounterView.tsx`, `src/app/api/orders/route.ts` |
| 4 | 🔴 | **No hay tests de `/api/orders` ni `/api/payments/webhook`** — toda la lógica de plata sin red | `src/__tests__/` |
| 5 | 🔴 | **Price/modifier mismatch loguea `warn` en vez de `error`** — fraude silencioso pasa Sin alertar | `src/app/api/orders/route.ts:323,361` |
| 6 | 🟡 | **`OrderNotifier` no maneja `CHANNEL_ERROR` / reconexión** — owner deja de recibir órdenes en background | `src/components/dashboard/OrderNotifier.tsx:85` |
| 7 | 🟡 | **Auto-retry silencioso en checkout (2s)** — UX confuso, posible doble submit si user no nota | `src/components/public/CheckoutPageClient.tsx:610-617` |
| 8 | 🟡 | **`CustomizationSheet` y `framer-motion` cargados eager en `MenuShell`** — bundle grande en menú público | `src/components/public/MenuShell.tsx:23` |
| 9 | 🟡 | **Crons cada 3-5-10 min en Vercel** — costo y ruido. Consolidables. | `vercel.json` |
| 10 | 🟡 | **`src/lib/` con 39 archivos top-level** — costo cognitivo, dificulta onboarding | `src/lib/` |

---

## 1. Seguridad y Multi-tenancy

### 🔴 Crítico

- **`src/lib/order-token.ts:44`** — `verifyOrderToken` retorna `true` si `ORDER_TOKEN_SECRET` y `NEXTAUTH_SECRET` están vacíos. **Verificar en Vercel** que al menos uno está seteado en `production`. Si no, los honeypots y el token son cosméticos. **Fix:** en producción fallar duro si no hay secret (`if (!SECRET && process.env.NODE_ENV === 'production') throw`). **Complejidad: S.**
- **`next.config.js:36`** — CSP `script-src` incluye `'unsafe-eval'`. Si en algún momento entra un XSS (ej. por translation string mal sanitizada renderizada dentro de un `dangerouslySetInnerHTML`), `unsafe-eval` permite escalarlo a RCE en el cliente. **Fix:** Identificar qué necesita eval (probablemente Monaco editor en `/admin` o un legacy de Mapbox). Aislarlo con un nonce o servirlo en una ruta sin la directiva. **Complejidad: M.**

### 🟡 Medio

- **`src/app/api/v1/orders/route.ts:73-89`** — Devuelve `customer_email`, `customer_phone`, `delivery_address` al cliente API. Es OK porque filtra por `auth.restaurantId`, pero **conviene documentar en API_DOCUMENTATION.md** que estos endpoints sólo se autorizan al dueño. **Fix:** nota explícita en docs. **Complejidad: S.**
- **`src/app/api/public/repeat-order/route.ts:31-46`** — Permite enumerar órdenes por `phone` + `restaurant_id`. Si alguien itera por `restaurant_id` y por números MX comunes, puede mapear clientes. **Fix:** rate limit más bajo + agregar Turnstile en pull pull, o bloquear si > N consultas con el mismo número en T minutos. **Complejidad: S.**
- **`src/lib/notifications/order-notifications.ts:79`** — Errores de email se devuelven como `false` y nunca llegan a Sentry. Si Resend falla por API key vencida, te enterás cuando un cliente reclame. **Fix:** `captureError(...)` antes del return. **Complejidad: S.**
- **`dangerouslySetInnerHTML` en `AutomationsPanel.tsx` y `(dashboard)/app/settings/data/page.tsx`** — verificar de dónde viene el contenido. Si es plantilla server-rendered hardcoded, OK; si recibe input de usuario, sanitizar. **Complejidad: S (revisión).**
- **Migraciones aplicadas a la base "limpian" RLS de tablas viejas** (`migration-rls-security-fixes.sql`, `migration-security-audit-fixes.sql`) — **verificar en Supabase Dashboard** que TODAS las tablas con datos por tenant tienen `rowsecurity = true`. Quick check:
  ```sql
  select schemaname, tablename, rowsecurity from pg_tables where schemaname='public' and rowsecurity = false;
  ```
  Si aparecen tablas con `restaurant_id`, son leak en potencia. **Complejidad: S (verificación).**

### 🟢 OK
- `getTenant()` valida `userId` + `restaurantId` desde `profiles.default_restaurant_id`.
- `validateApiKey()` hashea SHA256 contra DB.
- Stripe / Wompi / MercadoPago webhooks **verifican signature** + idempotency con `processed_webhook_events`.
- `createAdminClient` (service role) no se importa en componentes `'use client'`.
- Anon key expuesta como `NEXT_PUBLIC_` (correcto, RLS la protege).
- Rate limit aplicado en `/auth`, `/api/orders`, `/api/orders/status`, `/api/public/*`.
- Middleware exige email verification para acceder al dashboard.

---

## 2. Performance

### 🟡 Medio

- **`src/components/public/MenuShell.tsx:23`** — `CustomizationSheet` y `framer-motion` se importan eager. El sheet se abre raramente (sólo al personalizar producto). **Fix:** `dynamic(() => import('./CustomizationSheet'), { ssr: false })`. Estimado: **−40-60 KB gzip** del bundle del menú. **Complejidad: S.**
- **`src/app/[slug]/menu-data.ts`** — `select('*')` en `restaurants` trae JSONB pesados (`operating_hours`, `translations`, `available_locales`) que solo se usan parcialmente en el hot path. **Fix:** select explícito de columnas usadas. **Complejidad: S.**
- **`useTransition` no se usa en `CheckoutPageClient`** — submit grande sin `isPending` para feedback visual. **Fix:** envolver el submit en `startTransition` para no bloquear el render del botón de "Pagar". **Complejidad: S.**
- **`vercel.json` crons `*/3` `*/5` `*/10`** — `auto-complete-pickup` cada 3 min, `monitor-stores` y `activate-scheduled` cada 5 min, `monitor-orders` cada 10 min. En Vercel free/pro estos consumen invocaciones. **Fix:** subir a 10/15 min salvo que haya razón clara para tan agresivos; o consolidar en un único `tick` cada 5 min que dispara los handlers internamente. **Complejidad: M.**

### 🟢 OK
- `revalidate = 300` en `[slug]/page.tsx`, alineado con header CDN `s-maxage=300, stale-while-revalidate=600`.
- `generateStaticParams()` pre-genera rutas.
- `revalidatePublicMenuForRestaurant()` se invoca al editar producto / cambiar stock.
- Imágenes vía `next/image` + supabase loader + AVIF/WebP + cache 30 días.
- `menu-data.ts` paraleliza queries con `Promise.all` (no N+1).
- Modificadores **lazy-loaded** vía `/api/product-modifiers` (slim pattern del CLAUDE.md).
- Realtime: filtros server-side por `restaurant_id` (no carga eventos de otros tenants).
- `optimizePackageImports` para `lucide-react`, `framer-motion`, `@dnd-kit/*`.

---

## 3. iOS / Mobile

### 🟡 Medio

- **`PhoneField` (componente dynamic en `CheckoutPageClient.tsx:25`)** — verificar que su `<input>` interno tiene `font-size: 16px`. Los recientes commits arreglaron Safari pero PhoneField es de tercero. **Complejidad: S (verificación).**
- **`CheckoutPageClient.tsx:1001-1060`** — Demo payment inputs usan `text-sm font-mono` (~14px). Es demo-only pero conviene `text-base` para consistencia con resto del checkout. **Complejidad: S.**
- **`CustomizationSheet.tsx:414,443`** — Grid view de variants/extras con `py-3` (~40px). Marginal contra los 44px recomendados. **Fix:** `py-3.5` o `min-h-11`. **Complejidad: S.**

### 🟢 OK (ya arreglado en commits recientes)
- `globals.css:135` — `.min-h-screen-safe { min-height: 100vh; min-height: 100dvh; }`
- Sticky CTA con `pb-[max(1.25rem,env(safe-area-inset-bottom))]` en MenuShell, CartPanel, CheckoutPageClient.
- `viewportFit: 'cover'` en metadata.
- `WebkitOverflowScrolling: 'touch'` + `overscrollBehavior: 'none'` (commit `a8e88d0`).
- `LandingStickyCta` migrado a IntersectionObserver (commit `331fb75`).
- Inputs principales (`inputClass`) en `text-base` (16px) — no zoom en iOS.
- Quantity buttons `w-11 h-11` (44×44).

---

## 4. Checkout y Carrito

### 🔴 Crítico

- **`src/app/api/orders/route.ts:323,361`** — `logger.warn('Price mismatch')` y `logger.warn('legacy modifier')` cuando el cliente manda precios distintos de los del servidor. El servidor corrige silenciosamente y la orden pasa con precio del DB (bien), pero estos logs **deberían ser `error`** para que Sentry / monitoreo los levante. Si entran 100 al día estás sufriendo intentos de manipulación de precio sin enterarte. **Fix:** cambiar nivel + agregar `captureWarning` con `tags: { kind: 'price_mismatch' }`. **Complejidad: S.**
- **No hay tests automatizados de `/api/orders`** — toda la lógica de pricing, modifiers, comisiones, idempotency, descuentos, loyalty, tax. Un refactor te puede romper checkout sin que CI te avise. **Fix:** suite `vitest` con casos: precio manipulado, modifier inexistente, modifier sin grupo, doble submit con mismo idempotency key, promo expirada, loyalty sin saldo, tip > subtotal, restaurant pausado, fuera de horario, plan free + online (debe rechazar). **Complejidad: L (~1-2 días).**

### 🟡 Medio

- **`src/components/public/CheckoutPageClient.tsx:610-617`** — Auto-retry tras network error con 2s de delay y sin UI de "Reintentando...". Si el primer submit creó la orden pero la red cortó la respuesta, el `idempotencyKeyRef` lo cubre — pero si el user hace click manual durante esos 2s con un key NUEVO regenerado por reload, hay riesgo de duplicado. **Fix:** mostrar UI "Reintentando…" + bloquear el botón explícitamente durante ese window. **Complejidad: S.**
- **`src/components/public/CheckoutPageClient.tsx:254-301`** — `/api/cart/quote` se invoca cada vez que cambia el carrito; si falla cae a estimado local. UX puede mostrar total local que difiere del final. El servidor recalcula igual al crear orden, así que no es fraude — pero el user puede ver "$120" y cobrarse "$118" o viceversa. **Fix:** tras crear la orden, mostrar el total final del server con énfasis ("Total cobrado: $X"). **Complejidad: S.**
- **`src/app/api/orders/route.ts:350`** — Fallback de modifier por `group_name` cuando `group_id` no matchea. Mitigado porque opciones no encontradas se cobran $0, pero **el riesgo real** es que un modifier required NO se valide. **Verificar** si `min_select`/`max_select` se enforce sobre el set de modifiers efectivamente válidos (después del fallback) o sobre los recibidos del cliente. **Complejidad: S (verificación).**

### 🟢 OK
- Idempotency-Key en `/api/orders` (línea 31-50): rechaza > 128 chars, busca existente antes de insertar, devuelve "ganador" en race.
- Servidor **recalcula** unit_price desde DB (línea 285-366). El `delivery_fee` viene de `restaurant.delivery_fee`, no del body. `discount_amount` se recalcula desde `promo_code`. `tax_amount` desde `tax_rate`. `tip_amount` clampeado al subtotal.
- Validación de `is_active`, `in_stock`, horario operativo (`operating_hours`), `orders_paused_until`.
- Comisión: 4% si `commission_plan = true`, 0% activo/trial, 0% Wompi.
- Stripe Checkout `application_fee_amount` aplica comisión sobre `order.total` del DB, no del cliente.
- Carrito Zustand persiste en localStorage y se limpia al cambiar de slug (`src/store/cartStore.ts:64-71`).
- `submittingRef` previene doble click.
- Estados de orden con `canTransition()` en `src/lib/order-state.ts`.
- Promo: RPC `increment_promo_usage` con lock (atómico). Loyalty: RPC `redeem_loyalty_points` con `FOR UPDATE` (verificar SQL).

---

## 5. Realtime y Dashboard

### 🟡 Medio

- **`src/components/dashboard/OrderNotifier.tsx:85`** — `.subscribe()` sin status handler. Si el WS cae, el dueño deja de oír el chime de orden nueva sin saberlo. Comparar con `OrderTracker.tsx:270-278` que sí lo hace. **Fix:** copiar el patrón de OrderTracker (status → reconnecting/connected/disconnected + indicador visual). **Complejidad: S.**
- **`src/components/dashboard/NotificationBell.tsx:94`** — Mismo issue, sin status handler.
- **`src/hooks/use-realtime-orders.ts:63,92`** — `(data as any).order_items` y `data.map((o: any) => …)`. **Fix:** schema Zod o tipo desde DB types generados. **Complejidad: S.**
- **`order-notifications.ts:189,230,308`** — `.catch(() => {})` silentes. Si la notificación al owner falla, nadie se entera. **Fix:** logger + `captureError`. **Complejidad: S.**

### 🟢 OK
- `use-realtime-orders.ts:141,164` — filtra `restaurant_id=eq.${restaurantId}` (no leak multi-tenant).
- Cleanup `removeChannel(channel)` en todos los `useEffect` revisados.
- Polling fallback cada 10s (línea 85) si el realtime falla.
- Deduplicación con `knownIdsRef` + `lastStatusRef`.
- `MenuShell.tsx:272,292` — channels para products y restaurants con cleanup.
- `MenuUpdateBanner.tsx:25-43` — channel para detectar cambios + cleanup.
- `OrderTracker.tsx:255-282` — broadcast channel con status handler completo.

---

## 6. TypeScript y Calidad

### 🔴 Crítico

- **293 ocurrencias `: any` / `as any`** en `src/`. Peores ofensores:
  - `src/components/orders/CounterView.tsx` — 28 (componente crítico para counter)
  - `src/app/api/orders/route.ts` — 12 (endpoint crítico)
  - `src/components/public/MenuShell.tsx` — 11
  - `src/lib/notifications/order-notifications.ts` — 8
  - **Fix:** generar tipos de Supabase con `npx supabase gen types typescript --project-id ... > src/types/database.types.ts` y usarlos. **Complejidad: M.**

### 🟡 Medio

- **No hay tests de payments webhook** — Stripe/Wompi/MP webhooks pueden romperse silenciosamente. **Complejidad: M.**
- **446 `console.log/error` en 201 archivos** — coexiste con `src/lib/logger.ts`. Mezclar es OK pero conviene reglar: `console.*` solo en client components, `logger.*` en server. **Fix:** ESLint rule `no-console` con override por path. **Complejidad: S.**
- **Catches vacíos / silenciosos**:
  - `src/lib/notifications/email.ts:78` — `.catch(() => ({}))`
  - `src/app/api/payments/webhook/route.ts:56-59` — catch sin log
  - `order-notifications.ts:79` — return false sin reportar
  - **Fix:** mínimo `logger.error` en cada uno. **Complejidad: S.**

### 🟢 OK
- 0 ocurrencias de `@ts-ignore` / `@ts-nocheck`.
- `eslint-disable` solo en 10 archivos, mayormente para reglas legítimas.
- `src/lib/error-reporting.ts` envuelve Sentry y se usa en `/api/orders/route.ts:939`, webhooks.
- Tests existentes: `calculate-pricing.test.ts`, `cart-store.test.ts`, `checkout-integration.test.ts`.
- TS strict habilitado (CLAUDE.md), `unknown` en catches en código nuevo.

---

## 7. SEO y Metadata

### 🟢 OK (poca cosa que mejorar)
- `[slug]/page.tsx` — `generateMetadata` con OG (title, description, url, image dinámica con `cover_image_url || logo_url`), Twitter card, locale `es_MX`/`en_US`, canonical, hreflang vía `alternates.languages`.
- `sitemap.ts` — incluye restaurantes activos dinámicamente (limit 5000), blog posts, páginas estáticas.
- `robots.ts` — disallow `/app/`, `/api/`, `/auth/`, `/admin/`, `/onboarding/`.
- `JsonLdScript` — Restaurant schema con address, geo, phone, image, paymentAccepted, OpeningHoursSpecification, AggregateRating, Menu/MenuSection/MenuItem con `suitableForDiet` y stock.
- Cookie `menius_locale` + `RootLayout` set `lang`.

### 🟡 Sugerencias
- En `JsonLdScript`, `hasMenuSection` actualmente toma top-3 categorías; con catálogos grandes (Buccaneer) conviene incluir todas.
- Demo restaurants (`the-grill-house`, etc.) no tienen `alternates.canonical` explícito en `generateMetadata` — duplicate content potencial si se indexan. Bajo impacto.

---

## 8. UX y Accesibilidad

### 🟡 Medio

- **Contraste `text-gray-400` (#9ca3af)** sobre blanco — ratio ~3.4:1 (WCAG AA falla para texto normal, pasa solo para large text 18pt+). Usado en CartPanel, CategorySidebar, CheckoutPageClient. **Fix:** texto importante a `text-gray-600` (#4b5563), helper text mantener gray-400 si es decorativo. **Complejidad: S.**
- **Strings hardcoded en español** en algunos componentes admin/dashboard sin pasar por `getTranslations()` — bajo impacto si los dueños son LatAm, pero romp i18n para EN. **Fix:** auditar dashboard. **Complejidad: M.**
- **`alt=""` en `BulkImageUpload.tsx:347,429` y `CategoriesManager.tsx:90`** — verificar si decorativos (entonces `aria-hidden="true"` también) o funcionales (alt descriptivo). Admin-only, bajo impacto. **Complejidad: S.**

### 🟢 OK
- `src/app/[slug]/loading.tsx` — skeleton bien hecho.
- `error.tsx` y `global-error.tsx` muestran mensaje bilingüe + digest + Sentry capture.
- ARIA labels en botones icon-only (CartPanel, CheckoutPageClient, CustomizationSheet).
- `role="dialog"` + `aria-labelledby` en sheets.
- `role="alert"` en mensajes de error.

---

## 9. Estructura del Proyecto

### 🟡 Medio

- **`src/lib/` con 39 archivos top-level + 15 subcarpetas** — mezcla data, config, dominio, utilidades. **Fix opcional:**
  - `src/data/` ← demo-data, blog-data, dietary-tags, country-config
  - `src/config/` ← env, turnstile, stripe, tax-presets
  - `src/i18n/` ← translations, dashboard-translations, landing-translations, i18n
  - `src/lib/` queda solo dominio + utils
  - **Complejidad: M (refactor mecánico, mucho touching de imports).**
- **`apps/menius-counter-android`** — convive en monorepo. CLAUDE.md no menciona cómo se relaciona con `main`. **Fix:** una nota corta en CLAUDE.md o README en la carpeta. **Complejidad: S.**

### 🟢 OK
- `src/components/` está bien organizado (admin, public, dashboard, ui, shared).
- Separación auth (browser/server/admin) clara en `src/lib/supabase/`.
- TypeScript strict, tipos en `src/types/`.

---

## 10. Deployment y DevOps

### 🔴 Crítico

- **`next.config.js:36` CSP `'unsafe-eval'`** — ya cubierto en sección 1. **Complejidad: M.**

### 🟡 Medio

- **`vercel.json` crons agresivos** — ya cubierto en sección 2.
- **`.env.local.example`** — falta `SENTRY_DSN` (sin `NEXT_PUBLIC_`) que `sentry.server.config.ts:3` lee. **Complejidad: S.**
- **No hay deploy automatizado en `.github/workflows`** — solo lint + test + e2e. Vercel deploya solo, así que es OK, pero **conviene gate** el deploy a Vercel a que CI pase (Vercel ↔ GitHub integration tiene esto). **Verificar.**

### 🟢 OK
- `vercel.json` headers: HSTS 2 años + preload, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy strict, Permissions-Policy, X-Frame-Options DENY (excepto demos).
- CSP comprehensivo: `default-src 'self'`, lista blanca de hosts (Stripe, Sentry, PostHog, Mapbox, Crisp, Supabase WSS).
- Sentry: client/server/edge configs con sample rates razonables, `tunnelRoute` para evadir adblockers, sourcemaps ocultos.
- `instrumentation.ts` registra Sentry condicionalmente.
- CI: lint + unit tests + e2e (Playwright).
- Bundle analyzer disponible vía `ANALYZE=true`.

---

## 11. Plan de acción priorizado

### Fase 1 — Críticos (rotos / inseguros / bloquean usuarios)

| # | Acción | Archivo | Complejidad |
|---|--------|---------|-------------|
| 1 | **Verificar `ORDER_TOKEN_SECRET` en Vercel prod**. Si falta, agregar y forzar fallo en producción cuando no exista. | `src/lib/order-token.ts:44` | S |
| 2 | **Cambiar `logger.warn` → `logger.error` + Sentry tag** en price/modifier mismatch. | `src/app/api/orders/route.ts:323,361` | S |
| 3 | **Verificar RLS en Supabase**: `select tablename from pg_tables where schemaname='public' and rowsecurity=false` y revisar resultado. | Supabase Dashboard | S |
| 4 | **Auditoría puntual de `dangerouslySetInnerHTML`** en `AutomationsPanel.tsx` y `(dashboard)/app/settings/data/page.tsx` — confirmar que no toca user input. | 2 archivos | S |
| 5 | **Tests `/api/orders`**: pricing, modifiers, idempotency, doble submit, plan free+online rechazado, restaurant pausado, fuera de horario, tip clamp. | `src/__tests__/api/orders.test.ts` (nuevo) | L |
| 6 | **Eliminar/aislar `'unsafe-eval'` en CSP**. Identificar de dónde viene (Monaco? Mapbox?), aislar o reemplazar. | `next.config.js:36` | M |
| 7 | **Agregar status handler a `OrderNotifier` y `NotificationBell`** (reconnect + indicador visual). | 2 archivos | S |
| 8 | **Reemplazar `.catch(() => {})` por logger + Sentry** en `order-notifications.ts`, `email.ts`, payments webhook catches. | 4 archivos | S |

**Tiempo estimado Fase 1: 2-3 días** (mayoría S + 1 L de tests).

---

### Fase 2 — Importantes (performance / UX visible)

| # | Acción | Archivo | Complejidad |
|---|--------|---------|-------------|
| 9 | **`CustomizationSheet` a `dynamic`** + lazy-load de framer-motion en MenuShell. | `MenuShell.tsx:23` | S |
| 10 | **`menu-data.ts` `select('*')` → columnas explícitas** en restaurants. | `src/app/[slug]/menu-data.ts` | S |
| 11 | **Rate limit más agresivo + Turnstile** en `/api/public/repeat-order`. | `route.ts:31` | S |
| 12 | **Auto-retry checkout con UI explícita** "Reintentando…" + bloquear botón. | `CheckoutPageClient.tsx:610-617` | S |
| 13 | **Mostrar total final del server post-orden** con énfasis para evitar dudas vs estimado. | `CheckoutPageClient.tsx` | S |
| 14 | **`text-gray-400` → `text-gray-600` en texto importante** (no helper text). | grep + replace | S |
| 15 | **Tests `/api/payments/webhook`** (Stripe + Wompi + MP). | `src/__tests__/api/webhooks.test.ts` | M |
| 16 | **`useTransition` en submit del checkout** para feedback visual. | `CheckoutPageClient.tsx` | S |
| 17 | **PhoneField font-size verificar**. Demo card inputs `text-sm → text-base`. CustomizationSheet grid `py-3 → py-3.5`. | varios | S |
| 18 | **Consolidar crons agresivos `*/3` `*/5`** a `*/10` o tick único. | `vercel.json` | M |

**Tiempo estimado Fase 2: 3-4 días.**

---

### Fase 3 — Mejoras (refactors / nice-to-have)

| # | Acción | Archivo | Complejidad |
|---|--------|---------|-------------|
| 19 | **Generar tipos Supabase** (`gen types typescript`) y reemplazar `any` en orders/route, CounterView, MenuShell. | varios | M |
| 20 | **ESLint rule `no-console`** con override de paths. | `.eslintrc.json` | S |
| 21 | **Reorganizar `src/lib/`** → `src/data/`, `src/config/`, `src/i18n/`. | masivo | M |
| 22 | **Tests Realtime reconnect logic + notification delivery**. | `__tests__/realtime/*` | M |
| 23 | **Auditar i18n en dashboard** — strings hardcoded. | dashboard | M |
| 24 | **`JsonLdScript`: incluir todas las categorías en `hasMenuSection`** para catálogos grandes. | componente | S |
| 25 | **Documentar `apps/menius-counter-android`** en CLAUDE.md o README local. | doc | S |
| 26 | **`alt=""` en BulkImageUpload / CategoriesManager** → `aria-hidden="true"` o alt descriptivo. | 3 archivos | S |
| 27 | **Agregar `SENTRY_DSN` al `.env.local.example`**. | doc | S |

**Tiempo estimado Fase 3: 4-6 días** (refactor de `src/lib/` es lo que más pesa).

---

## 12. Cosas que verificar manualmente (no pude del todo)

1. **`ORDER_TOKEN_SECRET` está seteado en Vercel prod?** (sección 1, hallazgo #1).
2. **RLS habilitado en TODAS las tablas con `restaurant_id`?** (query SQL en Fase 1 #3).
3. **Vercel ↔ GitHub integration tiene "wait for CI" habilitado?** (sección 10).
4. **`AutomationsPanel.tsx` y `settings/data/page.tsx` `dangerouslySetInnerHTML` source?** (Fase 1 #4).
5. **RPC `redeem_loyalty_points` y `increment_promo_usage` usan `FOR UPDATE`** en su SQL? (sección 4 OK note).
6. **Vercel cron costs**: revisar dashboard de invocaciones — si los `*/3-5-10` minutos consumen presupuesto, prioridad sube.

---

## 13. No revisado en esta pasada

- **Drivers / GPS / tracking** (`src/lib/tracking/`, `src/app/api/driver/`).
- **Loyalty atómica completa** (revisé el flow de checkout, no la economía completa).
- **Inventory** (`migration-inventory.sql`).
- **AI Dev Tool** (`/admin/dev` — CLAUDE.md dice "aún no implementado").
- **`apps/menius-counter-android`** (Kotlin, fuera de scope web).
- **`.worktrees/prod-safe`** (rama paralela; mencionado como blocked por aprobación de WhatsApp).

Si querés segunda pasada en alguna de estas, decime cuál.

---

*Generado por auditoría asistida — 2026-04-25.*
