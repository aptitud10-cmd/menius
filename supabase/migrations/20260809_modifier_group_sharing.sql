-- Reusable modifier groups across products ("Add existing" vs "Copy existing").
--
-- Buccaneer carries "Término de la carne" on a dozen dishes. Today every group
-- is owned by exactly one product, so that is twelve groups to create and
-- twelve to edit whenever a price moves.
--
-- ── Why product_id stays NOT NULL ────────────────────────────────────────────
-- The obvious design is a library table plus a nullable products.product_id.
-- That breaks ordering. Both /api/orders and /api/product-modifiers select
-- groups with `.eq('product_id', ...)` / `.in('product_id', ...)`; a group that
-- lived only in a library would be invisible to them, so the server would not
-- price its modifiers and would not enforce its required rule — the customer
-- picks an add-on, gets charged nothing for it, and a required choice can be
-- skipped entirely.
--
-- So sharing is modelled as a *sibling* relationship instead: every product
-- still owns a real row, and linked rows point at the one that owns the
-- content. Reads keep working untouched; only writes fan out.
--
--   shared_origin_id = NULL  → a normal, standalone group (every existing row)
--   shared_origin_id = <id>  → this row mirrors that group's content
--
-- The origin row itself always has shared_origin_id = NULL, so a link is never
-- more than one hop and there are no chains to resolve.
--
-- ── Why this is NOT a foreign key ────────────────────────────────────────────
-- 20260805_modifier_groups_conditional.sql learned this the hard way: adding
-- `REFERENCES modifier_options(id)` created a circular relationship between
-- modifier_groups and modifier_options, PostgREST could no longer resolve the
-- `modifier_options(...)` embed in /api/product-modifiers, and every restaurant
-- silently lost every modifier group while the endpoint still answered 200.
--
-- A self-referencing FK on modifier_groups risks the same class of embed
-- ambiguity, and the payoff would be small: the application already deletes
-- linked rows alongside their origin. An orphaned shared_origin_id degrades to
-- "a standalone group", which is the safe direction — the group keeps working,
-- it just stops syncing.

alter table modifier_groups
  add column if not exists shared_origin_id uuid;

-- Fan-out writes look up every sibling by origin on each edit.
create index if not exists modifier_groups_shared_origin_idx
  on modifier_groups (shared_origin_id)
  where shared_origin_id is not null;

comment on column modifier_groups.shared_origin_id is
  'When set, this group mirrors the content of that origin group (edits fan out to all siblings). NULL = standalone. Each product still owns a real row with its own product_id, so ordering queries are unaffected. Intentionally NOT a foreign key: see 20260805_modifier_groups_conditional.sql for how a FK here broke the PostgREST embed.';
