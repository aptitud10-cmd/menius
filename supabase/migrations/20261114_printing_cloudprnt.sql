-- Impresión automática de tickets por CloudPRNT (Star mC-Print3).
-- Spec: .specify/specs/in-progress/printing-spec.md · DATA_MODEL.md (v3.1)
--
-- La impresora consulta /api/cloudprnt/<token> por internet. Este archivo crea
-- la cola (print_jobs), las impresoras (printers), el trigger que encola al
-- aceptar/crear un pedido y los dos jobs de pg_cron (reintento y purga).
--
-- Seguridad:
--  - En prod las tablas nuevas de public reciben por default ALL para anon y
--    authenticated (pg_default_acl). Un `revoke select (col)` NO le gana a ese
--    grant de tabla: por eso acá se hace revoke all + grant select de columnas.
--  - Ningún cliente escribe estas tablas: todo pasa por server actions con
--    service role que validan dueño o tablet (API.md §2).
--  - El trigger sobre orders NUNCA puede romper un pedido: cualquier error se
--    traga con un warning (el pedido entra igual, solo no se encola el ticket).

-- ── FK compuestas: un job no puede apuntar a un pedido de otro restaurante ──
create unique index if not exists orders_id_restaurant_uidx
  on public.orders (id, restaurant_id);

-- ── printers ────────────────────────────────────────────────────────────────
create table if not exists public.printers (
  id               uuid primary key default gen_random_uuid(),
  restaurant_id    uuid not null references public.restaurants(id) on delete cascade,
  name             text not null default 'Counter',
  -- sha256 hex del token de la URL. El token en claro se muestra una sola vez.
  token_hash       text not null unique,
  mac_address      text,
  print_on         text not null default 'accepted' check (print_on in ('accepted','created')),
  copies           smallint not null default 1 check (copies between 1 and 3),
  order_types      text[] not null default '{delivery,pickup,dine_in}',
  is_active        boolean not null default true,
  last_poll_at     timestamptz,
  last_asb_status  text,
  last_client_info jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (id, restaurant_id)
);

create index if not exists printers_restaurant_idx on public.printers (restaurant_id);
-- NO unique: si dos impresoras reportan la misma MAC se loguea, no se rompe el poll.
create index if not exists printers_mac_idx on public.printers (mac_address);

-- ── print_jobs ──────────────────────────────────────────────────────────────
create table if not exists public.print_jobs (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null,
  printer_id    uuid not null,
  order_id      uuid,                       -- null en los tickets de prueba
  kind          text not null check (kind in ('order','reprint','test')),
  status        text not null default 'queued'
                check (status in ('queued','sent','printed','failed','cancelled')),
  not_before    timestamptz,                -- null = ya
  attempts      smallint not null default 0, -- solo sube al reclamar (queued → sent)
  copy_index    smallint not null default 1,
  media_type    text,
  error_code    text,
  requested_by  uuid,
  created_at    timestamptz not null default now(),
  sent_at       timestamptz,
  printed_at    timestamptz,
  foreign key (printer_id, restaurant_id)
    references public.printers (id, restaurant_id) on delete cascade,
  foreign key (order_id, restaurant_id)
    references public.orders (id, restaurant_id) on delete cascade
);

create index if not exists print_jobs_queue_idx on public.print_jobs
  (printer_id, coalesce(not_before, created_at), copy_index, id)
  where status in ('queued','sent');

-- Idempotencia: máximo un job automático por pedido, impresora y copia.
create unique index if not exists print_jobs_auto_once_idx
  on public.print_jobs (printer_id, order_id, copy_index) where kind = 'order';

create index if not exists print_jobs_order_idx on public.print_jobs (order_id);

-- ── RLS y permisos ──────────────────────────────────────────────────────────
alter table public.printers   enable row level security;
alter table public.print_jobs enable row level security;

revoke all on public.printers   from anon, authenticated;
revoke all on public.print_jobs from anon, authenticated;

-- token_hash queda fuera: ningún cliente lo puede leer.
grant select (id, restaurant_id, name, mac_address, print_on, copies, order_types,
              is_active, last_poll_at, last_asb_status, last_client_info,
              created_at, updated_at)
  on public.printers to authenticated;
grant select on public.print_jobs to authenticated;

drop policy if exists printers_owner_select on public.printers;
create policy printers_owner_select on public.printers
  for select to authenticated
  using (public.user_owns_restaurant(restaurant_id));

drop policy if exists print_jobs_owner_select on public.print_jobs;
create policy print_jobs_owner_select on public.print_jobs
  for select to authenticated
  using (public.user_owns_restaurant(restaurant_id));

