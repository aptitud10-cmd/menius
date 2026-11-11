-- device_sessions dejaba filas sueltas: desconectar una tablet borraba la sesión de
-- auth pero no la fila, y lo mismo cuando la tablet cierra sesión sola. Inofensivo
-- (los session_id no se reusan) pero acumula basura. Ahora desconectar borra la
-- fila y, de paso, las sueltas de ese restaurante. Misma firma y mismos permisos.

create or replace function public.revoke_device_session(p_restaurant_id uuid, p_session_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  delete from auth.sessions s
  using public.device_sessions d
  where s.id = p_session_id
    and d.session_id = s.id
    and d.restaurant_id = p_restaurant_id;
  get diagnostics n = row_count;

  -- La recién desconectada + las de tablets que ya cerraron sesión solas.
  delete from public.device_sessions d
  where d.restaurant_id = p_restaurant_id
    and not exists (select 1 from auth.sessions s where s.id = d.session_id);

  return n > 0;
end;
$$;

revoke all on function public.revoke_device_session(uuid, uuid) from public, anon, authenticated;
grant execute on function public.revoke_device_session(uuid, uuid) to service_role;

-- Limpieza única de las que ya existen.
delete from public.device_sessions d
where not exists (select 1 from auth.sessions s where s.id = d.session_id);
