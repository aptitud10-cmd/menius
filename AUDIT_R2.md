# AUDITORÍA RONDA 2 — MENIUS (2026-08-07)

6 auditores en paralelo sobre las zonas que ninguna auditoría anterior había cubierto a fondo:
billing/subscripciones, auth/onboarding, los 17 crons, aislamiento de tenants (IDOR), la app
Android del Counter, y performance del menú público.

**Todos los BLOCKERs de este reporte fueron verificados de primera mano contra producción**
(SQL read-only o transacciones revertidas, Node para el parseo de URLs, curl contra menius.app,
lectura directa del SDK instalado). Cero hallazgos inferidos.

Base de comparación: commits `60120fa..7cbc05d` (remediación general + Lote B + Wompi).

---

## Resumen ejecutivo

| # | BLOCKER | Dominio | ¿Explotable hoy? |
|---|---|---|---|
| B1 | Takeover cross-tenant vía `profiles.default_restaurant_id` | Auth | **SÍ — verificado en prod** |
| B2 | Open redirect en `/auth/callback` (backslash) | Auth | **SÍ — verificado** |
| B3 | `cost_price` de cada plato en el HTML público | Perf/Privacidad | **SÍ — verificado en menius.app** |
| B4 | Webhook de Stripe roto por versión de API (Basil) | Billing | Sí, al primer suscriptor real |
| B5 | Endpoint huérfano regala el plan 4% (features starter) | Billing | **SÍ — endpoint vivo** |
| B6 | RLS anon abierta en `app_devices` / `app_device_tokens` | IDOR | Sí (tablas vacías hoy) |
| B7 | Reservas canceladas 2-6h ANTES de la hora (timezone) | Crons | Sí, en cuanto se usen reservas |
| B8 | La app Android no compila (char literal + keystore) | Android | **SÍ — build roto** |
| B9 | Tickets térmicos con acentos → mojibake | Android | Sí, cada ticket en LatAm |

**Lo que está sano** (verificado, no asumido): el aislamiento tenant-vs-tenant en código
(18/18 rutas tenant y ~50 server actions filtran bien — no hay IDOR de A contra B), la
idempotencia de webhooks, el diseño del ciclo de subscripción (gracia, dunning, trial no
renovable, `free` nunca en DB), los 17 crons existen y están agendados (ninguno muerto), la
seguridad del WebView Android (navegación confinada, bridge mínimo, cleartext bloqueado), y la
arquitectura de datos del menú (ISR, slim pattern, imágenes con transforms y `sizes`).

---

## BLOCKERs

### B1 — Un restaurantero puede apoderarse del restaurante de otro
**Dominio:** auth · **Verificado en prod** (transacción revertida por el auditor; policy releída por mí)

`pg_policy` sobre `public.profiles` en prod:
```
users_update_own_profile   USING (user_id = auth.uid())   WITH CHECK = NULL
```
La policy controla *qué fila* editás, no *qué valor* escribís. Y `src/lib/auth/get-tenant.ts:20-31`
deriva el tenant **exclusivamente** de `profiles.default_restaurant_id`, sin validar contra
`restaurants.owner_user_id`.

**Ataque:** el dueño de un restaurante toma la anon key (pública, va en el bundle) + su JWT y hace
`update profiles set default_restaurant_id = '<uuid-ajeno>' where user_id = '<el suyo>'`.
Los UUID de restaurante se enumeran desde los endpoints públicos del menú.

Las tablas con RLS propia (`orders`, `products`) frenan, pero **16 rutas usan `createAdminClient()`
y confían en `tenant.restaurantId` sin re-verificar**: `tenant/wompi-keys` (sobrescribe las llaves
de pago de otro), `payments/refund` (emite reembolsos), `account/delete` (borra la cuenta),
`tenant/api-keys`, `tenant/loyalty`, `tenant/branches`, `tenant/upload`, `billing/*`, `ai/*`.

**Fix (las dos capas):**
1. Migración nueva con `WITH CHECK` que exija que el `default_restaurant_id` sea propio.
2. `getTenant()` hace join contra `restaurants.owner_user_id` y devuelve `null` si no matchea —
   una query que blinda las 16 rutas de golpe. No toca sesiones (ajeno a la regresión del 2026-06-15).

### B2 — Open redirect en `/auth/callback` vía backslash
**Dominio:** auth · **Verificado con Node**

