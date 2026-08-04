# AUDIT 2 — Menius Full Platform Review
**Fecha:** 2026-05-12  
**Áreas:** Seguridad · Performance · Pagos · Órdenes · DB/Schema · Frontend/UX  
**Rating anterior (AUDIT 1):** 8/10

---

## RESUMEN EJECUTIVO

| Área | Issues Críticos | Issues Altos | Issues Medios | Issues Bajos |
|------|:-:|:-:|:-:|:-:|
| Seguridad y Auth | 3 | 4 | 5 | 5 |
| Performance y Bundle | 3 | 3 | 5 | 2 |
| Pagos y Billing | 2 | 6 | 6 | 3 |
| Órdenes y Operación | 4 | 5 | 5 | 3 |
| DB / Schema | 3 | 3 | 3 | 4 |
| Frontend y UX | 0 | 5 | 5 | 8 |
| **TOTAL** | **15** | **26** | **29** | **25** |

---

## CRÍTICOS — Atender inmediatamente

### S1 · Seguridad
**Admin client en endpoint público `repeat-order`**  
`src/app/api/public/repeat-order/route.ts:31`  
Service role en endpoint sin autenticación. Aunque la query está scopeada por `restaurant_id`, bypasea RLS completamente. Cambiar a `createServerClient()` + verificar RLS en la tabla.

**Admin client en endpoint público `order-track`**  
`src/app/api/public/order-track/route.ts:29`  
Mismo problema. Service role no debe usarse en endpoints públicos. Cambiar a anon client.

**MercadoPago webhook sin idempotencia**  
`src/app/api/payments/mercadopago-webhook/route.ts:106`  
No hay insert en `processed_webhook_events`. Reintentos de MP disparan notificaciones duplicadas y potencialmente contabilizan el pago dos veces. Agregar claim antes de procesar.

### P1 · Pagos
**MercadoPago webhook — sin idempotencia**  
`src/app/api/payments/mercadopago-webhook/route.ts:106-144`  
(ver S1 arriba — mismo issue, doble impacto)

**Wompi webhook — no libera claim en error**  
`src/app/api/payments/wompi-webhook/route.ts:63-116`  
Si el update de DB falla después de hacer el claim de idempotencia, el order queda sin marcar como pagado y nunca se reintenta. Agregar cleanup del claim en el bloque catch.

### O1 · Órdenes
**Sin restauración de stock al cancelar orden**  
`src/app/api/orders/route.ts` (todo el flujo de cancelación)  
Cuando una orden se cancela (manual o por cron), `stock_qty` nunca se restaura. Para restaurantes con `track_inventory=true`, el inventario se pierde permanentemente. Agregar trigger DB o RPC que restaure stock en transición a `cancelled`.

**Polling Realtime sin backoff — riesgo de exhaustar DB**  
`src/components/dashboard/OrderNotifier.tsx:75-108`  
El fallback polling corre cada 15s sin límite superior ni backoff. Si Realtime cae, genera carga ilimitada en DB. Implementar backoff exponencial (15s → 30s → 60s → 5m) con máximo de 10 intentos y luego mostrar alerta al usuario.

**Deducción de puntos de loyalty silenciosa**  
`src/app/api/orders/route.ts:614-648`  
Falla silenciosa en la deducción de puntos. El cliente puede recanjeando los mismos puntos en múltiples órdenes si la RPC falla. Hacer la deducción transaccional o agregar cola de reintentos.

**FK violation en order details cancela sin notificar al cliente**  
`src/app/api/orders/route.ts:694-724`  
Si falla el insert de modificadores/variantes, la orden se cancela automáticamente sin enviar notificación al cliente. Agregar email de cancelación en ese bloque.

### DB1 · Base de Datos
**Dos versiones del RPC `create_restaurant_with_subscription`**  
`supabase/migration-atomic-restaurant.sql` vs `supabase/migrations/20260421_rpc_notification_email.sql`  
La versión antigua no tiene `notification_email`. Si está activa, los dueños no reciben notificaciones al crear el restaurante. Verificar cuál está deployada y dropear la vieja.

**Dos versiones del RPC `increment_promo_usage`**  
`supabase/migration-promotions.sql` vs `supabase/migrations/20260421_promo_atomic_increment.sql`  
La versión antigua no tiene `FOR UPDATE` lock — permite race conditions en uso de promos. Verificar y dropear la versión sin lock.

