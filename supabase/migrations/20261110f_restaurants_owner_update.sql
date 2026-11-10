-- El dueño no podía guardar NADA de su restaurante desde el panel (Ajustes,
-- logo, pausar pedidos, reservas): authenticated no tenía UPDATE en
-- public.restaurants (ACL: authenticated=rdxtm). La política RLS
-- owners_update_own_restaurants ya limita a su propia fila; acá se devuelve
-- el permiso SOLO en las columnas que el dueño edita. Quedan fuera las que
-- maneja el servidor: owner_user_id, slug, is_active, stripe_*, commission_plan,
-- is_legacy_free, domain_verified, wompi_*, config_overrides.
grant update (
  name, description, address, phone, email, website, timezone, currency, locale,
  available_locales, logo_url, cover_image_url, hero_video_url, operating_hours,
  notification_whatsapp, notification_email, notifications_enabled,
  order_types_enabled, payment_methods_enabled, custom_domain,
  fiscal_rfc, fiscal_razon_social, fiscal_regimen_fiscal, fiscal_lugar_expedicion,
  delivery_fee, estimated_delivery_minutes, delivery_radius_km, delivery_min_order,
  latitude, longitude, google_business_url, instagram_url, country_code, state_code,
  tax_rate, tax_included, tax_label, mp_access_token, mp_enabled, cuisine_type, tags,
  orders_paused_until,
  reservations_enabled, reservation_slot_minutes, reservation_max_party_size,
  reservation_open_days, reservation_open_time, reservation_close_time
) on public.restaurants to authenticated;
