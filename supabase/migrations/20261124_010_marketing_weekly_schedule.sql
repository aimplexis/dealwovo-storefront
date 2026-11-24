-- Weekly private editorial planning; never posts or sends external messages.
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('dealwovo-weekly-marketing-drafts','0 14 * * 1','select dealwovo_private.plan_marketing_week();');

-- Narrow, read-only admin status without exposing the cron schema.
create function dealwovo_private.marketing_scheduler_status()
returns text language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not dealwovo_private.is_catalog_admin() then
   raise exception 'catalog administrator required' using errcode='42501';
 end if;
 if exists(select 1 from cron.job j where j.jobname='dealwovo-weekly-marketing-drafts' and j.active and j.schedule='0 14 * * 1' and j.command='select dealwovo_private.plan_marketing_week();') then
   return 'active';
 end if;
 return 'inactive';
end;
$$;
revoke all on function dealwovo_private.marketing_scheduler_status() from public,anon,authenticated;
grant execute on function dealwovo_private.marketing_scheduler_status() to authenticated;
create function public.marketing_scheduler_status()
returns text language sql stable security invoker set search_path='' as $$
 select dealwovo_private.marketing_scheduler_status();
$$;
revoke all on function public.marketing_scheduler_status() from public,anon,authenticated;
grant execute on function public.marketing_scheduler_status() to authenticated;
notify pgrst,'reload schema';
-- To stop this job only: select cron.unschedule('dealwovo-weekly-marketing-drafts');
