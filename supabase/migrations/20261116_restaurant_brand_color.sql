-- Color del restaurante para el seguimiento del pedido (lo elige el dueño en
-- Configuración). Solo hex #RRGGBB; NULL = sin color (el seguimiento usa tinta
-- neutra). La legibilidad la resuelve src/lib/tracker-brand.ts.
alter table public.restaurants add column if not exists brand_color text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'restaurants_brand_color_hex'
  ) then
    alter table public.restaurants
      add constraint restaurants_brand_color_hex
      check (brand_color is null or brand_color ~ '^#[0-9A-Fa-f]{6}$');
  end if;
end $$;
