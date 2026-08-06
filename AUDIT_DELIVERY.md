# AUDIT — Capacidades de DELIVERY/FULFILLMENT en MENIUS

> **Nota de encuadre para el lector:** este es el estado actual verificado a 2026-08-06, generado como insumo para cotizar la implementación de Buccaneer. Los ítems del anexo §6 marcados como configuración (fee, ETA, geocodificación) son ~30 minutos de settings y NO deben cotizarse como desarrollo; todo lo del §4 sí es desarrollo real.

**Fecha:** 2026-08-06 · **Modo:** solo lectura (ningún archivo de código modificado)
**Alcance:** repo completo (`src/`, `supabase/`, `package.json`, docs) + memorias de auditorías previas (2026-06-18, 2026-06-20)

> Veredicto en una frase: MENIUS tiene un **tracking de entrega con flota propia sorprendentemente maduro** (GPS en vivo, PWA offline, foto de entrega), pero **cero logística**: no hay dispatch, no hay red de repartidores, no hay integración con couriers externos, y ninguna regla de negocio (zona, mínimo, fee por distancia) se aplica de verdad. El repartidor lo consigue, coordina y gestiona el restaurante por fuera de la plataforma.

---

## 1. GESTIÓN DE PEDIDOS

### 1.1 Tipos de fulfillment soportados

Tres tipos: `dine_in`, `pickup`, `delivery`.

- Tipo TS: `src/types/index.ts:5` — `export type OrderType = 'dine_in' | 'pickup' | 'delivery'`
- Columna: `supabase/schema.sql:383` — `order_type text DEFAULT 'dine_in'` (valores documentados solo en comentario SQL, `supabase/migration-locale-ordertype-payments.sql:23`; **no hay CHECK constraint** sobre `order_type`)
- Gate por restaurante: `supabase/schema.sql:583` — `order_types_enabled jsonb DEFAULT '["dine_in", "pickup"]'` → **delivery viene APAGADO de fábrica**; el dueño lo activa en Settings
- El servidor rechaza órdenes de un tipo no habilitado: `src/app/api/orders/route.ts:232-246`

### 1.2 Cómo se diferencia delivery de pickup en el data model

No hay tabla separada de deliveries. Todo vive como **columnas en `orders`** (`supabase/schema.sql:369-421`, 52 columnas):

| Grupo | Columnas | path:línea |
|---|---|---|
| Tipo | `order_type` | schema.sql:383 |
| Destino | `delivery_address`, `delivery_instructions`, `delivery_lat`, `delivery_lng` | schema.sql:385, 417, 418-419 |
| Cobro | `delivery_fee` (snapshot del fee cobrado) | schema.sql:389 |
| Repartidor | `driver_id` (FK a `drivers`), `driver_name`, `driver_phone`, `driver_assigned_at` | schema.sql:390-393 |
| Tracking | `driver_tracking_token`, `driver_token_expires_at`, `driver_lat`, `driver_lng`, `driver_updated_at` | schema.sql:398-401, 409 |
| Progreso | `driver_picked_up_at`, `driver_at_door_at`, `driver_delivered_at` | schema.sql:410-412 |
| Prueba | `delivery_photo_url` | schema.sql:402 |

⚠️ Datos importantes sobre estas columnas:

- **`delivery_lat`/`delivery_lng` NUNCA se pueblan.** El `AddressAutocomplete` (Google Places) sí devuelve coordenadas (`src/components/ui/AddressAutocomplete.tsx:85-90`), pero el checkout no conecta `onPlaceSelect` (`src/components/public/CheckoutPageClient.tsx:1652-1661`) — las coordenadas del destino se descartan. La dirección viaja como string plano.
- **`delivery_instructions` existe pero el checkout público nunca la escribe** — no hay campo de instrucciones para el repartidor.
- **`driver_name`/`driver_phone` son texto libre denormalizado**; `driver_id` (FK real) existe pero el Counter web no lo setea (ver §2.2).

