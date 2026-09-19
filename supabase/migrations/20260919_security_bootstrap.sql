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


-- Private user-scoped storage for sensitive health/hair imports.
insert into storage.buckets (id, name, public)
values ('lifeos-private', 'lifeos-private', false)
on conflict (id) do update set public = false;

drop policy if exists "lifeos private storage select" on storage.objects;
drop policy if exists "lifeos private storage insert" on storage.objects;
drop policy if exists "lifeos private storage update" on storage.objects;
drop policy if exists "lifeos private storage delete" on storage.objects;

create policy "lifeos private storage select" on storage.objects
for select to authenticated
using (bucket_id = 'lifeos-private' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "lifeos private storage insert" on storage.objects
for insert to authenticated
with check (bucket_id = 'lifeos-private' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "lifeos private storage update" on storage.objects
for update to authenticated
using (bucket_id = 'lifeos-private' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'lifeos-private' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "lifeos private storage delete" on storage.objects
for delete to authenticated
using (bucket_id = 'lifeos-private' and (storage.foldername(name))[1] = auth.uid()::text);


-- Realtime publication for multi-device LifeOS refresh.
do $
declare
  t text;
begin
  foreach t in array array[
    'tasks','habits','habit_logs','receivables','receivable_payments','receivable_followups',
    'goals','projects','family_tasks','baby_records','health_entries','lab_results','hair_photos',
    'urge_logs','migration_countries','migration_documents','focus_sessions','journal_entries',
    'notifications','automation_rules'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $;

commit;
