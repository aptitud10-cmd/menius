# AUDIT GENERAL — MENIUS

**Fecha:** 2026-08-06 · **Modo:** solo lectura sobre `main` (a0b6ed4)
**Método:** 6 auditores paralelos (seguridad, pagos/billing, schema-vs-código, features fantasma, crons/infra, flujos core) + **verificación contra la base de producción real** (information_schema, pg_constraint, datos) antes de reportar. Los hallazgos marcados ✔prod fueron confirmados con queries a prod; el resto está confirmado por lectura completa del flujo de código.

---

## RESUMEN EJECUTIVO — los 3 patrones que producen casi todos los bugs

1. **Código escrito contra un schema imaginado.** ~35 columnas/tablas/RPCs que el código usa y NO existen en prod. Ya rompió la tienda dos veces (42703 → 404) y hoy explica: API v1 muerta, MercadoPago muerto, web push muerto, 6 automatizaciones de email muertas, turnos de caja muertos, AI chat roto, 4 crons rotos.
2. **`try/catch` decorativo sobre supabase-js.** supabase-js NO lanza excepciones — devuelve `{ error }`. Los 12 sitios que hacen `await db.from(...).insert(...)` sin desestructurar `{ error }` descartan el fallo, y el `catch {}` alrededor no atrapa nada. Así `monitor-orders` y `monitor-stores` escribieron al vacío por meses sin una sola señal.
3. **Gates y validaciones solo en la UI.** Límite de sucursales, acceso API por plan, radio de reservas, roles de staff: la página los muestra, el endpoint no los aplica.

**Daño actual real vs latente:** la mayoría de los BLOCKERs están en flujos que hoy tienen poco o cero uso (lealtad con 0 canjes, MP/Wompi sin volumen, API v1 sin clientes). Eso es suerte, no salud — cada cliente nuevo que active una de esas features cae en el bug el día uno.

---

## A. BLOCKERS CON DAÑO O EXPOSICIÓN HOY

### A1. Web push al cliente: MUERTO en prod ✔prod
`push_subscriptions` en prod tiene `endpoint, keys_p256dh, keys_auth` — el código usa una columna `subscription` que no existe:
- `src/lib/notifications/push.ts:30` — `.select('subscription')` → 42703 en cada envío
- `src/lib/notifications/push.ts:45` — `.delete().eq('subscription', ...)`
- `src/app/api/push/subscribe/route.ts:48` — upsert con key `subscription` → la suscripción nunca se guarda

Consecuencia: **ninguna notificación web push de estado de orden ha llegado jamás** (los emails sí; el Expo push de la app usa otra tabla y está sano). Todo falla dentro de `.catch(() => {})` — patrón 2.

### A2. Botón "Enviar SMS" del KDS → 404 siempre
UI completa (botón por ticket, toggle, modal con 5 plantillas: `src/components/orders/KDSView.tsx:744,997-1090`) llamando a `/api/orders/sms` que **no existe** (`:1028`). Lo ve y lo toca un cliente pagador. Además `notifyStatusChange` solo retorna `'email'|'none'` — la rama SMS del Counter (`CounterView.tsx:506`) es inalcanzable.

### A3. Filter injection PostgREST en endpoint público (seguridad)
`src/app/api/public/recommendations/route.ts:45,65` — el email del querystring entra crudo en `.or()` de PostgREST con **service role** sobre `customers` (PII). El regex permite `,()` — los metacaracteres de la gramática. Techo actual: cruzar búsqueda dentro de un restaurante (no cross-tenant, el `.eq(restaurant_id)` combina con AND). Fix one-liner que ya existe en `tenant/customers/route.ts:26`. Nota: el mismo endpoint también tiene columnas fantasma (`orders.items`, `products.has_modifiers` — `:79,103,118`), o sea está parcialmente muerto Y es inyectable.

### A4. Doble impresión/sonido/push con dos tabs de Counter
Dedupe solo en memoria del componente (`use-realtime-orders.ts:27-32`); sin BroadcastChannel ni leader tab. Con print-on-arrival (config compartida vía localStorage entre tabs, `CounterView.tsx:402-407`) → **dos tickets por orden**. Coincide con el patrón histórico de "campanas duplicadas". Reproducible en 30 s.

