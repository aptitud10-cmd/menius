# Plan Menius 2026 — Top-1 Menu Experience

> **Para:** Claude Sonnet (ejecutor)
> **De:** Claude Opus (planner) + William
> **Objetivo:** Llevar la experiencia del menú público (`menius.app/[slug]`) y el panel del restaurantero a nivel "top-1 mundial" en 2026, con foco en conversión, AOV (average order value) y retención.
> **Stack actual:** Next.js 14 App Router · Supabase · Stripe Connect · Resend · Gemini · fal.ai · Framer Motion (asumido por Cart particles existentes)

---

## 0. Contexto crítico — leé esto antes de tocar código

1. **CLAUDE.md** del repo — reglas no negociables (RLS, cache invalidation, migraciones inmutables, planes en DB nunca `free`, FK modifiers, idempotency, etc.).
2. **Product slim pattern**: `[slug]/page.tsx` slimea productos antes de pasar a `MenuShell`. Si añadís props nuevas, mantené el patrón de lazy load (`/api/product-modifiers`).
3. **Cache**: ISR 300s + `unstable_cache` con tag `menu-data:${slug}`. Toda edición de menú/datos debe llamar `revalidateTag('menu-data:' + slug)`.
4. **Componentes ya existentes** (NO duplicar):
   - `src/components/public/MenuShell.tsx` — orquestador del menú público
   - `src/components/public/ProductCard.tsx` (+ Mobile/Desktop) — cards de producto
   - `src/components/public/CartPanel.tsx` — carrito lateral
   - `src/components/public/CartFlyParticles.tsx` — animación fly-to-cart (ya existe ✅)
   - `src/components/public/CustomizationSheet.tsx` — sheet de modificadores
   - `src/components/public/OrderTracker.tsx` — tracker de orden ya existe ✅
   - `src/components/public/RepeatOrderButton.tsx` — repetir orden ya existe ✅
   - `src/components/public/CategorySidebar.tsx` — sidebar categorías
5. **Migraciones existentes relevantes**:
   - `migration-loyalty.sql` + `migration-loyalty-orders.sql` ✅ (loyalty ya hay)
   - `migration-suggestions.sql` ✅ (sistema de sugerencias ya hay base)
   - `migration-promotions.sql` ✅
6. **Antes de hacer un select explícito de columnas**: verificar que la columna existe en alguna `migration-*.sql`. Sin migración → 42703 → 404 en prod.

---

## 1. Sprint 1 — Quick wins (1-2 sesiones)

### 1.1 Social proof badges en ProductCard (#1) ✅ COMPLETO

**Goal:** mostrar `🔥 Top de la semana`, `✨ Nuevo`, `⭐ #1 popular` en cards.

**Backend:**
- Nueva migración `supabase/migration-product-popularity.sql`:
  ```sql
  ALTER TABLE products
    ADD COLUMN IF NOT EXISTS popularity_rank int,
    ADD COLUMN IF NOT EXISTS orders_last_7d int DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_new boolean GENERATED ALWAYS AS (created_at > NOW() - INTERVAL '14 days') STORED;
  CREATE INDEX IF NOT EXISTS idx_products_popularity ON products(restaurant_id, popularity_rank);
  ```
- Cron diario `src/app/api/cron/recalc-popularity/route.ts` (header `Authorization: Bearer ${CRON_SECRET}`):
  - Por restaurant, group by `product_id` en `order_items` last 7d, ranquear top 10.
  - Update `products.popularity_rank` (1, 2, 3...) y `orders_last_7d`.
- Agregar a `vercel.json` schedule cron diario 04:00 UTC.

**Frontend:**
- Pasar `popularity_rank`, `orders_last_7d`, `is_new` en el slim product en `[slug]/menu-data.ts`.
- En `ProductCard.tsx`: mostrar badge flotante top-left:
  - `popularity_rank === 1` → `"⭐ #1 esta semana"` (gradient gold)
  - `popularity_rank <= 3` → `"🔥 Top {rank}"` (gradient red)
  - `orders_last_7d >= 10` → `"🔥 {n} pedidos esta semana"` (badge sutil)
  - `is_new && popularity_rank === null` → `"✨ Nuevo"` (badge azul)
- **Solo UN badge por card** — prioridad: rank > orders_last_7d > is_new.

**Acceptance criteria:**
- Cron corre sin errores con `Bearer CRON_SECRET`.
- Badges visibles en `cafe48` y otros restaurants con orders.
- No regresión en RSC payload (slim pattern intacto).

