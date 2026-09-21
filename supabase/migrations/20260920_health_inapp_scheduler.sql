begin;

create or replace function public.generate_due_health_notifications()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer := 0;
begin
  insert into public.notifications (
    workspace_id,user_id,title,body,severity,ref_table,ref_id,created_at
  )
  select
    r.workspace_id,
    wm.user_id,
    case
      when r.kind='medicine' then 'LifeOS medicine reminder'
      when r.kind='water' then 'LifeOS water reminder'
      when r.kind='sleep' then 'LifeOS sleep reminder'
      when r.kind='meal' then 'LifeOS meal reminder'
      else 'LifeOS health reminder'
    end,
    'A private health routine needs attention.',
    case when r.kind='medicine' then 'important' else 'normal' end,
    'health_routines',
    r.id,
    now()
  from public.health_routines r
  join public.workspace_members wm on wm.workspace_id=r.workspace_id
  left join public.profiles p on p.id=wm.user_id
  left join public.notification_preferences np on np.user_id=wm.user_id
  where r.active=true
    and (r.start_date is null or r.start_date <= (now() at time zone coalesce(p.timezone,'Asia/Dubai'))::date)
    and (r.end_date is null or r.end_date >= (now() at time zone coalesce(p.timezone,'Asia/Dubai'))::date)
    and extract(isodow from (now() at time zone coalesce(p.timezone,'Asia/Dubai')))::int = any(r.days_of_week)
    and exists (
      select 1
      from unnest(r.reminder_times) as rt
      where
        (
          (
            extract(hour from (now() at time zone coalesce(p.timezone,'Asia/Dubai')))::int * 60
            + extract(minute from (now() at time zone coalesce(p.timezone,'Asia/Dubai')))::int
          )
          -
          (
            split_part(rt,':',1)::int * 60
            + split_part(rt,':',2)::int
          )
        ) between 0 and 14
    )
    and not (
      (
        coalesce(np.quiet_start,'22:30') <= coalesce(np.quiet_end,'07:00')
        and to_char((now() at time zone coalesce(p.timezone,'Asia/Dubai')),'HH24:MI') >= coalesce(np.quiet_start,'22:30')
        and to_char((now() at time zone coalesce(p.timezone,'Asia/Dubai')),'HH24:MI') < coalesce(np.quiet_end,'07:00')
      )
      or
      (
        coalesce(np.quiet_start,'22:30') > coalesce(np.quiet_end,'07:00')
        and (
          to_char((now() at time zone coalesce(p.timezone,'Asia/Dubai')),'HH24:MI') >= coalesce(np.quiet_start,'22:30')
          or to_char((now() at time zone coalesce(p.timezone,'Asia/Dubai')),'HH24:MI') < coalesce(np.quiet_end,'07:00')
        )
      )
    )
    and not exists (
      select 1
      from public.notification_dnd_blocks d
      where d.user_id=wm.user_id
        and d.active=true
        and extract(isodow from (now() at time zone coalesce(p.timezone,'Asia/Dubai')))::int = any(d.days_of_week)
        and (
          (d.start_time <= d.end_time
            and to_char((now() at time zone coalesce(p.timezone,'Asia/Dubai')),'HH24:MI') >= d.start_time
            and to_char((now() at time zone coalesce(p.timezone,'Asia/Dubai')),'HH24:MI') < d.end_time)
          or
          (d.start_time > d.end_time
            and (
              to_char((now() at time zone coalesce(p.timezone,'Asia/Dubai')),'HH24:MI') >= d.start_time
              or to_char((now() at time zone coalesce(p.timezone,'Asia/Dubai')),'HH24:MI') < d.end_time
            ))
        )
    )
    and not exists (
      select 1
      from public.notifications n
      where n.user_id=wm.user_id
        and n.ref_table='health_routines'
        and n.ref_id=r.id
        and n.created_at > now() - interval '20 minutes'
    );

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

revoke all on function public.generate_due_health_notifications() from public, anon, authenticated;

do $$
begin
  if exists(select 1 from cron.job where jobname='lifeos-health-reminders-15m') then
    perform cron.unschedule((select jobid from cron.job where jobname='lifeos-health-reminders-15m' limit 1));
  end if;
  perform cron.schedule(
    'lifeos-health-reminders-15m',
    '*/15 * * * *',
    'select public.generate_due_health_notifications();'
  );
end $$;

commit;