begin;
drop policy if exists "external connection own select" on public.external_connections;
-- External tokens are intentionally server-only. Authenticated clients cannot SELECT this table directly.
commit;