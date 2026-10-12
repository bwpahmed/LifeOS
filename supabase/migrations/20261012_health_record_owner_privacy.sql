begin;

-- Enforce per-person healthcare privacy in the database, not merely in UI filters.
-- No rows or medical values are changed.
do $$
declare t text;
begin
  foreach t in array array[
    'health_routines','health_routine_logs','water_logs','diet_plan_items',
    'sleep_sessions','health_entries','lab_results','hair_photos'
  ] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('drop policy if exists %L on public.%I','health planner select',t);
    execute format('drop policy if exists %L on public.%I','health planner insert',t);
    execute format('drop policy if exists %L on public.%I','health planner update',t);
    execute format('drop policy if exists %L on public.%I','health planner delete',t);
    execute format('drop policy if exists %L on public.%I','private module select',t);
    execute format('drop policy if exists %L on public.%I','private module insert',t);
    execute format('drop policy if exists %L on public.%I','private module update',t);
    execute format('drop policy if exists %L on public.%I','private module delete',t);
    execute format('drop policy if exists %L on public.%I','health own select',t);
    execute format('drop policy if exists %L on public.%I','health own insert',t);
    execute format('drop policy if exists %L on public.%I','health own update',t);
    execute format('drop policy if exists %L on public.%I','health own delete',t);
    execute format('create policy "health own select" on public.%I for select to authenticated using (created_by=auth.uid() and public.can_access_module(workspace_id,%L))',t,'health');
    execute format('create policy "health own insert" on public.%I for insert to authenticated with check (created_by=auth.uid() and public.is_workspace_writer(workspace_id) and public.can_access_module(workspace_id,%L))',t,'health');
    execute format('create policy "health own update" on public.%I for update to authenticated using (created_by=auth.uid() and public.is_workspace_writer(workspace_id) and public.can_access_module(workspace_id,%L)) with check (created_by=auth.uid() and public.is_workspace_writer(workspace_id) and public.can_access_module(workspace_id,%L))',t,'health','health');
    execute format('create policy "health own delete" on public.%I for delete to authenticated using (created_by=auth.uid() and public.is_workspace_writer(workspace_id) and public.can_access_module(workspace_id,%L))',t,'health');
  end loop;
end $$;

-- Completion rows must reference a routine belonging to that same person/workspace.
drop policy if exists "health own insert" on public.health_routine_logs;
create policy "health own insert" on public.health_routine_logs for insert to authenticated
with check (
 created_by=auth.uid()
 and public.is_workspace_writer(workspace_id)
 and public.can_access_module(workspace_id,'health')
 and exists(select 1 from public.health_routines r
            where r.id=routine_id and r.workspace_id=health_routine_logs.workspace_id
              and r.created_by=auth.uid())
);
drop policy if exists "health own update" on public.health_routine_logs;
create policy "health own update" on public.health_routine_logs for update to authenticated
using (created_by=auth.uid() and public.is_workspace_writer(workspace_id)
       and public.can_access_module(workspace_id,'health'))
with check (created_by=auth.uid() and public.is_workspace_writer(workspace_id)
       and public.can_access_module(workspace_id,'health')
       and exists(select 1 from public.health_routines r
            where r.id=routine_id and r.workspace_id=health_routine_logs.workspace_id
              and r.created_by=auth.uid()));

-- Photos live in the same private Supabase bucket. Health/hair paths are
-- <workspace>/<owner>/health|hair/..., so a colleague must never read/signed-URL them.
create or replace function public.can_read_private_storage(object_name text)
returns boolean language plpgsql stable security definer set search_path=public
as $$
declare ws uuid; module_name text;
begin
 if split_part(object_name,'/',1)=coalesce(auth.uid()::text,'') then return true; end if;
 ws:=public.private_storage_workspace(object_name);
 module_name:=public.private_storage_module(object_name);
 return ws is not null and module_name is not null
   and public.can_access_module(ws,module_name)
   and (module_name <> 'health' or split_part(object_name,'/',2)=coalesce(auth.uid()::text,''));
end $$;

create or replace function public.can_manage_private_storage(object_name text)
returns boolean language plpgsql stable security definer set search_path=public
as $$
declare ws uuid; module_name text;
begin
 if split_part(object_name,'/',1)=coalesce(auth.uid()::text,'') then return true; end if;
 ws:=public.private_storage_workspace(object_name);
 module_name:=public.private_storage_module(object_name);
 return ws is not null and module_name is not null
   and public.is_workspace_writer(ws) and public.can_access_module(ws,module_name)
   and (module_name <> 'health' or split_part(object_name,'/',2)=coalesce(auth.uid()::text,''));
end $$;

do $$
declare t text;
begin
 foreach t in array array['health_routines','health_routine_logs','water_logs',
 'diet_plan_items','sleep_sessions','health_entries','lab_results','hair_photos'] loop
  execute format('create index if not exists %I on public.%I(workspace_id,created_by)',t||'_owner_idx',t);
 end loop;
end $$;

commit;
