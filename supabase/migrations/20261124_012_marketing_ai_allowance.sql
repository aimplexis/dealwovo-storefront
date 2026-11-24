-- Private generation attempt allowance. No model invocation or publication.
create table dealwovo_private.marketing_ai_attempts (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete restrict,
 created_at timestamptz not null default clock_timestamp()
);
alter table dealwovo_private.marketing_ai_attempts enable row level security;
revoke all on dealwovo_private.marketing_ai_attempts from public,anon,authenticated;
create index marketing_ai_attempts_owner_created on dealwovo_private.marketing_ai_attempts(owner_id,created_at desc);
create function dealwovo_private.reserve_marketing_ai_attempt() returns boolean
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();
begin
 if u is null or not exists(select 1 from public.catalog_admins a where a.user_id=u and a.role='owner') then
 raise exception 'owner required' using errcode='42501';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('dealwovo-ai-global',0));
 if exists(select 1 from dealwovo_private.marketing_ai_attempts where created_at>clock_timestamp()-interval '30 minutes')
 or (select count(*) from dealwovo_private.marketing_ai_attempts where created_at>clock_timestamp()-interval '24 hours')>=5 then return false;end if;
 insert into dealwovo_private.marketing_ai_attempts(owner_id) values(u);
 return true;
end;$$;
revoke all on function dealwovo_private.reserve_marketing_ai_attempt() from public,anon,authenticated;
grant execute on function dealwovo_private.reserve_marketing_ai_attempt() to authenticated;
create function public.reserve_marketing_ai_attempt() returns boolean
language sql security invoker set search_path='' as $$ select dealwovo_private.reserve_marketing_ai_attempt(); $$;
revoke all on function public.reserve_marketing_ai_attempt() from public,anon,authenticated;
grant execute on function public.reserve_marketing_ai_attempt() to authenticated;
notify pgrst,'reload schema';
