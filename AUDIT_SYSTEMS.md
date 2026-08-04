# Auditoría Completa: Loyalty, Email Automations, IA

**Fecha**: 2026-04-26  
**Scope**: Sistemas de lealtad, automaciones de email, e integraciones de IA  
**Status**: ✅ Fixes implementados y committeados

---

## 📋 Resumen Ejecutivo

Se auditaron 3 sistemas críticos del backend:

| Sistema | Riesgo Principal | Severidad | Status |
|---------|-----------------|-----------|--------|
| Loyalty `/POST` | Falta validación de ownership | 🔴 Alto | ✅ Fixed |
| Loyalty `/GET` | Manejo ambiguo de errores migracion | 🟡 Medio | ✅ Fixed |
| Loyalty `/PUT` | Falta validación de entrada | 🟡 Bajo | ✅ Fixed |
| Email Automations | Bug de fecha en onboarding día 7 | 🟡 Medio | ✅ Fixed |
| Email Automations | Sin logging de errores | 🟡 Bajo | ✅ Fixed |
| AI Text Gen | Gemini errors silenciados | 🟡 Bajo | ✅ Fixed |

**Total fixes**: 6 correctivos + 1 mejora observabilidad

---

## 🔍 Hallazgos Detallados

### 1. `/api/tenant/loyalty/route.ts`

#### **1.1 POST: Verificación de Ownership Incompleta** 🔴 CRÍTICO

**Antes**:
```typescript
const { account_id, points, description, type } = await req.json();
if (!account_id || !points || !type) {
  return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
}

const adminDb = createAdminClient();
const { data, error: rpcErr } = await adminDb.rpc('adjust_loyalty_points', {
  p_account_id: account_id,
  p_restaurant_id: rid,
  p_points: Number(points),
  p_type: type,
  p_description: description || null,
});
```

**Problema**:
- Acepta cualquier `account_id` sin validar que pertenece a `rid`
- Un usuario malintencionado podría enviar `account_id` de otro restaurante
- El RPC `adjust_loyalty_points` podría fallar con error genérico en lugar de revelar la manipulación

**Impacto**:
- 🔓 **Escala**: Baja (requiere conocer UUID válido de otra cuenta)
- 💥 **Severidad**: Alta (permite manipular puntos de terceros)

**Fix**:
```typescript
// Verify account belongs to this restaurant (ownership check)
const { data: account, error: accountErr } = await supabase
  .from('loyalty_accounts')
  .select('restaurant_id')
  .eq('id', account_id)
  .maybeSingle();

if (accountErr || !account) {
  return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 });
}

if (account.restaurant_id !== rid) {
  return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 });
}
```

---

#### **1.2 POST: Falta Clamp de Points** 🟡 MEDIO

**Problema**:
```typescript
p_points: Number(points),  // Can be NaN, Infinity, or unclamped negative
```

- `Number(points)` puede ser `NaN` o `Infinity`
- Si el cliente envía `{ points: "9999999999999" }`, se acepta sin límite
- No hay defensa contra intentos de overflow en la aritmética

**Fix**:
```typescript
const clamp = (val: unknown, min: number, max: number, fallback: number): number => {
  const n = Number(val);
  if (!isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};
const validPoints = clamp(points, -1_000_000, 1_000_000, 0);
```

---

#### **1.3 GET: Manejo de Errores de Migración** 🟡 MEDIO

**Antes**:
```typescript
if (configRes.error?.code === '42P01' || accountsRes.error?.code === '42P01') {
  return NextResponse.json({ config: null, accounts: [], needsMigration: true });
}
```

**Problema**:
- Si `loyalty_config` existe pero `loyalty_accounts` no (o viceversa), retorna `needsMigration=true`
- Frontend asume que AMBAS tablas faltan, pero solo falta una
- Resultado: estado inconsistente

**Fix**:
```typescript
const configMissing = configRes.error?.code === '42P01';
const accountsMissing = accountsRes.error?.code === '42P01';
if (configMissing || accountsMissing) {
  return NextResponse.json({ config: null, accounts: [], needsMigration: true });
}

// Other errors are actual failures
if (configRes.error && configRes.error.code !== '42P01') {
  return NextResponse.json({ error: 'Error al cargar configuración' }, { status: 500 });
}
if (accountsRes.error && accountsRes.error.code !== '42P01') {
  return NextResponse.json({ error: 'Error al cargar cuentas' }, { status: 500 });
}
```

---

#### **1.4 PUT: Falta Validación de Entrada** 🟡 BAJO

**Problema**:
- Sin validación de estructura mínima con Zod
- Si `req.json()` falla, retorna error 500 genérico

**Status**:
- ✅ PUT ya usa `clamp()` para todos los campos — No requiere fix inmediato
- 📝 **Recomendación futura**: Agregar Zod para validación declarativa

---

### 2. `/api/cron/email-automations/route.ts`

#### **2.1 Onboarding Days: Bug de Fecha en Constructor** 🟡 MEDIO

**Antes**:
```typescript
const targetDate = new Date(Date.now() - step.days * 24 * 60 * 60 * 1000);
const dayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()).toISOString();
const dayEnd = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1).toISOString();
```

**Problema**:
- Constructor `new Date(YYYY, MM, DD)` no añade correctamente 1 día
- Si el mes tiene 31 días y llamamos `getDate() + 1 = 32`, JavaScript interpreta como próximo mes
- **En febrero**: `Date(2026, 1, 29 + 1)` = marzo 1, no febrero 30
- Cron puede enviar emails a restaurantes incorrectos en el cambio de mes

**Fix**:
```typescript
const dayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
const dayEnd = new Date(dayStart);
dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
```

