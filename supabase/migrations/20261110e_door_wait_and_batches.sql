-- Repartidor en la puerta: espera, "Ya bajo" del cliente y entrega fallida.
alter table public.orders add column if not exists driver_wait_started_at timestamptz;
alter table public.orders add column if not exists customer_coming_at timestamptz;
alter table public.orders add column if not exists delivery_failed_at timestamptz;
alter table public.orders add column if not exists delivery_failure_reason text;

-- Varios pedidos en un mismo viaje del repartidor (ruta).
alter table public.orders add column if not exists batch_id uuid;
alter table public.orders add column if not exists batch_seq smallint;
create index if not exists orders_batch_id_idx on public.orders (batch_id) where batch_id is not null;