**RPC `redeem_loyalty_points` sin lock en versión vieja**  
`supabase/migration-fix-loyalty-race-condition.sql`  
Si existe versión anterior sin `FOR UPDATE`, clientes pueden canjear más puntos de los que tienen en órdenes concurrentes. Confirmar que solo la versión atómica está activa.

---

## ALTOS — Próximo sprint

### S2 · Seguridad
**MercadoPago webhook — signature validation condicional**  
`src/app/api/payments/mercadopago-webhook/route.ts:50-57`  
Si el request llega sin `ts`, `receivedHmac` o `dataId`, la verificación de firma se omite y se procesa igual. Agregar early return 401 si alguno de los tres falta.

**`ORDER_TOKEN_SECRET` con fallback a `NEXTAUTH_SECRET`**  
`src/lib/order-token.ts:15-17`  
Reutilizar el mismo secreto para tokens de tracking y autenticación aumenta la superficie de ataque. Requerir `ORDER_TOKEN_SECRET` explícito en producción.

**Trial expirado no se marca como `canceled` en webhook**  
`src/app/api/billing/webhook/route.ts:103-106`  
Si un trial expira sin que Stripe envíe un nuevo evento, el restaurante queda en `trialing` indefinidamente. `getEffectivePlanId()` lo trata como free, pero el estado inconsistente puede causar comportamientos inesperados.

**Rate limiting ausente en rutas admin**  
`src/app/api/admin/stats/route.ts`, `send-welcome/route.ts`  
Una sesión admin comprometida puede hacer abuso de recursos. Agregar rate limit por `user.id`.

### P2 · Pagos
**`PaymentIntent` sin idempotencia**  
`src/app/api/payments/intent/route.ts:9-87`  
Reintentos de red crean múltiples PaymentIntents para la misma orden en Stripe. Agregar check de `payment_intent_id` existente antes de crear uno nuevo.

**Free-tier check ocurre después del insert de orden**  
`src/app/api/orders/route.ts:512 vs 808`  
La validación en línea 808 elimina la orden ya insertada, pero notificaciones pueden haberse disparado. Consolidar la validación antes del insert.

**Checkout sin idempotencia — sesiones duplicadas**  
`src/app/api/payments/checkout/route.ts:98-115`  
Doble-click crea dos sesiones de Stripe. Agregar check de `payment_intent` existente o usar `Idempotency-Key` header.

**Commission plan no valida Stripe onboarding**  
`src/app/api/billing/activate-commission-plan/route.ts:60-72`  
Un restaurante sin Stripe conectado puede activar `commission_plan=true` y luego fallar en todos los pagos. Validar `stripe_onboarding_complete` antes de activar.

**Webhook claim no se libera en eventos desconocidos**  
`src/app/api/billing/webhook/route.ts:365-368`  
Si el tipo de evento no está en el switch, el claim queda en DB para siempre y futuros eventos del mismo tipo son ignorados. Asegurar que el claim se libere en todos los paths.

**Trial expirado: restaurante bloqueado en pagos online**  
`src/app/api/billing/webhook/route.ts:103-106`  
(mismo que S2 · trial — impacto en pagos)

### O2 · Órdenes
**Sin validación de stock al agregar items a orden existente**  
`src/app/api/tenant/orders/[id]/items/route.ts:6-88`  
El endpoint de agregar items no decrementa ni valida `stock_qty`. Si `track_inventory=true`, el inventario queda desincronizado.

**Cancelación de orden no decrementa uso de promo**  
(endpoint de cancelación)  
Si una orden con promo es cancelada, `promo_usage_count` no se restaura. Las campañas pierden presupuesto por órdenes canceladas.

**Transiciones de estado inválidas retornan 200 en driver endpoint**  
`src/app/api/driver/status/route.ts:84-125`  
Retorna `{ ok: true, skipped: true }` en vez de 400 para transiciones inválidas. Dificulta debugging y permite que una app buggy silenciosamente ignore rechazos.

**RLS `public_read_order_items` permite leer items de cualquier restaurante**  
`supabase/migration.sql:384-385`  
`USING (true)` sin restricción. Competidores pueden enumerar las órdenes de otros restaurantes. Restringir a órdenes del restaurante del usuario autenticado.

