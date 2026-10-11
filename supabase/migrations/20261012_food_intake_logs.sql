begin;

-- Canonical consumed-food entries. Diet plan items remain planned-only.
-- Only creator may read/write even inside a shared health workspace.
create table if not exists public.food_intake_logs (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  date date not null,
  food_key text not null check (length(food_key) between 1 and 90),
  food_name text not null check (length(food_name) between 1 and 120),
  quantity_g numeric not null check (quantity_g > 0 and quantity_g <= 5000),
  meal_type text not null default 'Other' check (meal_type in ('Breakfast','Lunch','Dinner','Snack','Other')),
  -- A reference snapshot: estimates are reproducible if catalog changes.
  estimated_nutrients jsonb not null default '{}'::jsonb
    check (jsonb_typeof(estimated_nutrients)='object'),
  reference_version text not null default 'food-v1',
  note text check (note is null or length(note) <= 500),
  created_at timestamptz not null default now()
);

alter table public.food_intake_logs enable row level security;

drop policy if exists "food intake own select" on public.food_intake_logs;
drop policy if exists "food intake own insert" on public.food_intake_logs;
drop policy if exists "food intake own update" on public.food_intake_logs;
drop policy if exists "food intake own delete" on public.food_intake_logs;

create policy "food intake own select" on public.food_intake_logs
for select to authenticated
using (created_by=auth.uid() and public.can_access_module(workspace_id,'health'));

create policy "food intake own insert" on public.food_intake_logs
for insert to authenticated
with check (created_by=auth.uid() and public.is_workspace_writer(workspace_id)
  and public.can_access_module(workspace_id,'health'));

create policy "food intake own update" on public.food_intake_logs
for update to authenticated
using (created_by=auth.uid() and public.is_workspace_writer(workspace_id)
  and public.can_access_module(workspace_id,'health'))
with check (created_by=auth.uid() and public.is_workspace_writer(workspace_id)
  and public.can_access_module(workspace_id,'health'));

create policy "food intake own delete" on public.food_intake_logs
for delete to authenticated
using (created_by=auth.uid() and public.is_workspace_writer(workspace_id)
  and public.can_access_module(workspace_id,'health'));

create index if not exists food_intake_own_date_idx
  on public.food_intake_logs(workspace_id,created_by,date desc,created_at desc);

commit;
