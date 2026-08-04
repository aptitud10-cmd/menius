# Plan de Monetización Menius — Migración del Modelo

> **Para:** William + Sonnet (ejecutor)
> **De:** Opus (planner)
> **Fecha:** 2026-04-29
> **Objetivo:** Pasar de "Free ilimitado" a un SaaS real con trial pagado, sin perder a los 17 clientes existentes ni romper el sitio público.

---

## 0. Diagnóstico (resumen)

**El problema:** 16 de 17 restaurantes están en plan `free` con productos y pedidos ilimitados. No hay razón económica para pagar.

**Causas técnicas:**
1. `plans.ts:49,53` → Free tiene `maxProducts: -1` y `maxOrdersPerMonth: -1`.
2. `plans.ts:35` → `TRIAL_DAYS = 0` (trial deshabilitado en código).
3. `migration-atomic-restaurant.sql:24-31` → RPC SÍ crea trials de 14d, pero como el código dice 0 hay desconexión y los trials zombi quedan abandonados.
4. `onboarding/create-restaurant/page.tsx` → no pide tarjeta nunca.
5. Marketing público (landing, FAQ, blog) → promete "Free forever, sin tarjeta".

---

## 1. Decisiones estratégicas (que tenés que confirmar)

### Decisión A — Modelo Free
**Recomendación:** Free se vuelve "showcase" — suficiente para ver el producto, insuficiente para operar.

```
Free:
- 1 mesa con QR
- 15 productos
- 50 pedidos/mes
- Branding "Powered by MENIUS" obligatorio
- Solo dine-in
- Sin AI, sin pickup, sin delivery, sin pagos online
```

### Decisión B — Trial
**Recomendación:** 14 días de **Starter completo** con tarjeta obligatoria al checkout (Stripe maneja esto nativo).

Alternativa más suave: 7 días sin tarjeta + paywall después.

### Decisión C — Clientes existentes (los 16 actuales)
**Recomendación:** **Grandfathering parcial.**
- Mantienen el plan free actual (ilimitado) por **30 días**.
- Email avisando: "El 30 de mayo tu cuenta pasa a Free limitado. Activá un plan ahora con 50% off el primer mes."
- Si no activan en 30d → quedan en Free limitado (1 mesa, 15 productos, 50 pedidos/mes).
- Sus datos NO se borran. Solo no pueden agregar más allá del límite.

### Decisión D — Comunicación pública
**Recomendación:** Marketing pasa de "Free forever, sin tarjeta" a "Probá 14 días gratis, sin compromiso".

⚠️ **Antes de tocar código necesito tu OK en A, B, C, D.**

---

## 2. Plan de ejecución (5 fases)

### **FASE 1 — Datos y comunicación previa** (ANTES de tocar código)

**Tareas:**
1. Query SQL admin que liste:
   - Restaurantes sin sub (los 16).
   - Restaurantes con trial vencido > 30 días.
   - Órdenes en últimos 30d por restaurante (para saber quién está activo de verdad).
2. Email manual a los 17 owners avisando del cambio (template abajo).
3. Esperar 7 días hábiles antes de activar paywall.

**Por qué primero:** si activás el paywall sin avisar, perdés los pocos activos que tenés.

---

### **FASE 2 — Backend: planes + validaciones**

**Files a modificar:**

1. **`src/lib/plans.ts`** — Reducir Free + reactivar TRIAL_DAYS:
   ```ts
   export const TRIAL_DAYS = 14;  // antes 0
   export const FREE_MONTHLY_ORDER_LIMIT = 50;  // antes -1
   PLANS.free.limits = {
     maxProducts: 15,        // antes -1
     maxTables: 1,           // antes 5
     maxOrdersPerMonth: 50,  // antes -1
     maxUsers: 1,
   };
   PLANS.free.features = [
     'Menú digital con QR (1 mesa)',
     'Hasta 15 productos',
     'Hasta 50 pedidos/mes',
     'Branding "Powered by MENIUS"',
     'Dine-in',
   ];
   ```

2. **`src/lib/auth/check-plan.ts`** — `getEffectivePlanId()` debe respetar:
   - `is_grandfathered_until` columna nueva → si la fecha es futura, retornar `'starter'` aunque no haya sub.

3. **Nueva migración `migration-grandfathering.sql`:**
   ```sql
   ALTER TABLE restaurants
     ADD COLUMN IF NOT EXISTS is_grandfathered_until timestamptz;
   -- Setear 30 días para los 16 actuales:
   UPDATE restaurants
     SET is_grandfathered_until = NOW() + INTERVAL '30 days'
     WHERE created_at < '2026-04-29';  -- solo los actuales
   ```

