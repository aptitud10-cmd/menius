-- SECURITY FIX (BLOCKER, audit 2026-06-14)
-- anon (and authenticated) had column-level SELECT/INSERT/UPDATE/REFERENCES on
-- sensitive restaurants columns. The RLS policy `public_read_restaurant_by_slug`
-- allows SELECT *, so any anonymous caller could read owner PII, Stripe account
-- ids and fiscal data of ALL tenants via PostgREST (reproduced live in prod).
--
-- RLS cannot restrict columns; column-level grants can (PostgREST honors them).
-- All legitimate readers of these columns use the admin client (service_role),
-- which bypasses column grants. RLS remains as a second layer for row filtering.
--
-- NOTE: in Postgres, a column-level REVOKE on a table that had a table-level GRANT
-- collapses that grant into per-column grants for the remaining columns and then
-- removes the revoked ones. Net effect here: anon/authenticated lose SELECT on the
-- whole `restaurants` table. The follow-up migration re-grants only `slug` to anon
-- (needed by middleware custom-domain resolution). cart/quote was switched to the
-- admin client in code. See 20260614_grant_anon_restaurant_slug.sql.

REVOKE SELECT, INSERT, UPDATE, REFERENCES (
  notification_email,
  notification_whatsapp,
  stripe_account_id,
  owner_user_id,
  fiscal_rfc,
  fiscal_razon_social,
  fiscal_regimen_fiscal
) ON public.restaurants FROM anon, authenticated;
