-- Order numbers were reused (7 duplicate (restaurant_id, order_number) pairs in prod).
--
-- generate_order_number(rest_id) computed COUNT(*)+1 of today's orders. Two ways
-- that repeats a number:
--   1. The advisory lock is released when the RPC's transaction ends, BEFORE the
--      API inserts the order, so two concurrent requests can read the same count.
--   2. The API's rollback paths DELETE a failed order; the count drops and the
--      next order gets a number that already exists (001,002,003 → delete 002 →
--      next is 003 again).
-- And nothing enforced uniqueness, so the tracker's .eq('order_number').maybeSingle()
-- could error or open the wrong order.
--
-- Fix: a per-restaurant, per-local-day counter row incremented atomically with
-- INSERT … ON CONFLICT DO UPDATE … RETURNING. Numbers are never reused, even if
-- an order is deleted afterwards. A unique index makes any future regression
-- fail loudly instead of silently colliding.

-- 1. Counter table (service role only; never exposed to clients).
create table if not exists public.order_number_counters (
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  day date not null,
  last_value integer not null,
  primary key (restaurant_id, day)
);
alter table public.order_number_counters enable row level security;
-- No policies on purpose: only the service role (which bypasses RLS) touches it.

-- 2. Same signature and format as before ('ORD-YYMMDD-NNN'), so callers don't change.
create or replace function public.generate_order_number(rest_id uuid)
returns text
language plpgsql
set search_path to ''
as $function$
declare
  rest_tz   text;
  now_local timestamp;
  today     date;
  today_str text;
  n         integer;
begin
  select coalesce(timezone, 'UTC') into rest_tz
    from public.restaurants where id = rest_id;

  now_local := (now() at time zone coalesce(rest_tz, 'UTC'))::timestamp;
  today     := now_local::date;
  today_str := to_char(now_local, 'YYMMDD');

  -- First order of the day seeds from the highest number already used today
  -- (orders created before this migration), so the switch-over can't collide.
  insert into public.order_number_counters as c (restaurant_id, day, last_value)
  values (
    rest_id,
    today,
    coalesce((
      select max(substring(o.order_number from '-(\d+)$')::int)
        from public.orders o
       where o.restaurant_id = rest_id
         and o.order_number like 'ORD-' || today_str || '-%'
    ), 0) + 1
  )
  on conflict (restaurant_id, day)
  do update set last_value = c.last_value + 1
  returning c.last_value into n;

  return 'ORD-' || today_str || '-' || lpad(n::text, 3, '0');
end;
$function$;

-- 3. Rename the existing duplicates (all old test orders, Mar–Aug 2026) so the
--    unique index can be created: keep the oldest as-is, suffix the rest -B, -C…
with d as (
  select id,
         row_number() over (partition by restaurant_id, order_number order by created_at, id) as rn
    from public.orders
)
update public.orders o
   set order_number = o.order_number || '-' || chr((64 + d.rn)::int)   -- 2 → B, 3 → C
  from d
 where d.id = o.id and d.rn > 1;

-- 4. Enforce it.
create unique index if not exists orders_restaurant_order_number_key
  on public.orders (restaurant_id, order_number);
