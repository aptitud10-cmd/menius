-- Companion to 20260615_restore_authenticated_restaurant_read.sql.
--
-- restaurants had TWO permissive SELECT policies, both for {public} (anon + authenticated):
--   1. owners_read_own_restaurants    USING (owner_user_id = auth.uid())
--   2. public_read_restaurant_by_slug USING (true)
-- RLS policies OR together, so policy #2 let ANY role read ALL rows. anon was contained
-- only by column grants (slug). But once we restore full table SELECT to authenticated
-- (companion migration, so owners can read their own restaurant), policy #2 would let any
-- logged-in user read EVERY tenant's row in full — a cross-tenant leak (this `true`
-- policy predates the 2026-06-14 work; the revoke had been masking it for authenticated).
--
-- Scope the permissive `true` policy to anon ONLY. Result:
--   - anon          → policy(true) + column grant(slug only) = reads slug of any
--                     restaurant (public menu + custom-domain resolution; nothing else).
--   - authenticated → only owners_read_own_restaurants applies = reads ONLY its own row,
--                     in full (dashboard works, no cross-tenant access).
--
-- Verified in prod: authenticated owner sees exactly 1 row (its own); anon reads slug,
-- 42501 on sensitive columns.
DROP POLICY IF EXISTS public_read_restaurant_by_slug ON public.restaurants;
CREATE POLICY public_read_restaurant_by_slug ON public.restaurants
  FOR SELECT TO anon
  USING (true);
