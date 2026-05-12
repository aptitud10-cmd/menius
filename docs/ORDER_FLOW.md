# Order Flow — Menius

> Referencia para entender el ciclo de vida completo de una orden en producción.
> Última actualización: 2026-05-12

---

## 1. Visión general

```
Cliente abre menú (/[slug])
    ↓
Agrega productos al carrito (CartPanel / CartStore - Zustand)
    ↓
Abre checkout (/[slug]/checkout)
    ↓
Elige método de pago
    ├─ Tarjeta (Stripe) ──────→ /api/payments/checkout ──→ Stripe Hosted Page
    ├─ Tarjeta intent (inline) → /api/payments/intent   ──→ Stripe PaymentIntent
    └─ Efectivo / Wompi        → /api/orders (directo)
    ↓
POST /api/orders  ← endpoint central de creación
    ↓
Orden creada con status = 'pending'
    ↓
notifyNewOrder() → push + email al dueño (no bloquea respuesta)
    ↓
Dueño acepta en Dashboard / Counter → status cambia
    ↓
Cliente ve actualizaciones en tiempo real (OrderTracker / Supabase Realtime)
    ↓
status = 'delivered' | 'completed' | 'cancelled'
```

---

## 2. Estados de orden

| Status DB | Visible al cliente | Descripción |
|---|---|---|
| `pending` | "Recibido" | Creada, esperando confirmación del dueño |
| `confirmed` | "Confirmado" | Dueño aceptó la orden |
| `preparing` | "Preparando" | En cocina |
| `ready` | "Listo para retirar" | Listo (pickup) o en camino (delivery) |
| `delivered` | "Entregado" | Completado con éxito |
| `cancelled` | "Cancelado" | Cancelado en cualquier etapa |

Transiciones válidas en `src/lib/order-state.ts` (función `canTransition()`). La API v1 expone aliases adicionales: `accepted`, `delivering`, `completed`.

---

## 3. POST /api/orders — pasos internos

```
src/app/api/orders/route.ts
```

1. **Rate limiting** — rechaza si IP supera N requests/minuto.
2. **Idempotency** — lee header `Idempotency-Key`. Si existe orden con ese key, devuelve la existente (200 con la orden original). El key se guarda en `orders.idempotency_key`.
3. **Validación del restaurante** — verifica `is_active`, `orders_paused_until`, `operating_hours`.
4. **Verificación del plan** — plan `free` sin sub activa bloquea órdenes online. Mensaje neutral al cliente final.
5. **Recálculo de precios server-side** — no se confía en los precios del body. Por cada `order_item`:
   - Busca el producto en DB, valida `is_active` y `in_stock`.
   - Valida modificadores contra `modifier_groups` y `modifier_options` en DB (por `group_id`/`option_id`). Fallback por `group_name` si `group_id` no matchea (legacy).
   - Precios del body son ignorados — se usan los del DB.
   - Si hay mismatch de precio → `logger.error` + Sentry tag `price_mismatch`.
6. **Promo code** — si viene `promo_code`, llama RPC `increment_promo_usage` (atómica con lock). Si falla (expirada, máx usos), rechaza con 409.
7. **Loyalty redemption** — si viene `loyalty_points_redeemed`, llama RPC `redeem_loyalty_points` (atómica con `FOR UPDATE`).
8. **Comisión** — si `restaurant.commission_plan = true` → 4% de `order.total`. Si plan activo/trial → 0%. Wompi (Colombia) → siempre 0%.
9. **Inserción en DB** — `orders` + `order_items` en transacción implícita.
10. **notifyNewOrder()** — fire-and-forget (push + email). Errores no bloquean la respuesta.
11. **Loyalty earn** — puntos ganados se otorgan post-inserción.

### Campos críticos del body

```ts
{
  restaurant_id: string,           // UUID
  items: Array<{
    product_id: string,            // UUID
    quantity: number,
    modifiers?: Array<{
      group_id: string,
      option_id: string,
    }>,
    extras?: Array<{ id: string }>,
    note?: string,
  }>,
  customer_name: string,
  customer_phone?: string,
  customer_email?: string,
  order_type: 'dine_in' | 'pickup' | 'delivery',
  payment_method: 'cash' | 'card' | 'stripe' | 'wompi',
  promo_code?: string,
  loyalty_points_redeemed?: number,
  tip_amount?: number,
  delivery_address?: string,
  table_id?: string,
}
```

