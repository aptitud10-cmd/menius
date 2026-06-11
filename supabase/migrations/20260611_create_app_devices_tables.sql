-- Create app_devices and app_device_tokens tables.
--
-- These tables were created manually in the Supabase dashboard and never had
-- a migration. This migration documents the schema so preview branches and
-- fresh restores work correctly.
--
-- If applied against a DB where the tables already exist, the IF NOT EXISTS
-- guards make it a no-op.

CREATE TABLE IF NOT EXISTS public.app_devices (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_uuid      text NOT NULL,
  platform         text NOT NULL,
  app_version      text,
  os_version       text,
  display_name     text,
  phone            text,
  phone_verified_at timestamptz,
  email            text,
  favorites        jsonb NOT NULL DEFAULT '[]'::jsonb,
  addresses        jsonb NOT NULL DEFAULT '[]'::jsonb,
  preferences      jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_seen_at     timestamptz NOT NULL DEFAULT now(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_devices_device_uuid_key UNIQUE (device_uuid)
);

CREATE TABLE IF NOT EXISTS public.app_device_tokens (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id        uuid NOT NULL REFERENCES public.app_devices (id) ON DELETE CASCADE,
  expo_push_token  text NOT NULL,
  platform         text NOT NULL,
  is_active        boolean NOT NULL DEFAULT true,
  last_used_at     timestamptz NOT NULL DEFAULT now(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_device_tokens_device_id_expo_push_token_key UNIQUE (device_id, expo_push_token)
);

-- RLS: service_role (admin client) bypasses RLS — no anon policies needed.
ALTER TABLE public.app_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_device_tokens ENABLE ROW LEVEL SECURITY;

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS app_devices_phone_idx ON public.app_devices (phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS app_device_tokens_device_id_active_idx ON public.app_device_tokens (device_id) WHERE is_active = true;