### A5. Undo del KDS 100% roto
`KDSView.tsx:262-269` llama `updateOrderStatus(orderId, prev)` pero `VALID_TRANSITIONS` (`order-state.ts:21-32`) **no tiene ninguna arista hacia atrás** → todo undo devuelve "Transición inválida" y revierte. No es edge case: es el camino feliz del botón. (El Counter no tiene undo — verificado.)

### A6. Historial de pedidos con solo el email, sin token (seguridad/PII)
`src/app/api/orders/history/route.ts:14-64` — admin client, sin prueba de posesión: cualquiera con el email de un cliente ve sus últimos 20 pedidos. Es la misma clase de IDOR que ya se cerró en `order-track`/`orders/status`; este endpoint quedó fuera de esa remediación.
⚠️ **Pregunta de negocio para William:** ¿el cliente sin cuenta debe poder ver su historial solo con su email, o exigimos token? De eso depende el fix.

### A7. Gates de plan solo en la página — fuga de ingresos
"Hasta 3 sucursales" (vendido en landing/planes/FAQ) **no existe como límite en ningún código**; `POST /api/tenant/branches` no valida plan ni cuenta (`branches/route.ts:42-99`). Mismo patrón en `tenant/loyalty` y `tenant/api-keys`: gate en `page.tsx`, API abierta. Un plan Free crea sucursales ilimitadas con un POST directo.

---

## B. BLOCKERS LATENTES (rotos al 100%, pero el flujo aún no tiene uso real) ✔prod

### B1. API pública v1 completa: tabla `api_keys` NO existe
`validateApiKey()` (`src/lib/auth/validate-api-key.ts:42,52`) consulta una tabla inexistente → `null` → **todo `/api/v1/*` responde 401 desde siempre**. La migración `supabase/migration-api-keys.sql` nunca se aplicó. Y detrás del 401 espera otra capa: `/api/v1/menu` tiene 5 columnas fantasma más (`v1/menu/route.ts:38,55-62`: `in_stock` en variants, `max_qty`, `required/min_selections/max_selections` vs `is_required/min_select/max_select`). El "Acceso API" del plan Business ($149/mes) no puede funcionar para nadie. Además no hay documentación real del v1 para clientes (la doc pública describe OTRO endpoint, y mal — ver §D).

### B2. MercadoPago: checkout y webhook rotos
`restaurants.mp_access_token` / `mp_enabled` **no existen en prod**: `payments/mercadopago/route.ts:53` (42703 al iniciar checkout), `mercadopago-webhook/route.ts:155` (el pago nunca se confirma), `tenant/restaurant/route.ts:42` (guardar la config falla). La UI de settings de MP existe y guarda a la nada.

### B3. Webhooks Wompi/MP resuelven por `order_number` — que NO es único ✔prod
Verificado en prod: hay `order_number` **triplicados, incluso dentro del mismo restaurante** (el generador cuenta filas → race), y no existe UNIQUE. `wompi-webhook/route.ts:95-99` y `mercadopago-webhook:114-119` buscan `.eq('order_number', ref)` sin `restaurant_id` → con duplicados `maybeSingle()` falla → **pago real cobrado que nunca se marca `paid`**, y el claim de idempotencia (insertado ANTES del lookup) descarta el reintento. MP además no valida monto. Stripe es inmune (usa UUID). Fix: `UNIQUE (restaurant_id, order_number)` + lookup scoped + claim después del lookup.

### B4. Lealtad: el cliente que canjea puntos queda congelado para siempre ✔prod
Doble causa confirmada:
1. Guard sin filtro de tipo: `src/lib/loyalty/earn.ts:42-50` — `.eq('order_id', orderId)` sin `.eq('type','earn')` → la fila `redeem` bloquea el earn.
2. **`UNIQUE (restaurant_id, order_id)` en `loyalty_transactions`** (verificado en pg_constraint) → aunque se arregle el guard, el INSERT del earn choca 23505.
Estado actual: **0 canjes en prod** — cero daño hasta hoy, pero el primer cliente que canjee se congela. Fix: guard por tipo + reemplazar el UNIQUE por uno parcial `(restaurant_id, order_id) WHERE type='earn'`.