### 1.3 Estados — "en camino" y "asignado a repartidor"

**Sí existe** el estado "en camino": `out_for_delivery`. CHECK vigente con 10 estados (`supabase/migration-new-order-statuses.sql:25-38`):

```
pending · confirmed · preparing · almost_ready · ready ·
out_for_delivery · served · delivered · completed · cancelled
```

Máquina de estados autoritativa en `src/lib/order-state.ts:21-32`. Ruta delivery:
`pending → preparing → ready → out_for_delivery → delivered` (terminal).

"Asignado a repartidor" **no es un estado** — es la presencia de `driver_assigned_at`/`driver_name` en la orden. El progreso fino de la entrega tampoco usa estados sino timestamps (`driver_picked_up_at`, `driver_at_door_at`, `driver_delivered_at`), decisión documentada en `supabase/migration-driver-status-timestamps.sql:2-3` ("without introducing new order statuses"). Los badges del Counter ("Espera driver / En camino / En puerta") se derivan de esos timestamps (`src/components/orders/CounterView.tsx:2395-2405`).

🐛 **Bug encontrado — API v1 desincronizada de la DB:** `src/app/api/v1/orders/route.ts:23` valida `accepted` y `delivering`, estados que **no existen** en el CHECK de la DB ni en `OrderStatus`, y omite `confirmed`, `almost_ready`, `out_for_delivery`, `served` que sí existen. No hay capa de mapeo — el filtro se aplica crudo (`route.ts:95`). Consecuencia: `?status=delivering` devuelve siempre `[]` (200 vacío) y `?status=out_for_delivery` da 400 aunque sea un estado real y poblado. Un integrador externo no puede consultar los pedidos en camino.

---

## 2. LOGÍSTICA DE ENTREGA

### 2.1 Repartidores propios — SÍ existe módulo, y es lo más maduro del sistema

**Tabla `drivers`** (`supabase/schema.sql:157-166`): pool de repartidores por restaurante (`name`, `phone`, `is_active`, `auth_user_id`, `phone_e164`). CRUD desde el dashboard en Staff (`src/app/api/tenant/drivers/route.ts`, bien scoped por tenant en las 4 operaciones).

**PWA del repartidor** — `src/app/driver/track/[token]/DriverTrackClient.tsx` (822 líneas):
- Auth **por token-por-orden** (`crypto.randomUUID()`, TTL 24 h) — **el repartidor NO tiene login**
- GPS con `watchPosition` + throttle (`:288-301`), Screen Wake Lock (`:255-266`)
- Flujo de 3 pasos: `picked_up` → `at_door` → `delivered` con swipe-to-confirm
- Offline real: cola en IndexedDB + Background Sync (`public/sw.js:130-144`) + fallback manual iOS
- Foto de prueba de entrega (`:373-391` → `/api/driver/photo`)

**Pipeline GPS** (bien diseñado a escala): `POST /api/driver/location` → cache Redis del token (`src/lib/tracking/token-cache.ts:36`) → tabla estrecha `order_location_latest` (`supabase/schema.sql:340-347`, solo última posición, PK = order_id) → trigger sincroniza a `orders.driver_lat/lng` → broadcast realtime `location_update` separado del `status_change` (`src/lib/realtime/broadcast-order.ts:58-84`).

**El cliente ve al repartidor en un mapa en vivo**: `src/components/public/DeliveryMap.tsx` (Mapbox GL, geocoding v6, ETA vía Directions API proxied con cache Redis en `/api/public/directions`). Consumido por `OrderTracker.tsx:959` con realtime + fallback a DB.

### 2.2 Pero la arquitectura de drivers está PARTIDA EN DOS sistemas desconectados

Existe una segunda vía pensada para una app nativa de driver (JWT de Supabase): `src/lib/auth/driver-auth.ts:21-42`, `GET /api/driver/me`, `GET /api/driver/orders` (batch de órdenes asignadas, filtra por `driver_id` — `src/app/api/driver/orders/route.ts:73-74`). El problema:

