-- Lock down push_subscriptions RLS: drop the open anon/authenticated policies.
--
-- Security audit found three policies that exposed Web Push encryption material
-- (keys_p256dh, keys_auth, endpoint, order_id) to any client:
--   - "Anyone can subscribe"          INSERT anon/authenticated WITH CHECK (true)
--   - "Anon can read own subscription" SELECT anon  USING (true)  (misnamed — reads ALL)
--   - "Service can read subscriptions" SELECT authenticated USING (true)
-- These were created manually in the dashboard and never lived in a migration.
--
-- Safe to drop: nothing uses this table with the anon key. Web push subscribes
-- through POST /api/push/subscribe (admin client) and reads/deletes via the admin
-- client in src/lib/notifications/push.ts. The mobile app does not touch this table.
-- The remaining `admin_all` policy (service_role) covers all real access.
DROP POLICY IF EXISTS "Anyone can subscribe" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Anon can read own subscription" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Service can read subscriptions" ON public.push_subscriptions;
