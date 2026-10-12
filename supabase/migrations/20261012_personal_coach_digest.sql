begin;

-- Lightweight coach reminder delivery is a notification about a factual Home brief.
-- The AI answer itself is never generated in cron or treated as a durable fact.
create or replace function public.generate_personal_coach_notifications()
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare
  ctx record;
  local_ts timestamp;
  local_date date;
  local_hm text;
  quiet boolean;
  open_overdue integer;
  n integer := 0;
begin
  for ctx in
    select wm.workspace_id,wm.user_id,
      coalesce(p.timezone,'Asia/Dubai') as timezone,
      coalesce(nullif(p.morning_planning_time,''),'08:00') as morning_time,
      coalesce(np.quiet_start,'22:30') as quiet_start,
      coalesce(np.quiet_end,'07:00') as quiet_end
    from public.workspace_members wm
    left join public.profiles p on p.id=wm.user_id
    left join public.notification_preferences np on np.user_id=wm.user_id
  loop
    local_ts := now() at time zone ctx.timezone;
    local_date := local_ts::date;
    local_hm := to_char(local_ts,'HH24:MI');
    quiet := case when ctx.quiet_start<=ctx.quiet_end
      then local_hm>=ctx.quiet_start and local_hm<ctx.quiet_end
      else local_hm>=ctx.quiet_start or local_hm<ctx.quiet_end
    end;
    if quiet or exists(
      select 1 from public.notification_dnd_blocks d where d.user_id=ctx.user_id and d.active
        and extract(isodow from local_ts)::int = any(d.days_of_week)
        and ((d.start_time<=d.end_time and local_hm>=d.start_time and local_hm<d.end_time)
          or(d.start_time>d.end_time and(local_hm>=d.start_time or local_hm<d.end_time)))
    ) then continue;end if;

    -- A single morning prompt opens a fresh source-derived Home brief.
    if local_ts::time >= ctx.morning_time::time
       and local_ts::time < (ctx.morning_time::time + interval '5 minutes')
       and not exists(select 1 from public.notifications x
         where x.user_id=ctx.user_id and x.workspace_id=ctx.workspace_id and x.ref_table='daily_coach'
         and x.title='LifeOS daily brief ready'
         and (x.created_at at time zone ctx.timezone)::date=local_date)
    then
      insert into public.notifications(workspace_id,user_id,title,body,severity,ref_table,created_at)
      values(ctx.workspace_id,ctx.user_id,'LifeOS daily brief ready',
        'Open Home to see your latest recorded tasks, habits and health summary.','normal','daily_coach',now());
      n:=n+1;
    end if;

    -- When due work remains unfinished, send a private non-medical follow-up at noon/5 PM.
    if local_hm in('12:00','17:00') then
      select count(*) into open_overdue from public.tasks t
      where t.workspace_id=ctx.workspace_id and (t.created_by=ctx.user_id or t.assigned_to=ctx.user_id)
        and t.deadline<local_date and t.status not in ('Completed','Cancelled');
      if open_overdue>0 and not exists(select 1 from public.notifications x
        where x.user_id=ctx.user_id and x.workspace_id=ctx.workspace_id
          and x.title='LifeOS overdue task check-in'
          and x.created_at>now()-interval '4 hours')
      then
        insert into public.notifications(workspace_id,user_id,title,body,severity,ref_table,created_at)
        values(ctx.workspace_id,ctx.user_id,'LifeOS overdue task check-in',
          open_overdue||' open past-deadline task(s). Review your daily brief and decide what to do next.',
          'important','daily_coach',now());
        n:=n+1;
      end if;
    end if;
  end loop;
  return n;
end;
$$;

revoke all on function public.generate_personal_coach_notifications() from public,anon,authenticated;

do $$
begin
 if exists(select 1 from cron.job where jobname='lifeos-daily-coach-5m') then
  perform cron.unschedule((select jobid from cron.job where jobname='lifeos-daily-coach-5m' limit 1));
 end if;
 perform cron.schedule('lifeos-daily-coach-5m','*/5 * * * *',
   'select public.generate_personal_coach_notifications();');
end $$;
commit;
