begin;

create table if not exists public.money_expenses (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  amount numeric not null check (amount > 0),
  category text not null default 'Other',
  merchant text,
  note text,
  is_waste boolean not null default false,
  waste_reason text,
  avoid_next_time text,
  recurring boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.health_routines (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('water','medicine','sleep','meal','other')),
  title text not null,
  details jsonb not null default '{}'::jsonb,
  reminder_times text[] not null default '{}',
  days_of_week int[] not null default '{1,2,3,4,5,6,7}',
  active boolean not null default true,
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.health_routine_logs (
  id uuid primary key default uuid_generate_v4(),
  routine_id uuid not null references public.health_routines(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  date date not null,
  scheduled_time text not null default '',
  status text not null default 'done' check (status in ('done','skipped','missed')),
  value numeric,
  unit text,
  note text,
  completed_at timestamptz default now(),
  created_at timestamptz not null default now(),
  unique(routine_id,date,scheduled_time)
);

create table if not exists public.water_logs (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  date date not null,
  amount_ml int not null check (amount_ml > 0 and amount_ml <= 5000),
  created_at timestamptz not null default now()
);

create table if not exists public.diet_plan_items (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  meal_type text not null default 'Meal',
  meal_time text,
  title text not null,
  details text,
  calories int,
  protein_g numeric,
  days_of_week int[] not null default '{1,2,3,4,5,6,7}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sleep_sessions (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  date date not null,
  bed_time text,
  wake_time text,
  duration_min int check (duration_min is null or (duration_min >= 0 and duration_min <= 1440)),
  quality int check (quality is null or quality between 1 and 10),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['money_expenses','health_routines','health_routine_logs','water_logs','diet_plan_items','sleep_sessions'] loop
    execute format('alter table public.%I enable row level security',t);
  end loop;
end $$;

drop policy if exists "money expenses select" on public.money_expenses;
drop policy if exists "money expenses insert" on public.money_expenses;
drop policy if exists "money expenses update" on public.money_expenses;
drop policy if exists "money expenses delete" on public.money_expenses;
create policy "money expenses select" on public.money_expenses for select
using (public.can_access_module(workspace_id,'money'));
create policy "money expenses insert" on public.money_expenses for insert
with check (public.is_workspace_writer(workspace_id) and public.can_access_module(workspace_id,'money') and created_by=auth.uid());
create policy "money expenses update" on public.money_expenses for update
using (public.is_workspace_writer(workspace_id) and public.can_access_module(workspace_id,'money'))
with check (public.is_workspace_writer(workspace_id) and public.can_access_module(workspace_id,'money'));
create policy "money expenses delete" on public.money_expenses for delete
using (public.is_workspace_writer(workspace_id) and public.can_access_module(workspace_id,'money'));

do $$
declare t text;
begin
  foreach t in array array['health_routines','health_routine_logs','water_logs','diet_plan_items','sleep_sessions'] loop
    execute format('drop policy if exists "health planner select" on public.%I',t);
    execute format('drop policy if exists "health planner insert" on public.%I',t);
    execute format('drop policy if exists "health planner update" on public.%I',t);
    execute format('drop policy if exists "health planner delete" on public.%I',t);
    execute format('create policy "health planner select" on public.%I for select using (public.can_access_module(workspace_id,''health''))',t);
    execute format('create policy "health planner insert" on public.%I for insert with check (public.is_workspace_writer(workspace_id) and public.can_access_module(workspace_id,''health'') and created_by=auth.uid())',t);
    execute format('create policy "health planner update" on public.%I for update using (public.is_workspace_writer(workspace_id) and public.can_access_module(workspace_id,''health'')) with check (public.is_workspace_writer(workspace_id) and public.can_access_module(workspace_id,''health''))',t);
    execute format('create policy "health planner delete" on public.%I for delete using (public.is_workspace_writer(workspace_id) and public.can_access_module(workspace_id,''health''))',t);
  end loop;
end $$;

create index if not exists money_expenses_ws_date_idx on public.money_expenses(workspace_id,date desc);
create index if not exists money_expenses_ws_waste_idx on public.money_expenses(workspace_id,is_waste,date desc);
create index if not exists health_routines_ws_kind_idx on public.health_routines(workspace_id,kind,active);
create index if not exists health_routine_logs_ws_date_idx on public.health_routine_logs(workspace_id,date desc);
create index if not exists water_logs_ws_date_idx on public.water_logs(workspace_id,date desc);
create index if not exists diet_plan_items_ws_active_idx on public.diet_plan_items(workspace_id,active);
create index if not exists sleep_sessions_ws_date_idx on public.sleep_sessions(workspace_id,date desc);

do $$
declare t text;
begin
  foreach t in array array['money_expenses','health_routines','health_routine_logs','water_logs','diet_plan_items','sleep_sessions'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname='supabase_realtime' and schemaname='public' and tablename=t
    ) then
      execute format('alter publication supabase_realtime add table public.%I',t);
    end if;
  end loop;
end $$;

commit;