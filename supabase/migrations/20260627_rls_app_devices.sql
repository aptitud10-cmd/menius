-- Habilitar RLS en app_devices y app_device_tokens.
--
-- Las tablas fueron creadas manualmente en prod antes de que existiera la
-- migración 20260611_create_app_devices_tables.sql, por lo que pueden no
-- tener RLS habilitado en la base de datos de producción.
-- Esta migración lo garantiza de forma idempotente (ENABLE es no-op si ya está activo).
--
-- No se crean policies para anon/authenticated: solo service_role las accede,
-- y service_role bypasea RLS por defecto.

ALTER TABLE public.app_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_device_tokens ENABLE ROW LEVEL SECURITY;
