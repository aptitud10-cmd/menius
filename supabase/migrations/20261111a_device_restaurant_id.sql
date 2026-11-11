-- W-O10: la tablet vinculada sigue a SU tienda (device_sessions.restaurant_id),
-- no a la que el dueño tenga elegida en el panel (profiles.default_restaurant_id).
-- Devuelve la tienda de la sesión actual si es una tablet, o NULL si no lo es.
-- Lee el session_id del JWT ya verificado: el cliente no elige qué sesión se consulta.
-- El código cae al comportamiento anterior mientras esta función no exista.

create or replace function public.current_device_restaurant_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select d.restaurant_id
  from public.device_sessions d
  where d.session_id = nullif(auth.jwt() ->> 'session_id', '')::uuid
  limit 1;
$$;

revoke all on function public.current_device_restaurant_id() from public, anon;
grant execute on function public.current_device_restaurant_id() to authenticated;
