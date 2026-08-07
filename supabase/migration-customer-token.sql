-- Aplicada a prod el 2026-08-07 (via MCP, nombre: orders_customer_token)
--
-- Separa el token de VISTA del cliente del token de ACCION del driver.
-- driver_tracking_token permite marcar entregado y postear GPS; viajaba en las
-- URLs de redirect de las 3 pasarelas (historial del navegador + logs del PSP).
-- customer_token es solo-lectura: gatea la PII en el tracker publico.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_token uuid DEFAULT gen_random_uuid();

-- Backfill: toda orden existente recibe su token de vista.
UPDATE public.orders SET customer_token = gen_random_uuid() WHERE customer_token IS NULL;
