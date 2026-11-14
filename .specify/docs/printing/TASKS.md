# TASKS — Impresión (CloudPRNT) · v3 MVP

> Ubicación: `.specify/docs/printing/TASKS.md`
> Regla: leer `printing-spec.md`, `DATA_MODEL.md` y `API.md` antes de cada sesión. Si hay que desviarse, primero se actualiza el spec y después se codea. Cada sprint cierra con OK de William.

## Sprint 0 — Verificaciones (solo lectura) + decisiones
- [ ] **Auditar la impresión existente (SPEC §1b)**:
  - [ ] `src/lib/printing/*`, `OrdersBoard`/`KDSView` autoPrint, app Android (`ReceiptEscPosBuilder.kt`, `BluetoothThermalPrinter.kt`, `NetworkThermalPrinter.kt`, `MeniusJsBridge.kt`)
  - [ ] Reportar qué hace hoy cada pieza y qué del spec ya existe
  - [ ] Proponer opción (a) o (b) para unificar el diseño del ticket
  - [ ] Proponer cómo la counter app sabe si hay CloudPRNT activo
- [ ] Confirmar en el código que aceptar = `pending → preparing` (ya verificado en DB) y que no hay otro camino de aceptación
- [ ] Webhooks de pago: ¿alguno pone `payment_status = 'paid'`? Si no, proponer el fix (es bloqueante para pagos online, no para efectivo)
- [ ] Encontrar dónde el email y el seguimiento generan el `#003`
- [ ] Patrón de auth de las server actions de la counter app (`device_sessions`)
- [ ] URL pública del restaurante para "Order direct" (`custom_domain` / slug)
- [ ] Doc Star:
  - [ ] ¿`image/png` es nativo en la mC-Print3?
  - [ ] Límites de tamaño PNG
  - [ ] Respuesta correcta al "Server setting information request (GET)"
- [ ] Confirmar que satori/resvg corren en runtime nodejs en Vercel y el tamaño del bundle
- [ ] Revisar el matcher del middleware para excluir `/api/cloudprnt`
- [ ] William: aprobar v3 y comprar 1 mC-Print3

## Sprint 1 — Datos [S]
- [ ] Migración: `printers`, `print_jobs`, índice único `orders (id, restaurant_id)`, FKs compuestas, índices
- [ ] RLS + `revoke select (token_hash)` + test con 2 tenants (CA-7)
- [ ] Trigger + tests SQL:
  - [ ] aceptar → 1 job
  - [ ] ready/delivered → 0 jobs nuevos
  - [ ] cancelar con job en cola → `cancelled`
  - [ ] `print_on='created'` → `not_before` +5 s
- [ ] `pg_cron` (requeue seguro + purga), con test de que un pedido cancelado nunca vuelve a la cola (CA-5)
- [ ] Tipos TS

## Sprint 2 — Número corto + render [M]
- [ ] Extraer `lib/orders/short-number.ts`. Email y seguimiento lo importan sin cambio visual (CA-12)
- [ ] `ticket-data`, `i18n`, `allergy`, `channel`, `render-ticket` según SPEC §6 (diseño aprobado por William, sin emojis)
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
- [ ] POST / GET (reclamo atómico) / DELETE + GET de configuración (API §1)
- [ ] Script que simula la impresora (POST → GET → DELETE), con estos casos:
  - [ ] carrera "cancelar durante el GET"
  - [ ] token inválido

## Sprint 4 — UI + convivencia con la impresión existente [M]
- [ ] Panel: impresoras (crear, URL una vez, rotar, toggles de v3, prueba)
- [ ] Counter app: online/offline + banner rojo (F5) + botón Reimprimir (F2)
- [ ] Con CloudPRNT activo: desactivar y ocultar el autoPrint local; "Imprimir" → job `reprint` (CA-17)
- [ ] Camino Bluetooth/red con el layout nuevo según la opción (a)/(b) elegida en Sprint 0 (CA-18)
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
