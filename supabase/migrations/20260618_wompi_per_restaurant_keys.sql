-- Per-restaurant Wompi credentials (Colombia).
-- Lets each CO restaurant collect card payments into ITS OWN Wompi account
-- instead of a single global MENIUS account. Secrets are stored ENCRYPTED
-- (aes-256-gcm via src/lib/crypto/secrets.ts); the public key is not secret.
-- Aditivo: defaults null/false, no afecta tiendas existentes.
-- Aplicada a prod (menius-prod) el 2026-06-18 vía MCP.

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS wompi_public_key text,
  ADD COLUMN IF NOT EXISTS wompi_integrity_secret_enc text,
  ADD COLUMN IF NOT EXISTS wompi_events_secret_enc text,
  ADD COLUMN IF NOT EXISTS wompi_connected boolean NOT NULL DEFAULT false;
