begin;

-- Personal habit pins: the same LifeOS Supabase is authoritative.
-- A pin never changes shared habit ownership or log history.
create table if not exists public.user_habit_pins (
 user_id uuid not null references auth.users(id) on delete cascade,
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 habit_id uuid not null references public.habits(id) on delete cascade,
 pinned_at timestamptz not null default now(),
 primary key(user_id,habit_id)
);

alter table public.user_habit_pins enable row level security;
drop policy if exists "habit pins select own" on public.user_habit_pins;
drop policy if exists "habit pins insert own" on public.user_habit_pins;
drop policy if exists "habit pins delete own" on public.user_habit_pins;

create policy "habit pins select own" on public.user_habit_pins for select to authenticated
using(user_id=auth.uid() and public.is_workspace_member(workspace_id));
create policy "habit pins insert own" on public.user_habit_pins for insert to authenticated
with check(user_id=auth.uid() and public.is_workspace_member(workspace_id)
 and exists(select 1 from public.habits h where h.id=habit_id and h.workspace_id=user_habit_pins.workspace_id));
create policy "habit pins delete own" on public.user_habit_pins for delete to authenticated
using(user_id=auth.uid() and public.is_workspace_member(workspace_id));

revoke all on table public.user_habit_pins from anon;
grant select,insert,delete on table public.user_habit_pins to authenticated;
grant all on table public.user_habit_pins to service_role;

create index if not exists user_habit_pins_workspace_idx on public.user_habit_pins(workspace_id,user_id,pinned_at);

do $$
begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='user_habit_pins') then
  alter publication supabase_realtime add table public.user_habit_pins;
 end if;
end $$;

commit;