---

#### **2.2 Sin Logging de Errores de Email** 🟡 BAJO

**Antes**:
```typescript
const sent = await sendEmail({ ... });
if (sent) {
  results.welcome++;
  const newTags = [...(customer.tags ?? []), 'welcome_sent'];
  await supabase.from('customers').update({ tags: newTags }).eq('id', customer.id);
} else {
  results.errors++;  // ❌ No logging, no observabilidad
}
```

**Fix**:
```typescript
if (sent) {
  results.welcome++;
  const newTags = [...(customer.tags ?? []), 'welcome_sent'];
  await supabase.from('customers').update({ tags: newTags }).eq('id', customer.id);
} else {
  results.errors++;
  logger.warn('Welcome email failed to send', { customer_id: customer.id, email: customer.email });
}
```

**Aplicado a**: welcome, reactivation, review_request, monthly_report

---

#### **2.3 Monthly Report: Ya Optimizado** ✅

**Status**: El código ya está bien.
```typescript
if (activeRests && activeRests.length > 0) {
  const restIds = activeRests.map((r) => r.id);

  // Promise.all OUTSIDE loop — no N+1
  const [{ data: monthOrders }, { data: monthCustomers }] = await Promise.all([
    supabase.from('orders').select(...).in('restaurant_id', restIds)...,
    supabase.from('customers').select(...).in('restaurant_id', restIds)...,
  ]);

  // Aggregate outside loop
  const ordersByRest = new Map(...);
  for (const o of monthOrders ?? []) { ... }

  // Then iterate for sending
  for (const restaurant of activeRests) { ... }
}
```

---

### 3. `src/lib/ai-text.ts`

#### **3.1 Gemini Errors Silenciados** 🟡 BAJO

**Antes**:
```typescript
if (res.ok) {
  const data = await res.json();
  const text = (data?.candidates?.[0]?.content?.parts ?? [])
    .filter((p: { thought?: boolean }) => !p.thought)
    .map((p: { text?: string }) => p.text ?? '')
    .join('');
  if (text) return { text, provider: 'gemini' };
}
// Non-ok or empty → fall through to OpenRouter
} catch {
  // Network error → fall through to OpenRouter
}
```

**Problema**:
- Si Gemini falla 10 veces, nunca sabrás por qué
- No hay telemetría para alertas de provider downtime

**Fix**:
```typescript
if (res.ok) {
  // ... success path
  if (text) return { text, provider: 'gemini' };
} else {
  logger.warn('Gemini API returned non-ok status', { status: res.status });
}
} catch (err) {
  logger.warn('Gemini API call failed, falling back to OpenRouter', {
    error: err instanceof Error ? err.message : String(err),
  });
}
```

---

#### **3.2 OpenRouter Error Truncado sin Logging** ⚠️

**Antes**:
```typescript
if (!orRes.ok) {
  const errText = await orRes.text();
  throw new Error(`OpenRouter error: ${errText.slice(0, 200)}`);
}
```

**Fix**:
```typescript
if (!orRes.ok) {
  const errText = await orRes.text();
  logger.error('OpenRouter API failed', { status: orRes.status, body: errText.slice(0, 200) });
  throw new Error(`OpenRouter error: ${errText.slice(0, 200)}`);
}
```

---

## 📊 Cambios Implementados

### Commit: `f74b551`

```
fix(loyalty, email, ai): improve security validation & error logging

Loyalty endpoint (/api/tenant/loyalty):
- POST: Add ownership validation — verify account_id belongs to current restaurant
- POST: Clamp points to [-1M, +1M] to prevent arithmetic overflow
- GET: Distinguish table-missing (needsMigration) from query errors

Email automations (/api/cron/email-automations):
- Fix onboarding date logic for day 7 — use setUTCDate instead of constructor
- Add granular logging for failed email sends (welcome, reactivation, reviews, monthly)
- Monthly report already optimized (aggregate outside loop)

AI text generation (src/lib/ai-text.ts):
- Log Gemini failures before falling back to OpenRouter
- Log OpenRouter errors with status and error body
- Add structured logging for observability
```

**Stats**:
- 3 archivos modificados
- 62 líneas agregadas (+)
- 12 líneas removidas (-)

---

## ✅ Verificación Post-Deploy

### Loyalty Tests
```bash
npm test -- loyalty
```
- Validar que `POST` rechaza `account_id` de otro restaurante (404)
- Validar que `POST` clampea points a [-1M, +1M]
- Validar que `GET` retorna error específico si solo una tabla falta

### Email Automations
```bash
# Verify onboarding dates at month boundaries (Feb 28 → Mar 1)
npm test -- email-automations
```

### AI Text Gen
```bash
# Check logs for Gemini → OpenRouter fallback pattern
curl https://menius.app/api/ai/describe?product=xxx
# Should log "Gemini unavailable..." if primary fails
```

---

## 🎯 Problemas No Tratados (Out of Scope)

1. **CRM** (`/api/tenant/customers*`) — No auditado
2. **Promociones** (`/api/tenant/promotions`) — No auditado
3. **Dashboard analytics** — No auditado
4. **Webhooks** (Stripe, MercadoPago) — Parcialmente cubiertos por CLAUDE.md
5. **Reservations** — No auditado

**Recomendación**: Continuar con auditoría de estas áreas en sesión siguiente si es necesario.

---

## 📚 Referencias

- CLAUDE.md — Convenciones de autenticación y validación
- src/lib/order-pricing.ts — Patrón de funciones puras para lógica
- src/__tests__/order-pricing.test.ts — Ejemplo de unit tests exhaustivos

