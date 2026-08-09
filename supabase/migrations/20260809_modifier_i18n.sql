-- Translations for modifier groups and options.
--
-- `products.translations` already exists, so an English menu shows
-- "Cheeseburger" translated while the group underneath still reads
-- "Término de la carne" and its options "Tocino / Queso / Aguacate".
-- Multi-language stopped exactly halfway down the customization sheet.
--
-- Same shape as products.translations so getTranslation() works unchanged:
--   { "en": { "name": "Cooking temperature" } }
--
-- Options only ever carry a name (they have no description), so the same
-- ContentTranslation shape is reused and the description key is simply unused.
-- NULL means "no translations" and falls back to the original name, so this is
-- a no-op for every existing row.

alter table modifier_groups
  add column if not exists translations jsonb;

alter table modifier_options
  add column if not exists translations jsonb;

comment on column modifier_groups.translations is
  'Per-locale overrides, e.g. {"en":{"name":"Cooking temperature"}}. NULL or a missing locale falls back to the base name.';

comment on column modifier_options.translations is
  'Per-locale overrides, e.g. {"en":{"name":"Bacon"}}. NULL or a missing locale falls back to the base name.';
