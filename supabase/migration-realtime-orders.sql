-- Enable Supabase Realtime for the orders table
-- Without this, WebSocket subscriptions (postgres_changes) on 'orders'
-- never fire — the customer tracker falls back to 15-second polling only.
-- With this, any status change or driver GPS update propagates instantly.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'orders'
  ) then
    execute 'alter publication supabase_realtime add table orders';
    raise notice 'orders added to supabase_realtime publication';
  else
    raise notice 'orders already in supabase_realtime — no change needed';
  end if;
end$$;
