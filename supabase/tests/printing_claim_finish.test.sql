-- Tests de 20261115_printing_claim_finish.sql (Sprint 3). Requiere las dos
-- migraciones de impresión aplicadas. Todo en BEGIN … ROLLBACK.
-- Al final: 'ALL CLAIM/FINISH TESTS PASSED'.

begin;

insert into auth.users (id) values ('00000000-0000-4000-8000-0000000000b1');
insert into public.restaurants (id, name, slug, owner_user_id) values
  ('00000000-0000-4000-8000-0000000000ba', 'Claim Test A', 'zz-claim-test-a', '00000000-0000-4000-8000-0000000000b1');
insert into public.printers (id, restaurant_id, token_hash) values
  ('00000000-0000-4000-8000-0000000000e1', '00000000-0000-4000-8000-0000000000ba', 'hash-claim-1'),
  ('00000000-0000-4000-8000-0000000000e2', '00000000-0000-4000-8000-0000000000ba', 'hash-claim-2');

create function pg_temp.accepted_job(num text) returns uuid language plpgsql as $$
declare o uuid; j uuid;
begin
  insert into public.orders (restaurant_id, order_number, order_type, payment_method)
  values ('00000000-0000-4000-8000-0000000000ba', num, 'pickup', 'cash') returning id into o;
  update public.orders set status = 'preparing' where id = o;
  -- La impresora 2 está activa también: nos quedamos con el job de la 1.
  select id into j from public.print_jobs
  where order_id = o and printer_id = '00000000-0000-4000-8000-0000000000e1';
  return j;
end $$;

create function pg_temp.st(j uuid) returns text language sql as $$
  select status from public.print_jobs where id = j;
$$;

do $$
declare j uuid; r public.print_jobs;
begin
  j := pg_temp.accepted_job('ZZ-CL-001');

  -- Otra impresora no puede reclamar el job.
  assert not exists (select 1 from public.claim_print_job(j, '00000000-0000-4000-8000-0000000000e2', 'image/png')),
         'claim: otra impresora no reclama el job';

  select * into r from public.claim_print_job(j, '00000000-0000-4000-8000-0000000000e1', 'image/png');
  assert r.status = 'sent' and r.attempts = 1 and r.media_type = 'image/png' and r.sent_at is not null,
         'claim: queued → sent, attempts 1';

  -- GET repetido del mismo job: sigue sent y NO suma intento.
  select * into r from public.claim_print_job(j, '00000000-0000-4000-8000-0000000000e1', 'image/png');
  assert r.status = 'sent' and r.attempts = 1, 'claim: GET repetido no suma intento';

  -- DELETE con 200 OK → printed.
  assert public.finish_print_job(j, '00000000-0000-4000-8000-0000000000e1', '200 OK') = 'printed',
         'finish: 2xx → printed';
  assert (select printed_at is not null from public.print_jobs where id = j), 'finish: printed_at';
  -- Un printed no se puede volver a reclamar ni cerrar.
  assert not exists (select 1 from public.claim_print_job(j, '00000000-0000-4000-8000-0000000000e1', 'image/png')),
         'claim: un printed no se reclama';
  assert public.finish_print_job(j, '00000000-0000-4000-8000-0000000000e1', '200') is null,
         'finish: un printed no se toca';
end $$;

-- Error de impresora: vuelve a la cola mientras queden intentos; al 3.º, failed.
do $$
declare j uuid;
begin
  j := pg_temp.accepted_job('ZZ-CL-002');
  perform public.claim_print_job(j, '00000000-0000-4000-8000-0000000000e1', 'image/png');
  assert public.finish_print_job(j, '00000000-0000-4000-8000-0000000000e1', '520') = 'queued', 'finish: error con 1 intento → queued';
  assert (select error_code from public.print_jobs where id = j) = '520', 'finish: guarda el código';
  perform public.claim_print_job(j, '00000000-0000-4000-8000-0000000000e1', 'image/png');
  assert public.finish_print_job(j, '00000000-0000-4000-8000-0000000000e1', '410') = 'queued', 'finish: error con 2 intentos → queued';
  perform public.claim_print_job(j, '00000000-0000-4000-8000-0000000000e1', 'image/png');
  assert (select attempts from public.print_jobs where id = j) = 3, 'claim: 3 intentos';
  assert public.finish_print_job(j, '00000000-0000-4000-8000-0000000000e1', '410') = 'failed', 'finish: 3 intentos → failed';
