begin;

alter table public.notifications
  add column if not exists push_sent_at timestamptz,
  add column if not exists push_attempted_at timestamptz,
  add column if not exists push_attempts integer not null default 0,
  add column if not exists push_error text;

create or replace function public.lifeos_vapid_config()
returns table(public_key text, private_key text, subject text)
language sql
security definer
set search_path = public, vault
as $$
  select
    (select decrypted_secret from vault.decrypted_secrets where name='lifeos_vapid_public' limit 1),
    (select decrypted_secret from vault.decrypted_secrets where name='lifeos_vapid_private' limit 1),
    (select decrypted_secret from vault.decrypted_secrets where name='lifeos_vapid_subject' limit 1);
$$;

revoke all on function public.lifeos_vapid_config() from public, anon, authenticated;
grant execute on function public.lifeos_vapid_config() to service_role;

create index if not exists notifications_push_dispatch_idx
  on public.notifications(user_id, push_sent_at, created_at desc)
  where read_at is null;

commit;