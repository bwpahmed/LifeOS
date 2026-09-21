-- LifeOS: intentional spending + practical health tracking.
-- Supabase remains the single source of truth. RLS mirrors existing workspace rules.

create table if not exists expenses (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  date date not null default current_date,
  amount numeric not null check (amount >= 0),
  category text not null default 'Other',
  merchant text,
  note text,
  is_waste boolean not null default false,
  waste_reason text,
  created_by uuid references auth.users,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists expenses_ws_date_idx on expenses(workspace_id, date desc);

create table if not exists health_reminders (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  kind text not null check (kind in ('water','medicine','sleep','diet','other')),
  title text not null,
  time text,
  target numeric,
  unit text,
  days text[] default array['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
  enabled boolean not null default true,
  notes text,
  created_by uuid references auth.users,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists diet_plan_items (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  meal text not null,
  title text not null,
  target_time text,
  calories numeric,
  protein_g numeric,
  notes text,
  active boolean not null default true,
  created_by uuid references auth.users,
  created_at timestamptz default now()
);

create table if not exists sleep_logs (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  sleep_date date not null default current_date,
  bedtime time,
  wake_time time,
  duration_hours numeric,
  quality int check (quality between 1 and 10),
  notes text,
  created_by uuid references auth.users,
  created_at timestamptz default now()
);

alter table expenses enable row level security;
alter table health_reminders enable row level security;
alter table diet_plan_items enable row level security;
alter table sleep_logs enable row level security;

create policy "workspace member expenses" on expenses for all using (
  exists (select 1 from workspace_members m where m.workspace_id = expenses.workspace_id and m.user_id = auth.uid())
) with check (
  exists (select 1 from workspace_members m where m.workspace_id = expenses.workspace_id and m.user_id = auth.uid())
);

create policy "private health reminders" on health_reminders for all using (
  exists (select 1 from workspace_members m where m.workspace_id = health_reminders.workspace_id and m.user_id = auth.uid()
    and (m.role in ('owner','admin') or 'health' = any(m.modules)))
) with check (
  exists (select 1 from workspace_members m where m.workspace_id = health_reminders.workspace_id and m.user_id = auth.uid()
    and (m.role in ('owner','admin') or 'health' = any(m.modules)))
);

create policy "private diet plan" on diet_plan_items for all using (
  exists (select 1 from workspace_members m where m.workspace_id = diet_plan_items.workspace_id and m.user_id = auth.uid()
    and (m.role in ('owner','admin') or 'health' = any(m.modules)))
) with check (
  exists (select 1 from workspace_members m where m.workspace_id = diet_plan_items.workspace_id and m.user_id = auth.uid()
    and (m.role in ('owner','admin') or 'health' = any(m.modules)))
);

create policy "private sleep logs" on sleep_logs for all using (
  exists (select 1 from workspace_members m where m.workspace_id = sleep_logs.workspace_id and m.user_id = auth.uid()
    and (m.role in ('owner','admin') or 'health' = any(m.modules)))
) with check (
  exists (select 1 from workspace_members m where m.workspace_id = sleep_logs.workspace_id and m.user_id = auth.uid()
    and (m.role in ('owner','admin') or 'health' = any(m.modules)))
);