### B5. Doble descuento de lealtad al editar items de una orden
`orders.discount_amount` ya incluye la lealtad (`order-pricing.ts:109`) y además se guarda `loyalty_discount` aparte; `tenant/orders/[id]/items/route.ts:71-74,144-147` resta **ambos** al recalcular → total por debajo de lo debido (hasta $0). También contamina analytics/reports que suman `discount_amount` como si fuera solo promo. Estado: 0 órdenes con lealtad hoy ✔prod — latente pero seguro.

### B6. 6 de 10 automatizaciones de email muertas + riesgo de spam ✔prod
`restaurants.tags` no existe y el RPC `append_restaurant_tag` no existe (verificado en pg_proc). `email-automations/route.ts:281-609`: onboarding D1/D3/D7, setup, no-orders y reporte mensual **nunca se enviaron** (el select falla → lista vacía → "0 enviados" parece normal). Trampa: si alguien agrega la columna sin el RPC, la idempotencia rota **enviaría el mismo email a cada restaurante todos los días**. Necesita decisión de diseño (columna+RPC vs tabla de idempotencia dedicada), no parche.

### B7. Recordatorio de fin de trial marca "enviado" aunque el email falle
`trial-ending-reminders/route.ts:74-88` — `sendEmail` retorna boolean y nunca rechaza; el `.then()` estampa `trial_ending_reminder_sent_at` incondicionalmente y el conteo reporta éxito. Un trial cuyo email falló jamás recibe el aviso.

### B8. Cancelar una orden pagada no reembolsa ni avisa ✔prod
`updateOrderStatus` no lee `payment_status` (`restaurant.ts:1404-1452`) → `cancelled`+`paid` sin refund, sin alerta. El endpoint de refund **existe, está bien hecho, y tiene 0 llamadas desde UI** (`payments/refund/route.ts`). Estado: 0 casos hoy — pero es cuestión de tiempo con volumen online.

### B9. Turnos de caja (`shifts`) rotos
Tabla inexistente en prod; `openShift/closeShift/getOpenShift` (`restaurant.ts:1835-1951`) fallan. Migración huérfana: `supabase/migration-shifts.sql` nunca aplicada.

### B10. Familia de columnas fantasma restante ✔prod
| Dónde | Qué | Efecto |
|---|---|---|
| `public/restaurant-menu/route.ts:56-98` | 8 columnas en 5 queries (name_en, is_approved vs is_visible, price vs price_delta…) | El endpoint "API pública" degrada/rompe — 0 consumidores conocidos |
| `ai/chat/route.ts:120,126,150,837,1034,1197` | `usage_count`, `staff_members.name/is_active`, `order_items.created_at`, `orders.items_count`, `stock_quantity` | El AI chat del dashboard rompe al cargar contexto |
| `order_items.created_at` (no existe) | `ai/menu-optimizer:61`, `cron/daily-summary:64`, `cron/menu-optimizer-alerts:131` | 3 crons/features de analytics rotos |
| `domain/verify/route.ts:57` | `domain_verified` | Verificación de dominio custom siempre falla |
| `admin/restaurant-detail/route.ts:29` | `cancel_at_period_end` vs `cancel_at` | Panel admin rompe |
| `public/recommendations/route.ts:79,118` | `orders.items`, `products.has_modifiers` | Recomendaciones muertas |

---

## C. WARNS (consolidado)

**Infraestructura silenciosa:**
- `catch` decorativo restante (gemelos del bug dev_alerts): `dashboard-notifications.ts:28`, `order-notifications.ts:243` (rompe la idempotencia del email de review → posible reenvío), `dunning/route.ts:73,105`, `billing/webhook:241,277,360,517` — **regla propuesta: `await supabase.from()` sin `{ error }` = error de lint**
- Realtime sin `res.ok` (`broadcast-order.ts:35-54,75-94`): podría estar muerto y el polling de 5 s lo taparía — invisible por diseño
- Service Worker: regresión — el auto-reload post-deploy (commits a4a376f/a62d59e/5931344) fue removido de `layout.tsx:203-217` → chunk-load errors en KDS/Counter que corren todo el día
- 21 rutas críticas sin `captureError` (todo `billing/*`, `connect/webhook`, `orders/status`, los crons de monitoreo). **Verificar SENTRY_DSN en Vercel** — si falta, todo lo anterior es doblemente invisible
- 56 env vars usadas sin validar; las graves: 6× `STRIPE_PRICE_*`, 3× `*_WEBHOOK_SECRET` de Stripe, `TELEGRAM_*` (canal de alertas del operador), `WOMPI_*`
- `daily-summary` filtra por `restaurants.email`; todos los demás crons usan `notification_email` — digest posiblemente sin destinatarios
- Rate limit: `checkRateLimit` sync ignora Redis (límite × instancias serverless); `getClientIP` toma el primer `x-forwarded-for` (spoofeable) → bypass

