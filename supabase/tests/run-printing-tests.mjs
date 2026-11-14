// Corre supabase/tests/printing_cloudprnt.test.sql contra un Postgres en memoria
// (PGlite, WASM): no necesita Docker ni toca ninguna base real.
//
//   npm i --no-save @electric-sql/pglite@0.3.7
//   node supabase/tests/run-printing-tests.mjs
//
// (o PGLITE_PATH=/ruta/a/node_modules/@electric-sql/pglite/dist/index.js)
//
// El stub reproduce lo que importa de prod (verificado 2026-11-14):
//  - roles anon / authenticated con default privileges ALL en tablas nuevas
//    de public (como pg_default_acl en prod) → el test de RLS es honesto.
//  - auth.uid() leyendo request.jwt.claims, como Supabase.
//  - user_owns_restaurant() idéntica a la de prod.
//  - sin pg_cron (la migración lo saltea; los tests llaman a las funciones).
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const spec = process.env.PGLITE_PATH ? pathToFileURL(process.env.PGLITE_PATH).href : '@electric-sql/pglite';
const { PGlite } = await import(spec);

const STUB = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;

create schema auth;
grant usage on schema auth to anon, authenticated;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub', '')::uuid
$$;
grant execute on function auth.uid() to anon, authenticated;

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  owner_user_id uuid not null references auth.users(id)
);
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id),
  order_number text not null,
  status text not null default 'pending',
  notes text default '',
  order_type text default 'dine_in',
  payment_method text default 'cash',
  payment_status text default 'pending',
  created_at timestamptz default now()
);
alter table public.restaurants enable row level security;
alter table public.orders enable row level security;

create function public.user_owns_restaurant(rest_id uuid) returns boolean
language sql stable security definer set search_path to '' as $$
  select exists (select 1 from public.restaurants
                 where id = rest_id and owner_user_id = (select auth.uid()));
$$;
`;

const migration = readFileSync(join(here, '..', 'migrations', '20261114_printing_cloudprnt.sql'), 'utf8');
const tests = readFileSync(join(here, 'printing_cloudprnt.test.sql'), 'utf8');

const db = new PGlite();
try {
  await db.exec(STUB);
  await db.exec(migration);
  // La migración tiene que ser re-ejecutable (if not exists / or replace / drop if exists).
  await db.exec(migration);
  const results = await db.exec(tests);
  const passed = results.some((r) => r.rows?.some((row) => row.result === 'ALL PRINTING TESTS PASSED'));
  if (!passed) throw new Error('No llegó al final de los tests');
  console.log('ALL PRINTING TESTS PASSED');
} catch (err) {
  console.error('FALLÓ:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await db.close();
}