4. **Validaciones en APIs** que crean recursos:
   - `/api/products` → bloquear con 402 Payment Required si supera `maxProducts`.
   - `/api/categories` (si aplica).
   - Endpoint para crear mesas → bloquear con 402.
   - `/api/orders` → bloquear con 402 si supera `maxOrdersPerMonth` (mostrar al cliente final mensaje neutral, NO "el restaurante no pagó").

5. **Tests `__tests__/plans.test.ts`** — actualizar asserts para los nuevos límites.

---

### **FASE 3 — Frontend: onboarding con tarjeta + dashboard**

**Files a modificar/crear:**

1. **`src/app/onboarding/create-restaurant/page.tsx`** — agregar paso final:
   - Después de "productos" → paso "Activá tu prueba gratis":
     - Hero: "14 días de Starter gratis. $0 hoy."
     - Stripe Checkout embebido o redirect.
     - Botón secundario: "Continuar con Free limitado" (down-bottom, gris).
   - Si completan checkout → redirect `/app` con `?welcome=trial`.
   - Si eligen Free → redirect `/app` con `?welcome=free` y ven banner "Subí a Starter".

2. **`src/app/api/billing/create-checkout/route.ts`** — soportar `trial_period_days: 14` con `payment_method_collection: 'always'` (tarjeta obligatoria).

3. **`src/components/dashboard/TrialBanner.tsx`** — refactor:
   - Si `trialing`: countdown "X días de prueba · activá tu tarjeta no se cobra hasta {fecha}".
   - Si `free`: "Estás en Free limitado · 32/50 pedidos · Subí a Starter →" (ROJO si > 80% del límite).
   - Si `is_grandfathered_until` futura: "Tu cuenta cambia a Free limitado el {fecha}. Activá un plan ahora con 50% off."

4. **`src/components/dashboard/DashboardHome.tsx`** — banner sticky de upgrade cuando aplique.

5. **Nuevo componente `PaywallModal.tsx`** que se muestra al hitear límite:
   - "Llegaste al límite de productos en Free. Subí a Starter por $39/mes →"
   - CTA directo a `/app/billing` con plan preseleccionado.

6. **`src/app/(dashboard)/app/billing/page.tsx`** — agregar:
   - Card "Tu plan actual: Free limitado" si aplica.
   - Card "Trial en curso" con countdown.
   - Card "Cuenta legacy" si está grandfathered.

---

### **FASE 4 — Marketing público + AI + docs**

**Files a modificar:**

1. **`src/lib/landing-translations.ts`** — cambiar mensajes:
   - ❌ "Sin tarjeta · Sin contrato"
   - ✅ "14 días gratis · Cancela cuando quieras"
   - Hero CTA: "Empezá tu prueba gratis"

2. **`src/lib/faq-data.tsx`** — actualizar:
   - Q "¿Puedo usar MENIUS gratis?" → respuesta nueva:
     > "Tenés 14 días gratis para probar Starter completo. Después podés elegir un plan pago o seguir con Free limitado (1 mesa, 15 productos, 50 pedidos/mes)."
   - Esto se publica como JSON-LD → Google indexa.

3. **`src/lib/blog-data.ts`** — buscar y reemplazar:
   - "free plan, no credit card" → "14-day free trial"
   - "plan gratuito sin tarjeta" → "14 días de prueba"
   - 5-6 posts afectados, los reescribimos con find/replace + revisión manual.

4. **`src/components/shared/PricingTable.tsx`** — quitar badge "Forever free", reemplazar por "Hasta 50 pedidos/mes".

5. **`src/app/demo/page.tsx`** y **`src/app/start/page.tsx`** — CTAs actualizados.

6. **`src/components/landing/LandingStickyCta.tsx`** — texto actualizado.

7. **`src/app/api/ai/chat/route.ts`** y **`src/app/api/ai/import-menu/route.ts`** — verificar que `hasPlanAccess('pro')` rechaza correctamente Free. Mensaje al user: "Esta función requiere Pro. [Subir plan]".

8. **`CLAUDE.md`** — actualizar sección "Planes y comisiones":
   ```md
   - Free: 1 mesa, 15 productos, 50 pedidos/mes (limitado)
   - Trial: 14 días Starter completo CON tarjeta obligatoria
   - Onboarding: Stripe checkout obligatorio (o "Continuar con Free")
   - Grandfathering: columna `restaurants.is_grandfathered_until`
   ```

---

### **FASE 5 — Cron jobs + emails de retención**

**Files a modificar/crear:**

1. **`src/app/api/cron/trial-ending-reminders/route.ts`** — verificar y mejorar:
   - Día 10 de trial: email "Tu trial vence en 4 días — confirmá tu plan".
   - Día 13: "Tu trial vence mañana".
   - Día 14: "Tu trial venció — recuperá tu menú con 50% off".