---

### 1.2 Micro-interacciones + haptic (#3) ✅ COMPLETO

**Goal:** Add-to-cart se siente premium en mobile.

- En `ProductCard.tsx` botón "+ Add":
  - Antes de invocar add: `if ('vibrate' in navigator) navigator.vibrate(8);`
  - Animación de scale + ripple (Framer Motion) — si el botón tiene `whileTap={{ scale: 0.95 }}` ya está, sino agregalo.
- `CartFlyParticles` ya existe ✅ — verificar que se dispara desde el botón Add (puede que ya).
- En `CartPanel`: cuando incrementa contador, usar `motion.span` con `key={count}` y `initial={{scale:1.4}} animate={{scale:1}}` para "pop" del número.
- En el ícono del carrito (header), badge con `count`: animar igual.

**Acceptance:** se siente notable en iPhone Safari (haptic) y todos los browsers (animación).

---

### 1.3 Filtros tags dietary (#4) ✅ COMPLETO

**Goal:** chips bajo el search: `Vegano · Vegetariano · Sin gluten · Picante · < $10`.

**Backend:**
- Migración `migration-product-tags.sql`:
  ```sql
  ALTER TABLE products
    ADD COLUMN IF NOT EXISTS dietary_tags text[] DEFAULT '{}'; -- ['vegan','vegetarian','gluten_free','spicy','dairy_free']
  CREATE INDEX IF NOT EXISTS idx_products_dietary_tags ON products USING GIN(dietary_tags);
  ```
- Editor: en `ProductEditor.tsx` agregar multi-select de dietary tags.
- **Bonus IA:** `src/app/api/admin/auto-tag/route.ts` (verifyAdmin o getTenant) que lee descripción + nombre y con Gemini propone tags. Botón "Auto-tag con IA" en ProductsManager.

**Frontend (`MenuShell`):**
- Bajo el search bar (mobile + desktop), una row de chips toggleables.
- Estado local `selectedTags: Set<string>` y `priceMax: number | null`.
- Filtrado en cliente del array `products` (ya está in-memory).
- Si activo, mostrar count de resultados: `"23 platos"`.
- Botón "Limpiar filtros" cuando hay alguno activo.

**Acceptance:** filtros se sienten instantáneos, persisten al cambiar de categoría, se limpian al cerrar tab.

---

## 2. Sprint 2 — AOV y conversión (2-3 sesiones)

### 2.1 Smart Upsell en CartPanel (#2) ✅ COMPLETO

**Goal:** antes del "Pagar", sección "Completá tu pedido" con 3 sugerencias personalizadas.

**Lógica (sin IA primero, regla simple — luego upgrade a Gemini):**
1. Si carrito tiene `category=mains` pero no `category=drinks` → sugerir top 3 drinks del restaurant.
2. Si no tiene `category=desserts` → sugerir top 2 desserts.
3. Si carrito total < umbral del restaurant (ej. < $20) → sugerir extras/complementos.

**Backend:**
- Endpoint `src/app/api/upsell/route.ts` POST `{ restaurant_id, cart_items: [...] }` → returns `{ suggestions: [{product, reason, ranking_score}] }`.
- Reglas en código primero. Después: tabla `upsell_pairings` (prod_a → prod_b, score) calculada por cron desde `order_items` (productos comprados juntos).
- Migración `migration-upsell-pairings.sql`:
  ```sql
  CREATE TABLE IF NOT EXISTS upsell_pairings (
    restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    product_a uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    product_b uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    co_orders int DEFAULT 0,
    score numeric DEFAULT 0,
    updated_at timestamptz DEFAULT NOW(),
    PRIMARY KEY (restaurant_id, product_a, product_b)
  );
  CREATE INDEX idx_upsell_pairings_a ON upsell_pairings(restaurant_id, product_a, score DESC);
  ```
- Cron `recalc-upsell-pairings` semanal.

**Frontend:**
- En `CheckoutPageClient.tsx`, antes del "Pagar", sección horizontal scrollable con 3-5 productos sugeridos.
- Card mini con imagen, nombre, precio, botón "+ Agregar".
- Tracking: log evento `upsell_shown` y `upsell_added` en tabla `events` (si existe) o console primero.

**Acceptance:** sugerencias relevantes (no propone hamburguesa cuando ya hay 2 hamburguesas). Mide AOV antes/después en métricas admin.

