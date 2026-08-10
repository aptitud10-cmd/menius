-- Compact rows for products that don't need a photo.
--
-- A product with no image_url used to still reserve the full card area (a square
-- on mobile, 16/9 on desktop) and fill it with a grey cutlery icon. That reads as
-- "a photo failed to load", not as a deliberate choice — the placeholder is worse
-- than no image at all, and it pushes the dishes that DO have photos further down.
--
-- Two ways in, because the two cases are different:
--   * no image_url            → compact row automatically, no config needed.
--   * image_url + hide_image  → owner keeps the photo on file (menu print, socials,
--                               a future redesign) but the menu lists the item as a
--                               row. Buccaneer has ~86 generated beverage images it
--                               does not want to show and should not have to delete.
--
-- Nullable would add a third state ("unset") that behaves exactly like false, so
-- NOT NULL DEFAULT false keeps the client-side check a plain boolean.
alter table products
  add column if not exists hide_image boolean not null default false;

comment on column products.hide_image is
  'When true the public menu lists this product as a compact row and ignores image_url. Set by the owner in the product editor; products without an image_url render as rows regardless.';
