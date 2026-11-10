-- Un navegador puede seguir VARIOS pedidos a la vez (antes: endpoint único →
-- cada pedido nuevo le quitaba los avisos al anterior).
-- El índice único (order_id, endpoint) ya existe en prod; solo sobra la
-- restricción por endpoint.
alter table public.push_subscriptions drop constraint if exists push_subscriptions_endpoint_key;
create unique index if not exists push_subscriptions_order_endpoint on public.push_subscriptions (order_id, endpoint);
