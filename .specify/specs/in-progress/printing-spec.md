# SPEC — Impresión automática de tickets (CloudPRNT) · v3 (MVP)

> Ubicación en repo: `.specify/specs/in-progress/printing-spec.md`
> Estado: **DRAFT v3** — pendiente aprobación de William
> Fecha: 2026-11-14
> Docs relacionados: `.specify/docs/printing/DATA_MODEL.md`, `API.md`, `TASKS.md`
>
> **Cambios v3:** viene de la revisión de 3 agentes (técnico, operación, producto) y de verificar contra la DB de prod.
> - Corregido "aceptar" = `pending → preparing`, no `confirmed`. Con la v2 la impresora no habría impreso nunca.
> - Recortado a MVP: pasan a fase 2 el ticket de cancelado, el aviso de programados, `kitchen_name`, `font_size`, 58 mm, el QR del repartidor y "cliente frecuente".
> - Arreglos de seguridad y concurrencia (DATA_MODEL y API).
> - "PAGADO" solo si `payment_status = 'paid'`.
> - Layout: se mantiene el diseño aprobado (nombre grande, franja negra, `#003` negro abajo). Se agregan: canal "WEBSITE", READY junto al `#003`, franja de alergia, REPRINT arriba y "Order direct" en el pie.
> - Contexto: todos los pedidos actuales en prod son de prueba. Este módulo es parte de salir en vivo en Buccaneer.

---

## 1. Descripción

Cada pedido de MENIUS imprime solo un ticket térmico de 80 mm en la impresora del **counter** del restaurante. Se usa una impresora **Star (CloudPRNT)** que le consulta a MENIUS por internet si hay trabajos. No depende de que la tablet esté prendida para imprimir. Hay **una sola copia**: el counter la usa y se engrapa a la bolsa. La cocina no necesita copia (confirmado por William). La leen el staff, el cliente de pickup y el repartidor.

## 1b. Impresión que YA existe (descubierta 2026-11-14) — LEER ANTES DE TODO

MENIUS ya imprime desde la tablet:
- **App Android Counter** (`apps/menius-counter-android/`): WebView + impresión ESC/POS por **Bluetooth** (`BluetoothThermalPrinter.kt`) y por **red** (`NetworkThermalPrinter.kt`), 58/80 mm, ticket de prueba. Bridge JS: `MeniusAndroid.printReceipt(json)`.
- **Web:** `src/lib/printing/` (`PrinterService.ts`, `native-bridge.ts`, `receipt-formatter.ts`, `types.ts` con `ReceiptData`) + fallback `window.print()`.
- **Auto-print** en la tablet: toggle `autoPrint` en `OrdersBoard.tsx` y `KDSView.tsx` (localStorage).
- El layout ESC/POS actual se arma en `ReceiptEscPosBuilder.kt`.

Este spec **no reemplaza** esa impresión: le agrega CloudPRNT como camino principal (más confiable, no depende de la tablet). Reglas:

1. **Un solo diseño de ticket.** El contenido sale siempre de `buildTicketData()` (API §3), sin importar el camino. Prohibido mantener dos layouts distintos (CloudPRNT PNG vs `ReceiptEscPosBuilder.kt`). Sprint 0 elige cómo unificar:
   - **(a)** El server renderiza el PNG y la app Android lo imprime como raster ESC/POS (`GS v 0`). Un solo render, pero hay que medir la velocidad por Bluetooth.
   - **(b)** `TicketData` JSON → el renderer PNG (CloudPRNT) + `ReceiptEscPosBuilder.kt` reescrito para seguir el layout de §6 con texto ESC/POS (doble alto/ancho, inverso `GS B`).
   - Recomendación por defecto: (a) si el raster por BT imprime un ticket típico en < 8 s; si no, (b).
2. **Bluetooth/red se quedan como respaldo** para restaurantes con impresora propia (no Star) o sin CloudPRNT.
3. **Nunca dos impresiones del mismo pedido.** Si el restaurante tiene una impresora CloudPRNT activa (`printers.is_active` con poll < 10 min), la counter app **desactiva y oculta** su auto-print local y su botón "Imprimir" crea un job `reprint` en la cola de CloudPRNT. Sin CloudPRNT activo, todo sigue como hoy.
4. **No romper** el flujo actual de restaurantes que ya imprimen por Bluetooth.
5. **Pendiente de confirmar** (William, en Buccaneer): marca y modelo de la impresora actual y si tiene puerto Ethernet. Si lo tiene, se puede cambiar ya a modo red desde la app como mejora inmediata.

