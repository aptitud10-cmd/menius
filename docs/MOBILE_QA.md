# Mobile QA Checklist — Menius

> Checklist de pruebas en dispositivo real antes de cada release que toque el menú público o checkout.
> Dispositivos objetivo: iPhone Safari (iOS 16+), Android Chrome (Android 12+).

---

## 1. Menú público (`/[slug]`)

### Layout y scroll
- [ ] Header fijo no tapa contenido al scrollear.
- [ ] Category sidebar / pills scrollean horizontalmente sin saltar.
- [ ] `safe-area-inset-bottom` correcto en iPhone con Home Bar (no se corta el CTA flotante).
- [ ] Modo landscape: layout no se rompe.
- [ ] `100dvh` (no `100vh`) — no desaparece al aparecer/desaparecer el teclado.

### ProductCard
- [ ] Imagen carga con lazy load (no bloquea scroll).
- [ ] Botón "+ Agregar" tamaño mínimo 44×44px.
- [ ] Tap en card abre CustomizationSheet o agrega directo (según `has_modifiers`).
- [ ] Haptic feedback en add-to-cart (iPhone Safari con `navigator.vibrate(8)`).
- [ ] Animación scale/ripple se dispara correctamente.
- [ ] CartFlyParticles se dispara al agregar (no rompe en iOS).

### Búsqueda y filtros
- [ ] Input de búsqueda no hace zoom al foco (font-size ≥ 16px).
- [ ] Filtros dietary chips toggleables y funcionan sin recarga.
- [ ] "Limpiar filtros" aparece cuando hay alguno activo.

### CartPanel
- [ ] Abre/cierra sin jank desde el botón del header.
- [ ] Scroll interno funciona sin triggerear el scroll del body.
- [ ] Sugerencias upsell (scroll horizontal de mini-cards) visible cuando hay ≥1 ítem.
- [ ] Tap en sugerencia: si tiene modifiers → abre CustomizationSheet. Si no → agrega directo.
- [ ] Cantidad de cada ítem incrementa/decrementa correctamente.
- [ ] Botón "Ir a pagar" navega a checkout.

### CustomizationSheet
- [ ] Se abre desde abajo (bottom sheet) sin animación rota en iOS.
- [ ] Keyboard no oculta campos de texto dentro del sheet.
- [ ] Scroll interno funciona con overscroll contenido.
- [ ] Botón "Agregar" sticky en el bottom del sheet, respeta safe-area.
- [ ] Variantes / extras / modifiers: tap targets ≥ 44px (`py-3.5`).

---

## 2. Checkout (`/[slug]/checkout`)

### Formulario
- [ ] Todos los inputs tienen `font-size: 16px` (no zoom en iOS).
- [ ] `PhoneField` no hace zoom en foco.
- [ ] Teclado numérico aparece en campo de teléfono (`inputmode="tel"`).
- [ ] Teclado email aparece en campo de correo.
- [ ] Al cerrar teclado, el botón "Pagar" no queda oculto.

### Pago
- [ ] Stripe Checkout redirect funciona en Safari (no bloqueado como pop-up).
- [ ] Botón "Pagar" se deshabilita al primer tap (evitar doble submit).
- [ ] Estado de loading visible mientras procesa.
- [ ] Si red cae → mensaje "Reintentando…" y botón bloqueado durante el retry.
- [ ] Stripe Elements (si se usa inline) renderiza correctamente en mobile.

### Post-pago
- [ ] Redirect a success URL llega a `/[slug]/order/[id]`.
- [ ] OrderTracker carga correctamente.
- [ ] Realtime: cambios de status se reflejan sin reload.
- [ ] Botón "Volver al menú" navega correctamente.

---

## 3. OrderTracker (`/[slug]/order/[id]`)

- [ ] Timeline de pasos visible y legible.
- [ ] Step actual con indicador animado.
- [ ] Actualización en tiempo real cuando el dueño cambia el status.
- [ ] Funciona en background tab (retoma al volver al tab sin reload).
- [ ] Tiempo estimado visible cuando status es `preparing`.

---

## 4. Rendimiento mobile

- [ ] First paint < 2s en 4G (Lighthouse Mobile).
- [ ] No hay layout shift (CLS) visible al cargar las imágenes.
- [ ] ISR funciona: segundo load < 500ms (página ya en CDN).
- [ ] Bundle del menú no supera ~350KB gzipped (verificar en DevTools Network).
- [ ] `CustomizationSheet` carga lazy (no en el bundle inicial).

---

## 5. Regresiones comunes a verificar siempre

| Escenario | Dónde revisar |
|---|---|
| Agregar producto sin modifiers → va directo al carrito | ProductCard |
| Agregar producto con modifiers → abre sheet | ProductCard → CustomizationSheet |
| Promo code válido → descuento aplicado | Checkout |
| Promo code inválido → error claro (no crash) | Checkout |
| Loyalty: canjear puntos → descuento visible | Checkout |
| Carrito vacío → no muestra sección upsell | CartPanel |
| Restaurante pausado → mensaje claro al cliente | Checkout |
| Fuera de horario → mensaje claro al cliente | Checkout |
| Plan free sin sub → no se puede pagar online | Checkout |
| Stripe webhook: orden se marca como pagada | Dashboard dueño |

---

## 6. Dispositivos de prueba recomendados

| Dispositivo | Por qué importa |
|---|---|
| iPhone 14 Safari (iOS 17) | Safe area, haptic, zoom en inputs |
| iPhone SE 2 Safari (pantalla chica) | Layout en 375px de ancho |
| Samsung Galaxy A (Chrome Android) | Variantes Android populares en LatAm |
| iPad Safari | Layout tablet — mismo slug, diferente viewport |

---

## 7. Comandos útiles

```bash
# Lighthouse CLI
npx lighthouse https://menius.app/[slug] --emulated-form-factor=mobile --output=html

# Simular 4G throttling en Chrome DevTools
# DevTools → Network → "Fast 4G"

# Ver safe-area en Safari iOS (DevTools Simulator)
# Settings → Safari → Advanced → Web Inspector
```
