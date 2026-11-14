-- Tests de la migración 20261114_printing_cloudprnt.sql (Sprint 1 · TASKS.md).
--
-- Requiere la migración ya aplicada. Todo corre dentro de BEGIN … ROLLBACK:
-- no deja filas. Si un caso falla, ASSERT corta con el mensaje del caso.
-- Al final imprime 'ALL PRINTING TESTS PASSED'.
--
-- Se corre como postgres (SQL editor / MCP execute_sql) o con el harness local
-- supabase/tests/run-printing-tests.mjs (PGlite, sin tocar ninguna base real).

begin;

-- ── Fixtures ────────────────────────────────────────────────────────────────
-- u1 es dueño de A (imprime al aceptar), B (imprime al crear) y D (para filtros).
-- u2 es dueño de C (el otro tenant del test de RLS).
insert into auth.users (id) values
  ('00000000-0000-4000-8000-0000000000a1'),
  ('00000000-0000-4000-8000-0000000000a2');

insert into public.restaurants (id, name, slug, owner_user_id) values
  ('00000000-0000-4000-8000-00000000000a', 'Print Test A', 'zz-print-test-a', '00000000-0000-4000-8000-0000000000a1'),
  ('00000000-0000-4000-8000-00000000000b', 'Print Test B', 'zz-print-test-b', '00000000-0000-4000-8000-0000000000a1'),
  ('00000000-0000-4000-8000-00000000000c', 'Print Test C', 'zz-print-test-c', '00000000-0000-4000-8000-0000000000a2'),
  ('00000000-0000-4000-8000-00000000000d', 'Print Test D', 'zz-print-test-d', '00000000-0000-4000-8000-0000000000a1');

insert into public.printers (id, restaurant_id, token_hash, print_on) values
  ('00000000-0000-4000-8000-0000000000fa', '00000000-0000-4000-8000-00000000000a', 'hash-a', 'accepted'),
  ('00000000-0000-4000-8000-0000000000fb', '00000000-0000-4000-8000-00000000000b', 'hash-b', 'created'),
  ('00000000-0000-4000-8000-0000000000fc', '00000000-0000-4000-8000-00000000000c', 'hash-c', 'accepted'),
  ('00000000-0000-4000-8000-0000000000fd', '00000000-0000-4000-8000-00000000000d', 'hash-d', 'accepted');

create function pg_temp.new_order(rid uuid, num text, otype text default 'pickup',
                                  pmethod text default 'cash')
returns uuid language sql as $$
  insert into public.orders (restaurant_id, order_number, order_type, payment_method)
  values (rid, num, otype, pmethod)
  returning id;
$$;

create function pg_temp.jobs(oid_ uuid, st text default null)
returns integer language sql as $$
  select count(*)::integer from public.print_jobs
  where order_id = oid_ and (st is null or status = st);
$$;

-- ── Trigger: print_on = 'accepted' ─────────────────────────────────────────
do $$
declare o uuid; n uuid;
begin
  o := pg_temp.new_order('00000000-0000-4000-8000-00000000000a', 'ZZ-A-001');
  assert pg_temp.jobs(o) = 0, 'accepted: crear un pedido no encola';

  update public.orders set status = 'preparing' where id = o;
  assert pg_temp.jobs(o, 'queued') = 1, 'accepted: pending → preparing (Counter) encola 1 job';
  assert (select not_before is null from public.print_jobs where order_id = o),
         'accepted: el job de aceptar sale ya (not_before null)';

  update public.orders set status = 'ready' where id = o;
  update public.orders set status = 'delivered' where id = o;
  update public.orders set notes = 'cambio cualquiera' where id = o;
  assert pg_temp.jobs(o) = 1, 'ready/delivered/otros updates no encolan de nuevo (CA-2)';

  n := pg_temp.new_order('00000000-0000-4000-8000-00000000000a', 'ZZ-A-002');
  update public.orders set status = 'confirmed' where id = n;
  assert pg_temp.jobs(n, 'queued') = 1, 'accepted: pending → confirmed (panel web) encola 1 job';
end $$;

-- Deshacer la aceptación y volver a aceptar: sigue habiendo 1 solo job.
do $$
declare o uuid;
begin
  o := pg_temp.new_order('00000000-0000-4000-8000-00000000000a', 'ZZ-A-003');
  update public.orders set status = 'preparing' where id = o;
  update public.orders set status = 'pending'   where id = o;
  update public.orders set status = 'preparing' where id = o;
  assert pg_temp.jobs(o) = 1, 'idempotencia: aceptar dos veces = 1 job';
end $$;