1. **El Counter web nunca setea `driver_id`**: `handleAssignDriver` llama `assignDriver(orderId, driverName, driverPhone)` sin el cuarto parámetro (`src/components/orders/CounterView.tsx:981`); el click en un driver del pool solo copia nombre/teléfono a los inputs (`:2152`). → `orders.driver_id` queda NULL → **la API de batch no ve ninguna orden asignada desde el Counter.**
2. **El CRUD del dashboard no puede setear `auth_user_id` ni `phone_e164`** (`src/app/api/tenant/drivers/route.ts:37` solo acepta `name`/`phone`) → un driver creado en la UI **jamás puede autenticarse**.
3. **El login OTP del driver está referenciado pero no existe** (`src/app/api/driver/me/route.ts:68` lo menciona; cero `signInWithOtp` en `src/`; no hay app de driver en `apps/`).

Conclusión: el flujo por JWT es infraestructura para un futuro que no llegó. Hoy el 100% del delivery real corre por el token-QR.

### 2.3 Integraciones con delivery-as-a-service — NO EXISTE NINGUNA

Verificado en tres capas, resultado cero:

- `package.json`: sin uber/doordash/rappi/stuart/shipday/nash/onfleet/bringg/olo/deliverect
- `src/lib/env.ts:11-35`: ninguna variable de courier externo (lista completa verificada)
- CSP en `next.config.js:46`: ningún host de courier whitelisteado — ni siquiera hay integración parcial

**MENIUS es 100% flota propia (BYOD — bring your own driver).** No existe abstracción de "delivery provider", ni webhooks de courier, ni cotización de despacho externo. Integrar Uber Direct/DoorDash Drive sería greenfield completo. El único proveedor externo de logística es **Mapbox** (mapas/geocoding/directions).

### 2.4 Radio/zona de entrega — el campo existe pero es DECORATIVO

- `restaurants.delivery_radius_km` (`supabase/schema.sql:588`) se configura con un slider en Settings (`src/components/dashboard/RestaurantSettings.tsx:949-958`), pero **la propia UI admite que no hace nada**: `:1014-1016` — *"Las órdenes fuera de este radio aún se pueden hacer (solo referencial)"*.
- `/api/orders` **no consulta el radio** (el select de `route.ts:208` ni lo incluye). Grep de `delivery_radius_km` en `src/`: solo settings + types, cero validación.
- La única validación de dirección en todo el sistema: **`length >= 5`** (`src/app/api/orders/route.ts:249-262`). `"asdfg"` crea una orden válida y pagable. Una dirección a 40 km (o en otro país) entra igual.
- No existen tablas `delivery_zones` ni polígonos. ⚠️ `API_DOCUMENTATION.md:186-217` y `RESTAURANT_MENU_API_README.md:28,54,228-236` **documentan `deliveryZones` y `deliveryRestrictions` que la API real no devuelve** (`src/app/api/public/restaurant-menu/route.ts:137-146`) — docs de ficción.
- Irónico: la única distancia cliente-restaurante que se calcula en el sistema (`src/lib/utils/eta.ts:44-47`, haversine × 1.35 a 25 km/h) sirve solo para *sugerir* un ETA al staff después de que el pedido ya entró — nunca para validar cobertura ni cobrar por distancia. Además llama a Nominatim desde el navegador sin User-Agent (`eta.ts:37`), violando su política de uso.

### 2.5 Delivery fee — existe y está bien cobrado, pero es un número plano