`src/app/auth/callback/route.ts:66-67` filtra `//evil.com` pero no `/\evil.com`. El estándar WHATWG
normaliza `\` → `/` en esquemas especiales. Salida real de mi verificación:
```
next="/\evil.com"    pasa_guard=true   destino_final=https://evil.com/
next="/\/evil.com"   pasa_guard=true   destino_final=https://evil.com/
next="//evil.com"    pasa_guard=false  (bloqueado)
```
**Impacto:** es el path de TODOS los magic links y del login de Google. El link es de menius.app real,
el intercambio PKCE ocurre de verdad, y la víctima aterriza en el sitio del atacante ya logueada.

**Fix:** no parchear con más `startsWith`. Resolver y comparar origin:
`const c = new URL(raw, origin); if (c.origin === origin) next = c.pathname + c.search + c.hash;`

### B3 — El costo de cada plato viaja al browser de cada cliente
**Dominio:** performance/privacidad · **Verificado con curl contra menius.app/buccaneer**

`menu-data.ts:134-138` hace `select('*')` (obligatorio por la regla 11) y `[slug]/page.tsx:532-536`
solo vacía `variants`/`extras`. Las 24 columnas escalares viajan en el payload RSC, incluidas
**`cost_price`** (el costo real de cada plato), `stock_qty`, `low_stock_threshold`, `track_inventory`.
Confirmado: `cost_price` aparece en el HTML público de Buccaneer hoy.

Cualquiera que abra el código fuente ve los márgenes del restaurante. Es filtración de datos del
negocio del cliente **y** payload muerto (~200-300KB de flight con 424 productos).

**Fix:** pick explícito de campos en `page.tsx` (capa JS, no toca la query — compatible con la regla
11 y con el slim pattern). Estimado −30-40% de payload además de cerrar la fuga.

### B4 — El webhook de Stripe se rompe con el primer suscriptor real
**Dominio:** billing · **Verificado leyendo el SDK instalado**

`node_modules/stripe/cjs/apiVersion.js` → `2026-01-28.clover`; SDK v20.3.1; `src/lib/stripe.ts:9`
crea el cliente sin pinnear `apiVersion`. Desde Basil (2025-03) `subscription.current_period_end`
ya no existe en la raíz (se movió a `items.data[]`) e `invoice.subscription` desapareció.

Usos rotos: `billing/webhook/route.ts:152-163` y `cron/billing-reconciliation/route.ts:129-132`
(`new Date(undefined * 1000).toISOString()` → **RangeError**).

**Estado en prod:** `processed_webhook_events` no tiene **ni un solo evento de suscripción** en toda
la historia, y ninguna fila de `subscriptions` tiene `stripe_subscription_id`. Este camino nunca
corrió end-to-end. Cuando corra: el webhook lanza → 500 → Stripe reintenta 3 días → la suscripción
nunca se registra → **el restaurante paga y no tiene acceso**. Y la red de seguridad (el cron de
reconciliación) está rota por la misma causa.

**Fix:** `sub.items?.data?.[0]?.current_period_end ?? sub.current_period_end`,
`invoice.parent?.subscription_details?.subscription ?? invoice.subscription`, y un checkout de
prueba en test mode antes del primer cliente pago.

### B5 — Endpoint huérfano que regala el plan 4% (= features starter gratis)
**Dominio:** billing · **Verificado leyendo el route**

`src/app/api/billing/activate-commission-plan/route.ts:61-71`: solo pide `getTenant()`. Un POST `{}`
pone `commission_plan = true` (único gate: no ser Colombia). Eso hace que `check-plan.ts:90` devuelva
`'starter'` → features de plan pago sin suscripción.

Como el 4% solo se cobra sobre pagos online con tarjeta, un restaurante que trabaja en efectivo
obtiene **starter gratis para siempre**. Contradice el CLAUDE.md: "Activación SOLO desde /admin"
vía `/api/admin/toggle-commission-plan` con `verifyAdmin`. No tiene callers en la UI.

**Fix:** borrar la rama de activación (o gatearla con `verifyAdmin`). La rama `deactivate` puede
quedar para el tenant.

### B6 — RLS abierta a anónimos en las tablas de la app móvil
**Dominio:** IDOR · **Verificado en prod** (policies releídas por mí; explotación probada por el auditor con rollback)

```
app_devices_anon_select   cmd=r  USING (true)
app_devices_anon_update   cmd=w  USING (true)
app_devices_anon_insert   cmd=a
app_device_tokens_anon_all cmd=*  USING (true)
```
Cualquiera con la anon key puede **leer y sobrescribir** `phone`, `email`, `addresses`,
`display_name` de todos los clientes, y enumerar/borrar los `expo_push_token` (→ mandar
notificaciones falsas suplantando a MENIUS).

**Patrón raíz:** `src/app/api/app/device/route.ts:15-22` afirma en un comentario que "anon RLS on it
was closed" — **nunca se cerró**. La ruta se blindó, la pared quedó abierta.

**Atenuante:** ambas tablas están vacías (la app Expo no lanzó). El fix cuesta 4 líneas hoy y es una
fuga retroactiva total el día que la app cargue clientes.

**Fix:** `revoke all on app_devices, app_device_tokens from anon` + drop de las 4 policies. Todo el
tráfico ya pasa por `/api/app/device*` con admin client.

### B7 — Las reservas se cancelan 2-6 horas ANTES de la hora reservada
**Dominio:** crons

`cron/auto-cancel-reservations/route.ts:38`: `new Date(\`${reserved_date}T${reserved_time}\`)` parsea
como UTC (Vercel corre en UTC), pero esas columnas guardan hora **local del restaurante**
(`date` + `time without time zone`).

Buccaneer (UTC-4): una reserva pendiente de las 19:00 locales se lee como 19:00 UTC = 15:00 locales,
y el cron —que debía limpiar no-shows 2h *después*— la cancela a las 17:00, **dos horas antes de que
llegue el cliente**. En UTC-6 son 4 horas. Muere en silencio: no notifica a nadie.

**Fix:** resolver el timezone del restaurante antes de comparar.

### B8 — La app Android no compila
**Dominio:** Android · **Verificado leyendo el source**

1. `EscPosEncoder.kt:21` → `s.replace('€', 'EUR')` — `'EUR'` es un *character literal* de 3
   caracteres: error de compilación de Kotlin. Fix: comillas dobles.
2. `app/build.gradle.kts:28-31` → `file(keystoreProps["storeFile"] as String)` se evalúa en la fase
   de configuración; `keystore.properties` está en `.gitignore`, así que en un clone limpio es `null`
   → NPE → **falla hasta `assembleDebug`**. Fix: gatear el bloque con `if (keystorePropsFile.exists())`.

Nadie compiló este código en su estado actual.

### B9 — Los tickets térmicos imprimen los acentos como basura
**Dominio:** Android

`EscPosEncoder.kt:23` manda UTF-8 crudo sin seleccionar code page (`ESC t`). Las térmicas
(Epson/Star/Xprinter) arrancan en CP437/CP850: cada `ñ/á/é/í` sale como mojibake. En LatAm eso es
cada ticket (nombres, direcciones, platos). Encima `ReceiptEscPosBuilder.kt:134,196` imprime el
emoji `⏱`.

**Fix:** transcodificar a CP858 + `ESC t` al code page correspondiente; quitar el emoji.

---

## WARNs (18)

### Seguridad / datos
- **W1 — Rate limit de auth decorativo.** `src/lib/actions/auth.ts:10-15` tiene su propia copia de
  `getIPFromHeaders()` con `x-forwarded-for.split(',')[0]` — el elemento spoofeable, justo lo que la
  remediación de ayer corrigió en `getClientIP()`. Mandando un XFF random por request, los límites de
  login (10/5min), signup (5/5min) y reset (3/5min) **dejan de existir**. Fix: usar `getClientIP()`.
- **W2 — `verifyTurnstile` fail-open ante misconfiguración.** `turnstile.ts:22-27` devuelve `true` si
  falta el secret. Combinado con W1: si `TURNSTILE_SECRET_KEY` se borra en prod, auth queda sin
  anti-bot **ni** rate limit, en silencio. Fix: en producción, secret ausente = error al boot.
- **W3 — `/api/public/repeat-order` devuelve el último pedido con solo el teléfono.** Es el hermano no
  remediado de `order-track`/`orders/history` (que sí recibieron gate de token). Además el
  `ilike %últimos10%` puede colisionar entre clientes. Fix: exigir `customer_token`; mínimo, `eq`.
- **W4 — Enumeración de cuentas en signup.** `auth.ts:35` propaga el error crudo y la UI lo mapea a
  "Este email ya está registrado". Puede ser decisión consciente de UX.
- **W5 — `staff_members` es una UI sin backend.** 0 filas en prod, no existe flujo de invitación, y
  `getTenant()` ni consulta la tabla: **un staff invitado no puede entrar**. Cuando alguien la conecte,
  entraría con permisos de owner (no hay noción de rol). Decidir si la feature vive o se saca de la UI.

### Billing
- **W6 — La reconciliación marca `past_due` sin estampar `past_due_since`** → el moroso conserva el
  plan pago para siempre y el dunning nunca lo toca (`check-plan.ts:108` + `dunning/route.ts:43`).
- **W7 — Eventos de Stripe fuera de orden pueden resucitar una sub cancelada** (`webhook:104-218` no
  compara `event.created`).
- **W8 — `getEffectivePlanId` no resuelve aliases legacy** (`basic`/`enterprise` rankean como free).
  Teórico hoy: prod solo tiene `starter`/`business`.

### Crons
- **W9 — `{ error }` ignorado en 8 crons** (email-automations, health-alerts, monitor-stores,
  monitor-orders, menu-optimizer-alerts, stripe-connect-reminders, dunning): un error de query se ve
  como "0 filas" y el cron reporta `ok: true`. Es el patrón catch-decorativo otra vez.
- **W10 — Alertas sin dedupe en crons de */10min** → hasta 144 duplicadas/día por la misma condición
  (monitor-orders secciones 1/2/3, monitor-stores). La remediación puso dedupe solo en 1b.
- **W11 — `stripe-connect-reminders` spamea todos los lunes para siempre**, sin cap ni opt-out, y no
  excluye Colombia (donde Stripe ni aplica tras la Opción B de Wompi).
- **W12 — `daily-summary` sin `maxDuration`, loop secuencial sin dedupe**: con decenas de restaurantes
  muere a mitad y un re-run duplica emails a los primeros N.

### Performance
- **W13 — First-load JS sobredimensionado**: posthog-js estático (~50KB gz) con autocapture sobre
  cientos de cards, framer-motion completo (~40KB), supabase-js con realtime, todo dentro de un client
  component de 3.758 líneas que se hidrata entero. Estimado 250-330KB gz → 1,5-3s de parse en gama media.
- **W14 — Los 424 productos se serializan dos veces**: payload RSC + JSON-LD completo con los 424
  `MenuItem`.
- **W15 — El blur placeholder está muerto**: `image-loader.ts:53-67` devuelve una URL remota, y Next la
  envuelve en un SVG data-URI que no puede cargar recursos externos. Nunca se muestra.
- **W16 — `router.prefetch('/checkout')` en el mount** compite con el LCP en 4G.
- **W17 — 2 WebSockets realtime por visitante** desde el segundo cero (consumen el pool de conexiones
  de Supabase con gente que solo mira el menú).
- **W18 — Listener `touchmove` global no-pasivo con `getComputedStyle` en loop** (`layout.tsx:170-192`),
  en el hot path del scroll de todas las páginas.

### Android
- **W19 — `printReceipt` congela la UI del Counter** hasta ~10s por orden con impresora caída
  (`runBlocking` en un método síncrono del bridge).
- **W20 — Sin red = pantalla de error cruda de Chromium** sin botón de recargar.
- **W21 — Sin `keepScreenOn`**: la tablet del mostrador se duerme y se pierden órdenes.
- **W22 — Logout no limpia WebStorage**: datos del restaurante A visibles para el B en tablet compartida.

---

## Patrón raíz de esta ronda

**Comentarios que afirman una protección que no existe.** `device/route.ts` dice "anon RLS was closed"
y no lo está (B6). El bloque de Settings decía "Wompi activo" sin que nada funcionara (arreglado ayer).
El docstring de `driver/status` prometía notificaciones que el código no manda (ronda anterior).

Corolario operativo: **`supabase/schema.sql` no sirve para auditar seguridad** — no tiene ni una línea
de RLS/POLICY en sus 735 líneas, y además le faltan columnas que sí están en prod
(`subscriptions.trial_ending_reminder_sent_at`, `menius_posts.external_post_id/published_at`). Dos
auditores estuvieron a punto de reportar falsos BLOCKERs por eso. Hay que regenerarlo incluyendo
políticas, y hacer que el cron `rls-drift-check` (que ya existe) valide estas policies.

---

## Lotes propuestos

**Lote 1 — Seguridad, hoy (2-3h).** B1 (takeover) + B2 (open redirect) + B6 (RLS anon) + W1 (rate
limit) + B5 (endpoint del 4%). Son los que un tercero puede explotar contra prod ahora mismo.

**Lote 2 — Privacidad y dinero (2-3h).** B3 (`cost_price` fuera del HTML) + B4 (campos Basil de
Stripe) + W6 (`past_due_since`) + B7 (timezone de reservas).

**Lote 3 — App Android (3-4h + build en tablet física).** B8 + B9 + W19-W22. Requiere que vos
compiles y pruebes en una tablet real; yo no puedo validar impresión térmica.

**Lote 4 — Performance del menú (medio día).** W13-W18, con `ANALYZE=true next build` + Lighthouse
para medir de verdad (los KB del reporte son estimados por análisis estático).

**Lote 5 — Higiene de crons (2h).** W9-W12 + regenerar `schema.sql` con RLS.
