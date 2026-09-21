begin;

do $lifeos$
begin
  if exists(select 1 from cron.job where jobname='lifeos-push-dispatch-5m') then
    perform cron.unschedule((select jobid from cron.job where jobname='lifeos-push-dispatch-5m' limit 1));
  end if;

  perform cron.schedule(
    'lifeos-push-dispatch-5m',
    '*/5 * * * *',
    $cron$
      select net.http_post(
        url := (
          select decrypted_secret
          from vault.decrypted_secrets
          where name='lifeos_project_url'
          limit 1
        ) || '/functions/v1/lifeos-push-dispatch',
        headers := jsonb_build_object(
          'Content-Type','application/json',
          'Authorization','Bearer ' || (
            select decrypted_secret
            from vault.decrypted_secrets
            where name='lifeos_cron_anon_key'
            limit 1
          )
        ),
        body := jsonb_build_object('source','pg_cron','scheduled_at',now()),
        timeout_milliseconds := 10000
      ) as request_id;
    $cron$
  );
end
$lifeos$;

commit;