-- Delivery enhancements: instructions + verified coordinates from Google Places.
-- The instructions are a free-form note from customer to driver.
-- The lat/lng are captured from Google Places autocomplete so we can:
--   (a) validate the address is inside the restaurant's delivery zone,
--   (b) render an accurate destination pin without re-geocoding.

alter table orders
  add column if not exists delivery_instructions text,
  add column if not exists delivery_lat double precision,
  add column if not exists delivery_lng double precision;

comment on column orders.delivery_instructions is
  'Free-form instructions from customer to driver (e.g. "leave at door", gate code)';
comment on column orders.delivery_lat is
  'Latitude from Google Places autocomplete — used for zone validation and map pin';
comment on column orders.delivery_lng is
  'Longitude from Google Places autocomplete';
