-- Cost price per modifier option.
--
-- `products.cost_price` already drives the margin readout in the product
-- editor, but a burger with a $2 bacon add-on has a different contribution
-- margin than the base item. Without a cost on the option itself, every
-- add-on is implicitly treated as pure profit and the reported margin is wrong
-- for exactly the items that get customized the most.
--
-- NULL means "not tracked" — the margin calculation ignores those options
-- instead of assuming a zero cost, so an untracked add-on never inflates the
-- margin. This is a no-op for every existing row.

alter table modifier_options
  add column if not exists cost_price numeric default null;

comment on column modifier_options.cost_price is
  'Actual cost of this add-on, used for true margin. NULL = not tracked (excluded from margin math rather than counted as free).';
