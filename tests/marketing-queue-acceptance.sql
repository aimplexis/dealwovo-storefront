\set ON_ERROR_STOP on
-- Run only after fixture and staged queue schema in an empty disposable database.
do $$
begin
 if has_function_privilege('anon','public.claim_marketing_execution(uuid,text)','execute') or has_function_privilege('authenticated','public.finish_marketing_execution(uuid,uuid,text,text)','execute') or has_function_privilege('authenticated','public.revalidate_marketing_execution(uuid,uuid)','execute') then raise exception 'Unexpected execution grant'; end if;
 if has_table_privilege('anon','public.marketing_execution_jobs','select') or has_table_privilege('authenticated','public.marketing_execution_jobs','insert,update,delete') then raise exception 'Unexpected table grant'; end if;
end $$;
insert into public.marketing_execution_jobs(id,plan_id,scheduled_at,expires_at,state,account_id,channel,release_approved_at,release_approved_by,rights_verified,destination_verified,disclosure_reviewed,media_ready)
values ('50000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001',now()-interval '1 minute',now()+interval '1 hour','pending','fixture-account','facebook',now()-interval '2 minutes','10000000-0000-4000-8000-000000000001',true,true,true,true);
set role authenticated;
do $$ begin
 if (select count(*) from public.marketing_execution_jobs)<>0 then raise exception 'Nonowner can read'; end if;
 perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
 if (select count(*) from public.marketing_execution_jobs)<>1 then raise exception 'Owner cannot read'; end if;
end $$;
reset role;
set role service_role;
do $$ begin
 if exists(select 1 from public.claim_marketing_execution('50000000-0000-4000-8000-000000000001','fixture-account')) then raise exception 'Default hold bypassed'; end if;
end $$;
reset role;
update public.marketing_execution_control set enabled=true;
set role service_role;
do $$ declare token uuid; jid uuid:='50000000-0000-4000-8000-000000000001'; begin
 if exists(select 1 from public.claim_marketing_execution(jid,'wrong-account')) then raise exception 'Wrong account accepted'; end if;
 select claim_token into token from public.claim_marketing_execution(jid,'fixture-account');
 if token is null then raise exception 'Claim failed'; end if;
 if exists(select 1 from public.claim_marketing_execution(jid,'fixture-account')) then raise exception 'Duplicate claim'; end if;
 if not exists(select 1 from public.revalidate_marketing_execution(jid,token)) then raise exception 'Valid revalidation failed'; end if;
 if public.finish_marketing_execution(jid,gen_random_uuid(),'published','fixture-post') then raise exception 'Wrong token accepted'; end if;
 if public.finish_marketing_execution(jid,token,'published',' ') then raise exception 'Invalid receipt accepted'; end if;
end $$;
reset role;
update public.marketing_execution_control set enabled=false;
set role service_role;
do $$ declare token uuid; jid uuid:='50000000-0000-4000-8000-000000000001'; begin
 select claim_token into token from public.marketing_execution_jobs where id=jid;
 if exists(select 1 from public.revalidate_marketing_execution(jid,token)) then raise exception 'Emergency hold bypassed'; end if;
 update public.marketing_execution_jobs set claimed_at=now()-interval '16 minutes' where id=jid;
 if public.mark_uncertain_marketing_execution()<>1 then raise exception 'Lost worker not recovered'; end if;
 if public.finish_marketing_execution(jid,token,'failed',null) then raise exception 'Uncertain outcome erased'; end if;
 if not public.finish_marketing_execution(jid,token,'published','fixture-post') then raise exception 'Reconciliation failed'; end if;
 if public.finish_marketing_execution(jid,token,'published','duplicate') then raise exception 'Terminal result rewritten'; end if;
end $$;
reset role;
select 'PASS PostgreSQL queue permissions, hold, claims, revalidation and recovery' as result;

-- Terminal state and audit-history checks.
set role service_role;
do $$ declare jid uuid:='50000000-0000-4000-8000-000000000001'; begin
 if public.cancel_marketing_execution(jid) then raise exception 'Published cancellation accepted'; end if;
 begin
  update public.marketing_execution_jobs set state='pending',external_id=null where id=jid;
  raise exception 'Terminal reset accepted';
 exception when raise_exception then
  if sqlerrm<>'Terminal execution is immutable' then raise; end if;
 end;
 if (select array_agg(new_state order by occurred_at,id) from public.marketing_execution_events where job_id=jid) is distinct from array['pending','dispatching','uncertain','published']::text[] then raise exception 'Audit history incomplete'; end if;
 if has_table_privilege('service_role','public.marketing_execution_events','update,delete,truncate') then raise exception 'Worker can rewrite audit history'; end if;
end $$;
reset role;
insert into public.marketing_social_plans values ('40000000-0000-4000-8000-000000000003','prepared',(now() at time zone 'UTC')::date,'20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001');
insert into public.marketing_execution_jobs(id,plan_id,scheduled_at,expires_at,channel)
values ('50000000-0000-4000-8000-000000000003','40000000-0000-4000-8000-000000000003',now(),now()+interval '1 hour','facebook');
set role service_role;
do $$ declare jid uuid:='50000000-0000-4000-8000-000000000003'; begin
 if not public.cancel_marketing_execution(jid) then raise exception 'Held cancellation failed'; end if;
 if public.cancel_marketing_execution(jid) then raise exception 'Duplicate cancellation'; end if;
 if (select array_agg(new_state order by occurred_at,id) from public.marketing_execution_events where job_id=jid) is distinct from array['held','cancelled']::text[] then raise exception 'Cancellation history incomplete'; end if;
end $$;
reset role;
set role authenticated;
do $$ begin
 if exists(select 1 from public.marketing_execution_events) then raise exception 'Nonowner audit access'; end if;
 perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
 if (select count(*) from public.marketing_execution_events)<>6 then raise exception 'Owner audit access incomplete'; end if;
end $$;
reset role;
select 'PASS execution cancellation, terminal state protection and audit history' as result;
