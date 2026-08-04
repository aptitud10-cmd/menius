# Smoke test — antes del primer pedido real de un cliente

Prueba manual de ~15 min para confirmar que un restaurante nuevo puede vender.
El código del flujo de órdenes ya está verificado (delivery/pickup/dine-in usan
columnas reales). Esto cubre lo que el código NO puede probar: pago real y que
la orden llegue al Counter.

> Hacelo en una tienda real ya configurada (o una de prueba). Usá montos chicos
> ($1) para los pagos con tarjeta. Cancelá/reembolsá después si hace falta.

---

## 0. Pre-requisitos (config del restaurante)
- [ ] Restaurante creado, con `slug` y al menos 1 categoría + 1 producto activo.
- [ ] En el dashboard → ajustes: habilitar los tipos que va a usar (delivery, pickup, dine-in).
- [ ] Si va a cobrar con tarjeta: onboarding de pagos completo
      (Stripe Connect fuera de Colombia / Wompi en Colombia).
- [ ] Counter abierto en una pantalla (web o app Android) con sesión iniciada.

---

## 1. El menú carga
- [ ] Abrir `menius.app/<slug>` en el celular (no solo desktop).
- [ ] El menú carga, se ven categorías, productos, precios, imágenes.
- [ ] No hay pantalla de "not found" ni error.

## 2. Pedido DINE-IN (lo más simple — empezá por acá)
- [ ] Agregar un producto al carrito.
- [ ] Elegir "Comer aquí" / dine-in, ingresar nº de mesa.
- [ ] Confirmar el pedido (pago en efectivo / al mesero si aplica).
- [ ] **La orden aparece en el Counter** en segundos, con la mesa correcta.
- [ ] (Si hay impresora térmica) imprime el ticket.

## 3. Pedido PICKUP
- [ ] Agregar producto, elegir "Recoger" / pickup.
- [ ] Confirmar.
- [ ] La orden llega al Counter marcada como pickup.

## 4. Pedido DELIVERY
- [ ] Agregar producto, elegir "Domicilio" / delivery.
- [ ] Ingresar dirección.
- [ ] Verificar que el **costo de envío** (delivery_fee) se suma al total y es el configurado.
- [ ] Confirmar.
- [ ] La orden llega al Counter con la dirección.

## 5. Pago con TARJETA (el más importante — solo si va a cobrar online)
- [ ] Hacer un pedido y elegir pago con tarjeta.
- [ ] Completar el pago con una tarjeta real de monto bajo ($1) o tarjeta de prueba.
- [ ] El pago se aprueba y redirige a confirmación.
- [ ] **La orden llega al Counter** marcada como pagada.
- [ ] El dinero aparece en la cuenta del restaurante (Stripe/Wompi dashboard).
- [ ] Comisión MENIUS = 0% si el plan está activo (verificar el monto neto).

## 6. Estados de la orden
- [ ] Desde el Counter, mover la orden por sus estados (pending → confirmed → preparing → ready → delivered).
- [ ] El cliente, si abre el link de seguimiento, ve el estado actualizado.

---

## Si algo falla
- **El menú no carga** → revisar que el producto/categoría estén `is_active` y el slug correcto.
- **La orden no llega al Counter** → revisar sesión del Counter y conexión; revisar `notifyNewOrder`.
- **El pago no completa** → revisar onboarding de Stripe/Wompi y el país del restaurante
  (Colombia = Wompi, no Stripe).
- **El envío cobra mal** → revisar `delivery_fee` en ajustes del restaurante.

> Pasá los 6 con una orden real de prueba y el cliente puede facturar con confianza.