end $$;

-- Carrera "cancelar durante el GET" (Sprint 3 / CA-5).
do $$
declare j uuid; o uuid;
begin
  -- a) Cancelado ANTES del GET: el claim no devuelve nada y el job queda cancelled.
  j := pg_temp.accepted_job('ZZ-CL-003');
  select order_id into o from public.print_jobs where id = j;
  update public.orders set status = 'cancelled' where id = o;
  assert not exists (select 1 from public.claim_print_job(j, '00000000-0000-4000-8000-0000000000e1', 'image/png')),
         'claim: pedido cancelado → no se reclama';
  assert pg_temp.st(j) = 'cancelled', 'claim: el job sigue cancelled';

  -- b) Cancelado DESPUÉS del claim (la impresora ya bajó el ticket) y la
  --    impresora reporta error: no vuelve a la cola.
  j := pg_temp.accepted_job('ZZ-CL-004');
  select order_id into o from public.print_jobs where id = j;
  perform public.claim_print_job(j, '00000000-0000-4000-8000-0000000000e1', 'image/png');
  update public.orders set status = 'cancelled' where id = o;
  assert pg_temp.st(j) = 'sent', 'cancelar no toca un job sent';
  -- La impresora reintenta el GET (timeout de red) después de la cancelación: no se lo damos.
  assert not exists (select 1 from public.claim_print_job(j, '00000000-0000-4000-8000-0000000000e1', 'image/png')),
         'claim: un GET repetido de un pedido ya cancelado no se entrega';
  assert public.finish_print_job(j, '00000000-0000-4000-8000-0000000000e1', '500') = 'cancelled',
         'finish: error de un pedido cancelado → cancelled, nunca queued';
end $$;

-- not_before: un job de print_on='created' no se reclama antes de tiempo.
do $$
declare j uuid;
begin
  j := pg_temp.accepted_job('ZZ-CL-005');
  update public.print_jobs set not_before = now() + interval '1 minute' where id = j;
  assert not exists (select 1 from public.claim_print_job(j, '00000000-0000-4000-8000-0000000000e1', 'image/png')),
         'claim: respeta not_before';
end $$;

-- Ticket de prueba (sin pedido): se reclama y se cierra igual.
do $$
declare j uuid;
begin
  insert into public.print_jobs (restaurant_id, printer_id, kind)
  values ('00000000-0000-4000-8000-0000000000ba', '00000000-0000-4000-8000-0000000000e1', 'test')
  returning id into j;
  assert exists (select 1 from public.claim_print_job(j, '00000000-0000-4000-8000-0000000000e1', 'image/png')),
         'claim: ticket de prueba';
  assert public.finish_print_job(j, '00000000-0000-4000-8000-0000000000e1', '200 OK') = 'printed', 'finish: ticket de prueba';
end $$;

-- Permisos: ni anon ni authenticated pueden llamarlas.
set local role authenticated;
do $$
begin
  begin
    perform public.claim_print_job(gen_random_uuid(), gen_random_uuid(), 'image/png');
    assert false, 'authenticated no puede reclamar jobs';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.finish_print_job(gen_random_uuid(), gen_random_uuid(), '200');
    assert false, 'authenticated no puede cerrar jobs';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

select 'ALL CLAIM/FINISH TESTS PASSED' as result;

rollback;
