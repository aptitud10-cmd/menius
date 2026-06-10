-- Lock down three tables with open USING(true) policies found by the security audit.
-- All three were created manually (mislabeled "service role" but granted to public),
-- never in a migration. None is read with the anon key by any client.
--
-- subscription_audit_log: exposed every restaurant's billing history (plan changes,
--   cancellations, stripe metadata) to any client. Only the billing webhook / crons
--   write here, via the admin client (service_role bypasses RLS).
-- menius_posts: exposed (and allowed writing/deleting) the social-media content
--   calendar. Only the social-posts cron touches it, via the admin client.
-- tables: public_read_tables exposed qr_code_value for every restaurant's tables,
--   letting an attacker craft dine-in orders for any table. The public order flow
--   reads tables via /api/orders using the admin client; owners use owners_manage_tables.
--
-- product_pairings is intentionally left open: the public menu (MenuShell) reads it
-- with the anon key, and the data (which products pair with which) is non-sensitive
-- menu metadata that is already public.

DROP POLICY IF EXISTS "service_role_audit_log" ON public.subscription_audit_log;
DROP POLICY IF EXISTS "Service role full access on menius_posts" ON public.menius_posts;
DROP POLICY IF EXISTS "public_read_tables" ON public.tables;
