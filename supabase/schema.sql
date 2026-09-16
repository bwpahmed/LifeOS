-- LifeOS V1 production schema (Supabase / Postgres). RLS ON everywhere. No RLS bypass.
-- UTC timestamptz; display TZ handled client-side (default Asia/Dubai).

create extension if not exists "uuid-ossp";

-- profiles (1:1 auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text, display_name text default 'Me',
  timezone text default 'Asia/Dubai', currency text default 'AED',
  week_start text default 'monday', date_format text default 'dd-mmm-yyyy', time_format text default '12h',
  daily_focus_target int default 120, weekly_focus_target int default 600,
  morning_planning_time text default '08:00', night_review_time text default '21:30',
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create table workspaces (id uuid primary key default uuid_generate_v4(), name text not null, type text default 'personal', created_by uuid references auth.users, created_at timestamptz default now(), updated_at timestamptz default now());
create table workspace_members (workspace_id uuid references workspaces(id) on delete cascade, user_id uuid references auth.users(id) on delete cascade, role text default 'member', modules text[] default '{}', created_at timestamptz default now(), primary key (workspace_id, user_id));

create table life_areas (id uuid primary key default uuid_generate_v4(), workspace_id uuid references workspaces(id) on delete cascade, name text not null, created_at timestamptz default now());

create table goals (id uuid primary key default uuid_generate_v4(), workspace_id uuid references workspaces(id) on delete cascade, area text, name text not null, why text, target numeric, unit text, deadline date, status text default 'On Track', progress int default 0, privacy text default 'family', created_by uuid references auth.users, created_at timestamptz default now(), updated_at timestamptz default now());
create table goal_milestones (id uuid primary key default uuid_generate_v4(), goal_id uuid references goals(id) on delete cascade, title text, done boolean default false, created_at timestamptz default now());
create table goal_updates (id uuid primary key default uuid_generate_v4(), goal_id uuid references goals(id) on delete cascade, progress int, note text, created_by uuid references auth.users, created_at timestamptz default now());

create table projects (id uuid primary key default uuid_generate_v4(), workspace_id uuid references workspaces(id) on delete cascade, goal_id uuid references goals(id) on delete set null, area text, name text not null, owner text default 'Me', deadline date, status text default 'Active', notes text, privacy text default 'family', created_by uuid references auth.users, created_at timestamptz default now(), updated_at timestamptz default now());
create table project_members (project_id uuid references projects(id) on delete cascade, user_id uuid references auth.users(id) on delete cascade, primary key (project_id, user_id));

create table tasks (
  id uuid primary key default uuid_generate_v4(), workspace_id uuid references workspaces(id) on delete cascade,
  name text not null, description text, area text, goal_id uuid references goals(id) on delete set null,
  project_id uuid references projects(id) on delete set null, milestone_id uuid references goal_milestones(id) on delete set null,
  status text default 'Inbox', importance int default 3, ai_score int,
  start_date date, deadline date, reminder_time text, recurrence jsonb default '{"kind":"none"}',
  estimate_min int default 30, actual_min int default 0, financial_value numeric default 0,
  assigned_to uuid references auth.users, waiting_for text, blocked_by uuid references tasks(id) on delete set null,
  tags text[] default '{}', notes text, privacy text default 'family',
  completed_at timestamptz, created_by uuid references auth.users,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create index tasks_ws_idx on tasks (workspace_id, status, deadline);
create table task_dependencies (task_id uuid references tasks(id) on delete cascade, depends_on uuid references tasks(id) on delete cascade, primary key (task_id, depends_on));
create table task_comments (id uuid primary key default uuid_generate_v4(), task_id uuid references tasks(id) on delete cascade, body text, created_by uuid references auth.users, created_at timestamptz default now());
create table task_activity (id uuid primary key default uuid_generate_v4(), task_id uuid references tasks(id) on delete cascade, action text, detail text, created_by uuid references auth.users, created_at timestamptz default now());

create table habits (id uuid primary key default uuid_generate_v4(), workspace_id uuid references workspaces(id) on delete cascade, name text not null, area text, frequency text default 'Daily', target int default 1, unit text default 'done', kind text default 'build', privacy text default 'family', created_by uuid references auth.users, created_at timestamptz default now(), updated_at timestamptz default now());
create table habit_logs (id uuid primary key default uuid_generate_v4(), habit_id uuid references habits(id) on delete cascade, date date not null, value numeric default 1, created_at timestamptz default now(), unique (habit_id, date));
create table focus_sessions (id uuid primary key default uuid_generate_v4(), workspace_id uuid references workspaces(id) on delete cascade, task_id uuid references tasks(id) on delete set null, date date, minutes int, created_by uuid references auth.users, created_at timestamptz default now());

create table health_entries (id uuid primary key default uuid_generate_v4(), workspace_id uuid references workspaces(id) on delete cascade, date date not null, sleep numeric, energy int, mood int, stress int, steps int, weight numeric, waist numeric, exercise text, protein text, notes text, privacy text default 'private', created_by uuid references auth.users, created_at timestamptz default now());
create table health_documents (id uuid primary key default uuid_generate_v4(), workspace_id uuid references workspaces(id) on delete cascade, title text, path text, privacy text default 'private', created_by uuid references auth.users, created_at timestamptz default now());
create table lab_results (id uuid primary key default uuid_generate_v4(), workspace_id uuid references workspaces(id) on delete cascade, test_name text, date date, result text, result_num numeric, unit text, ref_range text, doctor_notes text, attachment text, privacy text default 'private', created_by uuid references auth.users, created_at timestamptz default now());
create table hair_photos (id uuid primary key default uuid_generate_v4(), workspace_id uuid references workspaces(id) on delete cascade, date date, label text, path text, privacy text default 'private', created_by uuid references auth.users, created_at timestamptz default now());
create table urge_logs (id uuid primary key default uuid_generate_v4(), workspace_id uuid references workspaces(id) on delete cascade, date date, time text, level int, trigger text, response text, outcome text, notes text, privacy text default 'private', created_by uuid references auth.users, created_at timestamptz default now());

create table contacts (id uuid primary key default uuid_generate_v4(), workspace_id uuid references workspaces(id) on delete cascade, name text not null, company text, phone text, whatsapp text, email text, notes text, created_by uuid references auth.users, created_at timestamptz default now());

create table receivables (
  id uuid primary key default uuid_generate_v4(), workspace_id uuid references workspaces(id) on delete cascade,
  contact_id uuid references contacts(id) on delete set null, name text not null, company text,
  phone text, whatsapp text, email text, total numeric not null default 0,
  due_date date, last_followup date, next_followup date, promise_date date,
  status text default 'Due', priority text default 'Normal', notes text, privacy text default 'family',
  created_by uuid references auth.users, created_at timestamptz default now(), updated_at timestamptz default now()
);
create table receivable_payments (id uuid primary key default uuid_generate_v4(), receivable_id uuid references receivables(id) on delete cascade, amount numeric not null, date date, method text, reference text, note text, attachment text, created_by uuid references auth.users, created_at timestamptz default now());
create table receivable_followups (id uuid primary key default uuid_generate_v4(), receivable_id uuid references receivables(id) on delete cascade, date date, method text, note text, promise_date date, next_followup date, status text, created_by uuid references auth.users, created_at timestamptz default now());
create table receivable_documents (id uuid primary key default uuid_generate_v4(), receivable_id uuid references receivables(id) on delete cascade, path text, created_by uuid references auth.users, created_at timestamptz default now());

create table family_members (id uuid primary key default uuid_generate_v4(), workspace_id uuid references workspaces(id) on delete cascade, name text not null, relation text, notes text, created_by uuid references auth.users, created_at timestamptz default now());
create table family_tasks (id uuid primary key default uuid_generate_v4(), workspace_id uuid references workspaces(id) on delete cascade, title text not null, member_id uuid references family_members(id) on delete set null, due_date date, responsible text, status text default 'Pending', reminder_days int default 2, notes text, created_by uuid references auth.users, created_at timestamptz default now(), updated_at timestamptz default now());
create table baby_records (id uuid primary key default uuid_generate_v4(), workspace_id uuid references workspaces(id) on delete cascade, date date, type text, title text, value text, notes text, created_by uuid references auth.users, created_at timestamptz default now());

create table migration_countries (id uuid primary key default uuid_generate_v4(), workspace_id uuid references workspaces(id) on delete cascade, country text, route text, status text default 'Research', progress int default 0, notes text, created_by uuid references auth.users, created_at timestamptz default now());
create table migration_routes (id uuid primary key default uuid_generate_v4(), country_id uuid references migration_countries(id) on delete cascade, route text, requirements text, cost_estimate numeric, documents text, language text, timeline text, next_action text);
create table migration_documents (id uuid primary key default uuid_generate_v4(), workspace_id uuid references workspaces(id) on delete cascade, country_id uuid references migration_countries(id) on delete set null, name text, owner text, status text default 'Missing', issue_date date, expiry_date date, needs_attestation boolean default false, attachment text, notes text, created_by uuid references auth.users, created_at timestamptz default now());
create table migration_tasks (id uuid primary key default uuid_generate_v4(), workspace_id uuid references workspaces(id) on delete cascade, country_id uuid references migration_countries(id) on delete cascade, title text, due_date date, status text default 'Pending', created_by uuid references auth.users, created_at timestamptz default now());

create table calendar_items (id uuid primary key default uuid_generate_v4(), workspace_id uuid references workspaces(id) on delete cascade, title text, kind text, starts_at timestamptz, ends_at timestamptz, ref_table text, ref_id uuid, created_by uuid references auth.users, created_at timestamptz default now());
create table journal_entries (id uuid primary key default uuid_generate_v4(), workspace_id uuid references workspaces(id) on delete cascade, date date, mood text, body text, tags text[] default '{}', privacy text default 'private', created_by uuid references auth.users, created_at timestamptz default now());
create table daily_reviews (id uuid primary key default uuid_generate_v4(), workspace_id uuid references workspaces(id) on delete cascade, date date, accomplishment text, incomplete text, blocker text, energy int, improve text, snapshot jsonb, created_by uuid references auth.users, created_at timestamptz default now());
create table weekly_reviews (id uuid primary key default uuid_generate_v4(), workspace_id uuid references workspaces(id) on delete cascade, date date, snapshot jsonb, created_by uuid references auth.users, created_at timestamptz default now());
create table monthly_reviews (id uuid primary key default uuid_generate_v4(), workspace_id uuid references workspaces(id) on delete cascade, month text, snapshot jsonb, created_by uuid references auth.users, created_at timestamptz default now());

create table automation_rules (id uuid primary key default uuid_generate_v4(), workspace_id uuid references workspaces(id) on delete cascade, name text, trigger text, conditions jsonb default '{}', action text, enabled boolean default true, created_by uuid references auth.users, created_at timestamptz default now());
create table automation_runs (id uuid primary key default uuid_generate_v4(), rule_id uuid references automation_rules(id) on delete cascade, changes int default 0, created_at timestamptz default now());
create table notifications (id uuid primary key default uuid_generate_v4(), workspace_id uuid references workspaces(id) on delete cascade, user_id uuid references auth.users(id) on delete cascade, title text, body text, severity text default 'normal', ref_table text, ref_id uuid, snoozed_until timestamptz, read_at timestamptz, created_at timestamptz default now());
create table notification_preferences (user_id uuid primary key references auth.users(id) on delete cascade, quiet_start text default '22:30', quiet_end text default '07:00', allow_critical_in_quiet boolean default false, push_endpoint jsonb);
create table push_subscriptions (id uuid primary key default uuid_generate_v4(), user_id uuid references auth.users(id) on delete cascade, endpoint text unique, keys jsonb, created_at timestamptz default now());
create table attachments (id uuid primary key default uuid_generate_v4(), workspace_id uuid references workspaces(id) on delete cascade, owner_table text, owner_id uuid, path text, created_by uuid references auth.users, created_at timestamptz default now());
create table activity_log (id uuid primary key default uuid_generate_v4(), workspace_id uuid references workspaces(id) on delete cascade, action text, object_table text, object_id uuid, detail text, created_by uuid references auth.users, created_at timestamptz default now());
create table ai_conversations (id uuid primary key default uuid_generate_v4(), workspace_id uuid references workspaces(id) on delete cascade, title text, created_by uuid references auth.users, created_at timestamptz default now());
create table ai_suggestions (id uuid primary key default uuid_generate_v4(), conversation_id uuid references ai_conversations(id) on delete cascade, kind text, payload jsonb, status text default 'proposed', created_at timestamptz default now());
create table user_settings (user_id uuid primary key references auth.users(id) on delete cascade, settings jsonb default '{}', updated_at timestamptz default now());
create table sync_queue (id uuid primary key default uuid_generate_v4(), user_id uuid references auth.users(id) on delete cascade, table_name text, op text, row jsonb, client_updated_at timestamptz, created_at timestamptz default now());

-- RLS: enable + workspace-membership checks (representative; repeat per table in migration runner)
alter table profiles enable row level security;
alter table tasks enable row level security;
alter table receivables enable row level security;
alter table health_entries enable row level security;
alter table urge_logs enable row level security;
alter table journal_entries enable row level security;

create policy "own profile" on profiles for all using (auth.uid() = id);
create policy "workspace member tasks" on tasks for all using (
  exists (select 1 from workspace_members m where m.workspace_id = tasks.workspace_id and m.user_id = auth.uid())
);
create policy "workspace member receivables" on receivables for all using (
  exists (select 1 from workspace_members m where m.workspace_id = receivables.workspace_id and m.user_id = auth.uid())
);
-- Private tables: additionally require owner/admin OR explicit module grant
create policy "private health" on health_entries for all using (
  exists (select 1 from workspace_members m where m.workspace_id = health_entries.workspace_id and m.user_id = auth.uid()
    and (m.role in ('owner','admin') or 'health' = any(m.modules)))
);
create policy "private urges" on urge_logs for all using (
  exists (select 1 from workspace_members m where m.workspace_id = urge_logs.workspace_id and m.user_id = auth.uid()
    and (m.role in ('owner','admin') or 'self_control' = any(m.modules)))
);
create policy "private journal" on journal_entries for all using (
  exists (select 1 from workspace_members m where m.workspace_id = journal_entries.workspace_id and m.user_id = auth.uid()
    and (m.role in ('owner','admin') or 'journal' = any(m.modules)))
);
