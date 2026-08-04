-- Groups categories into navigable parents for large menus.
--
-- Buccaneer has 47 categories / 424 products: the pill row was unusable and the
-- sidebar needed scrolling past 30 entries to reach dinner. group_name lets a
-- restaurant collapse those into ~9 parent pills while every category stays
-- intact as a subsection heading inside its group.
--
-- NULL means "no grouping" — the menu falls back to the flat category list, so
-- this is a no-op for every restaurant that doesn't set it.

alter table categories
  add column if not exists group_name text;

-- Order of the parent pills. Categories in the same group must share it;
-- the menu sorts groups by min(group_sort_order) and falls back to sort_order.
alter table categories
  add column if not exists group_sort_order integer;

comment on column categories.group_name is
  'Optional parent group for menu navigation (e.g. "Breakfast"). NULL = ungrouped, menu shows the flat category list.';
comment on column categories.group_sort_order is
  'Sort position of the parent group in the pill row. Shared by all categories of the same group.';
