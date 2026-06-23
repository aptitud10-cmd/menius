-- MENIUS - schema real de produccion (menius-prod)
-- Generado desde information_schema via MCP de Supabase.
-- FUENTE DE VERDAD del schema. NO editar a mano: regenerar desde prod.
-- Tablas: 49  -  Columnas: 523

CREATE TABLE public.ai_enhance_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ip text NOT NULL,
  restaurant_id uuid,
  type text NOT NULL DEFAULT 'enhance'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  action text
);

CREATE TABLE public.analytics_daily (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  restaurant_id uuid,
  date date NOT NULL,
  total_orders integer DEFAULT 0,
  completed_orders integer DEFAULT 0,
  canceled_orders integer DEFAULT 0,
  total_revenue numeric DEFAULT 0,
  avg_order_value numeric DEFAULT 0,
  delivery_orders integer DEFAULT 0,
  pickup_orders integer DEFAULT 0,
  dine_in_orders integer DEFAULT 0,
  top_selling_items jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.app_device_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL,
  expo_push_token text NOT NULL,
  platform text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  last_used_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.app_devices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  device_uuid text NOT NULL,
  platform text NOT NULL,
  app_version text,
  os_version text,
  display_name text,
  phone text,
  phone_verified_at timestamp with time zone,
  email text,
  favorites jsonb NOT NULL DEFAULT '[]'::jsonb,
  addresses jsonb NOT NULL DEFAULT '[]'::jsonb,
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_seen_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'whatsapp'::text,
  audience text NOT NULL DEFAULT 'all'::text,
  message_preview text,
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  restaurant_id uuid NOT NULL,
  name text NOT NULL,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  available_from time without time zone,
  available_to time without time zone
);

CREATE TABLE public.cfdi_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  restaurant_id uuid NOT NULL,
  rfc text NOT NULL,
  razon_social text NOT NULL,
  cfdi_use text NOT NULL,
  regimen_fiscal text NOT NULL,
  cp_domicilio text,
  status text NOT NULL DEFAULT 'pending'::text,
  facturama_id text,
  xml_url text,
  pdf_url text,
  error_message text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.code_embeddings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  file_path text NOT NULL,
  chunk_index integer NOT NULL DEFAULT 0,
  content text NOT NULL,
  embedding USER-DEFINED,
  sha text,
  indexed_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.customers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  name text NOT NULL DEFAULT ''::text,
  email text,
  phone text,
  address text,
  total_orders integer NOT NULL DEFAULT 0,
  total_spent numeric NOT NULL DEFAULT 0,
  last_order_at timestamp with time zone,
  notes text DEFAULT ''::text,
  tags ARRAY DEFAULT '{}'::text[],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.dashboard_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  action_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.dev_conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  title text,
  model text DEFAULT 'claude-sonnet-4-5'::text,
  messages jsonb DEFAULT '[]'::jsonb,
  user_id text DEFAULT 'admin'::text
);

CREATE TABLE public.drivers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  name text NOT NULL,
  phone text NOT NULL DEFAULT ''::text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  auth_user_id uuid,
  phone_e164 text
);

CREATE TABLE public.kds_stations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#06c167'::text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.loyalty_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  customer_phone text NOT NULL,
  customer_email text,
  customer_name text,
  points integer NOT NULL DEFAULT 0,
  lifetime_points integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  referral_code text,
  referred_by_account_id uuid,
  referral_count integer NOT NULL DEFAULT 0
);

CREATE TABLE public.loyalty_config (
  restaurant_id uuid NOT NULL,
  enabled boolean DEFAULT false,
  points_per_peso numeric DEFAULT 1.0,
  min_redeem_points integer DEFAULT 100,
  peso_per_point numeric DEFAULT 0.10,
  welcome_points integer DEFAULT 0,
  updated_at timestamp with time zone DEFAULT now(),
  referral_enabled boolean NOT NULL DEFAULT false,
  referral_points_referrer integer NOT NULL DEFAULT 0,
  referral_points_referee integer NOT NULL DEFAULT 0
);

