-- Conditional modifier groups: show a group only when a specific option of
-- another group is selected.
--
-- Buccaneer's burgers carry both "Style" (Regular / Deluxe) and a required
-- "Choice of Side". A Regular comes with no side at all, yet the customer was
-- still forced to pick one — and picking a premium side charged them $1.50 for
-- food they would never receive.
--
-- NULL means "always visible", so this is a no-op for every existing group.

alter table modifier_groups
  add column if not exists depends_on_option_id uuid
    references modifier_options(id) on delete set null;

comment on column modifier_groups.depends_on_option_id is
  'When set, this group is only shown (and only required) if that option is selected. NULL = always visible.';

-- The client resolves visibility per render and the orders API validates it per
-- line, both looking up by product; this index keeps that lookup cheap.
create index if not exists idx_modifier_groups_depends_on
  on modifier_groups(depends_on_option_id)
  where depends_on_option_id is not null;
