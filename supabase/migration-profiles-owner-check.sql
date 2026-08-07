-- Aplicada a prod el 2026-08-07 (via MCP, nombre: profiles_default_restaurant_with_check)
--
-- BLOCKER B1 de AUDIT_R2.md — takeover cross-tenant.
-- La policy de UPDATE controlaba QUE FILA se edita (user_id = auth.uid()) pero
-- no QUE VALOR se escribe. Como getTenant() deriva el tenant de
-- profiles.default_restaurant_id, cualquier usuario autenticado podia apuntar su
-- sesion al restaurante de otro (los UUID se enumeran desde el menu publico) y
-- operarlo a traves de las ~16 rutas que usan service role: escribir las llaves
-- Wompi del ajeno, emitir reembolsos, borrar la cuenta.
--
-- Verificado tras aplicar: el UPDATE a un restaurante ajeno devuelve
-- "new row violates row-level security policy"; el UPDATE al propio pasa.
-- Segunda capa en src/lib/auth/get-tenant.ts (join contra owner_user_id).

DROP POLICY IF EXISTS users_update_own_profile ON public.profiles;

CREATE POLICY users_update_own_profile ON public.profiles
  FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND (
      default_restaurant_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.restaurants r
        WHERE r.id = default_restaurant_id
          AND r.owner_user_id = (SELECT auth.uid())
      )
    )
  );