### DB2 · Base de Datos  
**Indexes compuestos posiblemente no aplicados**  
`supabase/migration-missing-indexes.sql`  
El archivo existe pero no está en `migrations/` con fecha. Si no fue aplicado, queries del dashboard (restaurant_id + created_at DESC) hacen full table scan. Verificar y aplicar.

**`loyalty_transactions.order_id` con ON DELETE SET NULL**  
`supabase/migration-loyalty.sql:20`  
Si una orden se elimina, las transacciones de loyalty quedan huérfanas (`order_id = null`) rompiendo la trazabilidad. Cambiar a `ON DELETE RESTRICT`.

### Frontend A
**`CustomizationSheet` falla silenciosamente al cargar modificadores**  
`src/components/public/CustomizationSheet.tsx:73-79`  
`.catch(() => setModifiersLoading(false))` sin mostrar error. El usuario ve un spinner que nunca termina. Agregar estado de error con mensaje.

**`orders_paused_until` con `as any` en MenuShell**  
`src/components/public/MenuShell.tsx:180`  
Bypasea type checking. Puede causar runtime errors si la propiedad no existe. Agregar la columna al tipo `Restaurant`.

**Strings de i18n hardcodeados en español en `CustomizationSheet`**  
`src/components/public/CustomizationSheet.tsx:310-317, 591, 629`  
Etiquetas de modificadores ("Elige 1"), mensaje de validación ("Selecciona:") y aria-label ("Volver") están en español. Mover a translations.

**`MenuErrorBoundary` con texto hardcodeado en español**  
`src/components/public/MenuErrorBoundary.tsx:57, 74`  
Error boundary muestra "Algo salió mal" y "Reintentar" a usuarios en inglés. Pasar locale como prop.

**Sin Sentry en producción en error boundary**  
`src/components/public/MenuErrorBoundary.tsx:39-43`  
Errores de producción no se reportan a Sentry. Solo se loguean en dev.

---

## MEDIOS — Backlog próximas 2 semanas

### Performance
- `src/app/(dashboard)/app/page.tsx:262-282` — Las 3 queries del health score son secuenciales. Moverlas al `Promise.all` inicial (ya hay 9 queries ahí). (**Ya identificado en la sesión anterior, no se corrigió**)
- `src/app/(dashboard)/app/page.tsx:234` — Free tier month count query fuera del `Promise.all`.
- `supabase/` — Agregar indexes: `(restaurant_id, created_at DESC)` en `orders`; `(restaurant_id, is_active)` en `products`; `(restaurant_id, last_order_at)` en `customers`.
- `src/app/api/public/restaurant-menu/route.ts:149` — `timestamp: new Date().toISOString()` en response body rompe CDN cache (body diferente en cada request aunque `s-maxage=60`). Eliminar el timestamp del body.
- `src/app/[slug]/page.tsx:12` — ISR `revalidate=300` agresivo. Subir a 3600 y confiar en `revalidateTag` on-demand.

### Pagos
- `src/app/api/payments/mercadopago-webhook/route.ts:123-130` — Sin fallback si el token del restaurante está revocado. Agregar retry o token de plataforma como fallback.
- `src/lib/plans.ts:35` — `TRIAL_DAYS = 0` hardcodeado — o eliminar toda la lógica de trial o documentar que están deshabilitados.
- `src/app/api/billing/create-checkout/route.ts:97-101` — `hasValidTrial` falla si `stripe_subscription_id` está seteado (edge case → suscripciones duplicadas).

### Órdenes
- `src/app/api/orders/route.ts:563-570` — Rollback de promo sin retry. Si falla el decrement, el contador queda inflado. Agregar retry + tabla `promo_rollback_queue`.
- `src/app/api/cron/auto-complete-pickup/route.ts:70,112` — `broadcastOrderUpdate().catch(() => {})` silencioso. Loguear failures con contexto de orden.
- `src/lib/notifications/order-notifications.ts:316-329` — Push notifications con `.catch(() => {})`. Sin alertas si el sistema de push falla globalmente.
- `src/app/api/orders/route.ts:727-752` — Customer tag cleanup anidado en fire-and-forget. Tags `reactivation_sent` pueden quedar pegados si falla el cleanup.
- Implementar decremento de `stock_qty` en creación de orden cuando `track_inventory=true`.

### DB
- `src/app/api/tenant/loyalty/route.ts:98` — Tipo `'adjustment'` no existe en el CHECK constraint de la tabla (solo `'adjust'`). Corregir el string.
- `supabase/migrations/20260407_dev_alerts.sql:20` — RLS policy `USING (true)` en dev_alerts — cualquier rol autenticado puede leer todas las alertas. Restringir a `service_role`.

