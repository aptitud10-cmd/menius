-- Clientes y caja frente a la tablet (auditoría 2026-11-25, sigue a 20261128).
--
-- La tablet inicia sesión con la cuenta del dueño, así que con su token se
-- podía hablar directo con la base y:
--   · bajar la libreta completa de clientes (nombre, teléfono, email,
--     dirección, notas) o editarla;
--   · reescribir un turno de caja ya cerrado (efectivo contado, esperado,
--     diferencia) o borrarlo.
--
-- Reglas (el dueño en su celular/computadora y el servidor con service role no
-- cambian):
--   · customers: la tablet SIN PIN no la lee ni la escribe. Las alertas de
--     "cliente problema" del Counter las lee y las marca el servidor.
--     Con el panel abierto por PIN, el dueño ve sus clientes como en el panel.
--   · shifts: ninguna tablet escribe turnos directo. Abrir y cerrar turno lo
--     hace el servidor (calcula los totales); la tablet solo lee.

-- ── customers ───────────────────────────────────────────────────────────
-- RESTRICTIVE: se suma (AND) a customers_owner_access sin reemplazarla.
drop policy if exists customers_no_locked_tablet on public.customers;
create policy customers_no_locked_tablet on public.customers
  as restrictive
  for all
  to authenticated
  using (not (select public.current_session_is_locked_tablet()))
  with check (not (select public.current_session_is_locked_tablet()));

-- ── shifts ──────────────────────────────────────────────────────────────
create or replace function public.guard_tablet_shifts()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if public.current_session_is_device() then
    raise exception 'TABLET_MONEY_LOCKED: una tablet no escribe turnos de caja' using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists guard_tablet_shifts on public.shifts;
create trigger guard_tablet_shifts
  before insert or update or delete on public.shifts
  for each row execute function public.guard_tablet_shifts();