- **Un solo valor fijo por restaurante**: `restaurants.delivery_fee` (`supabase/schema.sql:568`). Ni por distancia, ni por zona, ni por subtotal. Se configura en Settings (`RestaurantSettings.tsx:928-936`).
- **Server-authoritative (bien):** el checkout lo muestra, pero el servidor recalcula todo desde DB — `src/app/api/orders/route.ts:631` (`serverDeliveryFee`) → `computeOrderTotals({ isDelivery })` (`:751-762`, `src/lib/order-pricing.ts:107-124`). Las tres pasarelas cobran `order.total` completo (Stripe `checkout/route.ts:82`, wallet `intent/route.ts:78`, Wompi `wompi/route.ts:70`). No es manipulable desde el cliente.
- **No hay mínimo de pedido para delivery.** `min_order` es solo umbral de cupones (`schema.sql:497`); `minOrderValue` es solo de auto-aceptación del Counter (`src/lib/counter/AutoAcceptService.ts:82`). Un pedido de $1 a domicilio es obligatorio de despachar.
- Detalles: la comisión de plataforma 4% se cobra también sobre el fee de envío (`payments/checkout/route.ts:90-93,112`); el `CartPanel` suma el fee sin saber el `order_type` (`CartPanel.tsx:489,527` vía `MenuShell.tsx:3035,3215`), mostrando "+envío" antes de que el cliente elija pickup — discrepancia de UI, no de cobro.

---

## 3. FLUJO END-TO-END DE UN PEDIDO DE DELIVERY

### Traza (con los archivos que ejecutan cada paso)

1. **Cliente ordena** — `CheckoutPageClient.tsx:566` (`handleSubmitOrder`) → POST `/api/orders` con `Idempotency-Key` (`:635`) y `delivery_address` solo si es delivery (`:652`). Dirección obligatoria client-side (`:588-595`).
2. **Servidor crea la orden** — `src/app/api/orders/route.ts`: rate limit (`:52-65`), idempotencia con manejo de race 23505 (`:78-96`, `:860-879`), anti-bot (`:103-127`), valida tipo habilitado (`:232-246`) y dirección ≥5 chars (`:250-262`), **recalcula precios desde DB** (`:621-622`), genera `driver_tracking_token` con TTL 24 h solo para delivery (`:780-784`), inserta con `status: 'pending'` (`:797`).
3. **Notificación de nueva orden** — `notifyNewOrder()` fire-and-forget (`:1375-1404` → `src/lib/notifications/order-notifications.ts:102-225`): email al cliente, email al dueño (si configuró `notification_email`), notificación in-app. **No hay push ni SMS en la orden nueva** (el doc interno `docs/ORDER_FLOW.md:26` dice "push + email" — está desactualizado). El sonido del Counter es client-side vía realtime.
4. **Restaurante la ve en el Counter** — realtime `use-realtime-orders.ts` (postgres_changes + polling fallback 10 s) → chime + push local + impresión (`CounterView.tsx:582-593`). Acepta (`pending → preparing`, fija ETA, `:714-753`), marca lista (`→ ready`, `:765-783`). Toda transición pasa por `updateOrderStatus()` (`src/lib/actions/restaurant.ts:1404-1508`) con `canTransition` + log en `order_status_history`.
5. **Asignación de repartidor — MANUAL** — Modal en el Counter: nombre y teléfono **a mano** (`CounterView.tsx:2167-2179`; el pool solo autocompleta texto, `:2152`) → `assignDriver()` (`restaurant.ts:1680-1762`) genera token nuevo y **no notifica a nadie**.
6. **El link llega al repartidor EN PAPEL** — dos caminos: ficha impresa con QR (`CounterView.tsx:2195-2229`) o QR en el ticket de cocina (`src/lib/printing/receipt-formatter.ts:391-397`). El repartidor escanea con su teléfono y abre la PWA.
7. **Entrega con tracking** — PWA: `picked_up` avanza la orden a `out_for_delivery` (`src/app/api/driver/status/route.ts:105-114`), GPS arranca, el cliente ve el mapa en vivo en `/[slug]/orden/[orderNumber]?t=token` (`OrderTracker.tsx`, broadcast + polling 5 s). `at_door` → timestamp. Foto opcional de entrega.
8. **Cierre** — `delivered` lo marca el repartidor (swipe, `driver/status/route.ts:130-191`) o el restaurante desde el Counter (con guard bypasseable si el driver nunca confirmó pickup, `CounterView.tsx:897-900`). Email + push al cliente (`notifyStatusChange`). Delivery termina en `delivered`, no `completed` (`CounterView.tsx:892-893`); ambos cuentan como revenue (`order-state.ts:57`).

