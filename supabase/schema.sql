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

-- Production RLS, auth bootstrap and private storage policies.
-- Kept in sync with supabase/migrations/20260919_security_bootstrap.sql.
-- LifeOS production hardening: full RLS coverage + automatic personal workspace bootstrap.
-- Safe to run after the baseline schema. No destructive table/data changes.
begin;

create or replace function public.is_workspace_member(ws uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = ws and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_writer(ws uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = ws
      and m.user_id = auth.uid()
      and m.role in ('owner','admin','member')
  );
$$;

create or replace function public.is_workspace_admin(ws uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = ws
      and m.user_id = auth.uid()
      and m.role in ('owner','admin')
  );
$$;

create or replace function public.can_access_module(ws uuid, module_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = ws
      and m.user_id = auth.uid()
      and (m.role in ('owner','admin') or module_name = any(m.modules))
  );
$$;

grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.is_workspace_writer(uuid) to authenticated;
grant execute on function public.is_workspace_admin(uuid) to authenticated;
grant execute on function public.can_access_module(uuid,text) to authenticated;


create or replace function public.can_access_private_row(
  ws uuid, owner_id uuid, privacy_level text, area_name text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = ws
      and m.user_id = auth.uid()
      and (
        coalesce(privacy_level,'family') <> 'private'
        or owner_id = auth.uid()
        or m.role in ('owner','admin')
        or (area_name = 'Health' and 'health' = any(m.modules))
        or (area_name = 'Self-control' and 'self_control' = any(m.modules))
      )
  );
$$;

grant execute on function public.can_access_private_row(uuid,uuid,text,text) to authenticated;

create or replace function public.handle_new_lifeos_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ws uuid;
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name','Me'))
  on conflict (id) do nothing;

  if not exists (select 1 from public.workspace_members where user_id = new.id) then
    insert into public.workspaces (name, type, created_by)
    values ('My LifeOS', 'personal', new.id)
    returning id into ws;

    insert into public.workspace_members (workspace_id, user_id, role, modules)
    values (
      ws, new.id, 'owner',
      array['tasks','money','health','self_control','journal','family','baby','calendar','europe','business']
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_lifeos on auth.users;
create trigger on_auth_user_created_lifeos
after insert on auth.users
for each row execute procedure public.handle_new_lifeos_user();

-- Backfill existing authenticated users who pre-date the bootstrap trigger.
do $$
declare
  u record;
  ws uuid;
begin
  for u in select id, email, raw_user_meta_data from auth.users loop
    insert into public.profiles (id, email, display_name)
    values (u.id, u.email, coalesce(u.raw_user_meta_data->>'display_name','Me'))
    on conflict (id) do nothing;

    if not exists (select 1 from public.workspace_members where user_id = u.id) then
      insert into public.workspaces (name, type, created_by)
      values ('My LifeOS', 'personal', u.id)
      returning id into ws;
      insert into public.workspace_members (workspace_id, user_id, role, modules)
      values (
        ws, u.id, 'owner',
        array['tasks','money','health','self_control','journal','family','baby','calendar','europe','business']
      );
    end if;
  end loop;
end $$;

-- Enable RLS on every application table.
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles','workspaces','workspace_members','life_areas','goals','goal_milestones','goal_updates',
    'projects','project_members','tasks','task_dependencies','task_comments','task_activity',
    'habits','habit_logs','focus_sessions','health_entries','health_documents','lab_results','hair_photos','urge_logs',
    'contacts','receivables','receivable_payments','receivable_followups','receivable_documents',
    'family_members','family_tasks','baby_records','migration_countries','migration_routes','migration_documents','migration_tasks',
    'calendar_items','journal_entries','daily_reviews','weekly_reviews','monthly_reviews',
    'automation_rules','automation_runs','notifications','notification_preferences','push_subscriptions',
    'attachments','activity_log','ai_conversations','ai_suggestions','user_settings','sync_queue'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "workspace read" on public.workspaces;
drop policy if exists "workspace create" on public.workspaces;
drop policy if exists "workspace admin update" on public.workspaces;
drop policy if exists "workspace admin delete" on public.workspaces;
create policy "workspace read" on public.workspaces for select using (public.is_workspace_member(id));
create policy "workspace create" on public.workspaces for insert with check (created_by = auth.uid());
create policy "workspace admin update" on public.workspaces for update using (public.is_workspace_admin(id)) with check (public.is_workspace_admin(id));
create policy "workspace admin delete" on public.workspaces for delete using (public.is_workspace_admin(id));

drop policy if exists "workspace members read" on public.workspace_members;
drop policy if exists "workspace members admin insert" on public.workspace_members;
drop policy if exists "workspace members admin update" on public.workspace_members;
drop policy if exists "workspace members admin delete" on public.workspace_members;
create policy "workspace members read" on public.workspace_members for select using (public.is_workspace_member(workspace_id));
create policy "workspace members admin insert" on public.workspace_members for insert with check (public.is_workspace_admin(workspace_id));
create policy "workspace members admin update" on public.workspace_members for update using (public.is_workspace_admin(workspace_id)) with check (public.is_workspace_admin(workspace_id));
create policy "workspace members admin delete" on public.workspace_members for delete using (public.is_workspace_admin(workspace_id));

-- Workspace tables: members can read, writers can mutate.
do $$
declare
  t text;
begin
  foreach t in array array[
    'life_areas','goals','projects','tasks','habits','focus_sessions','contacts','receivables',
    'family_members','family_tasks','baby_records','migration_countries','migration_documents','migration_tasks',
    'calendar_items','daily_reviews','weekly_reviews','monthly_reviews','automation_rules',
    'attachments','activity_log','ai_conversations'
  ] loop
    execute format('drop policy if exists "workspace select" on public.%I', t);
    execute format('drop policy if exists "workspace insert" on public.%I', t);
    execute format('drop policy if exists "workspace update" on public.%I', t);
    execute format('drop policy if exists "workspace delete" on public.%I', t);
    execute format('create policy "workspace select" on public.%I for select using (public.is_workspace_member(workspace_id))', t);
    execute format('create policy "workspace insert" on public.%I for insert with check (public.is_workspace_writer(workspace_id))', t);
    execute format('create policy "workspace update" on public.%I for update using (public.is_workspace_writer(workspace_id)) with check (public.is_workspace_writer(workspace_id))', t);
    execute format('create policy "workspace delete" on public.%I for delete using (public.is_workspace_writer(workspace_id))', t);
  end loop;
end $$;


-- Row-level privacy for generic hierarchy tables that can contain sensitive Health/Self-control items.
do $$
declare
  t text;
begin
  foreach t in array array['goals','projects','tasks','habits'] loop
    execute format('drop policy if exists "workspace select" on public.%I', t);
    execute format('drop policy if exists "workspace insert" on public.%I', t);
    execute format('drop policy if exists "workspace update" on public.%I', t);
    execute format('drop policy if exists "workspace delete" on public.%I', t);
    execute format('drop policy if exists "private row select" on public.%I', t);
    execute format('drop policy if exists "private row insert" on public.%I', t);
    execute format('drop policy if exists "private row update" on public.%I', t);
    execute format('drop policy if exists "private row delete" on public.%I', t);
    execute format('create policy "private row select" on public.%I for select using (public.can_access_private_row(workspace_id,created_by,privacy,area))', t);
    execute format('create policy "private row insert" on public.%I for insert with check (public.is_workspace_writer(workspace_id) and public.can_access_private_row(workspace_id,created_by,privacy,area))', t);
    execute format('create policy "private row update" on public.%I for update using (public.is_workspace_writer(workspace_id) and public.can_access_private_row(workspace_id,created_by,privacy,area)) with check (public.is_workspace_writer(workspace_id) and public.can_access_private_row(workspace_id,created_by,privacy,area))', t);
    execute format('create policy "private row delete" on public.%I for delete using (public.is_workspace_writer(workspace_id) and public.can_access_private_row(workspace_id,created_by,privacy,area))', t);
  end loop;
end $$;

-- Private modules require owner/admin or an explicit module grant.
do $$
declare
  t text;
begin
  foreach t in array array['health_entries','health_documents','lab_results','hair_photos'] loop
    execute format('drop policy if exists "private module select" on public.%I', t);
    execute format('drop policy if exists "private module insert" on public.%I', t);
    execute format('drop policy if exists "private module update" on public.%I', t);
    execute format('drop policy if exists "private module delete" on public.%I', t);
    execute format('create policy "private module select" on public.%I for select using (public.can_access_module(workspace_id,''health''))', t);
    execute format('create policy "private module insert" on public.%I for insert with check (public.can_access_module(workspace_id,''health'') and public.is_workspace_writer(workspace_id))', t);
    execute format('create policy "private module update" on public.%I for update using (public.can_access_module(workspace_id,''health'') and public.is_workspace_writer(workspace_id)) with check (public.can_access_module(workspace_id,''health'') and public.is_workspace_writer(workspace_id))', t);
    execute format('create policy "private module delete" on public.%I for delete using (public.can_access_module(workspace_id,''health'') and public.is_workspace_writer(workspace_id))', t);
  end loop;
end $$;

drop policy if exists "private urges" on public.urge_logs;
create policy "private urges" on public.urge_logs for all
using (public.can_access_module(workspace_id,'self_control'))
with check (public.can_access_module(workspace_id,'self_control') and public.is_workspace_writer(workspace_id));

drop policy if exists "private journal" on public.journal_entries;
create policy "private journal" on public.journal_entries for all
using (public.can_access_module(workspace_id,'journal'))
with check (public.can_access_module(workspace_id,'journal') and public.is_workspace_writer(workspace_id));

-- Child-table access follows the parent workspace.
drop policy if exists "goal milestone access" on public.goal_milestones;
create policy "goal milestone access" on public.goal_milestones for all
using (exists(select 1 from public.goals g where g.id=goal_id and public.is_workspace_member(g.workspace_id)))
with check (exists(select 1 from public.goals g where g.id=goal_id and public.is_workspace_writer(g.workspace_id)));

drop policy if exists "goal update access" on public.goal_updates;
create policy "goal update access" on public.goal_updates for all
using (exists(select 1 from public.goals g where g.id=goal_id and public.is_workspace_member(g.workspace_id)))
with check (exists(select 1 from public.goals g where g.id=goal_id and public.is_workspace_writer(g.workspace_id)));

drop policy if exists "project member access" on public.project_members;
create policy "project member access" on public.project_members for all
using (exists(select 1 from public.projects p where p.id=project_id and public.is_workspace_member(p.workspace_id)))
with check (exists(select 1 from public.projects p where p.id=project_id and public.is_workspace_admin(p.workspace_id)));

drop policy if exists "task dependency access" on public.task_dependencies;
create policy "task dependency access" on public.task_dependencies for all
using (exists(select 1 from public.tasks t where t.id=task_id and public.is_workspace_member(t.workspace_id)))
with check (exists(select 1 from public.tasks t where t.id=task_id and public.is_workspace_writer(t.workspace_id)));

drop policy if exists "task comment access" on public.task_comments;
create policy "task comment access" on public.task_comments for all
using (exists(select 1 from public.tasks t where t.id=task_id and public.is_workspace_member(t.workspace_id)))
with check (exists(select 1 from public.tasks t where t.id=task_id and public.is_workspace_writer(t.workspace_id)));

drop policy if exists "task activity access" on public.task_activity;
create policy "task activity access" on public.task_activity for all
using (exists(select 1 from public.tasks t where t.id=task_id and public.is_workspace_member(t.workspace_id)))
with check (exists(select 1 from public.tasks t where t.id=task_id and public.is_workspace_writer(t.workspace_id)));

drop policy if exists "habit log access" on public.habit_logs;
create policy "habit log access" on public.habit_logs for all
using (exists(select 1 from public.habits h where h.id=habit_id and public.is_workspace_member(h.workspace_id)))
with check (exists(select 1 from public.habits h where h.id=habit_id and public.is_workspace_writer(h.workspace_id)));

do $$
declare
  t text;
begin
  foreach t in array array['receivable_payments','receivable_followups','receivable_documents'] loop
    execute format('drop policy if exists "receivable child access" on public.%I', t);
    execute format(
      'create policy "receivable child access" on public.%I for all using (exists(select 1 from public.receivables r where r.id=receivable_id and public.is_workspace_member(r.workspace_id))) with check (exists(select 1 from public.receivables r where r.id=receivable_id and public.is_workspace_writer(r.workspace_id)))',
      t
    );
  end loop;
end $$;

drop policy if exists "migration route access" on public.migration_routes;
create policy "migration route access" on public.migration_routes for all
using (exists(select 1 from public.migration_countries c where c.id=country_id and public.is_workspace_member(c.workspace_id)))
with check (exists(select 1 from public.migration_countries c where c.id=country_id and public.is_workspace_writer(c.workspace_id)));

drop policy if exists "automation run access" on public.automation_runs;
create policy "automation run access" on public.automation_runs for all
using (exists(select 1 from public.automation_rules r where r.id=rule_id and public.is_workspace_member(r.workspace_id)))
with check (exists(select 1 from public.automation_rules r where r.id=rule_id and public.is_workspace_writer(r.workspace_id)));

drop policy if exists "ai suggestion access" on public.ai_suggestions;
create policy "ai suggestion access" on public.ai_suggestions for all
using (exists(select 1 from public.ai_conversations c where c.id=conversation_id and public.is_workspace_member(c.workspace_id)))
with check (exists(select 1 from public.ai_conversations c where c.id=conversation_id and public.is_workspace_writer(c.workspace_id)));

drop policy if exists "workspace select" on public.notifications;
drop policy if exists "workspace insert" on public.notifications;
drop policy if exists "workspace update" on public.notifications;
drop policy if exists "workspace delete" on public.notifications;
drop policy if exists "own notifications select" on public.notifications;
drop policy if exists "own notifications update" on public.notifications;
drop policy if exists "own notifications delete" on public.notifications;
create policy "own notifications select" on public.notifications for select
using (user_id = auth.uid());
create policy "own notifications update" on public.notifications for update
using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own notifications delete" on public.notifications for delete
using (user_id = auth.uid());

drop policy if exists "own notification preferences" on public.notification_preferences;
create policy "own notification preferences" on public.notification_preferences for all
using (user_id=auth.uid()) with check (user_id=auth.uid());

drop policy if exists "own push subscriptions" on public.push_subscriptions;
create policy "own push subscriptions" on public.push_subscriptions for all
using (user_id=auth.uid()) with check (user_id=auth.uid());

drop policy if exists "own user settings" on public.user_settings;
create policy "own user settings" on public.user_settings for all
using (user_id=auth.uid()) with check (user_id=auth.uid());

drop policy if exists "own sync queue" on public.sync_queue;
create policy "own sync queue" on public.sync_queue for all
using (user_id=auth.uid()) with check (user_id=auth.uid());


-- Private workspace storage. New objects use:
-- <workspace_id>/<uploader_user_id>/<health|hair|money>/...
-- Legacy <user_id>/... paths remain readable/manageable by that same user.
create or replace function public.private_storage_workspace(object_name text)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  raw_id text;
begin
  raw_id := split_part(object_name, '/', 1);
  if raw_id = coalesce(auth.uid()::text, '') then
    return null;
  end if;
  begin
    return raw_id::uuid;
  exception when invalid_text_representation then
    return null;
  end;
end;
$$;

create or replace function public.private_storage_module(object_name text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case split_part(object_name, '/', 3)
    when 'health' then 'health'
    when 'hair' then 'health'
    when 'money' then 'money'
    else null
  end;
$$;

create or replace function public.can_read_private_storage(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  ws uuid;
  module_name text;
begin
  if split_part(object_name, '/', 1) = coalesce(auth.uid()::text, '') then
    return true;
  end if;
  ws := public.private_storage_workspace(object_name);
  module_name := public.private_storage_module(object_name);
  return ws is not null
    and module_name is not null
    and public.can_access_module(ws, module_name);
end;
$$;

create or replace function public.can_insert_private_storage(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  ws uuid;
  module_name text;
begin
  if split_part(object_name, '/', 1) = coalesce(auth.uid()::text, '') then
    return true;
  end if;
  ws := public.private_storage_workspace(object_name);
  module_name := public.private_storage_module(object_name);
  return ws is not null
    and module_name is not null
    and split_part(object_name, '/', 2) = coalesce(auth.uid()::text, '')
    and public.is_workspace_writer(ws)
    and public.can_access_module(ws, module_name);
end;
$$;

create or replace function public.can_manage_private_storage(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  ws uuid;
  module_name text;
begin
  if split_part(object_name, '/', 1) = coalesce(auth.uid()::text, '') then
    return true;
  end if;
  ws := public.private_storage_workspace(object_name);
  module_name := public.private_storage_module(object_name);
  return ws is not null
    and module_name is not null
    and public.is_workspace_writer(ws)
    and public.can_access_module(ws, module_name);
end;
$$;

revoke all on function public.private_storage_workspace(text) from public;
revoke all on function public.private_storage_module(text) from public;
revoke all on function public.can_read_private_storage(text) from public;
revoke all on function public.can_insert_private_storage(text) from public;
revoke all on function public.can_manage_private_storage(text) from public;
grant execute on function public.private_storage_workspace(text) to authenticated;
grant execute on function public.private_storage_module(text) to authenticated;
grant execute on function public.can_read_private_storage(text) to authenticated;
grant execute on function public.can_insert_private_storage(text) to authenticated;
grant execute on function public.can_manage_private_storage(text) to authenticated;

insert into storage.buckets (id, name, public)
values ('lifeos-private', 'lifeos-private', false)
on conflict (id) do update set public = false;

drop policy if exists "lifeos private storage select" on storage.objects;
drop policy if exists "lifeos private storage insert" on storage.objects;
drop policy if exists "lifeos private storage update" on storage.objects;
drop policy if exists "lifeos private storage delete" on storage.objects;

create policy "lifeos private storage select" on storage.objects
for select to authenticated
using (bucket_id = 'lifeos-private' and public.can_read_private_storage(name));

create policy "lifeos private storage insert" on storage.objects
for insert to authenticated
with check (bucket_id = 'lifeos-private' and public.can_insert_private_storage(name));

create policy "lifeos private storage update" on storage.objects
for update to authenticated
using (bucket_id = 'lifeos-private' and public.can_manage_private_storage(name))
with check (bucket_id = 'lifeos-private' and public.can_manage_private_storage(name));

create policy "lifeos private storage delete" on storage.objects
for delete to authenticated
using (bucket_id = 'lifeos-private' and public.can_manage_private_storage(name));


-- Realtime publication for multi-device LifeOS refresh.
do $$
declare
  t text;
begin
  foreach t in array array[
    'tasks','habits','habit_logs','receivables','receivable_payments','receivable_followups',
    'goals','goal_milestones','projects','family_tasks','baby_records','health_entries','health_documents','lab_results','hair_photos',
    'urge_logs','migration_countries','migration_routes','migration_documents','focus_sessions','journal_entries',
    'notifications','automation_rules','receivable_documents'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;


-- Workspace invitations and explicit module-level access.
create table if not exists public.workspace_invitations (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  role text not null default 'member',
  modules text[] not null default '{}',
  token uuid not null unique default uuid_generate_v4(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.workspace_invitations enable row level security;

drop policy if exists "workspace invitations admin select" on public.workspace_invitations;
drop policy if exists "workspace invitations admin insert" on public.workspace_invitations;
drop policy if exists "workspace invitations admin update" on public.workspace_invitations;
drop policy if exists "workspace invitations admin delete" on public.workspace_invitations;
create policy "workspace invitations admin select" on public.workspace_invitations for select
using (public.is_workspace_admin(workspace_id));
create policy "workspace invitations admin insert" on public.workspace_invitations for insert
with check (public.is_workspace_admin(workspace_id) and created_by = auth.uid());
create policy "workspace invitations admin update" on public.workspace_invitations for update
using (public.is_workspace_admin(workspace_id)) with check (public.is_workspace_admin(workspace_id));
create policy "workspace invitations admin delete" on public.workspace_invitations for delete
using (public.is_workspace_admin(workspace_id));

-- Preserve the old broad member behavior for existing members; new invites use explicit grants.
update public.workspace_members
set modules = array['tasks','money','family','baby','calendar','europe','business']
where role in ('member','viewer') and coalesce(array_length(modules,1),0)=0;

-- Module-aware hierarchy rows. Health and Self-control rows require their own grants.
do $$
declare
  t text;
begin
  foreach t in array array['goals','projects','tasks','habits'] loop
    execute format('drop policy if exists "private row select" on public.%I', t);
    execute format('drop policy if exists "private row insert" on public.%I', t);
    execute format('drop policy if exists "private row update" on public.%I', t);
    execute format('drop policy if exists "private row delete" on public.%I', t);
    execute format(
      'create policy "private row select" on public.%I for select using (
        public.can_access_module(workspace_id, case when area = ''Health'' then ''health'' when area = ''Self-control'' then ''self_control'' when area = ''Money'' then ''money'' when area = ''Family'' then ''family'' when area = ''Europe'' then ''europe'' when area in (''Business'',''Work'') then ''business'' else ''tasks'' end)
        and public.can_access_private_row(workspace_id,created_by,privacy,area)
      )', t
    );
    execute format(
      'create policy "private row insert" on public.%I for insert with check (
        public.is_workspace_writer(workspace_id)
        and public.can_access_module(workspace_id, case when area = ''Health'' then ''health'' when area = ''Self-control'' then ''self_control'' when area = ''Money'' then ''money'' when area = ''Family'' then ''family'' when area = ''Europe'' then ''europe'' when area in (''Business'',''Work'') then ''business'' else ''tasks'' end)
        and public.can_access_private_row(workspace_id,created_by,privacy,area)
      )', t
    );
    execute format(
      'create policy "private row update" on public.%I for update using (
        public.is_workspace_writer(workspace_id)
        and public.can_access_module(workspace_id, case when area = ''Health'' then ''health'' when area = ''Self-control'' then ''self_control'' when area = ''Money'' then ''money'' when area = ''Family'' then ''family'' when area = ''Europe'' then ''europe'' when area in (''Business'',''Work'') then ''business'' else ''tasks'' end)
        and public.can_access_private_row(workspace_id,created_by,privacy,area)
      ) with check (
        public.is_workspace_writer(workspace_id)
        and public.can_access_module(workspace_id, case when area = ''Health'' then ''health'' when area = ''Self-control'' then ''self_control'' when area = ''Money'' then ''money'' when area = ''Family'' then ''family'' when area = ''Europe'' then ''europe'' when area in (''Business'',''Work'') then ''business'' else ''tasks'' end)
        and public.can_access_private_row(workspace_id,created_by,privacy,area)
      )', t
    );
    execute format(
      'create policy "private row delete" on public.%I for delete using (
        public.is_workspace_writer(workspace_id)
        and public.can_access_module(workspace_id, case when area = ''Health'' then ''health'' when area = ''Self-control'' then ''self_control'' when area = ''Money'' then ''money'' when area = ''Family'' then ''family'' when area = ''Europe'' then ''europe'' when area in (''Business'',''Work'') then ''business'' else ''tasks'' end)
        and public.can_access_private_row(workspace_id,created_by,privacy,area)
      )', t
    );
  end loop;
end $$;

-- Module-level policies for non-private workspace tables.
do $$
declare
  tables text[] := array[
    'life_areas','focus_sessions','contacts','receivables','family_members','family_tasks',
    'baby_records','migration_countries','migration_documents','migration_tasks','calendar_items',
    'daily_reviews','weekly_reviews','monthly_reviews','automation_rules','activity_log','ai_conversations'
  ];
  modules text[] := array[
    'tasks','tasks','money','money','family','family',
    'baby','europe','europe','europe','calendar',
    'tasks','tasks','tasks','tasks','tasks','tasks'
  ];
  i int;
  t text;
  m text;
begin
  for i in 1..array_length(tables,1) loop
    t := tables[i]; m := modules[i];
    execute format('drop policy if exists "workspace select" on public.%I', t);
    execute format('drop policy if exists "workspace insert" on public.%I', t);
    execute format('drop policy if exists "workspace update" on public.%I', t);
    execute format('drop policy if exists "workspace delete" on public.%I', t);
    execute format('drop policy if exists "module select" on public.%I', t);
    execute format('drop policy if exists "module insert" on public.%I', t);
    execute format('drop policy if exists "module update" on public.%I', t);
    execute format('drop policy if exists "module delete" on public.%I', t);
    execute format('create policy "module select" on public.%I for select using (public.can_access_module(workspace_id,%L))', t, m);
    execute format('create policy "module insert" on public.%I for insert with check (public.is_workspace_writer(workspace_id) and public.can_access_module(workspace_id,%L))', t, m);
    execute format('create policy "module update" on public.%I for update using (public.is_workspace_writer(workspace_id) and public.can_access_module(workspace_id,%L)) with check (public.is_workspace_writer(workspace_id) and public.can_access_module(workspace_id,%L))', t, m, m);
    execute format('create policy "module delete" on public.%I for delete using (public.is_workspace_writer(workspace_id) and public.can_access_module(workspace_id,%L))', t, m);
  end loop;
end $$;

-- Generic attachments are owner/admin only unless a dedicated parent policy exists.
drop policy if exists "workspace select" on public.attachments;
drop policy if exists "workspace insert" on public.attachments;
drop policy if exists "workspace update" on public.attachments;
drop policy if exists "workspace delete" on public.attachments;
drop policy if exists "attachment owner select" on public.attachments;
drop policy if exists "attachment owner insert" on public.attachments;
drop policy if exists "attachment owner update" on public.attachments;
drop policy if exists "attachment owner delete" on public.attachments;
create policy "attachment owner select" on public.attachments for select
using (created_by = auth.uid() or public.is_workspace_admin(workspace_id));
create policy "attachment owner insert" on public.attachments for insert
with check ((created_by = auth.uid() or public.is_workspace_admin(workspace_id)) and public.is_workspace_writer(workspace_id));
create policy "attachment owner update" on public.attachments for update
using ((created_by = auth.uid() or public.is_workspace_admin(workspace_id)) and public.is_workspace_writer(workspace_id))
with check ((created_by = auth.uid() or public.is_workspace_admin(workspace_id)) and public.is_workspace_writer(workspace_id));
create policy "attachment owner delete" on public.attachments for delete
using ((created_by = auth.uid() or public.is_workspace_admin(workspace_id)) and public.is_workspace_writer(workspace_id));

-- Tighten child tables so direct queries cannot bypass module grants.
drop policy if exists "goal milestone access" on public.goal_milestones;
create policy "goal milestone access" on public.goal_milestones for all
using (exists(select 1 from public.goals g where g.id=goal_id and public.can_access_module(g.workspace_id,case when g.area='Health' then 'health' when g.area='Self-control' then 'self_control' when g.area='Money' then 'money' when g.area='Family' then 'family' when g.area='Europe' then 'europe' when g.area in ('Business','Work') then 'business' else 'tasks' end)))
with check (exists(select 1 from public.goals g where g.id=goal_id and public.is_workspace_writer(g.workspace_id) and public.can_access_module(g.workspace_id,case when g.area='Health' then 'health' when g.area='Self-control' then 'self_control' when g.area='Money' then 'money' when g.area='Family' then 'family' when g.area='Europe' then 'europe' when g.area in ('Business','Work') then 'business' else 'tasks' end)));

drop policy if exists "goal update access" on public.goal_updates;
create policy "goal update access" on public.goal_updates for all
using (exists(select 1 from public.goals g where g.id=goal_id and public.can_access_module(g.workspace_id,case when g.area='Health' then 'health' when g.area='Self-control' then 'self_control' when g.area='Money' then 'money' when g.area='Family' then 'family' when g.area='Europe' then 'europe' when g.area in ('Business','Work') then 'business' else 'tasks' end)))
with check (exists(select 1 from public.goals g where g.id=goal_id and public.is_workspace_writer(g.workspace_id) and public.can_access_module(g.workspace_id,case when g.area='Health' then 'health' when g.area='Self-control' then 'self_control' when g.area='Money' then 'money' when g.area='Family' then 'family' when g.area='Europe' then 'europe' when g.area in ('Business','Work') then 'business' else 'tasks' end)));

drop policy if exists "project member access" on public.project_members;
create policy "project member access" on public.project_members for all
using (exists(select 1 from public.projects p where p.id=project_id and public.can_access_module(p.workspace_id,case when p.area='Health' then 'health' when p.area='Self-control' then 'self_control' when p.area='Money' then 'money' when p.area='Family' then 'family' when p.area='Europe' then 'europe' when p.area in ('Business','Work') then 'business' else 'tasks' end)))
with check (exists(select 1 from public.projects p where p.id=project_id and public.is_workspace_admin(p.workspace_id)));

drop policy if exists "task dependency access" on public.task_dependencies;
create policy "task dependency access" on public.task_dependencies for all
using (exists(select 1 from public.tasks t where t.id=task_id and public.can_access_module(t.workspace_id,case when t.area='Health' then 'health' when t.area='Self-control' then 'self_control' when t.area='Money' then 'money' when t.area='Family' then 'family' when t.area='Europe' then 'europe' when t.area in ('Business','Work') then 'business' else 'tasks' end)))
with check (exists(select 1 from public.tasks t where t.id=task_id and public.is_workspace_writer(t.workspace_id) and public.can_access_module(t.workspace_id,case when t.area='Health' then 'health' when t.area='Self-control' then 'self_control' when t.area='Money' then 'money' when t.area='Family' then 'family' when t.area='Europe' then 'europe' when t.area in ('Business','Work') then 'business' else 'tasks' end)));

drop policy if exists "task comment access" on public.task_comments;
create policy "task comment access" on public.task_comments for all
using (exists(select 1 from public.tasks t where t.id=task_id and public.can_access_module(t.workspace_id,case when t.area='Health' then 'health' when t.area='Self-control' then 'self_control' when t.area='Money' then 'money' when t.area='Family' then 'family' when t.area='Europe' then 'europe' when t.area in ('Business','Work') then 'business' else 'tasks' end)))
with check (exists(select 1 from public.tasks t where t.id=task_id and public.is_workspace_writer(t.workspace_id) and public.can_access_module(t.workspace_id,case when t.area='Health' then 'health' when t.area='Self-control' then 'self_control' when t.area='Money' then 'money' when t.area='Family' then 'family' when t.area='Europe' then 'europe' when t.area in ('Business','Work') then 'business' else 'tasks' end)));

drop policy if exists "task activity access" on public.task_activity;
create policy "task activity access" on public.task_activity for all
using (exists(select 1 from public.tasks t where t.id=task_id and public.can_access_module(t.workspace_id,case when t.area='Health' then 'health' when t.area='Self-control' then 'self_control' when t.area='Money' then 'money' when t.area='Family' then 'family' when t.area='Europe' then 'europe' when t.area in ('Business','Work') then 'business' else 'tasks' end)))
with check (exists(select 1 from public.tasks t where t.id=task_id and public.is_workspace_writer(t.workspace_id) and public.can_access_module(t.workspace_id,case when t.area='Health' then 'health' when t.area='Self-control' then 'self_control' when t.area='Money' then 'money' when t.area='Family' then 'family' when t.area='Europe' then 'europe' when t.area in ('Business','Work') then 'business' else 'tasks' end)));

drop policy if exists "habit log access" on public.habit_logs;
create policy "habit log access" on public.habit_logs for all
using (exists(select 1 from public.habits h where h.id=habit_id and public.can_access_module(h.workspace_id,case when h.area='Health' then 'health' when h.area='Self-control' then 'self_control' when h.area='Money' then 'money' when h.area='Family' then 'family' when h.area='Europe' then 'europe' when h.area in ('Business','Work') then 'business' else 'tasks' end)))
with check (exists(select 1 from public.habits h where h.id=habit_id and public.is_workspace_writer(h.workspace_id) and public.can_access_module(h.workspace_id,case when h.area='Health' then 'health' when h.area='Self-control' then 'self_control' when h.area='Money' then 'money' when h.area='Family' then 'family' when h.area='Europe' then 'europe' when h.area in ('Business','Work') then 'business' else 'tasks' end)));

do $$
declare
  t text;
begin
  foreach t in array array['receivable_payments','receivable_followups','receivable_documents'] loop
    execute format('drop policy if exists "receivable child access" on public.%I', t);
    execute format('create policy "receivable child access" on public.%I for all using (exists(select 1 from public.receivables r where r.id=receivable_id and public.can_access_module(r.workspace_id,''money''))) with check (exists(select 1 from public.receivables r where r.id=receivable_id and public.is_workspace_writer(r.workspace_id) and public.can_access_module(r.workspace_id,''money'')))', t);
  end loop;
end $$;

drop policy if exists "migration route access" on public.migration_routes;
create policy "migration route access" on public.migration_routes for all
using (exists(select 1 from public.migration_countries c where c.id=country_id and public.can_access_module(c.workspace_id,'europe')))
with check (exists(select 1 from public.migration_countries c where c.id=country_id and public.is_workspace_writer(c.workspace_id) and public.can_access_module(c.workspace_id,'europe')));

drop policy if exists "automation run access" on public.automation_runs;
create policy "automation run access" on public.automation_runs for all
using (exists(select 1 from public.automation_rules r where r.id=rule_id and public.can_access_module(r.workspace_id,'tasks')))
with check (exists(select 1 from public.automation_rules r where r.id=rule_id and public.is_workspace_writer(r.workspace_id) and public.can_access_module(r.workspace_id,'tasks')));

drop policy if exists "ai suggestion access" on public.ai_suggestions;
create policy "ai suggestion access" on public.ai_suggestions for all
using (exists(select 1 from public.ai_conversations c where c.id=conversation_id and public.can_access_module(c.workspace_id,'tasks')))
with check (exists(select 1 from public.ai_conversations c where c.id=conversation_id and public.is_workspace_writer(c.workspace_id) and public.can_access_module(c.workspace_id,'tasks')));


-- Tighten SECURITY DEFINER helper execution.
-- RLS policies require selected helpers for authenticated users, but anonymous callers do not.

revoke execute on function public.is_workspace_member(uuid) from public, anon;
revoke execute on function public.is_workspace_writer(uuid) from public, anon;
revoke execute on function public.is_workspace_admin(uuid) from public, anon;
revoke execute on function public.can_access_module(uuid,text) from public, anon;
revoke execute on function public.can_access_private_row(uuid,uuid,text,text) from public, anon;
revoke execute on function public.can_read_private_storage(text) from public, anon;
revoke execute on function public.can_insert_private_storage(text) from public, anon;
revoke execute on function public.can_manage_private_storage(text) from public, anon;
revoke execute on function public.private_storage_workspace(text) from public, anon, authenticated;
revoke execute on function public.private_storage_module(text) from public, anon, authenticated;
revoke execute on function public.handle_new_lifeos_user() from public, anon, authenticated;

grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.is_workspace_writer(uuid) to authenticated;
grant execute on function public.is_workspace_admin(uuid) to authenticated;
grant execute on function public.can_access_module(uuid,text) to authenticated;
grant execute on function public.can_access_private_row(uuid,uuid,text,text) to authenticated;
grant execute on function public.can_read_private_storage(text) to authenticated;
grant execute on function public.can_insert_private_storage(text) to authenticated;
grant execute on function public.can_manage_private_storage(text) to authenticated;



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
-- No client SELECT policy: OAuth tokens stay server-only.

create policy "external connection own insert" on public.external_connections
for insert to authenticated
with check (user_id = auth.uid() and public.is_workspace_writer(workspace_id));

create policy "external connection own update" on public.external_connections
for update to authenticated
using (user_id = auth.uid() and public.is_workspace_writer(workspace_id))
with check (user_id = auth.uid() and public.is_workspace_writer(workspace_id));

create index if not exists external_connections_user_provider_idx
on public.external_connections(user_id,provider);



drop policy if exists "external connection own select" on public.external_connections;
create policy "external connection own select" on public.external_connections
for select to authenticated
using (user_id = auth.uid() and public.is_workspace_member(workspace_id));

commit;

