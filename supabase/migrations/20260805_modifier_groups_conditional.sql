-- Conditional modifier groups: show a group only when a specific option of
-- another group is selected.
--
-- Buccaneer's burgers carry both "Style" (Regular / Deluxe) and a required
-- "Choice of Side". A Regular comes with no side at all, yet the customer was
-- still forced to pick one — and picking a premium side charged them $1.50 for
-- food they would never receive.
--
-- NULL means "always visible", so this is a no-op for every existing group.
--
-- DELIBERATELY NOT A FOREIGN KEY. The first attempt used
-- `REFERENCES modifier_options(id)`, which gave modifier_groups and
-- modifier_options a circular relationship. PostgREST could then no longer
-- resolve the `modifier_options(...)` embed in /api/product-modifiers, that
-- query started returning an error, and the route handler's `?? []` turned it
-- into an empty array — every restaurant lost every modifier group, silently,
-- with the endpoint still answering 200. Reverting the code did not fix it
-- because the migration was still applied.
--
-- Without the FK a deleted option leaves an orphan uuid here. The code treats
-- an unknown depends_on_option_id as "never selected", so the group simply
-- stays hidden — the safe direction.

alter table modifier_groups
  add column if not exists depends_on_option_id uuid;

comment on column modifier_groups.depends_on_option_id is
  'When set, this group is only shown (and only required) if that option is selected. NULL = always visible. Intentionally NOT a foreign key: a FK to modifier_options makes the PostgREST embed ambiguous and breaks /api/product-modifiers.';
