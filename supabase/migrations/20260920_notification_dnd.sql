begin;

create table if not exists public.notification_dnd_blocks (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  start_time text not null,
  end_time text not null,
  days_of_week int[] not null default '{1,2,3,4,5,6,7}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.notification_dnd_blocks enable row level security;
drop policy if exists "own dnd blocks" on public.notification_dnd_blocks;
create policy "own dnd blocks" on public.notification_dnd_blocks for all
using (user_id=auth.uid() and public.is_workspace_member(workspace_id))
with check (user_id=auth.uid() and public.is_workspace_writer(workspace_id));
create index if not exists notification_dnd_user_idx on public.notification_dnd_blocks(user_id,active);
commit;