---

### 2.2 Dark mode menú público (#7)

**Goal:** toggle ☀️/🌙 en `MenuHeader` que persiste.

- Tailwind `darkMode: 'class'` en `tailwind.config` (verificar si ya está).
- Toggle en `MenuHeaderMobile` y `MenuHeaderDesktop`: setea `localStorage.getItem('menius:theme')` y aplica clase `dark` en `<html>`.
- Pasar por todas las cards/components agregando `dark:bg-...` `dark:text-...`.
- **Default:** detectar `prefers-color-scheme` para primer load.
- Auto-dark después de las 19:00 hora local del restaurant (opcional, V2).

**Acceptance:** toggle funciona, persiste, food photography "pop" en dark.

---

### 2.3 Empty cart con sugerencias (refinamiento visual) ✅ COMPLETO

- En `CartPanel.tsx`, cuando `items.length === 0`:
  - Mostrar mensaje + 3 productos populares del restaurant ("Pedí esto") con botón Add directo.
  - Datos: usar mismo `popularity_rank` del Sprint 1.

---

### 2.4 Refinamiento ProductCard ⚠️ PARCIAL (golden border ✅ — compare_at_price pendiente: requiere migración)

- Borde sutil dorado en `popularity_rank === 1`.
- Mostrar precio tachado si hay `compare_at_price` o promo activa.
- "DESDE $X.XX" si `variants.length > 1`.

---

## 3. Sprint 3 — Retención (3-4 sesiones)

### 3.1 Order Progress Timeline animado (#5)

**Goal:** post-checkout, pantalla "Tu orden" con timeline visual estilo Uber Eats.

- `OrderTracker.tsx` ya existe ✅ — auditarlo y mejorarlo:
  - Timeline horizontal con 4-5 steps: Recibido → Confirmado → Preparando → Listo → Entregado.
  - Cada step con ícono animado (Lottie o SVG con Framer Motion).
  - Step actual con pulso, completados en verde, futuros en gris.
  - Realtime con Supabase channels: subscribe a cambios en `orders.status`.
- Mostrar tiempo estimado dinámico: si status `preparing`, calcular `prep_time_min - elapsed`.
- Push notification cuando cambia status (ya hay `migration-push-subscriptions.sql`).

**Acceptance:** transiciones fluidas, realtime sin reload, funciona offline (PWA cache).

---

### 3.2 Recomendaciones "Para ti" (#8)

**Goal:** si el usuario es recurrente (cookie con `customer_id` o auth), mostrar arriba:
- "Lo que pediste la última vez" (1 card).
- "Te puede gustar" (3 cards basadas en historial + collaborative filtering).

**Backend:**
- Endpoint `src/app/api/recommendations/route.ts?restaurant_id=X&customer_id=Y`:
  - Last order de ese customer en ese restaurant.
  - Top items que pidieron customers que pidieron lo mismo (basic collaborative filtering).
- Customer ID ya está en `migration-customers.sql` y `migration-customer-phone.sql`.

**Frontend:**
- Sección sticky arriba del primer category render en `MenuShell`.
- Solo si tenemos `customer_id` (cookie o auth).

---

### 3.3 Loyalty visible en menú público (#10 part 1)

`migration-loyalty.sql` ya existe ✅. Falta:
- Mostrar puntos del cliente en el header del menú: `"⭐ 240 pts"`.
- Banner en checkout: `"🎁 80 pts más y desbloqueás 10% off"`.
- Después de pagar: `"Ganaste 12 pts ⭐"`.
- Endpoint `/api/loyalty/customer?customer_id=X` (probable que ya exista — verificar).

---

## 4. Sprint 4+ — Diferenciadores comerciales (Q3)

### 4.1 Hero con video (#6)
- Columna `restaurants.hero_video_url` (migración nueva).
- En `MenuHeader*`: si hay video, `<video autoplay muted loop playsinline>` con fallback imagen.
- Editor en `/admin/dashboard/perfil`: subir MP4 (cap 5MB, 10s max) o pegar URL.

### 4.2 AI Menu Optimizer (#9)
- Panel nuevo en `/admin/dashboard/ai-insights`:
  - "Tu sopa de tomate genera 60% margen pero está abajo. Subila al hero."
  - "Estos 3 items no se vendieron en 30d — ocultar."
  - "Subí precio de X — demanda alta + competencia."
