-- menius_posts: columnas de tracking de publicación que el endpoint
-- /api/social/update-status ya escribía pero que NO existían en prod.
-- Sin ellas, el UPDATE fallaba con 42703 → 500 y el estado del post nunca
-- se marcaba 'published' (el workflow n8n reporta el resultado a ese endpoint).
-- Aplicada en prod (hdlhmqvbaxzhmhtablwt) el 2026-06-30 vía MCP; este archivo
-- la deja registrada en el repo (las columnas eran deuda sin migración).
alter table public.menius_posts
  add column if not exists external_post_id text,
  add column if not exists published_at timestamptz;