### Frontend
- `src/components/public/CustomizationSheet.tsx:57-79` — Sin skeleton mientras cargan modificadores. Usuario ve formulario vacío.
- `src/components/public/CheckoutPageClient.tsx:185-188` — Error de loyalty balance no comunicado al usuario.
- `src/app/global-error.tsx:38` — Texto hardcodeado mezclado ES/EN. Extraer a variable.
- `src/components/public/MenuShell.tsx:245-273` — Realtime channel sin handler de error. Si falla la suscripción, el stock puede estar desactualizado silenciosamente.

---

## BAJOS — Oportunidades de mejora

### Seguridad
- `src/components/ui/AddressAutocomplete.tsx:6` — `NEXT_PUBLIC_GOOGLE_PLACES_KEY` expuesto. Considerar proxy server-side para evitar abuso de cuota.
- `src/app/api/driver/order/route.ts:19-20` — Token de driver sin validación de formato antes de hit a DB.
- `src/app/api/orders/status/route.ts:44` — Mensajes de error revelan si la orden existe. Usar mensaje genérico en endpoints públicos.
- `src/lib/validations.ts:97` — Plan IDs hardcodeados. Riesgo de desincronización al agregar planes.

### Performance
- `src/app/[slug]/page.tsx:151-158` — Objetos demo creados inline con `new Date()` en cada render. Mover fuera del componente.
- `src/app/ai-fotos/page.tsx:117,159` — Imágenes con `unoptimized` en tool admin. Quitar flag.

### Pagos
- No existe endpoint de refund. Refunds se hacen manualmente desde Stripe dashboard. Agregar `/api/payments/refund`.
- `src/app/api/orders/route.ts:831` — Double-rounding de precios en Stripe line items (menor, 1-2 centavos).
- Webhook Stripe retorna 400 en fallo de firma. Stripe docs recomiendan 401. Cambiar código.

### Órdenes
- `src/app/api/orders/route.ts:348-351` — Log de price mismatch sin rate limiting. En un bug masivo, inunda los logs.
- `src/app/api/cron/auto-complete-pickup/route.ts:50-56` — ETA calculation timezone-unaware. Puede auto-completar órdenes antes de tiempo.
- `src/app/api/orders/route.ts:754-774` — First order email en callbacks anidados `Promise.resolve().then().then()`. Simplificar a async/await con manejo de errores.

### DB
- `supabase/migration.sql:384-385` — `public_read_modifier_options` y `public_read_order_items` con `USING (true)`. Considerar restringir a productos activos.
- `supabase/migration.sql:167` — Falta composite index en `order_item_modifiers(order_item_id, group_id)`.

### Frontend
- `src/components/public/MenuShell.tsx:150-151` — Toast desaparece en 4s, poco para usuarios de screen reader. Subir a 6s.
- Multiple `as any` en dashboard components — `OnboardingChecklist.tsx`, `RestaurantSettings.tsx`, etc.

---

## PLAN DE ACCIÓN PRIORIZADO

### Sprint inmediato (esta semana)
1. Agregar idempotencia a MercadoPago webhook
2. Fix Wompi webhook claim cleanup en error
3. Fix admin client en `repeat-order` y `order-track` → server client
4. Restauración de stock al cancelar orden (trigger DB o RPC)
5. Verificar qué versión de RPCs está en producción (create_restaurant, increment_promo_usage, redeem_loyalty_points)
6. Backoff exponencial en OrderNotifier polling

### Sprint 2 (próxima semana)
7. MP webhook signature validation — rechazar si falta firma
8. Free-tier check antes del insert de orden
9. PaymentIntent idempotencia
10. Mover health score queries al Promise.all inicial (perf quick win)
11. Fix `loyalty_transactions` type mismatch ('adjustment' → 'adjust')
12. Indexes compuestos en DB

### Sprint 3 (2 semanas)
13. i18n strings hardcodeados en CustomizationSheet y ErrorBoundary
14. CustomizationSheet error state al cargar modificadores
15. Endpoint de refund
16. Stock decrement en creación de orden (track_inventory)
17. Promo rollback queue

---

*Generado automáticamente con 6 agentes de auditoría paralelos — 2026-05-12*
