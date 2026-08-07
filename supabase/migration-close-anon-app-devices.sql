-- Aplicada a prod el 2026-08-07 (via MCP, nombre: close_anon_rls_app_device_tables)
--
-- BLOCKER B6 de AUDIT_R2.md.
-- Las policies anon eran USING(true): cualquiera con la anon key (publica, va en
-- el bundle del browser/app) podia LEER y SOBRESCRIBIR phone/email/addresses/
-- display_name de todos los clientes, y enumerar o borrar los expo_push_token
-- (= mandar notificaciones falsas suplantando a MENIUS, o matar las
-- notificaciones de todos). Verificado en prod con transacciones revertidas.
--
-- El comentario en src/app/api/app/device/route.ts afirmaba que "anon RLS on it
-- was closed" — nunca se habia cerrado: la ruta se blindo, la pared quedo
-- abierta. (Corregido en el mismo commit.)
--
-- Los 3 consumidores (api/app/device, api/app/device-token,
-- lib/notifications/push) usan createAdminClient(), que bypasa RLS: anon no
-- necesita ningun acceso. Ambas tablas estaban vacias al aplicar esto (la app
-- Expo no lanzo), asi que el cierre no rompe nada existente.
--
-- Verificado tras aplicar: SET ROLE anon; select from app_devices ->
-- "permission denied for table app_devices". 0 policies restantes.

DROP POLICY IF EXISTS app_devices_anon_select ON public.app_devices;
DROP POLICY IF EXISTS app_devices_anon_update ON public.app_devices;
DROP POLICY IF EXISTS app_devices_anon_insert ON public.app_devices;
DROP POLICY IF EXISTS app_device_tokens_anon_all ON public.app_device_tokens;

REVOKE ALL ON public.app_devices FROM anon;
REVOKE ALL ON public.app_device_tokens FROM anon;
