-- MENIUS — RLS real de produccion (menius-prod)
-- Generado desde pg_policies / pg_class via MCP de Supabase el 2026-08-07.
-- FUENTE DE VERDAD de la seguridad a nivel de fila. NO editar a mano: regenerar desde prod.
--
-- Por que existe este archivo:
--   supabase/schema.sql tiene las columnas pero CERO lineas de RLS, asi que no
--   servia para auditar aislamiento. En la ronda 2 de auditoria dos auditores
--   estuvieron a punto de reportar BLOCKERs falsos por leer solo ese dump, y el
--   B6 real (RLS anon abierta en app_devices) vivio meses porque un comentario
--   del codigo afirmaba una proteccion que la DB no tenia. Si vas a razonar
--   sobre quien puede leer o escribir una tabla, leelo aca, no en el codigo.
--
-- Estado al momento de generarlo: 67 tablas, 69 policies sobre 39 tablas.
-- Las 28 tablas restantes tienen RLS activo y NINGUNA policy: eso NIEGA todo
-- acceso salvo service_role (verificado con `set local role anon` — 0 filas).

-- ═══════════════════════════════════════════════════════════════════════
-- 1. RLS habilitado
-- ═══════════════════════════════════════════════════════════════════════
-- Las 67 tablas de public tienen rowsecurity = true y forcerowsecurity = false
-- (el dueño de la tabla y service_role la saltean; es el comportamiento normal
-- de Supabase y de lo que depende createAdminClient()).

ALTER TABLE public.ai_enhance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cfdi_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dev_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dev_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kds_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_style_anchors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menius_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modifier_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item_extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_location_latest ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processed_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_pairings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.style_anchors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
-- (+ 16 tablas _backup_bucc*/_backup_buccaneer* del trabajo de menu de agosto,
--  todas con RLS activo y sin policies)

-- ═══════════════════════════════════════════════════════════════════════
-- 2. Tablas con RLS y CERO policies  →  solo service_role las ve
-- ═══════════════════════════════════════════════════════════════════════
-- ai_enhance_logs · analytics_daily · app_devices · app_device_tokens
-- code_embeddings · dev_alerts · dev_conversations · menius_posts
-- menu_categories · menu_items · notifications · restaurant_staff
-- subscription_audit_log · + las 16 tablas _backup_*
--
-- app_devices / app_device_tokens quedaron asi tras cerrar el B6 el 2026-08-07
-- (migration-close-anon-app-devices.sql): antes tenian policies anon con
-- USING (true) que dejaban leer y sobrescribir la PII de todos los clientes.
-- Todo su trafico pasa por /api/app/device* con admin client.

-- ═══════════════════════════════════════════════════════════════════════
-- 3. Policies
-- ═══════════════════════════════════════════════════════════════════════
-- Nota sobre `TO public`: en estas policies "public" es el rol de Postgres
-- (todos), no "acceso publico". El filtro real lo hace el USING — casi todas
-- resuelven auth.uid(), que para anon es NULL y no matchea nada.
-- Ojo con las que SI son abiertas: estan marcadas abajo.

-- ── api_keys ───────────────────────────────────────────────────────────
CREATE POLICY api_keys_owner ON public.api_keys FOR ALL TO public
  USING ((restaurant_id IN ( SELECT restaurants.id
   FROM restaurants
  WHERE (restaurants.owner_user_id = auth.uid()))));

-- ── campaigns ──────────────────────────────────────────────────────────
CREATE POLICY campaigns_owner ON public.campaigns FOR ALL TO public
  USING ((restaurant_id IN ( SELECT restaurants.id
   FROM restaurants
  WHERE (restaurants.owner_user_id = auth.uid()))));

-- ── categories ─────────────────────────────────────────────────────────
CREATE POLICY owners_manage_categories ON public.categories FOR ALL TO public
  USING (user_owns_restaurant(restaurant_id));
CREATE POLICY public_read_active_categories ON public.categories FOR SELECT TO public
  USING ((is_active = true));

