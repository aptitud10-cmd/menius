-- Un navegador puede seguir VARIOS pedidos a la vez (antes: endpoint único →
-- cada pedido nuevo le quitaba los avisos al anterior).
-- Unicidad por (pedido, navegador) en vez de solo por navegador.
alter table public.push_subscriptions drop constraint if exists push_subscriptions_endpoint_key;
alter table public.push_subscriptions drop constraint if exists push_subscriptions_order_endpoint;
alter table public.push_subscriptions add constraint push_subscriptions_order_endpoint unique (order_id, endpoint);