## 2. Objetivos

- **Paridad con Uber Eats / Grubhub:** sin ticket impreso, el pedido "no existe" en el counter.
- **Reconocer el canal en menos de 1 s:** un ticket MENIUS no se puede confundir con uno de Uber o Grubhub.
- **El cliente encuentra su bolsa en 1 s:** el `#003` del ticket es idéntico al del email y al de la página de seguimiento.
- **Cero plata perdida:** el ticket nunca dice "pagado" si el pago no está confirmado.
- **Ningún pedido sin imprimir sin que alguien se entere.**

## 3. Features del MVP

### F1 — Auto-impresión
- **Default `print_on = 'accepted'`:** imprime cuando el pedido sale de `pending` a cualquier estado que no sea `cancelled`. En la counter app, aceptar = `pending → preparing` (verificado en `order_status_history`).
- **Opción `print_on = 'created'`:** imprime al crearse el pedido, con `not_before = now() + 5 s` para que `order_items` ya esté insertado.
- **Se dispara con un trigger de Postgres**, no desde el frontend.
- **Es idempotente:** máximo un job automático por pedido, impresora y copia.

### F2 — Reimprimir
Botón "Reimprimir" en el detalle del pedido (counter app y panel). El ticket reimpreso lleva arriba la franja **"REPRINT — NOT A NEW ORDER"** con la hora.

### F3 — Ticket de prueba
Botón "Imprimir prueba" en la configuración de la impresora.

### F4 — Vincular impresora
- En el panel se da de alta la impresora y se obtiene una URL única con un token secreto.
- El token se muestra **una sola vez**. En DB se guarda solo el hash, y la columna no la puede leer ningún cliente.
- La MAC se registra en el primer poll.

### F5 — Estado de la impresora
- La counter app muestra **online / offline**. Offline = último poll hace más de 60 s.
- Si hay jobs `queued` y la impresora está offline → banner rojo: "Impresora desconectada — N pedidos sin imprimir".
- (Sin papel o tapa abierta a partir del ASB = fase 2.)

### F6 — Diseño del ticket y número corto (ver §6)
- `#003` gigante, generado con **el mismo helper** que el email y la página de seguimiento. Se extrae a `lib/orders/short-number.ts` y lo usan los 3. **Prohibido reimplementarlo.**
- Se repite abajo (sin invertir). El código completo `ORD-...` va chiquito.

### F7 — Reintentos
- Un job `sent` sin confirmación en 120 s vuelve a `queued`, **solo si sigue en `sent` y el pedido no está cancelado**.
- Después de 3 intentos queda `failed` y aparece en el banner de F5.

### F8 — Cancelación (mínimo)
Si el pedido pasa a `cancelled`, sus jobs `queued` pasan a `cancelled` y nunca se imprimen. Ningún reintento ni GET puede revivir un job de un pedido cancelado. (El ticket "CANCELLED" impreso queda para fase 2.)

### F9 — Pago en el ticket (regla de dinero)
| Condición | Texto | Estilo |
|---|---|---|
| `payment_status = 'paid'` | **PAID — DO NOT COLLECT** | recuadro con borde, sin invertir |
| `payment_method = 'cash'` y no pagado | **COLLECT $X CASH** (X = `orders.total`) | **invertido** |
| cualquier otro caso | **VERIFY PAYMENT ON TABLET** | recuadro con borde grueso |

**Nunca** se infiere "pagado" desde `payment_method`. Dependencia: hoy todo prod está en `payment_status = 'pending'`. El webhook de pago tiene que marcar `paid` antes de activar pagos online en Buccaneer (Sprint 0).

### F10 — Delivery
- Dirección a 36 px, con el apartamento en la misma línea si viene en `delivery_address`, y teléfono a 28 px.
- `delivery_instructions` en un recuadro con borde.
- "N items — check bag" (suma de `qty`).
- Bloque de pago según F9. En delivery en efectivo, "COLLECT" lo hace el repartidor.
- **Propina: no se imprime** en ningún ticket. TOTAL = `orders.total`.

