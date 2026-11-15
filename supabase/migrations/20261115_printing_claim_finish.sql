-- CloudPRNT: reclamo y cierre atómicos de un job (Sprint 3 · API.md §1.2 y §1.3).
--
-- supabase-js no puede hacer "attempts = attempts + 1 si estaba queued" ni
-- "no si el pedido está cancelado" en un solo UPDATE: por eso son funciones.
-- Solo service_role las ejecuta (el endpoint /api/cloudprnt usa admin client).

-- GET del job: queued/sent → sent. Suma un intento solo si venía de queued
-- (un GET repetido del mismo job no cuenta como intento nuevo). Nunca reclama
-- un job de un pedido cancelado. Devuelve la fila o nada.
create or replace function public.claim_print_job(p_job uuid, p_printer uuid, p_media_type text)
returns setof public.print_jobs
language sql
security definer
set search_path = ''
as $$
  update public.print_jobs j
     set status     = 'sent',
         sent_at    = now(),
         attempts   = j.attempts + case when j.status = 'queued' then 1 else 0 end,
         media_type = p_media_type
   where j.id = p_job
     and j.printer_id = p_printer
     and j.status in ('queued', 'sent')
     and (j.not_before is null or j.not_before <= now())
     and not exists (select 1 from public.orders o
                     where o.id = j.order_id and o.status = 'cancelled')
  returning j.*;
$$;

-- DELETE de confirmación. code que empieza con "2" → printed. Otro código →
-- queued si quedan intentos y el pedido no está cancelado; si no, failed
-- (o cancelled si el pedido se canceló). Solo toca jobs 'sent'.
-- Devuelve el estado final, o null si el job no estaba 'sent' para esa impresora.
create or replace function public.finish_print_job(p_job uuid, p_printer uuid, p_code text)
returns text
language sql
security definer
set search_path = ''
as $$
  update public.print_jobs j
     set status = case
           when left(coalesce(p_code, ''), 1) = '2' then 'printed'
           when exists (select 1 from public.orders o
                        where o.id = j.order_id and o.status = 'cancelled') then 'cancelled'
           when j.attempts < 3 then 'queued'
           else 'failed'
         end,
         printed_at = case when left(coalesce(p_code, ''), 1) = '2' then now() else j.printed_at end,
         error_code = case when left(coalesce(p_code, ''), 1) = '2' then j.error_code else left(p_code, 32) end
   where j.id = p_job
     and j.printer_id = p_printer
     and j.status = 'sent'
  returning j.status;
$$;

revoke all on function public.claim_print_job(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.finish_print_job(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.claim_print_job(uuid, uuid, text) to service_role;
grant execute on function public.finish_print_job(uuid, uuid, text) to service_role;