### Puntos donde el sistema depende de coordinación humana fuera de la plataforma

Este es el corazón del audit. **El sistema registra la entrega; no la produce:**

1. **No hay dispatch.** Cero asignación automática, cola de drivers, o broadcast a repartidores disponibles. Un humano decide a quién asignar y lo escribe a mano (`CounterView.tsx:2167-2179`).
2. **Conseguir al repartidor es 100% off-platform.** `assignDriver` escribe en DB y genera token — no manda SMS, WhatsApp, email ni push al driver. Llamarlo es un paso humano invisible al sistema. (No hay Twilio implementado — las menciones en el changelog son marketing sin código; `WHATSAPP_ACCESS_TOKEN` está declarado en `env.ts:34` con cero consumidores.)
3. **La entrega del link de tracking es física** (QR impreso). Impresora caída o driver que no escanea = tracking muerto, orden atascada en `ready` (el botón manual del Counter está bloqueado por el guard `!driver_picked_up_at`, `CounterView.tsx:820-823`).
4. **"Va en camino" no le llega al cliente.** `out_for_delivery` no dispara ni email ni push — no está en la lista de `notifyStatusChange` (`restaurant.ts:1484`) y no existe plantilla de email ni payload de push para ese estado. El docstring de `driver/status/route.ts:6-7` promete notificaciones de `picked_up`/`at_door` que el código no envía (solo broadcast in-page). El cliente se entera solo si tiene la pestaña del tracker abierta; en la práctica, el "ya salió tu pedido" se comunica por teléfono.
5. **`notify_outside` es código muerto** — retorna `ok: true` sin hacer nada y nadie la invoca (`driver/status/route.ts:126-128`).
6. **Sin cierre automático ni alertas para delivery colgado.** El cron de auto-cierre excluye delivery (`auto-complete-pickup/route.ts:42,91`) y el monitor solo vigila `pending` >1 h (`monitor-orders/route.ts:29`). Una orden en `ready` esperando driver, o en `out_for_delivery`, puede quedar viva para siempre.
7. **Sin confirmación del cliente.** `delivered` es unilateral (driver o restaurante). Las disputas se resuelven por teléfono; el único artefacto es la foto opcional.
8. **Decidir si el pedido es entregable es un juicio humano** — sin validación de zona, el restaurante rechaza cancelando (y quemando al cliente que ya pagó).

### Hallazgos de seguridad colaterales (para backlog, no bloquean el análisis de producto)

- `delivered` se acepta con token **expirado** a propósito (`driver/status/route.ts:77`); `/api/driver/photo` no valida expiración en absoluto (`photo/route.ts:41-47`).
- El `driver_tracking_token` (que permite marcar entregado y postear GPS) viaja en las URLs de redirect de las 3 pasarelas (`checkout/route.ts:102`, `wompi/route.ts:73`, `mercadopago/route.ts:79`) → queda en historial del navegador y logs del PSP.
- La foto de entrega (puede mostrar la puerta/casa del cliente) queda en URL pública no firmada (`photo/route.ts:65`).
- Foto POD no se encola offline (`DriverTrackClient.tsx:386-388`), contradiciendo el marketing de `blog-data.ts:3345` ("uploads automatically when signal returns").
- Re-asignar driver **borra todo el progreso GPS/entrega** (`restaurant.ts:1714-1720`) — correcto para reasignación, destructivo si se usa para regenerar un token vencido (pedidos programados >24 h).

---

## 4. GAPS Y LIMITACIONES — qué falta para competir con Uber Eats en DELIVERY

