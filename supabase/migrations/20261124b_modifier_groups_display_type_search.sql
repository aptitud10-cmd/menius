-- display_type 'search': el grupo se dibuja como buscador de agregados ("Add something else") al final de la
-- hoja del plato (AddonSearch, commit 2d7a9a82). Hasta ahora el CHECK solo aceptaba 'list' y 'grid'.
ALTER TABLE public.modifier_groups DROP CONSTRAINT IF EXISTS modifier_groups_display_type_check;
ALTER TABLE public.modifier_groups
  ADD CONSTRAINT modifier_groups_display_type_check CHECK (display_type IN ('list', 'grid', 'search'));
