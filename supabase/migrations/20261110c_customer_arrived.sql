-- Pickup: el cliente toca "Ya llegué" en su seguimiento y la tablet del
-- mostrador lo avisa (Domino's Carside, Chick-fil-A, Olo).
alter table public.orders add column if not exists customer_arrived_at timestamptz;