Sin suavizar: **MENIUS hoy NO tiene logística de entrega. Tiene un tracker.** La diferencia importa:

- **Uber Eats resuelve "¿quién lleva esto?"** — red de repartidores, dispatch automático, matching por cercanía, reasignación si el driver no responde. MENIUS asume que el restaurante ya tiene su repartidor y ya lo llamó; lo único que aporta es visibilidad una vez que el tipo escanea un QR.
- Gaps concretos, ordenados por qué tan estructural es cada uno:

| Gap | Estado en el código | Esfuerzo |
|---|---|---|
| Red de repartidores / marketplace | Inexistente. Ni concepto en el data model | Fuera de alcance realista de un SaaS de este tamaño |
| Integración courier externo (Uber Direct, DoorDash Drive) | Cero código, cero env vars, CSP no lo permite | Greenfield: capa de provider + webhooks + mapeo de estados. **Es la ruta viable** para ofrecer "delivery sin tu propia flota" |
| Dispatch/asignación automática a flota propia | Inexistente; asignación = texto libre en un modal | Medio, pero requiere primero identidad de driver (abajo) |
| Identidad del driver (login, sesión, "mis entregas") | ~40% construido y desconectado: API JWT existe, login OTP no, Counter no setea `driver_id`, dashboard no vincula `auth_user_id` | El plan completo ya existe (memoria `driver_app_plan`, est. 10-12 semanas con app nativa) |
| Notificación al driver de orden asignada | Inexistente (ni push, ni SMS, ni WhatsApp) | Bajo-medio; hoy el canal es papel |
| Notificación al cliente "en camino" | Broadcast in-page solamente; sin email/push | **Bajo — quick win claro** (agregar `out_for_delivery` a `notifyStatusChange` + plantilla) |
| Validación de zona de cobertura | Campo decorativo, autodeclarado "solo referencial" | Bajo-medio: las coordenadas del destino ya las devuelve Google Places, solo se descartan (`CheckoutPageClient.tsx:1652-1661`) + haversine que ya existe en `eta.ts` |
| Fee por distancia/zona | Fee plano único | Medio (depende de persistir `delivery_lat/lng`) |
| Mínimo de pedido delivery | Inexistente | Bajo |
| GPS en background (driver cierra la PWA → tracking muere) | Limitación estructural de PWA (`realtime_flow_audit`: "keep this page open") | Solo lo resuelve app nativa |
| Cierre automático / alertas de delivery colgado | Cron excluye delivery | Bajo |
| Campos estructurados de dirección (apto, referencias) | Un string de ≤300 chars | Bajo |

- **Deuda de credibilidad:** los docs públicos (`API_DOCUMENTATION.md`, `RESTAURANT_MENU_API_README.md`) prometen `deliveryZones`/`deliveryRestrictions` inexistentes; el changelog anuncia SMS vía Twilio sin una línea de código; el blog promete POD offline que no está implementado. Antes de vender delivery, limpiar esto — un prospecto técnico que lo verifique pierde la confianza.

---

## 5. RESUMEN EJECUTIVO

**Lo que SÍ puedes prometerle hoy a un dueño de restaurante:**

- ✅ **"Tus clientes pueden pedir a domicilio desde tu menú, pagar online, y ver a tu repartidor en un mapa en vivo"** — cierto y funciona bien: checkout con dirección, fee fijo cobrado correctamente (server-authoritative, no manipulable), tracking GPS en tiempo real estilo Uber, foto de prueba de entrega, y funciona offline en zonas de mala señal. Esta parte es genuinamente mejor que la de muchos competidores del segmento.
- ✅ **"Sin comisiones del 30%"** — el pitch real contra Uber Eats: el restaurante usa SUS repartidores y no regala margen (0% en planes activos; 4% solo en el plan interno).

**Lo que NO puedes prometer sin desarrollo adicional:**