-- ── cfdi_requests ──────────────────────────────────────────────────────
CREATE POLICY cfdi_requests_owner_read ON public.cfdi_requests FOR SELECT TO public
  USING ((restaurant_id IN ( SELECT restaurants.id
   FROM restaurants
  WHERE (restaurants.owner_user_id = auth.uid()))));

-- ── chat_messages ──────────────────────────────────────────────────────
CREATE POLICY chat_messages_owner_access ON public.chat_messages FOR ALL TO public
  USING ((restaurant_id IN ( SELECT restaurants.id
   FROM restaurants
  WHERE (restaurants.owner_user_id = auth.uid()))));

-- ── customers ──────────────────────────────────────────────────────────
CREATE POLICY customers_owner_access ON public.customers FOR ALL TO public
  USING ((restaurant_id IN ( SELECT r.id
   FROM restaurants r
  WHERE (r.owner_user_id = ( SELECT auth.uid() AS uid)))))
  WITH CHECK ((restaurant_id IN ( SELECT r.id
   FROM restaurants r
  WHERE (r.owner_user_id = ( SELECT auth.uid() AS uid)))));

-- ── dashboard_notifications ────────────────────────────────────────────
CREATE POLICY "Service role can insert notifications" ON public.dashboard_notifications FOR INSERT TO public
  WITH CHECK (true);
CREATE POLICY "Users can update own notifications (mark read)" ON public.dashboard_notifications FOR UPDATE TO public
  USING ((restaurant_id IN ( SELECT profiles.default_restaurant_id
   FROM profiles
  WHERE (profiles.user_id = auth.uid()))))
  WITH CHECK ((restaurant_id IN ( SELECT profiles.default_restaurant_id
   FROM profiles
  WHERE (profiles.user_id = auth.uid()))));
CREATE POLICY "Users can view own restaurant notifications" ON public.dashboard_notifications FOR SELECT TO public
  USING ((restaurant_id IN ( SELECT profiles.default_restaurant_id
   FROM profiles
  WHERE (profiles.user_id = auth.uid()))));

-- ── drivers ────────────────────────────────────────────────────────────
CREATE POLICY driver_read_own_row ON public.drivers FOR SELECT TO public
  USING ((auth_user_id = auth.uid()));
CREATE POLICY drivers_restaurant_owner ON public.drivers FOR ALL TO public
  USING ((restaurant_id IN ( SELECT restaurants.id
   FROM restaurants
  WHERE (restaurants.owner_user_id = auth.uid()))));

-- ── kds_stations ───────────────────────────────────────────────────────
CREATE POLICY kds_stations_owner ON public.kds_stations FOR ALL TO public
  USING ((restaurant_id IN ( SELECT r.id
   FROM (restaurants r
     JOIN profiles p ON ((p.default_restaurant_id = r.id)))
  WHERE (p.user_id = auth.uid()))));

-- ── loyalty_accounts / loyalty_config / loyalty_transactions ───────────
CREATE POLICY loyalty_owner ON public.loyalty_accounts FOR ALL TO public
  USING ((restaurant_id IN ( SELECT restaurants.id
   FROM restaurants
  WHERE (restaurants.owner_user_id = auth.uid()))));
CREATE POLICY loyalty_config_owner ON public.loyalty_config FOR ALL TO public
  USING ((restaurant_id IN ( SELECT restaurants.id
   FROM restaurants
  WHERE (restaurants.owner_user_id = auth.uid()))));
CREATE POLICY loyalty_tx_owner ON public.loyalty_transactions FOR ALL TO public
  USING ((restaurant_id IN ( SELECT restaurants.id
   FROM restaurants
  WHERE (restaurants.owner_user_id = auth.uid()))));

-- ── master_style_anchors ───────────────────────────────────────────────
-- ABIERTA a propósito: catálogo de estilos compartido, sin datos de tenant.
CREATE POLICY "Anyone can read master style anchors" ON public.master_style_anchors FOR SELECT TO public
  USING (true);

