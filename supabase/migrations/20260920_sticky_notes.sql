begin;

create table if not exists public.sticky_notes (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  title text not null default 'Important note',
  body text not null default '',
  color text not null default 'yellow',
  pinned boolean not null default true,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sticky_notes enable row level security;

drop policy if exists "sticky notes select" on public.sticky_notes;
drop policy if exists "sticky notes insert" on public.sticky_notes;
drop policy if exists "sticky notes update" on public.sticky_notes;

create policy "sticky notes select" on public.sticky_notes
for select to authenticated
using (
  created_by = auth.uid()
  and public.is_workspace_member(workspace_id)
);

create policy "sticky notes insert" on public.sticky_notes
for insert to authenticated
with check (
  created_by = auth.uid()
  and public.is_workspace_writer(workspace_id)
);

create policy "sticky notes update" on public.sticky_notes
for update to authenticated
using (
  created_by = auth.uid()
  and public.is_workspace_writer(workspace_id)
)
with check (
  created_by = auth.uid()
  and public.is_workspace_writer(workspace_id)
);

-- Intentionally no DELETE policy. Sticky notes are permanent records.
-- Users may archive/unarchive or edit them, but not permanently delete them.

create index if not exists sticky_notes_workspace_updated_idx
  on public.sticky_notes(workspace_id, archived, updated_at desc);

commit;
