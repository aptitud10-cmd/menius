-- KDS: "LISTO" por estación (auditoría 2026-11-25, W8).
--
-- Con el filtro de una estación (parrilla, freidora…), LISTO pasaba TODO el
-- pedido a 'ready': salía de las otras estaciones, sonaba "listo" en el
-- Counter y el cliente recibía "tu pedido está listo" con platos sin hacer.
-- Ahora cada estación anota que terminó lo suyo; el pedido pasa a 'ready'
-- cuando terminaron todas (lo decide la app).
--
-- Cada estación suele ser otra pantalla: el estado vive en la base, no en la
-- tablet. La función hace el cambio en una sola sentencia, así dos estaciones
-- que terminan a la vez no se pisan.

alter table public.orders
  add column if not exists kitchen_stations_done uuid[] not null default '{}';

comment on column public.orders.kitchen_stations_done is
  'Estaciones del KDS que ya terminaron sus platos de este pedido (LISTO con filtro de estación).';

-- SECURITY INVOKER: corre con los permisos de quien llama, así que la RLS de
-- orders decide (solo el dueño del restaurante, o su tablet, actualiza).
create or replace function public.kds_set_station_done(
  p_order_id uuid,
  p_station_id uuid,
  p_done boolean default true
)
returns uuid[]
language sql
security invoker
set search_path = public
as $$
  update public.orders
     set kitchen_stations_done = case
           when p_done then (
             select coalesce(array_agg(distinct s), '{}')
               from unnest(kitchen_stations_done || p_station_id) as s
           )
           else array_remove(kitchen_stations_done, p_station_id)
         end,
         updated_at = now()
   where id = p_order_id
  returning kitchen_stations_done;
$$;

revoke all on function public.kds_set_station_done(uuid, uuid, boolean) from public, anon;
grant execute on function public.kds_set_station_done(uuid, uuid, boolean) to authenticated;
