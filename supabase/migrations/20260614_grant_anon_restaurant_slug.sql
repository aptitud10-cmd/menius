-- Follow-up to 20260614_revoke_sensitive_restaurant_columns.sql
-- The column REVOKE collapsed anon's table-level SELECT into per-column grants and,
-- since the table grant was consumed, anon lost SELECT on ALL columns. That broke
-- middleware.ts custom-domain resolution, which runs as anon and reads
-- restaurants.slug by custom_domain.
--
-- slug is non-sensitive (it is the public menu URL). Grant back ONLY slug so custom
-- domains resolve. RLS (public_read_restaurant_by_slug) still filters rows; every
-- other column remains inaccessible to anon. Sensitive columns stay revoked.

GRANT SELECT (slug) ON public.restaurants TO anon;
