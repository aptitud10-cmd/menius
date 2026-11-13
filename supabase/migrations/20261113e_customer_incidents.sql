-- Clientes problema (Pedro 2026-11-13): un pedido que el cliente no recibió
-- (no estaba, no vino a buscarlo) o no pagó queda registrado, y el cliente
-- queda marcado desde el primer incidente. En su próximo pedido el Counter
-- muestra una alerta; si el restaurante cobra con tarjeta, se le exige pagar
-- online. El restaurante lo desmarca desde Clientes (incident_count = 0; el
-- historial queda en orders.incident).

alter table public.orders
  add column if not exists incident text
    check (incident in ('not_received', 'not_paid'));

alter table public.customers
  add column if not exists incident_count integer not null default 0,
  add column if not exists last_incident text
    check (last_incident in ('not_received', 'not_paid')),
  add column if not exists last_incident_at timestamptz;

-- El Counter pide solo los marcados de su restaurante.
create index if not exists customers_flagged_idx
  on public.customers (restaurant_id)
  where incident_count > 0;
