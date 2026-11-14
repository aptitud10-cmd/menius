# API — Impresión (CloudPRNT) · v3

> Ubicación: `.specify/docs/printing/API.md`
> Protocolo: Star CloudPRNT Protocol Guide (HTTP) — https://star-m.jp/products/s_print/sdk/StarCloudPRNT/manual/en/protocol-guide.html
> Client settings: https://star-m.jp/products/s_print/sdk/StarCloudPRNT/manual/en/client.html
> SDK de ejemplo: https://github.com/star-micronics/cloudprnt-sdk

## 1. `app/api/cloudprnt/[token]/route.ts`

`runtime = 'nodejs'`, `dynamic = 'force-dynamic'`. **Excluir `/api/cloudprnt` del matcher del middleware de Supabase.**

**Resolución común:**
1. `sha256(token)` → `printers` activo.
2. Si no existe → `404`, body vacío.
3. **Sin rate limit:** el token de 256 bits + el 404 alcanzan.
4. **No loguear el path completo** (contiene el token).

### 1.0 GET de configuración del servidor (sin `token` de job)
Las impresoras con soporte MQTT hacen un GET al arrancar para decidir el protocolo. **Sprint 0 lee la sección "Server setting information request (GET)" de la doc** y define la respuesta correcta para que la impresora quede en modo HTTP. Se prueba en la mC-Print3. Mientras tanto: un GET sin query `token` **no** es un pedido de job.

### 1.1 POST — poll
- **`last_poll_at`:** solo se actualiza si pasaron > 30 s desde el último o si cambió `status` (ASB). Evita un UPDATE y un broadcast de Realtime cada 5 s.
- **MAC:** se guarda en el primer poll. Si choca con otra impresora, se loguea un warning y **no** se rompe.
- **`printingInProgress = true`** → `{ "jobReady": false }`.
- **Siguiente job:** `status='queued' and (not_before is null or not_before <= now())`, orden `coalesce(not_before, created_at), copy_index, id`.
  - Si hay → `{ "jobReady": true, "mediaTypes": ["image/png"], "jobToken": "<id>" }`.
  - Si no → `{ "jobReady": false }`.
- **Respuesta:** siempre `Content-Type: application/json`.
- **Primer poll** (`last_client_info` null): pedir `clientAction` ClientType / ClientVersion / GetPollInterval y guardar los resultados.

### 1.2 GET — job (`?mac=&type=&token=<jobId>`)
1. **Reclamo atómico** antes de renderizar:
   ```sql
   update print_jobs j set status = 'sent', sent_at = now(),
          attempts = attempts + case when j.status = 'queued' then 1 else 0 end,
          media_type = $type
   where j.id = $token and j.printer_id = $printer and j.status in ('queued','sent')
     and not exists (select 1 from orders o where o.id = j.order_id and o.status = 'cancelled')
   returning *;
   ```
   Sin fila → `404`.
2. **Verificar** `order.restaurant_id = printer.restaurant_id` (además de las FKs compuestas).
3. Render del PNG → `200 image/png`.
4. Si el render falla → `500`. El job queda `sent` y el cron decide.

### 1.3 DELETE — confirmación (`?mac=&code=&token=`)
- `code` empieza con `2` → `printed` (`where status = 'sent'`).
- Otro código → `error_code = code`; `queued` si `attempts < 3` y el pedido no está cancelado, si no `failed`. **Siempre `where status = 'sent'`**.
- Responder `200`.

## 2. Server actions (service role, con validación propia)

| Acción | Valida | Retorno |
|---|---|---|
| `createPrinter({restaurantId,name})` | `user_owns_restaurant` | `{printer, serverUrl}` (token en claro una sola vez) |
| `rotatePrinterToken({printerId})` | dueño | `{serverUrl}` |
| `updatePrinterSettings({printerId, print_on, copies, order_types, is_active})` | dueño | `printer` |
| `deletePrinter({printerId})` | dueño | ok |
| `reprintOrder({orderId, printerId?})` | dueño **o** `device_sessions` del mismo restaurante; pedido e impresora del mismo `restaurant_id` | `job` |
| `printTest({printerId})` | dueño | `job` |
| `getPrinterStatus({restaurantId})` | dueño o dispositivo | `[{printerId,name,state:'online'\|'offline',lastPollAt,queuedCount,failedCount}]` |

- Token: 32 bytes `crypto.randomBytes` en base64url. Se guarda solo el sha256.
- `queuedCount` cuenta solo jobs con `not_before` vencido o null.

## 3. Render — `lib/`

```
lib/orders/short-number.ts   // EXTRAER la lógica actual del email/seguimiento. Única fuente del "#003".
lib/printing/
  ticket-data.ts     // buildTicketData(jobId)
  ticket-i18n.ts     // en / es
  allergy.ts         // detectAllergy(text) → fragmento | null (palabras de SPEC §6)
  channel.ts         // channelLabel(order) → 'WEBSITE' (v3)
  render-ticket.tsx  // satori → resvg → umbral 1-bit sobre píxeles (sin sharp)
  icons/*.svg        // en lugar de emojis
  fonts/Inter-Bold.ttf, Inter-Black.ttf
```

```ts
type TicketData = {
  kind: 'order' | 'reprint' | 'test';
  reprintedAt?: string;
  locale: 'en' | 'es';
  restaurant: { name: string; timezone: string; currency: string; taxLabel: string; orderDirectUrl: string };
  channel: { label: string; type: 'delivery' | 'pickup' | 'dine_in' };
  shortNumber: string;          // "#003"
  orderNumber: string;          // "ORD-261113-003"
  customerName?: string;
  readyAt?: string;             // created/accepted + estimated_ready_minutes, TZ del restaurante
  scheduledFor?: string;
  tableName?: string;
  includeUtensils: boolean;     // orders.include_utensils
  allergy?: string;
  items: { qty: number; name: string; variant?: string; lineTotal: number;
           lines: { text: string; price: number; indent?: boolean; title?: boolean }[]; notes?: string }[];
  itemCount: number;
  orderNotes?: string;
  totals: { subtotal: number; tax: number; deliveryFee?: number; discount?: number; total: number }; // sin tip
  payment: { kind: 'paid' | 'collect_cash' | 'verify'; amount: number };   // SPEC F9
  delivery?: { address: string; phone?: string; instructions?: string };
  placedAt: string;
};
```

- Preview en el panel: `GET /api/printing/preview/[orderId]` (autenticado), con el mismo render.
- Panel `/dashboard/settings/printers`: selects con columnas explícitas. `token_hash` está revocado.
