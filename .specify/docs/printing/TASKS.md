# TASKS — Impresión (CloudPRNT) · v3 MVP

> Ubicación: `.specify/docs/printing/TASKS.md`
> Regla: leer `printing-spec.md`, `DATA_MODEL.md` y `API.md` antes de cada sesión. Si hay que desviarse, primero se actualiza el spec y después se codea. Cada sprint cierra con OK de William.

## Sprint 0 — Verificaciones (solo lectura) + decisiones ✅ (2026-11-14)
- [x] **Auditar la impresión existente (SPEC §1b)**: hecho, ver §1b
  - [x] `src/lib/printing/*`, `OrdersBoard`/`KDSView` autoPrint, app Android (`ReceiptEscPosBuilder.kt`, `BluetoothThermalPrinter.kt`, `NetworkThermalPrinter.kt`, `MeniusJsBridge.kt`)
  - [x] Reportar qué hace hoy cada pieza y qué del spec ya existe (nada de CloudPRNT, satori ni resvg)
  - [x] Opción para unificar el ticket → **(b)**
  - [x] Cómo sabe la counter app si hay CloudPRNT activo → `GET /api/tenant/printers/status`
- [x] Aceptar = `pending → preparing` (Counter) **o** `pending → confirmed` (panel web). El trigger cubre los dos
- [x] Webhooks de pago: Stripe, MercadoPago y Wompi ya marcan `paid`. No hace falta fix
- [x] `#003`: `shortOrderNumber` en `lib/kitchen.ts` y `customer-email.ts`, más copias inline
- [x] Auth de la counter app: `getAuthenticatedRestaurant({ allowDevice: true })` + `getDeviceSession()`
- [x] "Order direct": `custom_domain` (si `domain_verified`) o `menius.app/<slug>`
- [ ] Doc Star (star-m.jp no respondía; se usaron la búsqueda y el SDK oficial):
  - [x] `image/png` es nativo en la mC-Print3
  - [ ] Límites de tamaño PNG → se mide en el Sprint 5
  - [x] Respuesta al "Server setting information request (GET)" → API §1.0 (sale del ejemplo del SDK)
  - [ ] Nombre del parámetro `token` del GET de job + TLS → Sprint 3
- [x] satori/resvg: no están instalados; resvg pesa ~4.4 MB en Linux. La prueba en Vercel se hace en el Sprint 2
- [x] Matcher del middleware: ya excluye `api/`
- [x] William: aprobar v3.1
- [ ] William: comprar 1 mC-Print3 + averiguar la marca y modelo de la impresora actual de Buccaneer

## Sprint 1 — Datos [S]
- [ ] Migración: `printers`, `print_jobs`, índice único `orders (id, restaurant_id)`, FKs compuestas, índices
- [ ] RLS + `revoke select (token_hash)` + test con 2 tenants (CA-7)
- [ ] Trigger + tests SQL:
  - [ ] aceptar → 1 job
  - [ ] ready/delivered → 0 jobs nuevos
  - [ ] cancelar con job en cola → `cancelled`
  - [ ] `print_on='created'` → `not_before` +5 s
  - [ ] `created` + online sin cobrar → 0 jobs; al pasar a `paid` → 1 job
  - [ ] aceptar por el panel (`pending → confirmed`) → 1 job
  - [ ] cancelar con job en cola y deshacer (`cancelled → preparing`) → el job vuelve a `queued`
  - [ ] job que se mandó (`sent_at` no null) y quedó `cancelled` por el cron → al reabrir el pedido **sigue** `cancelled`
- [ ] `pg_cron` (requeue seguro + purga), con test de que un pedido cancelado nunca vuelve a la cola (CA-5)
- [ ] Tipos TS

## Sprint 2 — Número corto + render [M]
- [ ] **Primero:** prueba mínima de satori + resvg + sharp en runtime nodejs, en un preview de Vercel (incluye `serverComponentsExternalPackages`). Si falla, se para y se revisa con William
- [ ] Extraer `lib/orders/short-number.ts`. Lo importan email, seguimiento, `kitchen.ts` y las copias inline, sin cambio visual (CA-12)
- [ ] `ticket-data` (`toTicketData` pura), `i18n`, `allergy`, `channel`, `render-ticket` según SPEC §6 (diseño aprobado por William, sin emojis)
- [ ] Preview `/api/printing/preview/[orderId]`
- [ ] Snapshots:
  - [ ] pickup cash
  - [ ] delivery cash
  - [ ] delivery pagado
  - [ ] online no pagado (VERIFY)
  - [ ] dine-in
  - [ ] programado
  - [ ] reprint
  - [ ] alergia
  - [ ] ñ/tildes
  - [ ] nota larga

## Sprint 3 — Endpoint CloudPRNT [M]
- [ ] Leer la Protocol Guide en un navegador: nombre del parámetro del job en el GET y TLS (API §1.0)
- [ ] POST / GET (reclamo atómico) / DELETE + GET de configuración (API §1)
- [ ] Script que simula la impresora (POST → GET → DELETE), con estos casos:
  - [ ] carrera "cancelar durante el GET"
  - [ ] token inválido

## Sprint 4 — UI + convivencia con la impresión existente [M]
- [ ] Panel: impresoras (crear, URL una vez, rotar, toggles de v3, prueba)
- [ ] Counter app: online/offline + banner rojo (F5) + botón Reimprimir (F2)
- [ ] `GET /api/tenant/printers/status` (al montar + cada 2 min)
- [ ] Con CloudPRNT activo: desactivar y ocultar las 4 impresiones locales (`counter-auto-print`, `counter-print-on-arrival`, la regla de mesa con bridge nativo, `menius-auto-print`); "Imprimir" → job `reprint` (CA-17)
- [ ] Camino Bluetooth/red con el layout nuevo, opción (b): `ReceiptEscPosBuilder.kt` lee `ticket` (`ticketVersion: 2`) con `GS !` + `GS B`. El JSON mantiene `ReceiptData` para los APKs viejos (CA-18)
- [ ] Si se toca la app Android: rebuild del APK y prueba en la tablet

## Sprint 5 — Prueba física en Buccaneer [S]
- [ ] Configurar la mC-Print3 (CloudPRNT, URL, poll interval)
- [ ] Correr CA-1 a CA-16 y anotar resultados
- [ ] CA-9 (velocidad del PNG): si falla, decidir el plan B StarPRNT
- [ ] CA-13: ticket engrapado, leer `#003` desde 1 m
- [ ] Mostrar 3 tickets reales al staff del counter y anotar feedback
- [ ] `INSTALL.md` (checklist)
- [ ] Mover el spec a `executed/`

## Antes de mostrarle números al dueño (tarea aparte, fuera de este spec)
- [ ] Marcar o limpiar los pedidos de prueba (`is_test`)

## Fase 2
Ticket CANCELLED · programados diferidos · `kitchen_name` · `font_size` · 58 mm · QR repartidor (cuando la app esté en uso) · cliente frecuente · ASB sin papel/tapa · alerta SMS si un job lleva 3 min sin imprimirse · auto-imprimir si nadie acepta · métricas en el panel · día de operación que cambie a las 5 AM · Epson / imprimir desde la tablet · pedidos por teléfono