CREATE TABLE public.loyalty_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  account_id uuid NOT NULL,
  order_id uuid,
  type text NOT NULL,
  points integer NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.master_style_anchors (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  category_slug text NOT NULL,
  display_name text NOT NULL,
  aliases ARRAY NOT NULL DEFAULT '{}'::text[],
  anchor_url text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

CREATE TABLE public.menius_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  platform text NOT NULL,
  post_type text NOT NULL,
  language text NOT NULL DEFAULT 'es'::text,
  hook text NOT NULL DEFAULT ''::text,
  caption text NOT NULL DEFAULT ''::text,
  hashtags text NOT NULL DEFAULT ''::text,
  cta text NOT NULL DEFAULT ''::text,
  image_url text,
  image_idea text,
  best_time text,
  tip text,
  status text NOT NULL DEFAULT 'draft'::text,
  source text NOT NULL DEFAULT 'auto'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.menu_categories (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  restaurant_id uuid,
  name character varying NOT NULL,
  description text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.menu_items (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  restaurant_id uuid,
  category_id uuid,
  name character varying NOT NULL,
  description text,
  price numeric NOT NULL,
  image_url text,
  is_available boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  preparation_time_minutes integer DEFAULT 15,
  modifiers jsonb DEFAULT '[]'::jsonb,
  dietary_tags ARRAY DEFAULT '{}'::text[],
  ai_generated_description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.modifier_groups (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  product_id uuid NOT NULL,
  name text NOT NULL,
  selection_type text NOT NULL DEFAULT 'single'::text,
  min_select integer NOT NULL DEFAULT 0,
  max_select integer NOT NULL DEFAULT 1,
  is_required boolean NOT NULL DEFAULT false,
  sort_order integer DEFAULT 0,
  display_type text NOT NULL DEFAULT 'list'::text
);

CREATE TABLE public.modifier_options (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  group_id uuid NOT NULL,
  name text NOT NULL,
  price_delta numeric DEFAULT 0,
  is_default boolean DEFAULT false,
  sort_order integer DEFAULT 0
);

CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  restaurant_id uuid,
  type character varying NOT NULL,
  title character varying NOT NULL,
  message text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  is_read boolean DEFAULT false,
  read_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.order_item_extras (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  order_item_id uuid NOT NULL,
  extra_id uuid NOT NULL,
  price numeric NOT NULL DEFAULT 0
);

CREATE TABLE public.order_item_modifiers (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  order_item_id uuid NOT NULL,
  group_id uuid,
  option_id uuid,
  group_name text NOT NULL,
  option_name text NOT NULL,
  price_delta numeric NOT NULL DEFAULT 0
);

CREATE TABLE public.order_items (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL,
  product_id uuid NOT NULL,
  variant_id uuid,
  qty integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  line_total numeric NOT NULL DEFAULT 0,
  notes text DEFAULT ''::text,
  product_name text DEFAULT ''::text,
  variant_name text DEFAULT ''::text
);

CREATE TABLE public.order_location_latest (
  order_id uuid NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  accuracy double precision,
  recorded_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.order_notification_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  restaurant_id uuid NOT NULL,
  event text NOT NULL,
  channel text NOT NULL,
  success boolean NOT NULL,
  error_code text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.order_status_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  from_status text,
  to_status text NOT NULL,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  restaurant_id uuid NOT NULL,
  table_id uuid,
  order_number text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  customer_name text DEFAULT ''::text,
  notes text DEFAULT ''::text,
  total numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  payment_status text DEFAULT 'pending'::text,
  payment_intent_id text DEFAULT ''::text,
  promo_code text DEFAULT ''::text,
  discount_amount numeric DEFAULT 0,
  order_type text DEFAULT 'dine_in'::text,
  payment_method text DEFAULT 'cash'::text,
  delivery_address text,
  customer_email text,
  customer_phone text,
  tip_amount numeric DEFAULT 0,
  delivery_fee numeric DEFAULT 0,
  driver_name text,
  driver_phone text,
  driver_id uuid,
  driver_assigned_at timestamp with time zone,
  estimated_ready_minutes integer,
  cancellation_reason text,
  idempotency_key text,
  scheduled_for timestamp with time zone,
  driver_lat double precision,
  driver_lng double precision,
  driver_updated_at timestamp with time zone,
  driver_tracking_token text,
  delivery_photo_url text,
  table_name text,
  include_utensils boolean DEFAULT true,
  tax_amount numeric DEFAULT 0,
  payment_breakdown jsonb,
  loyalty_discount numeric DEFAULT 0,
  loyalty_points_redeemed integer DEFAULT 0,
  driver_token_expires_at timestamp with time zone,
  driver_picked_up_at timestamp with time zone,
  driver_at_door_at timestamp with time zone,
  driver_delivered_at timestamp with time zone,
  utensils boolean DEFAULT false,
  updated_at timestamp with time zone DEFAULT now(),
  customer_locale text DEFAULT 'es'::text,
  prepared_at timestamp with time zone,
  delivery_instructions text,
  delivery_lat double precision,
  delivery_lng double precision,
  customer_id uuid
);

CREATE TABLE public.processed_webhook_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id text NOT NULL,
  event_type text NOT NULL,
  processed_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.product_extras (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  product_id uuid NOT NULL,
  name text NOT NULL,
  price numeric DEFAULT 0,
  sort_order integer DEFAULT 0
);

CREATE TABLE public.product_pairings (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  restaurant_id uuid NOT NULL,
  product_id uuid NOT NULL,
  paired_id uuid NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.product_variants (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  product_id uuid NOT NULL,
  name text NOT NULL,
  price_delta numeric DEFAULT 0,
  sort_order integer DEFAULT 0
);

CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  restaurant_id uuid NOT NULL,
  category_id uuid NOT NULL,
  name text NOT NULL,
  description text DEFAULT ''::text,
  price numeric NOT NULL DEFAULT 0,
  image_url text DEFAULT ''::text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  dietary_tags ARRAY DEFAULT '{}'::text[],
  in_stock boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  is_new boolean DEFAULT false,
  translations jsonb,
  prep_time_minutes integer,
  station_id uuid,
  popularity_rank integer,
  orders_last_7d integer DEFAULT 0,
  cost_price numeric DEFAULT NULL::numeric,
  stock_qty integer,
  low_stock_threshold integer DEFAULT 5,
  track_inventory boolean DEFAULT false,
  compare_at_price numeric DEFAULT NULL::numeric
);

CREATE TABLE public.profiles (
  user_id uuid NOT NULL,
  full_name text NOT NULL DEFAULT ''::text,
  role text NOT NULL DEFAULT 'owner'::text,
  default_restaurant_id uuid,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.promotions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  code text NOT NULL,
  description text DEFAULT ''::text,
  discount_type text NOT NULL,
  discount_value numeric NOT NULL DEFAULT 0,
  min_order numeric DEFAULT 0,
  max_uses integer,
  current_uses integer DEFAULT 0,
  is_active boolean DEFAULT true,
  starts_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.push_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  endpoint text NOT NULL,
  keys_p256dh text NOT NULL,
  keys_auth text NOT NULL,
  order_id uuid,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.reservations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  customer_name text NOT NULL,
  customer_phone text,
  customer_email text,
  party_size integer NOT NULL DEFAULT 2,
  reserved_date date NOT NULL,
  reserved_time time without time zone NOT NULL,
  duration_min integer NOT NULL DEFAULT 90,
  notes text,
  status text NOT NULL DEFAULT 'pending'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.restaurant_staff (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  restaurant_id uuid,
  user_id uuid,
  role character varying NOT NULL,
  permissions jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.restaurants (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  slug text NOT NULL,
  owner_user_id uuid NOT NULL,
  timezone text DEFAULT 'America/Mexico_City'::text,
  currency text DEFAULT 'MXN'::text,
  logo_url text,
  created_at timestamp with time zone DEFAULT now(),
  description text DEFAULT ''::text,
  address text DEFAULT ''::text,
  phone text DEFAULT ''::text,
  email text DEFAULT ''::text,
  website text DEFAULT ''::text,
  operating_hours jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  locale text DEFAULT 'es'::text,
  order_types_enabled jsonb DEFAULT '["dine_in", "pickup"]'::jsonb,
  payment_methods_enabled jsonb DEFAULT '["cash"]'::jsonb,
  notification_whatsapp text,
  notification_email text,
  notifications_enabled boolean DEFAULT true,
  custom_domain text,
  cover_image_url text,
  estimated_delivery_minutes integer,
  stripe_account_id text,
  stripe_onboarding_complete boolean DEFAULT false,
  delivery_fee numeric DEFAULT 0,
  orders_paused_until timestamp with time zone,
  latitude double precision,
  longitude double precision,
  fiscal_rfc text,
  fiscal_razon_social text,
  fiscal_regimen_fiscal text,
  fiscal_lugar_expedicion text,
  reservations_enabled boolean NOT NULL DEFAULT false,
  reservation_slot_minutes integer NOT NULL DEFAULT 30,
  reservation_max_party_size integer NOT NULL DEFAULT 10,
  reservation_open_days ARRAY NOT NULL DEFAULT ARRAY['mon'::text, 'tue'::text, 'wed'::text, 'thu'::text, 'fri'::text, 'sat'::text, 'sun'::text],
  reservation_open_time time without time zone NOT NULL DEFAULT '12:00:00'::time without time zone,
  reservation_close_time time without time zone NOT NULL DEFAULT '22:00:00'::time without time zone,
  country_code text,
  state_code text,
  tax_rate numeric DEFAULT 0,
  tax_included boolean DEFAULT false,
  tax_label text DEFAULT 'Tax'::text,
  available_locales jsonb,
  delivery_radius_km numeric DEFAULT NULL::numeric,
  config_overrides jsonb DEFAULT '{}'::jsonb,
  commission_plan boolean NOT NULL DEFAULT false,
  cuisine_type text,
  is_legacy_free boolean NOT NULL DEFAULT false,
  hero_video_url text,
  instagram_url text,
  wompi_public_key text,
  wompi_integrity_secret_enc text,
  wompi_events_secret_enc text,
  wompi_connected boolean NOT NULL DEFAULT false
);

CREATE TABLE public.reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  order_id uuid,
  customer_name text NOT NULL DEFAULT ''::text,
  rating integer NOT NULL,
  comment text DEFAULT ''::text,
  is_visible boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.staff_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  user_id uuid,
  email text NOT NULL,
  full_name text NOT NULL DEFAULT ''::text,
  role text NOT NULL DEFAULT 'staff'::text,
  status text NOT NULL DEFAULT 'pending'::text,
  invited_at timestamp with time zone DEFAULT now(),
  accepted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.style_anchors (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  category_name text NOT NULL,
  anchor_url text NOT NULL,
  style text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.subscription_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  action text NOT NULL,
  old_status text,
  new_status text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.subscriptions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  restaurant_id uuid,
  plan_id character varying NOT NULL,
  status character varying NOT NULL,
  stripe_subscription_id character varying,
  stripe_customer_id character varying,
  stripe_price_id character varying,
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  trial_start timestamp with time zone,
  trial_end timestamp with time zone,
  canceled_at timestamp with time zone,
  max_orders_per_month integer,
  max_locations integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  cancel_at timestamp with time zone,
  past_due_since timestamp with time zone,
  dunning_stage smallint NOT NULL DEFAULT 0
);

CREATE TABLE public.tables (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  restaurant_id uuid NOT NULL,
  name text NOT NULL,
  qr_code_value text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  email character varying NOT NULL,
  full_name character varying,
  phone character varying,
  role character varying NOT NULL DEFAULT 'customer'::character varying,
  avatar_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