**Seguridad (Lote B de delivery, TODOS siguen abiertos + nuevos):**
- Token de driver: acepta `delivered` expirado; `/api/driver/photo` sin check de expiración; token en URLs de redirect de las 3 pasarelas; fotos POD en URL pública sin firmar. **Causa raíz: una sola credencial con dos propósitos** (leer PII cliente / escribir estado driver) — separar tokens
- `repeat-order` matchea teléfono por substring ≥7 dígitos (colisiones + enumerable)
- Webhook de Sentry falla ABIERTO sin secreto (`webhooks/sentry:13`)
- `billing/cfdi` sin auth explícita — hoy lo salva RLS de casualidad
- `test-order` y `admin/debug-menu` expuestos en prod (el changelog presume haberlos borrado)

**Checkout/pagos:**
- Guard de doble pago en `/api/payments/intent` es código muerto (`payment_status` no está en el select; el `as any` ocultó el error) — la idempotencia real la cubre otro guard
- `checkout`/`intent` no aplican el gate de free-tier ni usan `resolveCommission` (vector estrecho: orden cash pagada después por el endpoint)
- Divergencia quote-vs-submit: `cart/quote` es una tercera implementación que no valida stock, variantes ajenas, grupos requeridos, `dine_in_only` ni mínimo de delivery → el total que ve el cliente puede diferir del cobrado. Y `calculate-pricing.ts` + sus tests son código muerto que da falsa confianza
- Comisión: `(dashboard)/layout.tsx:55-66` reimplementa el plan omitiendo `commission_plan` y grace — la regresión exacta que `plan-access.ts` documenta haber arreglado
- `admin/toggle-commission-plan` no bloquea Colombia (el self-service sí)
- Monedas zero-decimal (CLP/PYG): cobrarían 100×. Hoy 0 restaurantes ✔prod — poner la lista de zero-decimal ANTES de onboardear Chile/Paraguay
- Wompi por-restaurante: columnas cifradas (AES-256-GCM real) + `secrets.ts` existen pero **nadie los invoca** — todos los cobros CO irían a la cuenta global. Feature a medio migrar, necesita decisión

**Flujos:**
- Modifiers: `/api/product-modifiers` tiene `s-maxage=300` propio que `revalidatePublicMenu` (path-based) nunca invalida → cambios de precio/opciones tardan 5-10 min; `reorderModifierOptions` no invalida nada
- Promos: `current_uses` se quema sin venta (rollback de Stripe y abandono de checkout no decrementan) — una promo de 50 usos se agota sin 50 ventas
- Reservas: ignora `reservation_open_days/time/slot` (columnas configuradas que no restringen — mismo patrón que el radio), sin límite de capacidad (overbooking), y crear reserva no notifica al dueño
- Staff: roles se guardan y **no se aplican en ningún lado**; el ciclo de invitación no se completa (`user_id` nunca se setea) — feature a medias, riesgo teórico
- `staff_members` vs `restaurant_staff` y `dashboard_notifications` vs `notifications` y `categories/products` vs `menu_categories/menu_items`: tres pares de tablas duplicadas donde una es legacy huérfana

---

## D. CREDIBILIDAD — prometido vs real

**Lo ficticio (un prospecto lo desmiente en 30 segundos):**
- `API_DOCUMENTATION.md`: **19 de 19 categorías documentadas no existen** (ni las keys en la respuesta ni las tablas en prod); los snippets de `RESTAURANT_MENU_API_README.md` crashean en la línea 1 (`deliveryZones.length` de undefined). 1.100 líneas describiendo mal un endpoint que nadie consume
- Blog: módulo SMS con Twilio + "Configuración > Integraciones" (no existen ni el módulo ni la sección), 4 de las "9 automatizaciones" (cumpleaños, carrito abandonado, 2º pedido, cliente frecuente), programación de campañas y métricas de apertura/clic
- "Exportar reportes PDF" = HTML imprimible; "CSV/Excel" sin nada de Excel
- Referidos: toggle configurable en el dashboard, endpoint huérfano, **ningún** lugar donde el cliente meta un código
- Changelog atribuye el mapa a react-leaflet/OpenStreetMap (es Mapbox) y presume haber borrado routes de debug (quedan 2)
- FAQ: "offline completo" del driver — los estados sí, la foto POD no (ya conocido)

