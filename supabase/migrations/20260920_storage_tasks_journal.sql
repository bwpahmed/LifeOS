begin;

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
    when 'tasks' then 'tasks'
    when 'journal' then 'journal'
    when 'family' then 'family'
    when 'europe' then 'europe'
    else null
  end;
$$;

revoke all on function public.private_storage_module(text) from public, anon, authenticated;

commit;