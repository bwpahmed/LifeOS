begin;

create or replace function public.lifeos_valid_hhmm(value text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select value is not null
    and value ~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$';
$$;

create or replace function public.lifeos_valid_hhmm_array(items text[])
returns boolean
language sql
immutable
set search_path = public
as $$
  select coalesce(bool_and(public.lifeos_valid_hhmm(v)),true)
  from unnest(coalesce(items,'{}'::text[])) as v;
$$;

do $$
begin
  if not exists(select 1 from pg_constraint where conname='tasks_reminder_time_valid') then
    alter table public.tasks add constraint tasks_reminder_time_valid
      check (reminder_time is null or public.lifeos_valid_hhmm(reminder_time));
  end if;
  if not exists(select 1 from pg_constraint where conname='health_routines_times_valid') then
    alter table public.health_routines add constraint health_routines_times_valid
      check (public.lifeos_valid_hhmm_array(reminder_times));
  end if;
  if not exists(select 1 from pg_constraint where conname='diet_plan_meal_time_valid') then
    alter table public.diet_plan_items add constraint diet_plan_meal_time_valid
      check (meal_time is null or public.lifeos_valid_hhmm(meal_time));
  end if;
  if not exists(select 1 from pg_constraint where conname='sleep_bed_time_valid') then
    alter table public.sleep_sessions add constraint sleep_bed_time_valid
      check (bed_time is null or public.lifeos_valid_hhmm(bed_time));
  end if;
  if not exists(select 1 from pg_constraint where conname='sleep_wake_time_valid') then
    alter table public.sleep_sessions add constraint sleep_wake_time_valid
      check (wake_time is null or public.lifeos_valid_hhmm(wake_time));
  end if;
  if not exists(select 1 from pg_constraint where conname='profile_morning_time_valid') then
    alter table public.profiles add constraint profile_morning_time_valid
      check (morning_planning_time is null or public.lifeos_valid_hhmm(morning_planning_time));
  end if;
  if not exists(select 1 from pg_constraint where conname='profile_night_time_valid') then
    alter table public.profiles add constraint profile_night_time_valid
      check (night_review_time is null or public.lifeos_valid_hhmm(night_review_time));
  end if;
  if not exists(select 1 from pg_constraint where conname='notification_quiet_start_valid') then
    alter table public.notification_preferences add constraint notification_quiet_start_valid
      check (quiet_start is null or public.lifeos_valid_hhmm(quiet_start));
  end if;
  if not exists(select 1 from pg_constraint where conname='notification_quiet_end_valid') then
    alter table public.notification_preferences add constraint notification_quiet_end_valid
      check (quiet_end is null or public.lifeos_valid_hhmm(quiet_end));
  end if;
  if not exists(select 1 from pg_constraint where conname='dnd_start_time_valid') then
    alter table public.notification_dnd_blocks add constraint dnd_start_time_valid
      check (public.lifeos_valid_hhmm(start_time));
  end if;
  if not exists(select 1 from pg_constraint where conname='dnd_end_time_valid') then
    alter table public.notification_dnd_blocks add constraint dnd_end_time_valid
      check (public.lifeos_valid_hhmm(end_time));
  end if;
end $$;

commit;