-- ── Cancelación y reapertura ────────────────────────────────────────────────
do $$
declare o uuid; s uuid;
begin
  o := pg_temp.new_order('00000000-0000-4000-8000-00000000000a', 'ZZ-A-010');
  update public.orders set status = 'preparing' where id = o;
  update public.orders set status = 'cancelled' where id = o;
  assert pg_temp.jobs(o, 'cancelled') = 1, 'cancelar con el job en cola → cancelled (F8)';

  update public.orders set status = 'preparing' where id = o;  -- undo del KDS
  assert pg_temp.jobs(o, 'queued') = 1, 'reabrir: un job que nunca se mandó vuelve a queued';
  assert pg_temp.jobs(o) = 1, 'reabrir: no crea un job nuevo';

  -- Job que se mandó y el cron cerró como cancelled (pudo imprimirse).
  s := pg_temp.new_order('00000000-0000-4000-8000-00000000000a', 'ZZ-A-011');
  update public.orders set status = 'preparing' where id = s;
  update public.print_jobs set status = 'sent', attempts = 1,
         sent_at = now() - interval '5 minutes'
  where order_id = s;
  update public.orders set status = 'cancelled' where id = s;
  assert pg_temp.jobs(s, 'sent') = 1, 'cancelar no toca un job sent (lo resuelve el cron)';
  perform public.print_jobs_requeue();
  assert pg_temp.jobs(s, 'cancelled') = 1, 'cron: sent de un pedido cancelado → cancelled (CA-5)';
  update public.orders set status = 'preparing' where id = s;
  assert pg_temp.jobs(s, 'cancelled') = 1, 'reabrir: un job que se mandó (sent_at no null) sigue cancelled';
end $$;

-- ── Trigger: print_on = 'created' ──────────────────────────────────────────
do $$
declare o uuid; w uuid;
begin
  o := pg_temp.new_order('00000000-0000-4000-8000-00000000000b', 'ZZ-B-001');
  assert pg_temp.jobs(o, 'queued') = 1, 'created: un pedido en efectivo encola al crearse';
  assert (select not_before = now() + interval '5 seconds' from public.print_jobs where order_id = o),
         'created: not_before = now() + 5 s';
  update public.orders set status = 'preparing' where id = o;
  assert pg_temp.jobs(o) = 1, 'created: aceptar después no encola otro';

  w := pg_temp.new_order('00000000-0000-4000-8000-00000000000b', 'ZZ-B-002', 'pickup', 'online');
  assert pg_temp.jobs(w) = 0, 'created: online sin cobrar no encola';
  update public.orders set payment_status = 'paid' where id = w;
  assert pg_temp.jobs(w, 'queued') = 1, 'created: al pasar a paid encola 1 job';
  update public.orders set payment_status = 'paid', status = 'preparing' where id = w;
  assert pg_temp.jobs(w) = 1, 'created: aceptar un online ya cobrado no duplica';
end $$;

-- ── Filtros de la impresora ─────────────────────────────────────────────────
do $$
declare o uuid;
begin
  update public.printers set order_types = '{delivery}' where id = '00000000-0000-4000-8000-0000000000fd';
  o := pg_temp.new_order('00000000-0000-4000-8000-00000000000d', 'ZZ-D-001', 'pickup');
  update public.orders set status = 'preparing' where id = o;
  assert pg_temp.jobs(o) = 0, 'order_types: un pickup no imprime en una impresora solo-delivery';

  update public.printers set order_types = '{delivery,pickup,dine_in}', is_active = false
  where id = '00000000-0000-4000-8000-0000000000fd';
  o := pg_temp.new_order('00000000-0000-4000-8000-00000000000d', 'ZZ-D-002');
  update public.orders set status = 'preparing' where id = o;
  assert pg_temp.jobs(o) = 0, 'is_active = false no imprime';

  update public.printers set is_active = true, copies = 2
  where id = '00000000-0000-4000-8000-0000000000fd';
  o := pg_temp.new_order('00000000-0000-4000-8000-00000000000d', 'ZZ-D-003');
  update public.orders set status = 'preparing' where id = o;
  assert pg_temp.jobs(o) = 2, 'copies = 2 encola 2 jobs (copy_index 1 y 2)';
end $$;

-- ── Cron de reintento ───────────────────────────────────────────────────────
do $$
declare o1 uuid; o2 uuid; o3 uuid; o4 uuid;
begin
  o1 := pg_temp.new_order('00000000-0000-4000-8000-00000000000a', 'ZZ-A-020');
  o2 := pg_temp.new_order('00000000-0000-4000-8000-00000000000a', 'ZZ-A-021');
  o3 := pg_temp.new_order('00000000-0000-4000-8000-00000000000a', 'ZZ-A-022');
  o4 := pg_temp.new_order('00000000-0000-4000-8000-00000000000a', 'ZZ-A-023');
  update public.orders set status = 'preparing' where id in (o1, o2, o3, o4);

  update public.print_jobs set status = 'sent', attempts = 1, sent_at = now() - interval '5 minutes' where order_id = o1;
  update public.print_jobs set status = 'sent', attempts = 3, sent_at = now() - interval '5 minutes' where order_id = o2;
  update public.print_jobs set status = 'sent', attempts = 1, sent_at = now() - interval '30 seconds' where order_id = o3;
  -- o4 queda queued

  perform public.print_jobs_requeue();
  assert pg_temp.jobs(o1, 'queued') = 1, 'cron: sent > 120 s con < 3 intentos → queued';
  assert pg_temp.jobs(o2, 'failed') = 1, 'cron: sent > 120 s con 3 intentos → failed';
  assert pg_temp.jobs(o3, 'sent')   = 1, 'cron: sent hace < 120 s no se toca';
  assert pg_temp.jobs(o4, 'queued') = 1, 'cron: queued no se toca';