- ❌ **"MENIUS te consigue el repartidor"** — no hay red de drivers, ni dispatch, ni integración con Uber Direct/DoorDash Drive. El restaurante necesita su propia gente, la coordina por teléfono/WhatsApp, y le pasa el link de tracking en un QR impreso. Si el prospecto no tiene repartidores, MENIUS no le resuelve delivery — punto.
- ❌ **"El sistema controla tu zona y tarifas de entrega"** — el radio es decorativo (acepta cualquier dirección, incluso `"asdfg"`), el fee es un número plano, y no hay mínimo de pedido. Las reglas de negocio de delivery hoy son juicio humano del que atiende el Counter.
- ❌ **"Tu cliente recibe aviso cuando el pedido va en camino"** — solo lo ve si tiene la página de tracking abierta; `out_for_delivery` no dispara email ni push (gap chico de código, grande de percepción).

**Recomendación estratégica:** el posicionamiento honesto y vendible HOY es *"canal directo de pedidos + tracking premium para restaurantes que YA tienen quien reparta"* — no "alternativa a Uber Eats". Para cerrar la brecha, la ruta de mayor retorno por esfuerzo es: (1) notificación "en camino" [días], (2) persistir coordenadas del destino + validar radio + mínimo de pedido [1-2 semanas], (3) integración con UN courier-as-a-service tipo Uber Direct para restaurantes sin flota [proyecto real], (4) app/login de driver solo si aparece tracción con flota propia (plan ya documentado, 10-12 semanas).

---

## 6. ANEXO — Estado del tenant "buccaneer" (verificado contra la DB de producción, 2026-08-06)

No existe una columna `delivery_enabled`; el gate real es el JSONB `restaurants.order_types_enabled` (`supabase/schema.sql:583`). Fila real de Buccaneer (query directa a `menius-prod`):

| Campo | Valor en prod | Lectura |
|---|---|---|
| `order_types_enabled` | `["dine_in","pickup","delivery"]` | ✅ **Delivery HABILITADO** (los 3 tipos activos) |
| `delivery_fee` | `NULL` | ⚠️ El servidor lo resuelve a `0` (`orders/route.ts:631`) → **hoy Buccaneer entrega con envío GRATIS**, probablemente sin que sea una decisión consciente |
| `delivery_radius_km` | `9.66` (= 6 mi) | Configurado, pero recordar §2.4: es decorativo, no se aplica |
| `estimated_delivery_minutes` | `NULL` | Sin ETA — el badge "~X min" no se muestra en el menú/checkout |
| `latitude` / `longitude` | `NULL` / `NULL` | ⚠️ Sin geocodificar el restaurante → el ETA sugerido del Counter cae al fallback de prep-time (`CounterView.tsx:687-698`) y cualquier feature futura de radio/distancia no tiene punto de origen |
| `country_code` | `US` | Stripe OK; UI de radio en millas |
| `commission_plan` | `false` | Sin plan 4% |
| `notification_email` | configurado | El dueño sí recibe email de orden nueva |

**Uso real de delivery (tabla `orders`):** 65 órdenes `delivery` (vs 74 pickup, 62 dine_in) — delivery es ~⅓ del volumen, última el 2026-07-18. Pool de drivers: **1 registrado**. Solo **11 de 65** órdenes de delivery tienen `driver_assigned_at` → en la práctica, ~83% de las entregas se coordinaron completamente por fuera del sistema (sin tracking, sin foto, sin timestamps). Esto confirma en datos reales el diagnóstico del §3: el flujo de driver existe pero casi no se usa.

**Config pendiente para dejar delivery "bien configurado" en Buccaneer (sin desarrollo, solo settings):** definir `delivery_fee` real (o confirmar envío gratis como decisión), setear `estimated_delivery_minutes`, y geocodificar la dirección del restaurante (`latitude`/`longitude`) desde Settings.

---

*Generado por auditoría de solo lectura sobre el working tree en `main` (431eb10). Cada afirmación lleva path:línea para verificación directa. El anexo §6 proviene de queries de solo lectura a la DB de producción.*
