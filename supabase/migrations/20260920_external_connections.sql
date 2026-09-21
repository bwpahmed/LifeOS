begin;

create table if not exists public.external_connections (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  account_email text,
  access_token_enc text,
  refresh_token_enc text,
  token_expires_at timestamptz,
  scopes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, provider)
);

alter table public.external_connections enable row level security;

drop policy if exists "external connection own select" on public.external_connections;
drop policy if exists "external connection own insert" on public.external_connections;
drop policy if exists "external connection own update" on public.external_connections;

create policy "external connection own select" on public.external_connections
for select to authenticated
using (user_id = auth.uid() and public.is_workspace_member(workspace_id));

create policy "external connection own insert" on public.external_connections
for insert to authenticated
with check (user_id = auth.uid() and public.is_workspace_writer(workspace_id));

create policy "external connection own update" on public.external_connections
for update to authenticated
using (user_id = auth.uid() and public.is_workspace_writer(workspace_id))
with check (user_id = auth.uid() and public.is_workspace_writer(workspace_id));

create index if not exists external_connections_user_provider_idx
on public.external_connections(user_id,provider);

commit;