-- ── modifier_groups / modifier_options ─────────────────────────────────
CREATE POLICY owners_manage_modifier_groups ON public.modifier_groups FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM products p
  WHERE ((p.id = modifier_groups.product_id) AND user_owns_restaurant(p.restaurant_id)))));
CREATE POLICY public_read_modifier_groups ON public.modifier_groups FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM products p
  WHERE ((p.id = modifier_groups.product_id) AND (p.is_active = true)))));
CREATE POLICY owners_manage_modifier_options ON public.modifier_options FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM (modifier_groups mg
     JOIN products p ON ((p.id = mg.product_id)))
  WHERE ((mg.id = modifier_options.group_id) AND user_owns_restaurant(p.restaurant_id)))));
CREATE POLICY public_read_modifier_options ON public.modifier_options FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM (modifier_groups mg
     JOIN products p ON ((p.id = mg.product_id)))
  WHERE ((mg.id = modifier_options.group_id) AND (p.is_active = true)))));

-- ── order_items y sus hijos ────────────────────────────────────────────
-- El INSERT abierto a anon es el checkout publico: el cliente sin cuenta tiene
-- que poder crear su pedido. La lectura si esta cerrada al dueño.
CREATE POLICY owners_read_order_items ON public.order_items FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM orders o
  WHERE ((o.id = order_items.order_id) AND user_owns_restaurant(o.restaurant_id)))));
CREATE POLICY public_insert_order_items ON public.order_items FOR INSERT TO anon, authenticated
  WITH CHECK (true);
CREATE POLICY public_read_order_items ON public.order_items FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM orders o
  WHERE ((o.id = order_items.order_id) AND user_owns_restaurant(o.restaurant_id)))));
CREATE POLICY owners_read_order_item_extras ON public.order_item_extras FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM (order_items oi
     JOIN orders o ON ((o.id = oi.order_id)))
  WHERE ((oi.id = order_item_extras.order_item_id) AND user_owns_restaurant(o.restaurant_id)))));
CREATE POLICY public_insert_order_item_extras ON public.order_item_extras FOR INSERT TO anon, authenticated
  WITH CHECK (true);
CREATE POLICY owners_read_order_item_modifiers ON public.order_item_modifiers FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM (order_items oi
     JOIN orders o ON ((o.id = oi.order_id)))
  WHERE ((oi.id = order_item_modifiers.order_item_id) AND user_owns_restaurant(o.restaurant_id)))));
CREATE POLICY public_insert_order_item_modifiers ON public.order_item_modifiers FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- ── order_location_latest / order_notification_log / order_status_history ──
CREATE POLICY order_location_owner_read ON public.order_location_latest FOR SELECT TO public
  USING ((order_id IN ( SELECT o.id
   FROM (orders o
     JOIN restaurants r ON ((r.id = o.restaurant_id)))
  WHERE (r.owner_user_id = auth.uid()))));
CREATE POLICY restaurant_members_can_read_own_logs ON public.order_notification_log FOR SELECT TO public
  USING ((restaurant_id IN ( SELECT restaurant_staff.restaurant_id
   FROM restaurant_staff
  WHERE (restaurant_staff.user_id = auth.uid())
UNION
 SELECT restaurants.id
   FROM restaurants
  WHERE (restaurants.owner_user_id = auth.uid()))));
CREATE POLICY order_status_history_owner_read ON public.order_status_history FOR SELECT TO public
  USING ((order_id IN ( SELECT o.id
   FROM (orders o
     JOIN restaurants r ON ((r.id = o.restaurant_id)))
  WHERE (r.owner_user_id = auth.uid()))));