-- ── Trigger: encolar al aceptar / crear, cancelar, reabrir ──────────────────
create or replace function public.enqueue_order_print()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- Pedido online sin cobrar: el Counter no lo muestra (isAwaitingOnlinePayment).
  awaiting_pay boolean := new.payment_method in ('online','wallet')
                          and new.payment_status is distinct from 'paid';
  is_accept boolean := tg_op = 'UPDATE'
                       and old.status = 'pending'
                       and new.status not in ('pending','cancelled');
  -- Online cobrado mientras sigue en pending: recién ahí "existe" para el restaurante.
  is_paid   boolean := tg_op = 'UPDATE'
                       and old.payment_status is distinct from 'paid'
                       and new.payment_status = 'paid'
                       and new.status = 'pending';
  is_create boolean;
  is_cancel boolean := tg_op = 'UPDATE'
                       and new.status = 'cancelled'
                       and old.status is distinct from 'cancelled';
  -- Deshacer un rechazo (undoOrderStatus en el KDS).
  is_reopen boolean := tg_op = 'UPDATE'
                       and old.status = 'cancelled'
                       and new.status <> 'cancelled';
begin
  is_create := (tg_op = 'INSERT' and not coalesce(awaiting_pay, false)) or is_paid;

  begin
    if is_create or is_accept then
      insert into public.print_jobs
        (restaurant_id, printer_id, order_id, kind, copy_index, not_before)
      select new.restaurant_id, p.id, new.id, 'order', c.i,
             case when is_create then now() + interval '5 seconds' end
      from public.printers p
      cross join lateral generate_series(1, p.copies) as c(i)
      where p.restaurant_id = new.restaurant_id
        and p.is_active
        and new.order_type = any (p.order_types)
        and ((p.print_on = 'created'  and is_create)
          or (p.print_on = 'accepted' and is_accept))
      on conflict do nothing;
    end if;

    if is_cancel then
      update public.print_jobs set status = 'cancelled'
      where order_id = new.id and status = 'queued';
    end if;

    -- Un job 'cancelled' puede venir de 'queued' (arriba) o de 'sent' (cron, y
    -- ese sí pudo imprimirse). Solo vuelve a la cola el que nunca se mandó.
    if is_reopen then
      update public.print_jobs set status = 'queued', not_before = null
      where order_id = new.id and kind = 'order' and status = 'cancelled'
        and sent_at is null;
    end if;
  exception when others then
    -- Un ticket que no se encola nunca puede tumbar un pedido.
    raise warning 'enqueue_order_print failed for order %: % (%)', new.id, sqlerrm, sqlstate;
  end;

  return new;
end $$;

revoke all on function public.enqueue_order_print() from public, anon, authenticated;

drop trigger if exists orders_enqueue_print on public.orders;
create trigger orders_enqueue_print
  after insert or update of status, payment_status on public.orders
  for each row execute function public.enqueue_order_print();

-- ── Mantenimiento (los llama pg_cron) ───────────────────────────────────────
-- Cada minuto: un job 'sent' sin confirmación en 120 s se resuelve. Solo toca
-- jobs 'sent' y un pedido cancelado nunca vuelve a 'queued' (los 'test' no
-- tienen pedido: el exists da false y siguen la regla de intentos).
create or replace function public.print_jobs_requeue()
returns integer
language sql
security definer
set search_path = ''
as $$
  with upd as (
    update public.print_jobs j
    set status = case
      when exists (select 1 from public.orders o
                   where o.id = j.order_id and o.status = 'cancelled') then 'cancelled'
      when j.attempts >= 3 then 'failed'
      else 'queued'
    end
    where j.status = 'sent'
      and j.sent_at < now() - interval '120 seconds'
    returning 1
  )
  select count(*)::integer from upd;
$$;

-- Diario: los datos de métricas se guardan 30 días.
create or replace function public.print_jobs_purge()
returns integer
language sql
security definer
set search_path = ''
as $$
  with del as (
    delete from public.print_jobs
    where status in ('printed','cancelled','failed')
      and created_at < now() - interval '30 days'
    returning 1
  )
  select count(*)::integer from del;
$$;

revoke all on function public.print_jobs_requeue() from public, anon, authenticated;
revoke all on function public.print_jobs_purge()   from public, anon, authenticated;

-- cron.schedule con un nombre existente lo actualiza (pg_cron >= 1.3; prod: 1.6.4).
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('print-jobs-requeue', '* * * * *',
                          'select public.print_jobs_requeue()');
    perform cron.schedule('print-jobs-purge', '17 9 * * *',
                          'select public.print_jobs_purge()');
  end if;
end $$;
