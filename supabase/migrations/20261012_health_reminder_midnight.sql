begin;

-- Calculate dose time from the OWNER'S LOCAL DATE, including yesterday's
-- 23:56–23:59 slots that a five-minute worker can first see just after 00:00.
-- Never send a different day's dose as Taken or suppress a second slot.
create or replace function public.generate_due_health_notifications()
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare inserted_count integer:=0;
begin
  insert into public.notifications
    (workspace_id,user_id,title,body,severity,ref_table,ref_id,created_at)
  select
    r.workspace_id,r.created_by,
    case when r.kind='medicine' then 'LifeOS medicine reminder'
         when r.kind='water' then 'LifeOS water reminder'
         when r.kind='sleep' then 'LifeOS sleep reminder'
         when r.kind='meal' then 'LifeOS meal reminder'
         else 'LifeOS health reminder' end,
    'A private health routine needs attention for ' ||
       to_char(slot.planned_local,'YYYY-MM-DD HH24:MI') || ' (scheduled).',
    case when r.kind='medicine' then 'important' else 'normal' end,
    'health_routines',r.id,now()
  from public.health_routines r
  left join public.profiles p on p.id=r.created_by
  left join public.notification_preferences np on np.user_id=r.created_by
  cross join lateral (
    select now() at time zone coalesce(p.timezone,'Asia/Dubai') as local_now
  ) lt
  cross join lateral (
    select q.scheduled_time,
      (lt.local_now::date + d.day_offset
        + case when q.scheduled_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
             then q.scheduled_time::time else time '00:00' end) as planned_local
    from unnest(r.reminder_times) q(scheduled_time)
    cross join (values (0),(-1)) d(day_offset)
    where q.scheduled_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
  ) slot
  where r.active=true
    and (r.start_date is null or r.start_date<=slot.planned_local::date)
    and (r.end_date is null or r.end_date>=slot.planned_local::date)
    and extract(isodow from slot.planned_local)::int=any(r.days_of_week)
    and slot.planned_local<=lt.local_now
    and slot.planned_local>lt.local_now-interval '5 minutes'
    and not exists(
      select 1 from public.health_routine_logs l
      where l.routine_id=r.id and l.created_by=r.created_by
        and l.date=slot.planned_local::date and l.scheduled_time=slot.scheduled_time
        and l.status='done'
    )
    and not (
      (coalesce(np.quiet_start,'22:30')<=coalesce(np.quiet_end,'07:00')
       and to_char(lt.local_now,'HH24:MI')>=coalesce(np.quiet_start,'22:30')
       and to_char(lt.local_now,'HH24:MI')<coalesce(np.quiet_end,'07:00'))
      or
      (coalesce(np.quiet_start,'22:30')>coalesce(np.quiet_end,'07:00')
       and (to_char(lt.local_now,'HH24:MI')>=coalesce(np.quiet_start,'22:30')
         or to_char(lt.local_now,'HH24:MI')<coalesce(np.quiet_end,'07:00')))
    )
    and not exists(
      select 1 from public.notification_dnd_blocks d
      where d.user_id=r.created_by and d.active=true
        and extract(isodow from lt.local_now)::int=any(d.days_of_week)
        and (
          (d.start_time<=d.end_time
            and to_char(lt.local_now,'HH24:MI')>=d.start_time
            and to_char(lt.local_now,'HH24:MI')<d.end_time)
          or
          (d.start_time>d.end_time
            and (to_char(lt.local_now,'HH24:MI')>=d.start_time
              or to_char(lt.local_now,'HH24:MI')<d.end_time))
        )
    )
    and not exists(
      select 1 from public.notifications n
      where n.user_id=r.created_by and n.workspace_id=r.workspace_id
        and n.ref_table='health_routines' and n.ref_id=r.id
        and n.body='A private health routine needs attention for ' ||
          to_char(slot.planned_local,'YYYY-MM-DD HH24:MI') || ' (scheduled).'
    );
  get diagnostics inserted_count=row_count;
  return inserted_count;
end;
$$;

revoke all on function public.generate_due_health_notifications() from public,anon,authenticated;
commit;
