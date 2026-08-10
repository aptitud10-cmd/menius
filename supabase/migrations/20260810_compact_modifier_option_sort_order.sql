-- Renumbers every modifier group's options to a dense 0..n-1.
--
-- createModifierOption used to derive the new option's position from
-- `options.length`. Deleting a middle option leaves a gap (0,1,3), so the next
-- insert reused position 3 and two options ended up sharing it. 31 groups had
-- reached that state in production, all on one restaurant's menu.
--
-- Until now this only made the display order arbitrary between the tied rows.
-- With shared modifier groups it becomes a correctness problem: siblings pair
-- their options BY sort_order, so a single edit would rewrite two different
-- options on every linked dish — the owner changes the price of one add-on and
-- silently changes another.
--
-- The insert path is fixed alongside this (position now derives from the
-- highest existing sort_order), and deleting an option from a shared family now
-- compacts the family, so no new gaps appear.
--
-- Existing order is preserved — ties are broken by name, matching the stable
-- sort the editor already applies — and only the numbering changes.

with ranked as (
  select id,
         row_number() over (partition by group_id order by sort_order, name) - 1 as position
  from modifier_options
)
update modifier_options o
set sort_order = r.position
from ranked r
where o.id = r.id
  and o.sort_order <> r.position;