## 4. Out of scope (fase 2)

- Ticket impreso de CANCELLED (void).
- Programados: aviso al aceptar e impresión diferida (hoy hay 0 en prod). En v3, un programado imprime al aceptar, con la línea "SCHEDULED <fecha hora>" grande.
- `kitchen_name`, `font_size` S/M/L, papel de 58 mm, logo.
- QR → app del repartidor. La app todavía no está en uso real. Se activa cuando lo esté.
- "Cliente frecuente (N pedidos)". Hoy todos los datos son de prueba.
- Sin papel o tapa abierta (ASB); alerta por SMS/WhatsApp si un job lleva 3 min sin imprimirse; auto-imprimir con "NOT ACCEPTED" si nadie acepta en 3 min.
- Métricas en el panel (los datos sí quedan guardados en `print_jobs`; ver §8).
- Epson, MQTT, ruteo por estación, copia de cocina. (Imprimir desde la tablet ya existe: ver §1b.)
- Pedidos por teléfono (spec propio, depende del POS).
- Limpieza de pedidos de prueba en prod (`is_test`). Va en una tarea aparte, pero hay que hacerla **antes** de mostrarle números al dueño.

## 5. Stack técnico

- Route Handler `app/api/cloudprnt/[token]/route.ts` (runtime `nodejs`). **Excluido del middleware** de Supabase auth.
- Supabase: tablas `printers` y `print_jobs`, trigger sobre `orders`, `pg_cron`.
- Render como PNG 1-bit con `satori` + `@resvg/resvg-js`. El umbral se aplica sobre los píxeles de resvg, **sin `sharp`**. Ancho de 576 px.
- **Sin emojis** en el ticket (Inter no los tiene). Los íconos van en SVG inline.
- QR: no hay en v3.
- Hardware: Star mC-Print3. **Sprint 0 verifica en la doc oficial que CloudPRNT acepta `image/png` y sus límites de tamaño.** Si no, el plan B es `application/vnd.star.starprnt`.

## 6. Diseño del ticket (80 mm)

Diseño aprobado por William (2026-11-14). Van **invertidos** (fondo negro): la franja de canal, el bloque `#003`, el banner de alergia, el COLLECT CASH y el `#003` de abajo. Si en CA-9 la impresión sale lenta o empastada, se revisa con William; no se cambia por cuenta propia.

```
            BUCCANEER DINER               ← 40 px, centrado (marca del restaurante: el ticket va en la bolsa del cliente)
 ██████ WEBSITE · PICKUP ███████████████  ← INVERTIDO, 30 px
 ┌────────────────────────────────────┐
 │ REPRINT — NOT A NEW ORDER  3:10 AM  │  ← solo kind='reprint', borde grueso
 └────────────────────────────────────┘
 ██████████████████████████████████████
 ██ #003              READY 2:55 AM ██  ← INVERTIDO: #003 a 128 px + ready a 32 px
 ██ Stephen S.                       ██  ← 44 px
 ██████████████████████████████████████
 ██ [!] ALLERGY: peanut               ██  ← INVERTIDO, solo si se detecta alergia
  SCHEDULED Sat 11/15 7:30 PM             ← solo si scheduled_for, 32 px
  Utensils: No                            ← include_utensils
 ─────────────────────────────────────
  1x Bacon Cheeseburger Deluxe   21.54    ← 26 px bold
       Medium                             ← 22 px (modifier_lines)
       Sub Sweet Potato Fries     1.80
  1x Buffalo Wings               16.74
  Note: no onions                         ← notas en recuadro con borde
  3 items — check bag
 ─────────────────────────────────────
  Subtotal 56.82 · Tax 5.04 · Delivery …  ← sin propina
  TOTAL                          61.86    ← 30 px
 ██ COLLECT $61.86 CASH              ██  ← INVERTIDO (F9)
 ─────────────────────────────────────
  45-12 102nd St, Apt 3B                  ← solo delivery, 36 px
  (718) 555-0123                          ← 28 px
 ┌ Ring bell 2, leave at door ────────┐  ← instrucciones con borde
 ─────────────────────────────────────
 ████████████  #003  ███████████████████  ← INVERTIDO, 72 px (por si la grapa tapa el de arriba)
  ORD-261113-003 · Placed 2:43 AM         ← 18 px
  Order direct: <url del restaurante>     ← 20 px
  Online ordering by MENIUS               ← 16 px
```

