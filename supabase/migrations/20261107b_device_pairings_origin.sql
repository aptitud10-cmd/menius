-- Where a pairing request came from, shown to the owner BEFORE approving.
--
-- Security review 2026-11-07: the tablet-shows-code / owner-approves direction is
-- the phishable one (RFC 8628): an attacker opens /connect anywhere and sends the
-- owner "menius.app/link?code=…" as "MENIUS support". Approving would hand the
-- attacker a full owner session. Showing "this tablet is in <city>, <country>, and
-- it is / isn't the MENIUS Counter app" lets an owner standing next to their own
-- tablet notice a request from somewhere else.
--
-- Filled from Vercel's geo headers (x-vercel-ip-city/-country-region/-country) and
-- the User-Agent marker. Coarse location only; no IP stored.
alter table public.device_pairings
  add column if not exists request_city    text,
  add column if not exists request_region  text,
  add column if not exists request_country text,
  add column if not exists from_counter_app boolean not null default false;
