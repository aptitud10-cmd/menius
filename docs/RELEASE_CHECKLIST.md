# Release Checklist — Menius

> Para cualquier cambio que toque el menú público, checkout, órdenes, pagos, o webhooks.
> Completar de arriba hacia abajo antes de promover a producción.

---

## Pre-deploy (local / CI)

### Código
- [ ] `npx tsc --noEmit` → 0 errores.
- [ ] `npm run lint` → 0 warnings nuevos.
- [ ] `npm test` → todos los tests pasan.
- [ ] Sin `// @ts-ignore` ni `// eslint-disable` nuevos sin justificación.
- [ ] Sin `console.log` de debug en código de producción.
- [ ] Sin `any` nuevo en rutas críticas (`/api/orders`, `/api/payments/*`, `CounterView`).

### Base de datos
- [ ] Si el PR agrega columnas: existe migración en `supabase/migrations/YYYYMMDD_descripcion.sql`.
- [ ] Si hace `select` explícito de columna nueva: la migración ya está aplicada en prod.
- [ ] Migración es idempotente (`IF NOT EXISTS`, `DROP POLICY IF EXISTS`).
- [ ] RLS habilitado en toda tabla nueva con `restaurant_id`.
- [ ] Migraciones anteriores NO fueron modificadas (son inmutables).

### Cache
- [ ] Si el PR toca datos del menú: llama `revalidateTag('menu-data:' + slug)` en el lugar correcto.
- [ ] Sin `Date.now()` ni `Math.random()` en paths de query cacheados.

### Seguridad
- [ ] Rutas de dueño usan `getTenant()` — no accesibles sin auth.
- [ ] Rutas admin usan `verifyAdmin()` — `ADMIN_EMAIL` puede ser CSV.
- [ ] Crons verifican `Authorization: Bearer ${CRON_SECRET}`.
- [ ] Sin service role (`createAdminClient`) importado en código client.
- [ ] Inputs de usuario validados (Zod o manual) antes de cualquier DB call.
- [ ] Sin `dangerouslySetInnerHTML` que reciba input de usuario sin sanitizar.

### Stripe / Pagos
- [ ] Webhooks verifican `Stripe-Signature` header.
- [ ] Idempotency en webhook: tabla `processed_webhook_events`.
- [ ] `application_fee_amount` calculado desde DB, no del body.
- [ ] Refund endpoint: verifica que la orden pertenece al tenant.

---

## Deploy en Vercel

- [ ] Push a `main` (auto-deploy).
- [ ] Build completa sin errores en Vercel dashboard.
- [ ] Variables de entorno nuevas agregadas en Vercel (si aplica).
- [ ] Migración de Supabase aplicada en prod antes del deploy (si aplica).

---

## Smoke tests post-deploy (5 minutos)

Hacer en producción con un restaurante de prueba (ej. `the-grill-house`):

- [ ] `/[slug]` carga en < 2s.
- [ ] Agregar producto al carrito → aparece en CartPanel.
- [ ] CartPanel muestra sección upsell (si hay ítems y sugerencias).
- [ ] Abrir CustomizationSheet → cerrar → sin errores en consola.
- [ ] Ir a checkout → formulario carga correctamente.
- [ ] Botón "Pagar" visible y no bloqueado.
- [ ] Dashboard dueño: página de órdenes carga.
- [ ] OrderNotifier: chime de prueba (si hay forma de simular).

---

## Checklist específica por tipo de cambio

### Nuevo campo en `products` o `order_items`

- [ ] Migración crea la columna.
- [ ] Si va en `select` explícito de `menu-data.ts` → columna existe en migración prod.
- [ ] Slim pattern intacto: `modifier_groups: []`, `variants: []`, `extras: []` en `[slug]/page.tsx`.
- [ ] Campo agregado al slim si es necesario en el menú (no al modifier_groups).

### Nueva ruta de API pública (`/api/...`)

- [ ] Rate limiting aplicado.
- [ ] Validación de inputs al inicio.
- [ ] `export const dynamic = 'force-dynamic'` en POST handlers.
- [ ] Errores críticos logueados con `captureError`.

### Cambio en `/api/orders`

- [ ] Recálculo de precios server-side intacto.
- [ ] Idempotency intacto.
- [ ] Comisión calculada correctamente.
- [ ] `notifyNewOrder()` sigue siendo fire-and-forget.
- [ ] Tests `src/__tests__/api/orders.test.ts` actualizados si aplica.

### Cambio en webhooks Stripe / Wompi / MercadoPago

- [ ] Signature verification intacta.
- [ ] Idempotency con `processed_webhook_events` intacta.
- [ ] Handler devuelve 200 rápido (< 2s) antes de procesar.
- [ ] Procesamiento pesado en background o defer.

### Nueva migración de Supabase

- [ ] Nombre del archivo: `YYYYMMDD_descripcion.sql`.
- [ ] `IF NOT EXISTS` en todos los `CREATE TABLE`, `CREATE INDEX`.
- [ ] `DROP POLICY IF EXISTS` antes de `CREATE POLICY`.
- [ ] RLS habilitado con `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`.
- [ ] Policies definidas para `anon`, `authenticated`, `service_role` según necesidad.
- [ ] Aplicada en prod **antes** del deploy del código que la usa.

### Cambio en planes / comisiones

- [ ] `CLAUDE.md` actualizado con la nueva lógica.
- [ ] `getEffectivePlanId()` / `hasPlanAccess()` cubren el nuevo caso.
- [ ] Plan `free` nunca se guarda en DB (solo inferido).
- [ ] Columna `commission_plan` en DB no se toca sin aprobación.

---

## Rollback

Si algo falla en producción:

1. **Revertir en Vercel**: Deployments → promote previous deployment.
2. **Migraciones**: son aditivas (no se hace rollback de columnas). Si la columna rompió algo, agregar una migración nueva que corrija.
3. **Cache ISR**: `revalidateTag('menu-data:' + slug)` para forzar refresco de tiendas afectadas.
4. **Stripe**: refunds manuales desde Stripe Dashboard si un webhook rompió órdenes.

---

## Monitoreo post-release (1h)

- [ ] Sentry: sin errores nuevos o spike en errores existentes.
- [ ] Vercel logs: sin 500s en rutas críticas.
- [ ] Supabase logs: sin errores 42703 (columna inexistente) ni 42501 (RLS deny inesperado).
- [ ] Al menos 1 orden completada end-to-end en prod (si hay tráfico real).
