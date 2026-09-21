begin;
create policy "external connection own select" on public.external_connections
for select to authenticated
using (user_id = auth.uid() and public.is_workspace_member(workspace_id));
commit;