-- APLICADA A PROD 2026-08-06 vía MCP (migración inmutable — no editar)
-- El UNIQUE (restaurant_id, order_id) bloqueaba el earn en cualquier orden que
-- ya tuviera una fila redeem: el cliente que canjeaba puntos no acumulaba nunca
-- más. La idempotencia es por (orden, tipo), no por orden.
ALTER TABLE loyalty_transactions
  DROP CONSTRAINT IF EXISTS loyalty_transactions_restaurant_order_key;

CREATE UNIQUE INDEX IF NOT EXISTS loyalty_tx_earn_once
  ON loyalty_transactions (restaurant_id, order_id)
  WHERE type = 'earn' AND order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS loyalty_tx_redeem_once
  ON loyalty_transactions (restaurant_id, order_id)
  WHERE type = 'redeem' AND order_id IS NOT NULL;
