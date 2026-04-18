-- Restaurant delivery zone — simple circular zone defined by a radius (km)
-- centered on the restaurant's lat/lng. Matches how Uber Eats works for the
-- vast majority of restaurants ("we deliver within X km").
--
-- A future iteration can switch to a GeoJSON polygon (PostGIS) for irregular
-- zones, but the round zone covers ~95% of real-world use cases and avoids
-- PostGIS as a dependency.

alter table restaurants
  add column if not exists delivery_radius_km numeric(5,2);

comment on column restaurants.delivery_radius_km is
  'Radius in kilometers around (latitude, longitude) defining the delivery zone. NULL = unrestricted.';