- **Idioma:** todo pasa por i18n con `restaurants.locale`. Buccaneer = `en`. El diagrama de arriba está en `en`.
- **Alergia:** se detecta por palabras clave (case-insensitive) en `orders.notes` y `order_items.notes`: allerg, alergi, peanut, nut, gluten, celiac, shellfish, dairy, maní, nuez, mariscos. El banner muestra el fragmento de la nota.
- **Canal:** sale de `channelLabel(order)`, que en v3 devuelve `WEBSITE`. Cuando exista `orders.source` (fase 2: PHONE, etc.) solo cambia esa función.
- **"Order direct":** usa `custom_domain` si `domain_verified`; si no, la URL pública de MENIUS del restaurante. Sprint 0 confirma el patrón real.
- **Dine-in:** `TABLE <table_name>` va al lado de `#003`, dentro del bloque invertido.
- **Tamaños mínimos:** `#003` 128 px (~16 mm impreso). Nunca menos de 96 px.
- **Totales:** salen de los campos guardados en `orders`. Nunca se recalculan.
- **Modificadores:** vienen de `order_items.modifier_lines`. Si es null, fallback a `order_item_modifiers.option_name`.

## 7. Criterios de aceptación

- **CA-1:** Aceptar en la counter app (`pending → preparing`) imprime en ≤ poll interval + 3 s.
- **CA-2:** Pasar el pedido a ready/delivered o hacer otros updates no reimprime. Aceptar un solo pedido produce exactamente 1 ticket.
- **CA-3:** Reimprimir imprime una copia más, con la franja REPRINT arriba.
- **CA-4:** Con la impresora desconectada 5 min y 3 pedidos aceptados, al reconectarla salen los 3 en orden.
- **CA-5:** Cancelar un pedido con el job todavía en cola → no imprime nunca, ni con cron ni con reintentos.
- **CA-6:** Un token inválido → 404 sin consultar órdenes.
- **CA-7:** Nadie puede encolar ni ver jobs de otro restaurante, y nadie puede leer `token_hash` desde el cliente.
- **CA-8:** El ticket de Buccaneer cumple el layout de §6:
  - nombre del restaurante grande y centrado
  - franja de canal invertida
  - `#003` + READY + nombre
  - `#003` invertido abajo
- **CA-9:** Un ticket de 6 ítems imprime en < 5 s en la mC-Print3.
- **CA-10:** Ñ, tildes y símbolos salen bien. No hay cuadros vacíos.
- **CA-11:** El preview del panel es idéntico al ticket impreso.
- **CA-12:** Para el mismo pedido, el `#003` es idéntico en ticket, email y seguimiento.
- **CA-13:** El `#003` de un ticket engrapado a una bolsa se lee desde 1 m (prueba física).
- **CA-14:** Pago:
  - `payment_status = 'paid'` → "PAID — DO NOT COLLECT".
  - Efectivo no pagado → "COLLECT $X CASH".
  - Online no pagado → "VERIFY PAYMENT".
- **CA-15:** Ningún ticket muestra propina. "Utensils" refleja `include_utensils`.
- **CA-16:** Una nota con "peanut allergy" produce el banner ALLERGY.
- **CA-17:** Con CloudPRNT activo, aceptar un pedido con la tablet abierta y `autoPrint` encendido produce **un solo** ticket (el de CloudPRNT).
- **CA-18:** Un restaurante sin CloudPRNT sigue imprimiendo por Bluetooth como hoy, ahora con el layout de §6.

## 8. Métricas (los datos quedan guardados desde el día 1; el panel es fase 2)

- Aceptado → impreso: `print_jobs.printed_at − created_at`.
- Creado → aceptado: `order_status_history`.
- Porcentaje de jobs `failed`. Minutos offline, a partir de los huecos en `last_poll_at`.

## 9. Estimación

**S/M** — 3–4 sesiones de Claude Code + 1 prueba física en Buccaneer.