-- ── orders ─────────────────────────────────────────────────────────────
-- public_read_own_order pretende dejar a un anonimo leer su orden mandando el
-- UUID en el header x-order-id. Hoy NO funciona y NO es explotable: para
-- resolver el SELECT, Postgres evalua tambien owners_manage_orders, que llama a
-- user_owns_restaurant() y toca `restaurants`, tabla sobre la que anon no tiene
-- grant de SELECT — asi que la lectura anonima falla con o sin header
-- (verificado en prod). Ademas ningun codigo manda ese header: la unica mencion
-- en el repo es un comentario en public/repeat-order/route.ts explicando que no
-- se usa. Es superficie muerta; el tracking real va por /api/order-track con
-- customer_token. Candidata a eliminar, no a arreglar.
CREATE POLICY driver_read_assigned_orders ON public.orders FOR SELECT TO public
  USING ((driver_id IN ( SELECT drivers.id
   FROM drivers
  WHERE (drivers.auth_user_id = auth.uid()))));
CREATE POLICY owners_manage_orders ON public.orders FOR ALL TO public
  USING (user_owns_restaurant(restaurant_id));
CREATE POLICY public_insert_orders ON public.orders FOR INSERT TO anon, authenticated
  WITH CHECK (true);
CREATE POLICY public_read_own_order ON public.orders FOR SELECT TO anon
  USING (((id)::text = ((current_setting('request.headers'::text, true))::json ->> 'x-order-id'::text)));

-- ── processed_webhook_events ───────────────────────────────────────────
-- USING (false) = nadie salvo service_role. Correcto: es la tabla de
-- idempotencia de los webhooks de Stripe.
CREATE POLICY service_role_only ON public.processed_webhook_events FOR ALL TO public
  USING (false);

-- ── products y satelites ───────────────────────────────────────────────
CREATE POLICY owners_manage_products ON public.products FOR ALL TO public
  USING (user_owns_restaurant(restaurant_id));
CREATE POLICY public_read_active_products ON public.products FOR SELECT TO public
  USING ((is_active = true));
CREATE POLICY owners_manage_extras ON public.product_extras FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM products p
  WHERE ((p.id = product_extras.product_id) AND user_owns_restaurant(p.restaurant_id)))));
CREATE POLICY public_read_extras ON public.product_extras FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM products p
  WHERE ((p.id = product_extras.product_id) AND (p.is_active = true)))));
CREATE POLICY owners_manage_variants ON public.product_variants FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM products p
  WHERE ((p.id = product_variants.product_id) AND user_owns_restaurant(p.restaurant_id)))));
CREATE POLICY public_read_variants ON public.product_variants FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM products p
  WHERE ((p.id = product_variants.product_id) AND (p.is_active = true)))));
CREATE POLICY owners_manage_pairings ON public.product_pairings FOR ALL TO public
  USING ((restaurant_id IN ( SELECT restaurants.id
   FROM restaurants
  WHERE (restaurants.owner_user_id = auth.uid()))))
  WITH CHECK ((restaurant_id IN ( SELECT restaurants.id
   FROM restaurants
  WHERE (restaurants.owner_user_id = auth.uid()))));
CREATE POLICY public_read_pairings ON public.product_pairings FOR SELECT TO public
  USING (true);

-- ── profiles ───────────────────────────────────────────────────────────
-- El WITH CHECK de users_update_own_profile es el fix del B1 (2026-08-07,
-- migration-profiles-owner-check.sql). Sin el, cualquier dueño podia apuntar su
-- default_restaurant_id al restaurante ajeno y operarlo via las ~16 rutas con
-- service role. NO quitarlo. getTenant() valida lo mismo como segunda capa.
CREATE POLICY system_insert_profile ON public.profiles FOR INSERT TO public
  WITH CHECK (true);
CREATE POLICY users_read_own_profile ON public.profiles FOR SELECT TO public
  USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY users_update_own_profile ON public.profiles FOR UPDATE TO public
  USING ((user_id = ( SELECT auth.uid() AS uid)))
  WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) AND ((default_restaurant_id IS NULL) OR (EXISTS ( SELECT 1
   FROM restaurants r
  WHERE ((r.id = profiles.default_restaurant_id) AND (r.owner_user_id = ( SELECT auth.uid() AS uid))))))));

