-- Fix: allow anon users to SELECT orders so Supabase Realtime WebSocket works.
--
-- The existing policy uses request headers (x-order-id) which works for REST
-- calls but NOT for WebSocket subscriptions — Realtime can't read HTTP headers.
-- Without this, the customer tracker falls back to 15s polling forever.
--
-- Safety: order IDs are random UUIDs (unguessable). The customer already knows
-- their order ID from the initial API call. Realtime filter `id=eq.{uuid}`
-- ensures they only receive events for that specific order.

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'orders'
      and policyname = 'anon_realtime_orders'
  ) then
    execute $p$
      create policy "anon_realtime_orders"
      on orders
      for select
      to anon
      using (true)
    $p$;
    raise notice 'anon_realtime_orders policy created';
  else
    raise notice 'anon_realtime_orders already exists — no change needed';
  end if;
end$$;
