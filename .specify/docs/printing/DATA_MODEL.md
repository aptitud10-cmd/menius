# DATA_MODEL — Impresión (CloudPRNT) · v3

> Ubicación: `.specify/docs/printing/DATA_MODEL.md`
> Proyecto Supabase: `menius-prod` (`hdlhmqvbaxzhmhtablwt`)
> Verificado en prod (2026-11-14):
> - aceptar = `pending → preparing` (`order_status_history`)
> - `include_utensils` es la columna real (no `utensils`)
> - `order_type` nunca es null
> - `user_owns_restaurant()` es security definer
> - `pg_cron` y `pgcrypto` están instalados, pero no hay jobs de cron creados
> - triggers existentes en `orders`: `refund_loyalty`, `restore_stock`, `link_order_to_customer` (no chocan con el nuevo)

## 1. Tablas

### `printers`

| Columna | Tipo | Restricción |
|---|---|---|
| id | uuid | PK, default `gen_random_uuid()` |
| restaurant_id | uuid | NOT NULL, FK → restaurants ON DELETE CASCADE |
| name | text | NOT NULL, default `'Counter'` |
| token_hash | text | NOT NULL, UNIQUE (sha256 hex) |
| mac_address | text | NULL hasta el primer poll |
| print_on | text | NOT NULL, default `'accepted'`, CHECK in ('accepted','created') |
| copies | smallint | NOT NULL, default 1, CHECK between 1 and 3 |
| order_types | text[] | NOT NULL, default `'{delivery,pickup,dine_in}'` |
| is_active | boolean | NOT NULL, default true |
| last_poll_at | timestamptz | |
| last_asb_status | text | |
| last_client_info | jsonb | |
| created_at / updated_at | timestamptz | NOT NULL, default now() |

UNIQUE (`id`, `restaurant_id`) — para la FK compuesta.

### `print_jobs`

| Columna | Tipo | Restricción |
|---|---|---|
| id | uuid | PK |
| restaurant_id | uuid | NOT NULL |
| printer_id | uuid | NOT NULL |
| order_id | uuid | NULL (test) |
| kind | text | NOT NULL, CHECK in ('order','reprint','test') |
| status | text | NOT NULL, default `'queued'`, CHECK in ('queued','sent','printed','failed','cancelled') |
| not_before | timestamptz | NULL = ya |
| attempts | smallint | NOT NULL, default 0 — **solo se incrementa al reclamar el job (queued → sent)** |
| copy_index | smallint | NOT NULL, default 1 |
| media_type, error_code | text | |
| requested_by | uuid | |
| created_at | timestamptz | NOT NULL, default now() |
| sent_at, printed_at | timestamptz | |

**FKs compuestas (anti fuga entre tenants):**
```sql
foreign key (printer_id, restaurant_id) references printers (id, restaurant_id) on delete cascade,
foreign key (order_id, restaurant_id)   references orders (id, restaurant_id)   on delete cascade
-- requiere: create unique index orders_id_restaurant_uidx on orders (id, restaurant_id);
```

## 2. Índices

```sql
create index print_jobs_queue_idx on print_jobs
  (printer_id, coalesce(not_before, created_at), copy_index, id)
  where status in ('queued','sent');

create unique index print_jobs_auto_once_idx
  on print_jobs (printer_id, order_id, copy_index) where kind = 'order';

create index printers_restaurant_idx on printers (restaurant_id);
create index printers_mac_idx on printers (mac_address);   -- NO unique: se loguea el choque, no se rompe el poll
create index print_jobs_order_idx on print_jobs (order_id);
```

## 3. Trigger

```sql
create or replace function enqueue_order_print() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  is_accept boolean := tg_op = 'UPDATE'
                       and old.status = 'pending'
                       and new.status not in ('pending','cancelled');
  is_cancel boolean := tg_op = 'UPDATE'
                       and new.status = 'cancelled'
                       and old.status is distinct from 'cancelled';
begin
  if tg_op = 'INSERT' or is_accept then
    insert into print_jobs (restaurant_id, printer_id, order_id, kind, copy_index, not_before)
    select new.restaurant_id, p.id, new.id, 'order', c.i,
           case when tg_op = 'INSERT' then now() + interval '5 seconds' end
    from printers p
    cross join lateral generate_series(1, p.copies) as c(i)
    where p.restaurant_id = new.restaurant_id
      and p.is_active
      and new.order_type = any (p.order_types)
      and ((p.print_on = 'created'  and tg_op = 'INSERT')
        or (p.print_on = 'accepted' and is_accept))
    on conflict do nothing;
  end if;

  if is_cancel then
    update print_jobs set status = 'cancelled'
    where order_id = new.id and status = 'queued';
  end if;

  return new;
end $$;

create trigger orders_enqueue_print
  after insert or update of status on orders
  for each row execute function enqueue_order_print();
```

> Nota: si un pedido cancelado se reabre y se acepta otra vez, no reimprime solo, porque el índice de idempotencia ya está ocupado. Para ese caso está Reimprimir. Es aceptable.

## 4. RLS y permisos

```sql
alter table printers enable row level security;
alter table print_jobs enable row level security;

create policy printers_owner_all on printers for all
  using (user_owns_restaurant(restaurant_id))
  with check (user_owns_restaurant(restaurant_id));

-- token_hash: invisible para cualquier cliente
revoke select (token_hash) on printers from anon, authenticated;
-- (si el grant de tabla lo reintroduce: revoke select on printers + grant select (cols explícitas) to authenticated)

create policy print_jobs_owner_select on print_jobs for select
  using (user_owns_restaurant(restaurant_id));
-- SIN policy de INSERT/UPDATE/DELETE para clientes:
-- reprint y test se crean solo vía server actions con service role,
-- que validan dueño o sesión de dispositivo + que el pedido y la impresora sean del mismo restaurante.
```

## 5. `pg_cron` (crear el job; hoy no existe ninguno)

```sql
-- cada minuto
update print_jobs j
set status = case
  when exists (select 1 from orders o where o.id = j.order_id and o.status = 'cancelled') then 'cancelled'
  when j.attempts >= 3 then 'failed'
  else 'queued'
end
where j.status = 'sent'
  and j.sent_at < now() - interval '120 seconds';

-- diario
delete from print_jobs where status in ('printed','cancelled','failed') and created_at < now() - interval '30 days';
```

Regla: **solo se tocan jobs `sent`, y un pedido cancelado nunca vuelve a `queued`** (incluye los jobs `test`, que no tienen `order_id`).