- Backend: agregar function tools a Gemini que lean `orders`, `order_items`, `products`, `costs`.
- El AI Dev Tool de `/admin/dev` (memoria) era el embrión — conectar con datos reales.

### 4.3 Voice ordering PWA (#11)
- Botón mic en search bar → MediaRecorder → POST a `/api/voice-order` → Whisper o Gemini Audio → parser → carrito armado.
- Confirmación visual antes de checkout.

### 4.4 Scan-to-pay en mesa (#12)
- Migración `tables` (id, restaurant_id, table_number, qr_url).
- Generador masivo de QR codes en admin.
- Vista `/[slug]/table/[id]` que ata orden a mesa.
- Split bill en checkout: "Dividir entre N personas" → cada uno paga su parte con Stripe.

---

## 5. Cómo trabajar este plan

### Reglas para Sonnet ejecutor:
1. **Una mejora a la vez.** No mezclar Sprint 1.1 con 1.2 en el mismo PR.
2. **Verificar migraciones existentes** antes de crear nueva — buscar en `supabase/migration-*.sql`.
3. **Antes de select explícito** de columna: confirmar que existe en migración. Sino, agregar migración nueva.
4. **Cache invalidation** en cada cambio de menu data: `revalidateTag('menu-data:' + slug)`.
5. **Slim product pattern** intacto. Si agregás campo nuevo (ej. `popularity_rank`), agregalo al slim — no al `modifier_groups`.
6. **TypeScript strict, no `any`.** Catch con `unknown`.
7. **Test manual antes de marcar completo:** abrir `localhost:3000/cafe48` y ver el cambio en vivo.
8. **Commit por mejora**, mensaje descriptivo. PR si toca >5 archivos.
9. **No tocar lo que ya funciona** — leer componente existente antes de reescribir.
10. **Mobile-first siempre.** Test en DevTools mobile viewport.

### Orden sugerido de ejecución:
```
Sprint 1 → todo en una sesión si alcanza
  1.1 Popularity badges (backend + frontend + cron)
  1.2 Micro-interactions + haptic
  1.3 Dietary tags filter
Sprint 2 → 2 sesiones
  2.1 Smart upsell (rules first, AI later)
  2.2 Dark mode
  2.3 Empty cart suggestions
  2.4 ProductCard refinements
Sprint 3 → 2-3 sesiones
  3.1 OrderTracker animation upgrade
  3.2 Recommendations
  3.3 Loyalty visibility
Sprint 4+ → planning separado por feature
```

### Métricas a trackear (admin/metrics):
- AOV (average order value) por restaurant — antes/después.
- Conversion rate (carts iniciados vs órdenes completadas).
- Tiempo promedio en menú.
- Repeat customer rate.

---

## 6. Lo que NO hacer

- ❌ NO romper el slim product pattern (RSC payload).
- ❌ NO usar service role en cliente.
- ❌ NO hardcodear `Date.now()` en queries (cache buster).
- ❌ NO crear feature flags por código — usar `store-overrides` o columna en DB.
- ❌ NO agregar libs nuevas pesadas (>50KB gzipped) sin justificar.
- ❌ NO tocar webhooks Stripe sin verificar idempotency con `processed_webhook_events`.
- ❌ NO mockear DB en tests de integración.

---

## 7. Referencias (para context si Sonnet necesita justificar decisiones)

- AI Upselling: +15% AOV ([Zuppler](https://www.zuppler.com/smart-upsell), [Incentivio](https://www.incentivio.com/blog-news-restaurant-industry/how-to-increase-average-check-size-with-ai-powered-upselling))
- Personalización: +30% conversión ([Eoxys](https://eoxysit.com/blogs/ai-in-restaurant-food-delivery-apps-2026-smart-ordering-dynamic-menus-kitchen-automation/))
- Micro-interactions + haptic: estándar 2026 ([UIStudioz](https://uistudioz.com/blog/top-10-inspiring-food-delivery-app-ui-ux-designs/))
- Gen Z visual auth + maximalism ([HashtagPaid](https://hashtagpaid.com/banknotes/gen-z-visual-strategy-2026-why-design-is-now-a-performance-channel))
- Menu psychology: 75% decisiones por visual, +30% sales con foto ([Grafterr](https://www.grafterr.com/blog/the-psychology-of-menu-design-influencing-customer-choices/))

---

**Fin del plan. Sonnet: arrancá por 1.1 y reportá cuando esté en prod.**
