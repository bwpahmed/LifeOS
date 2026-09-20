begin;

create or replace function public.enforce_lifeos_single_owner()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if new.email is null or lower(new.email) <> 'bwpahmed@gmail.com' then
    raise exception 'LifeOS is restricted to the configured owner account';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_lifeos_single_owner() from public, anon, authenticated;

drop trigger if exists lifeos_single_owner_guard on auth.users;
create trigger lifeos_single_owner_guard
before insert on auth.users
for each row execute procedure public.enforce_lifeos_single_owner();

commit;