2. **Nuevo cron `src/app/api/cron/grandfathering-reminders/route.ts`** — diario:
   - Buscar restaurantes con `is_grandfathered_until` próximo a vencer.
   - Día -7, -3, -1: emails progresivos con CTA upgrade.

3. **`src/lib/notifications/email.ts`** — nuevos builders:
   - `buildGrandfatheringWarning({ daysLeft, ownerName, dashboardUrl })`
   - `buildPaywallHitEmail({ limitType, value })` — email cuando hitea límite.

4. **`vercel.json`** — registrar el nuevo cron.

---

## 3. Templates de comunicación

### Email a clientes existentes (FASE 1)

> **Asunto:** Cambios en MENIUS — tu cuenta sigue activa
>
> Hola {nombre},
>
> Te escribo desde MENIUS para avisarte de un cambio importante en cómo funcionan las cuentas a partir del **30 de mayo**.
>
> **Tu cuenta sigue activa.** Tu menú, tus productos, tus pedidos — todo sigue donde está.
>
> El cambio: el plan Free pasa a tener un límite de 1 mesa, 15 productos y 50 pedidos/mes. Si tu negocio necesita más, podés activar **Starter por $39/mes** (o $390/año, que sale 17% más barato).
>
> **Como cliente legacy, te ofrecemos 50% off el primer mes** si activás antes del 30 de mayo. Después de esa fecha tu cuenta pasa automáticamente a Free limitado (sin perder datos).
>
> 👉 [Activar mi plan con 50% off]({{checkout_url}})
>
> ¿Dudas? Respondeme este email.
>
> William
> MENIUS

### Banner en dashboard (FASE 3)

```
🎁 Cuenta legacy: Tenés acceso completo hasta el {fecha}.
Activá un plan ahora con 50% off → [Ver planes]
```

---

## 4. Riesgos y cómo mitigarlos

| Riesgo | Mitigación |
|--------|------------|
| Clientes activos enojados por cambio sorpresa | Email aviso con 30 días + grandfathering + descuento 50% |
| Owners pierden acceso a sus datos | Datos NO se borran, solo se bloquean acciones que excedan límite |
| Clientes finales (comensales) ven errores | Mostrar mensaje neutral: "Este menú no acepta pedidos online ahora" |
| SEO se cae por cambio en FAQ JSON-LD | Cambios graduales + redirects, monitorear Search Console |
| Stripe Checkout falla en onboarding → restaurante huérfano | Flujo de retry + opción "Continuar con Free" para no bloquear |
| Tests que asumen `maxProducts: -1` | Actualizar `__tests__/plans.test.ts` en mismo PR |
| Emails llegan a spam | Pre-warm Resend con dominio verificado, plain text fallback |

---

## 5. Orden de ejecución

```
Día 0  → CONFIRMAR decisiones A/B/C/D con William
Día 1  → FASE 1: query admin + email manual + esperar 7 días
Día 8  → FASE 2: plans.ts + grandfathering migration + validaciones API + tests
Día 9  → FASE 3: onboarding con tarjeta + banners dashboard + paywall modal
Día 10 → FASE 4: marketing copy + FAQ + blog + CLAUDE.md + AI checks
Día 11 → FASE 5: cron + emails retención
Día 12 → Deploy a producción + monitoring intensivo 48h
```

**Total: ~12 días calendario, ~5 días de trabajo de Sonnet.**

---

## 6. Métricas a trackear post-deploy

Widget nuevo en `/admin/metrics` "Funnel de Monetización":
- Onboardings iniciados → onboardings con tarjeta agregada → trials activos → conversiones a pago.
- Drop-off en cada paso.
- MRR proyectado vs actual.
- Churn semanal post-trial.

---

## 7. Lo que NO toco en este plan

- Comisión 4% (`commission_plan = true`) → sigue funcionando igual.
- Wompi 0% Colombia → sigue igual.
- Webhook Stripe → sigue igual (ya maneja `trialing → active`).
- Multi-location → sigue igual.

---

## 8. Pregunta para William antes de seguir

1. **¿OK con grandfathering 30 días o querés más/menos?**
2. **¿Trial 14d con tarjeta obligatoria, o 7d sin tarjeta?**
3. **¿Email manual a los 17 lo mandás vos o querés que generemos el cron que los manda?**
4. **¿Ofrecemos el 50% off el primer mes a los legacy o solo aviso?**
5. **¿Querés que arme dashboard de "Funnel monetización" antes o después del cambio?**

Respondeme estas 5 y arrancamos FASE 1.
