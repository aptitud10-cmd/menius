-- Feature: dine_in_only products (e.g. alcohol) that can only be ordered for dine-in.
-- Enforced server-side in /api/orders (delivery/pickup are rejected).
-- Default false => existing products keep their current behavior.

alter table products
  add column if not exists dine_in_only boolean not null default false;

comment on column products.dine_in_only is
  'When true, this product can only be ordered for dine-in (e.g. alcohol). Enforced in /api/orders.';