-- ── promotions ─────────────────────────────────────────────────────────
CREATE POLICY owners_manage_promotions ON public.promotions FOR ALL TO public
  USING ((restaurant_id IN ( SELECT restaurants.id
   FROM restaurants
  WHERE (restaurants.owner_user_id = ( SELECT auth.uid() AS uid)))));
CREATE POLICY public_read_active_promotions ON public.promotions FOR SELECT TO public
  USING ((is_active = true));

-- ── push_subscriptions ─────────────────────────────────────────────────
CREATE POLICY admin_all ON public.push_subscriptions FOR ALL TO public
  USING ((auth.role() = 'service_role'::text));

-- ── reservations ───────────────────────────────────────────────────────
CREATE POLICY owners_manage_reservations ON public.reservations FOR ALL TO public
  USING ((restaurant_id IN ( SELECT profiles.default_restaurant_id
   FROM profiles
  WHERE (profiles.user_id = auth.uid()))));
CREATE POLICY public_create_reservation ON public.reservations FOR INSERT TO public
  WITH CHECK (true);

-- ── restaurants ────────────────────────────────────────────────────────
-- public_read_restaurant_by_slug es abierta a anon porque el menu publico la
-- necesita. Por eso menu-data.ts DEBE seguir filtrando las columnas sensibles
-- (mp_access_token, wompi_*_enc) antes de mandar nada al cliente: la proteccion
-- de esos secretos NO esta en RLS, esta en el codigo.
-- Ojo: anon NO tiene grant de SELECT sobre restaurants (solo authenticated),
-- asi que el acceso anonimo real pasa por el server client de Next.
CREATE POLICY owners_insert_restaurants ON public.restaurants FOR INSERT TO public
  WITH CHECK ((owner_user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY owners_read_own_restaurants ON public.restaurants FOR SELECT TO public
  USING ((owner_user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY owners_update_own_restaurants ON public.restaurants FOR UPDATE TO public
  USING ((owner_user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY public_read_restaurant_by_slug ON public.restaurants FOR SELECT TO anon
  USING (true);

-- ── reviews ────────────────────────────────────────────────────────────
CREATE POLICY anyone_insert_reviews ON public.reviews FOR INSERT TO public
  WITH CHECK (true);
CREATE POLICY anyone_read_visible_reviews ON public.reviews FOR SELECT TO public
  USING ((is_visible = true));
CREATE POLICY owners_manage_reviews ON public.reviews FOR ALL TO public
  USING ((restaurant_id IN ( SELECT restaurants.id
   FROM restaurants
  WHERE (restaurants.owner_user_id = ( SELECT auth.uid() AS uid)))));

-- ── shifts ─────────────────────────────────────────────────────────────
CREATE POLICY shifts_owner ON public.shifts FOR ALL TO public
  USING ((restaurant_id IN ( SELECT r.id
   FROM (restaurants r
     JOIN profiles p ON ((p.default_restaurant_id = r.id)))
  WHERE (p.user_id = auth.uid()))));

-- ── staff_members ──────────────────────────────────────────────────────
-- W5 de AUDIT_R2: la tabla esta vacia y getTenant() ni la consulta, asi que un
-- staff invitado hoy no puede entrar. Las policies existen, el flujo no.
CREATE POLICY owners_manage_staff ON public.staff_members FOR ALL TO public
  USING ((restaurant_id IN ( SELECT restaurants.id
   FROM restaurants
  WHERE (restaurants.owner_user_id = ( SELECT auth.uid() AS uid)))));
CREATE POLICY staff_read_own ON public.staff_members FOR SELECT TO public
  USING ((user_id = ( SELECT auth.uid() AS uid)));

-- ── style_anchors ──────────────────────────────────────────────────────
CREATE POLICY "Owners manage their style anchors" ON public.style_anchors FOR ALL TO public
  USING ((restaurant_id IN ( SELECT restaurants.id
   FROM restaurants
  WHERE (restaurants.owner_user_id = auth.uid()))))
  WITH CHECK ((restaurant_id IN ( SELECT restaurants.id
   FROM restaurants
  WHERE (restaurants.owner_user_id = auth.uid()))));

-- ── subscriptions ──────────────────────────────────────────────────────
-- owners_update_own_subscription no declara WITH CHECK, pero eso NO la deja
-- abierta: cuando una policy UPDATE omite WITH CHECK, Postgres reutiliza la
-- expresion del USING para validar la fila nueva. Verificado en prod con
-- transaccion revertida: el dueño de 'cafes' intentando reasignar su fila al
-- restaurante de Buccaneer recibe "new row violates row-level security policy",
-- y el update legitimo sobre su propia fila pasa. El B1 de profiles era otra
-- cosa: ahi el problema es que default_restaurant_id apunta a un tenant ajeno
-- sin que la propia fila cambie de dueño, asi que el USING la seguia aceptando.
CREATE POLICY owners_read_own_subscription ON public.subscriptions FOR SELECT TO public
  USING ((restaurant_id IN ( SELECT restaurants.id
   FROM restaurants
  WHERE (restaurants.owner_user_id = ( SELECT auth.uid() AS uid)))));
CREATE POLICY owners_update_own_subscription ON public.subscriptions FOR UPDATE TO public
  USING ((restaurant_id IN ( SELECT restaurants.id
   FROM restaurants
  WHERE (restaurants.owner_user_id = ( SELECT auth.uid() AS uid)))));
CREATE POLICY service_insert_subscriptions ON public.subscriptions FOR INSERT TO public
  WITH CHECK (true);

-- ── tables ─────────────────────────────────────────────────────────────
CREATE POLICY owners_manage_tables ON public.tables FOR ALL TO public
  USING (user_owns_restaurant(restaurant_id));

-- ── users ──────────────────────────────────────────────────────────────
CREATE POLICY "Users can update their own data" ON public.users FOR UPDATE TO public
  USING ((auth.uid() = id));
CREATE POLICY "Users can view their own data" ON public.users FOR SELECT TO public
  USING ((auth.uid() = id));

-- ═══════════════════════════════════════════════════════════════════════
-- 4. Funcion de apoyo
-- ═══════════════════════════════════════════════════════════════════════
-- user_owns_restaurant(uuid) es la que usan las policies de products, orders,
-- categories y tables. Vive en la DB; si cambia, cambia el aislamiento de
-- media plataforma de una sola vez.

-- ═══════════════════════════════════════════════════════════════════════
-- 5. Grants a anon / authenticated
-- ═══════════════════════════════════════════════════════════════════════
-- Casi todas las tablas tienen grants amplios (SELECT/INSERT/UPDATE/DELETE) a
-- anon y authenticated. NO es un agujero por si mismo: RLS es lo que decide, y
-- una tabla con RLS y sin policies devuelve 0 filas (verificado con
-- `set local role anon` sobre dev_alerts, subscription_audit_log, notifications,
-- restaurant_staff, analytics_daily, menu_items, menius_posts, ai_enhance_logs
-- y los backups — 0 en las nueve).
--
-- Excepciones deliberadas ya aplicadas:
--   REVOKE ALL ON public.app_devices FROM anon;        -- B6, 2026-08-07
--   REVOKE ALL ON public.app_device_tokens FROM anon;  -- B6, 2026-08-07
--   restaurants: anon no tiene SELECT (solo authenticated).

-- ═══════════════════════════════════════════════════════════════════════
-- 6. Deteccion de drift
-- ═══════════════════════════════════════════════════════════════════════
-- El cron /api/cron/rls-drift-check (diario, 6am UTC) ya vigila esto: busca
-- policies SELECT/ALL con USING(true) alcanzables por anon/public/authenticated
-- y mailea a ADMIN_ALERT_EMAIL las que no esten en su allowlist justificada.
-- Corrida contra prod el 2026-08-07: devuelve exactamente las 3 aceptadas
-- (master_style_anchors, product_pairings, restaurants) — cero drift.
--
-- Si agregas una policy permisiva a proposito, va en el array ACCEPTED de ese
-- route CON su justificacion, y aca.