**Lo real (verificado — que nadie lo "arregle"):** CFDI/Facturama completo, inventario con triggers de Postgres, reservaciones (flujo base), roles de mesa por plan (enforced), dominios custom, offline de estados del driver, señalización de precios server-authoritative, RPCs de promo/lealtad con `FOR UPDATE` sin races.

**Limpieza (peso muerto):** 12 endpoints sin caller (incluye `test-order` y `debug-menu` — ver seguridad), 5 dependencias sin un import (`leaflet`×3, `twilio`, `@monaco-editor/react`, `diff`, `@google/genai`), 3 componentes huérfanos (`PhoneDemo` 226 líneas), 3 implementaciones del email de trial (2 muertas), claves i18n de WhatsApp/SMS retiradas, 16 tablas `_backup_*` en prod, `exec_readonly_sql` como RPC en prod (revisar su superficie).

---

## E. LO QUE ESTÁ BIEN (agregado de los 6 auditores)

Tenant isolation impecable (18 endpoints + ~50 server actions, cero IDOR) · service role jamás en cliente (`server-only`) · 3 webhooks de pago con firma + `timingSafeEqual` + idempotencia claim-before-process · montos siempre desde DB, precios del cliente ignorados · `verifyAdmin` en 19/20 admin (la excepción valida doblemente) · cero secretos hardcodeados · logs sin PII (`maskEmail`) · cifrado Wompi real (AES-256-GCM+scrypt) · 17/17 crons con `CRON_SECRET` fail-closed · rate limiting presente en toda escritura pública · Redis fail-open correcto · signup→menú atómico (RPC transaccional) · product slim pattern intacto · dunning bien construido · state machine única sin drift · fallback i18n correcto · RLS activo en 100% de las tablas.

---

## F. PLAN DE REMEDIACIÓN PROPUESTO

**Lote 1 — Sangrado activo (días):** A1 web push (3 líneas + verificar), A2 quitar u ocultar el botón SMS del KDS, A3 saneo del injection (one-liner), A5 quitar el undo del KDS o agregar aristas de undo explícitas, B3 UNIQUE compuesto + lookup scoped en webhooks, B4 fix de lealtad (guard + constraint parcial) ANTES de que alguien canjee, A4 leader-tab para impresión/sonido.
**Lote 2 — Infra silenciosa (días):** patrón `{ error }` en los gemelos + regla de lint, `res.ok` en broadcasts, re-agregar auto-reload del SW, `captureError` en billing/webhooks, validar `STRIPE_PRICE_*` y webhooks secrets en env.ts, verificar `SENTRY_DSN` en Vercel.
**Lote 3 — Decisiones de producto (William decide antes de codear):** `orders/history` con o sin token · mecanismo de idempotencia de email-automations · Wompi global vs por-restaurante · qué hacer con API v1 (aplicar migración + arreglar columnas + documentar, o retirarla del plan Business) · refund: ¿bloquear cancelación de pagadas o cablear el botón?
**Lote 4 — Credibilidad (horas, alto retorno):** reescribir/borrar `API_DOCUMENTATION.md` y README, corregir blog (SMS, automatizaciones, PDF), quitar referidos de la UI o completarlos, limpiar endpoints/deps muertos.
**Lote 5 — Latentes de plan:** gates server-side (branches/loyalty/api-keys), límite de 3 sucursales real, zero-decimal currencies, quote unificado con `order-pricing.ts`.

---

*Los 6 reportes crudos de los auditores están disponibles; este consolidado descarta lo no confirmado y marca ✔prod lo verificado contra producción. Cero BLOCKERs falsos detectados en esta ronda: los spot-checks contra el dump real de prod validaron a los auditores antes de aceptar sus hallazgos.*
