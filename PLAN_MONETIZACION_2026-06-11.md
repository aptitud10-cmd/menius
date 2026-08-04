# MENIUS — Decisiones de monetización (2026-06-11)

> Reemplaza el modelo de PLAN_MONETIZACION.md (2026-04-29, modelo viejo con Starter $39).
> NADA implementado todavía — diseño a confirmar antes de tocar código.

## Planes (de 4 → 3)

| Plan | Precio/mes | Anual | Para quién |
|------|-----------|-------|-----------|
| **Free** | $0 | — | Food trucks, prueba, enganche |
| **Pro** ⭐ | **$19** (confirmado) | ~$15/mes | El 80% — restaurantes |
| **Business** | $49 | ~$39/mes | Cadenas, multi-sucursal |

- **Eliminar Starter** (fundir con Pro).
- Comisión 4%: queda interno, fuera del menú público.
- Precios en **USD** (Stripe no soporta COP). Pagos del restaurante a sus clientes en Colombia → **Wompi**.
- Mostrar equivalencia COP en UI (ya existe `COP_PRICES`).

## El motor de pago (decisión clave pendiente)

Mover **"recibir pedidos online de clientes"** de Free → Pro:
- **Free = carta digital bonita**: menú QR (5 mesas), productos ilimitados, importar menú con IA, chat. Solo efectivo, SIN pedidos online. Marca "Powered by MENIUS".
- **Pro $19 = canal de ventas**: pedidos online (delivery/pickup/dine-in + carrito), pagos 0% comisión, KDS, analytics, promos, lealtad, reseñas, equipo (5), imágenes IA. Sin marca.
- **Business $49**: ilimitado, multi-sucursal (3), dominio propio, API, account manager.

Segundo gancho de retención: mostrar en dashboard **"ganaste $X este mes con MENIUS / subiste tu ticket Y%"**.

## Límites de IA (proteger margen)

Margen Pro: $19 − $0.85 Stripe = **$18.15**. fal.ai = **$0.04/imagen**.

| Plan | Imágenes/mes | Costo máx |
|------|-------------|-----------|
| Free | 0 | $0 |
| Pro | 40 | $1.60 |
| Business | 150 | $6.00 |

- **Bug a arreglar:** hoy es 30/DÍA (hasta $36/mes ☠️, mata el margen a $19). Cambiar a límite MENSUAL.
- Importar menú + chat usan Gemini (centavos) → OK en cualquier plan.

## Trial

- 14 días acceso Pro completo, IA limitada (40 img → abuso = máx $1.60).
- **Tarjeta al inicio** (opcional, prominente). Dato: con tarjeta convierte 44% vs 14% sin (5x).
- Sin tarjeta → día 14 cae a Free (siente perder pedidos online → vuelve).

## Alertas a William

- **Telegram bot** (gratis): nueva suscripción 🟢, error crítico 🔴, pago fallido 🟡, soporte 💬.

## Costos reales (verificados con William)

- Fijos MENIUS: ~$85/mes (Supabase $25 + Resend $20 + Vercel $20 + Sentry $20 cuando crezca).
- Claude $100 NO cuenta (herramienta de William, sirve a otros proyectos).
- Variables: fal.ai $0.04/img, Gemini centavos.
- **Break-even: 5 clientes Pro.** Cliente extra = costo ~$0.

## Decisiones de William pendientes

1. ¿Mover pedidos online a Pro? ← la más importante
2. ¿Tarjeta en wizard al inicio del trial? (datos: 5x conversión)
3. ¿Free con marca "Powered by MENIUS"? (rec: sí)

## Orden de implementación (cuando se confirme)

1. Recalibrar límite imágenes (diario → mensual)
2. Nuevos price IDs en Stripe ($19, $49)
3. `src/lib/plans.ts` → 3 planes
4. Gating de pedidos online a Pro
5. Tarjeta en onboarding wizard
6. Landing + legales + FAQ
7. Migrar cliente actual (1 real: lacasita)
8. Alertas Telegram

## Contexto importante

- Solo 1 cliente real (lacasita), 0 subscripciones pagas reales en prod.
- El doc viejo (abril) asumía 17 clientes y grandfathering — ya no aplica.