end $$;

-- ── Purga ───────────────────────────────────────────────────────────────────
do $$
declare viejo uuid; nuevo uuid;
begin
  insert into public.print_jobs (restaurant_id, printer_id, kind, status, created_at)
  values ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000000fa',
          'test', 'printed', now() - interval '31 days')
  returning id into viejo;
  insert into public.print_jobs (restaurant_id, printer_id, kind, status, created_at)
  values ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000000fa',
          'test', 'printed', now() - interval '29 days')
  returning id into nuevo;
  perform public.print_jobs_purge();
  assert not exists (select 1 from public.print_jobs where id = viejo), 'purga: borra lo terminado de > 30 días';
  assert exists (select 1 from public.print_jobs where id = nuevo), 'purga: deja lo de < 30 días';
end $$;

-- ── FK compuestas: nada cruza de restaurante ────────────────────────────────
do $$
declare o uuid;
begin
  o := pg_temp.new_order('00000000-0000-4000-8000-00000000000a', 'ZZ-A-030');
  begin
    insert into public.print_jobs (restaurant_id, printer_id, order_id, kind)
    values ('00000000-0000-4000-8000-00000000000c', '00000000-0000-4000-8000-0000000000fc', o, 'reprint');
    assert false, 'FK: un job de C no puede apuntar a un pedido de A';
  exception when foreign_key_violation then null;
  end;
  begin
    insert into public.print_jobs (restaurant_id, printer_id, order_id, kind)
    values ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000000fc', o, 'reprint');
    assert false, 'FK: un job de A no puede usar la impresora de C';
  exception when foreign_key_violation then null;
  end;
end $$;

-- ── El trigger nunca rompe un pedido ────────────────────────────────────────
-- Se fuerza un error en el insert del job: el pedido se acepta igual.
alter table public.print_jobs add constraint zz_force_fail check (false) not valid;
do $$
declare o uuid;
begin
  o := pg_temp.new_order('00000000-0000-4000-8000-00000000000a', 'ZZ-A-040');
  update public.orders set status = 'preparing' where id = o;
  assert (select status from public.orders where id = o) = 'preparing',
         'si encolar falla, el pedido se acepta igual';
  assert pg_temp.jobs(o) = 0, 'si encolar falla, no queda job a medias';
end $$;
alter table public.print_jobs drop constraint zz_force_fail;

-- ── RLS: dos tenants (CA-7) ─────────────────────────────────────────────────
-- Jobs en C (de u2) para que haya algo que NO se debe ver.
do $$
declare o uuid;
begin
  o := pg_temp.new_order('00000000-0000-4000-8000-00000000000c', 'ZZ-C-001');
  update public.orders set status = 'preparing' where id = o;
  assert pg_temp.jobs(o) = 1, 'fixture RLS: C tiene un job';
end $$;

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;

do $$
begin
  assert (select count(*) from public.print_jobs
          where restaurant_id = '00000000-0000-4000-8000-00000000000c') = 0,
         'RLS: u1 no ve los jobs de C';
  assert (select count(*) from public.print_jobs
          where restaurant_id = '00000000-0000-4000-8000-00000000000a') > 0,
         'RLS: u1 ve los jobs de A';
  assert (select count(*) from public.printers) = 3, 'RLS: u1 ve solo sus 3 impresoras (A, B, D)';
  assert (select count(*) from public.printers
          where id = '00000000-0000-4000-8000-0000000000fc') = 0, 'RLS: u1 no ve la impresora de C';

  begin
    perform token_hash from public.printers limit 1;
    assert false, 'token_hash no se puede leer desde el cliente';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.print_jobs (restaurant_id, printer_id, kind)
    values ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000000fa', 'test');
    assert false, 'el cliente no puede encolar jobs';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.printers set is_active = false where id = '00000000-0000-4000-8000-0000000000fa';
    assert false, 'el cliente no puede modificar impresoras';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
set local role anon;
do $$
begin
  begin
    perform 1 from public.print_jobs limit 1;
    assert false, 'anon no puede leer print_jobs';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.printers limit 1;
    assert false, 'anon no puede leer printers';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

select 'ALL PRINTING TESTS PASSED' as result;

rollback;
