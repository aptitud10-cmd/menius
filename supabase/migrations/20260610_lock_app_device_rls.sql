-- Lock down app_devices and app_device_tokens RLS.
--
-- Security audit found open anon policies on both tables (created manually,
-- never in a migration):
--   app_devices:        anon SELECT/INSERT/UPDATE USING/WITH CHECK (true)
--                       — exposes customer PII (phone, email, addresses, favorites)
--   app_device_tokens:  anon ALL USING/WITH CHECK (true)
--                       — exposes raw expo_push_tokens
-- The mobile app uses the anon key (guest-first, no auth.uid()), so these were
-- left fully open. The anon key ships in the app bundle, so any client could
-- read/modify/delete every row.
--
-- The Menius API now owns all writes via the admin client:
--   POST /api/app/device        (upsert app_devices, keyed by device_uuid)
--   POST /api/app/device-token  (upsert/deactivate app_device_tokens)
-- and src/lib/notifications/push.ts reads both with the admin client.
-- service_role bypasses RLS, so no anon policy is needed once these are dropped.
--
-- NOTE: this breaks direct writes from OLD app versions still using the anon key.
-- Accepted — the mobile app has near-zero real users yet (app_device_tokens: 0 rows).

DROP POLICY IF EXISTS "app_device_tokens_anon_all" ON public.app_device_tokens;

DROP POLICY IF EXISTS "app_devices_anon_select" ON public.app_devices;
DROP POLICY IF EXISTS "app_devices_anon_insert" ON public.app_devices;
DROP POLICY IF EXISTS "app_devices_anon_update" ON public.app_devices;
