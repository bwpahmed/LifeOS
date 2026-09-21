begin;

create or replace function public.generate_due_lifeos_notifications()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  ctx record;
  item record;
  local_ts timestamp;
  local_date date;
  local_time text;
  local_hour integer;
  local_dow integer;
  quiet boolean;
  dnd_active boolean;
  allow_critical boolean;
  sev text;
  reminder_hour integer;
  overdue_days integer;
  promise_missed boolean;
  reminder_days integer;
  days_to_due integer;
  inserted_count integer := 0;
begin
  for ctx in
    select distinct wm.user_id, wm.workspace_id,
      coalesce(p.timezone,'Asia/Dubai') as timezone,
      coalesce(np.quiet_start,'22:30') as quiet_start,
      coalesce(np.quiet_end,'07:00') as quiet_end,
      coalesce(np.allow_critical_in_quiet,false) as allow_critical
    from public.workspace_members wm
    left join public.profiles p on p.id=wm.user_id
    left join public.notification_preferences np on np.user_id=wm.user_id
  loop
    local_ts := now() at time zone ctx.timezone;
    local_date := local_ts::date;
    local_time := to_char(local_ts,'HH24:MI');
    local_hour := extract(hour from local_ts)::int;
    local_dow := extract(isodow from local_ts)::int;
    allow_critical := ctx.allow_critical;

    quiet :=
      case
        when ctx.quiet_start <= ctx.quiet_end
          then local_time >= ctx.quiet_start and local_time < ctx.quiet_end
        else local_time >= ctx.quiet_start or local_time < ctx.quiet_end
      end;

    select exists(
      select 1 from public.notification_dnd_blocks d
      where d.user_id=ctx.user_id and d.active=true
        and local_dow = any(d.days_of_week)
        and (
          (d.start_time <= d.end_time and local_time >= d.start_time and local_time < d.end_time)
          or
          (d.start_time > d.end_time and (local_time >= d.start_time or local_time < d.end_time))
        )
    ) into dnd_active;
    quiet := quiet or dnd_active;

    -- Tasks: reminder hour, noon and 5pm escalation.
    for item in
      select id,name,area,importance,reminder_time
      from public.tasks
      where workspace_id=ctx.workspace_id
        and deadline=local_date
        and status not in ('Completed','Cancelled')
    loop
      reminder_hour := coalesce(nullif(split_part(coalesce(item.reminder_time,'09:00'),':',1),''),'9')::int;
      if local_hour not in (reminder_hour,12,17) or local_hour < reminder_hour then continue; end if;

      sev := case
        when coalesce(item.importance,3) >= 5 then 'critical'
        when coalesce(item.importance,3) >= 4 then 'urgent'
        when coalesce(item.importance,3) >= 3 then 'important'
        else 'normal'
      end;
      if local_hour >= 17 then
        sev := case sev when 'urgent' then 'critical' when 'important' then 'urgent' when 'normal' then 'important' else sev end;
      elsif local_hour >= 12 then
        sev := case sev when 'important' then 'urgent' when 'normal' then 'important' else sev end;
      end if;
      if quiet and not (sev='critical' and allow_critical) then continue; end if;

      if not exists(
        select 1 from public.notifications n
        where n.user_id=ctx.user_id and n.ref_table='tasks' and n.ref_id=item.id
          and n.created_at > now()-interval '2 hours'
      ) then
        insert into public.notifications(workspace_id,user_id,title,body,severity,ref_table,ref_id,created_at)
        values(
          ctx.workspace_id,ctx.user_id,
          case when local_hour=reminder_hour then 'LifeOS task reminder' else 'LifeOS task follow-up' end,
          case when item.area in ('Health','Self-control') then 'A private LifeOS item needs attention.' else item.name end,
          sev,'tasks',item.id,now()
        );
        inserted_count := inserted_count + 1;
      end if;
    end loop;

    -- Money: 9am, noon, 5pm.
    if local_hour in (9,12,17) then
      for item in
        select id,due_date,promise_date
        from public.receivables
        where workspace_id=ctx.workspace_id
          and status <> 'Paid'
          and next_followup is not null
          and next_followup <= local_date
      loop
        overdue_days := case when item.due_date is null then 0 else greatest(0,local_date-item.due_date) end;
        promise_missed := item.promise_date is not null and item.promise_date < local_date;
        sev := case
          when promise_missed or overdue_days >= 10 then 'critical'
          when overdue_days >= 5 then 'urgent'
          when overdue_days >= 2 then 'important'
          else 'normal'
        end;
        if quiet and not (sev='critical' and allow_critical) then continue; end if;
        if not exists(
          select 1 from public.notifications n
          where n.user_id=ctx.user_id and n.ref_table='receivables' and n.ref_id=item.id
            and n.created_at > now()-interval '2 hours'
        ) then
          insert into public.notifications(workspace_id,user_id,title,body,severity,ref_table,ref_id,created_at)
          values(ctx.workspace_id,ctx.user_id,
            case when sev in ('urgent','critical') then 'LifeOS urgent money follow-up' else 'LifeOS money follow-up' end,
            'A money follow-up is due.',sev,'receivables',item.id,now());
          inserted_count := inserted_count + 1;
        end if;
      end loop;
    end if;

    -- Family: chosen lead-time and due day at 8am.
    if local_hour=8 and not quiet then
      for item in
        select id,title,due_date,coalesce(reminder_days,2) as reminder_days
        from public.family_tasks
        where workspace_id=ctx.workspace_id
          and status <> 'Completed'
          and due_date between local_date and local_date+90
      loop
        reminder_days := greatest(0,item.reminder_days);
        days_to_due := item.due_date-local_date;
        if days_to_due not in (0,reminder_days) then continue; end if;
        if not exists(
          select 1 from public.notifications n
          where n.user_id=ctx.user_id and n.ref_table='family_tasks' and n.ref_id=item.id
            and n.created_at > now()-interval '20 hours'
        ) then
          insert into public.notifications(workspace_id,user_id,title,body,severity,ref_table,ref_id,created_at)
          values(ctx.workspace_id,ctx.user_id,
            case when days_to_due=0 then 'LifeOS family task due today' else 'LifeOS family reminder' end,
            item.title,case when days_to_due=0 then 'important' else 'normal' end,
            'family_tasks',item.id,now());
          inserted_count := inserted_count + 1;
        end if;
      end loop;
    end if;

    -- Europe documents: 30/14/7/3/1/0 day reminders at 9am.
    if local_hour=9 then
      for item in
        select id,name,expiry_date
        from public.migration_documents
        where workspace_id=ctx.workspace_id
          and status <> 'Ready'
          and expiry_date is not null
          and expiry_date >= local_date
      loop
        days_to_due := item.expiry_date-local_date;
        if days_to_due not in (30,14,7,3,1,0) then continue; end if;
        sev := case when days_to_due <= 3 then 'critical' when days_to_due <= 7 then 'urgent' else 'important' end;
        if quiet and not (sev='critical' and allow_critical) then continue; end if;
        if not exists(
          select 1 from public.notifications n
          where n.user_id=ctx.user_id and n.ref_table='migration_documents' and n.ref_id=item.id
            and n.created_at > now()-interval '20 hours'
        ) then
          insert into public.notifications(workspace_id,user_id,title,body,severity,ref_table,ref_id,created_at)
          values(ctx.workspace_id,ctx.user_id,'LifeOS document reminder',
            item.name||' expires in '||days_to_due||' day'||case when days_to_due=1 then '' else 's' end||'.',
            sev,'migration_documents',item.id,now());
          inserted_count := inserted_count + 1;
        end if;
      end loop;
    end if;
  end loop;

  return inserted_count;
end;
$$;

revoke all on function public.generate_due_lifeos_notifications() from public,anon,authenticated;

do $$
begin
  if exists(select 1 from cron.job where jobname='lifeos-general-reminders-hourly') then
    perform cron.unschedule((select jobid from cron.job where jobname='lifeos-general-reminders-hourly' limit 1));
  end if;
  perform cron.schedule(
    'lifeos-general-reminders-hourly',
    '7 * * * *',
    'select public.generate_due_lifeos_notifications();'
  );
end $$;

commit;