### Headers requeridos

```
Idempotency-Key: <uuid v4 generado en cliente>
Content-Type: application/json
```

---

## 4. Pago con Stripe

### Checkout Hosted (flujo principal)

```
CheckoutPageClient
    ↓ POST /api/payments/checkout
    ↓ { restaurant_id, items, ... }
    ↓
route.ts:
    1. Crea la orden en DB con payment_status='pending'
    2. Calcula application_fee_amount (comisión 4% si aplica)
    3. Crea Stripe.checkout.sessions.create({
         payment_method_types: ['card'],
         line_items: [...],
         application_fee_amount,
         transfer_data: { destination: restaurant.stripe_account_id },
         success_url, cancel_url,
         metadata: { order_id }
       })
    4. Devuelve { url: stripe_checkout_url }
    ↓ Cliente hace redirect a Stripe
    ↓ Stripe cobra
    ↓ Webhook POST /api/payments/webhook
        - Evento: checkout.session.completed
        - Verifica signature (Stripe-Signature header)
        - Idempotency: tabla processed_webhook_events (deduplicación)
        - Actualiza order: payment_status='paid', payment_intent_id
        - notifyNewOrder()
    ↓ Stripe redirige a success_url
```

### PaymentIntent (inline, flujo alternativo)

```
POST /api/payments/intent
    ↓ Crea PaymentIntent con transfer_data
    ↓ Devuelve client_secret
    ↓ Frontend confirma con Stripe.js
    ↓ Webhook: payment_intent.succeeded → misma lógica de update
```

### Reembolso

```
POST /api/payments/refund  (solo dueño autenticado, getTenant())
    ↓ Verifica order pertenece al restaurante del tenant
    ↓ Verifica payment_status = 'paid'
    ↓ Verifica payment_intent_id existe
    ↓ stripe.refunds.create({ payment_intent, reason })
        (desde plataforma, sin stripeAccount header — Stripe revierte transfer automáticamente)
    ↓ Actualiza order: payment_status='refunded', status='cancelled'
```

---

## 5. Wompi (Colombia)

```
POST /api/payments/wompi/create → crea transaction en Wompi
POST /api/payments/wompi/webhook → webhook de Wompi
    - Actualiza payment_status
    - 0% comisión siempre (Wompi cobra aparte, no soporta application_fee)
```

---

## 6. Notificaciones al dueño

`src/lib/notifications/order-notifications.ts` — `notifyNewOrder(order, restaurantId)`

1. Push notification (si tiene `push_subscription` en DB) via Web Push.
2. Email via Resend (template `new-order`).
3. Chime en `OrderNotifier.tsx` (Supabase Realtime channel `orders:restaurant_id`).

Errores en cualquiera de los 3 están logueados con `logger.error` + `captureError`. No bloquean la respuesta al cliente.

---

## 7. Realtime (cliente y dueño)

### Cliente — OrderTracker.tsx
```
Supabase channel: orders:id=eq.{order_id}
Evento: UPDATE → actualiza status en tiempo real
Status handler completo (reconnecting/connected/disconnected + indicador visual)
```

### Dueño — use-realtime-orders.ts
```
Supabase channel: orders:restaurant_id=eq.{restaurantId}
Evento: INSERT → nueva orden → sonido + notificación
Deduplicación por knownIdsRef
Polling fallback cada 10s si Realtime cae
```

---

## 8. Reglas importantes

- **Nunca confiar en precios del cliente** — siempre recalcular desde DB.
- **Idempotency-Key es obligatorio** en `/api/orders`. Mismo key = misma orden.
- **FK modificadores** — validar `group_id`/`option_id` antes de insertar.
- **Comisión** — siempre calcular desde `restaurant.commission_plan` y plan efectivo, no desde el body.
- **Plan free** — no puede procesar pagos online. Mensaje neutral al comensal.
- **`notifyNewOrder()` es fire-and-forget** — no aguardar su resultado para devolver 200.
