begin;

create table if not exists public.time_entries (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  date date not null,
  category text not null check (category in ('Work','Family','Health','Growth','Social media','Admin','Other')),
  minutes int not null check (minutes > 0 and minutes <= 1440),
  task_id uuid references public.tasks(id) on delete set null,
  note text,
  source text not null default 'manual',
  created_at timestamptz not null default now()
);

create table if not exists public.morning_checkins (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  date date not null,
  sleep_hours numeric,
  energy int check (energy is null or energy between 1 and 10),
  mood int check (mood is null or mood between 1 and 10),
  sleep_quality int check (sleep_quality is null or sleep_quality between 1 and 10),
  main_goal text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id,created_by,date)
);

alter table public.time_entries enable row level security;
alter table public.morning_checkins enable row level security;

drop policy if exists "time entries module" on public.time_entries;
create policy "time entries module" on public.time_entries for all
using (public.can_access_module(workspace_id,'tasks'))
with check (public.is_workspace_writer(workspace_id) and public.can_access_module(workspace_id,'tasks') and created_by=auth.uid());

drop policy if exists "morning checkin module" on public.morning_checkins;
create policy "morning checkin module" on public.morning_checkins for all
using (public.can_access_module(workspace_id,'tasks'))
with check (public.is_workspace_writer(workspace_id) and public.can_access_module(workspace_id,'tasks') and created_by=auth.uid());

create index if not exists time_entries_ws_date_idx on public.time_entries(workspace_id,date desc);
create index if not exists morning_checkins_ws_date_idx on public.morning_checkins(workspace_id,date desc);

do $$
declare t text;
begin
  foreach t in array array['time_entries','morning_checkins'] loop
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
      execute format('alter publication supabase_realtime add table public.%I',t);
    end if;
  end loop;
end $$;

commit;