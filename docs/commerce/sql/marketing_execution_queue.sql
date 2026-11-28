-- Staged migration candidate; do not apply to shared production until reviewed.
-- No network calls, scheduler, secrets, or external publishing.
begin;
create table public.marketing_execution_jobs (
 id uuid primary key default gen_random_uuid(),
 plan_id uuid not null unique references public.marketing_social_plans(id) on delete restrict,
 scheduled_at timestamptz not null,
 expires_at timestamptz not null,
 state text not null default 'held' check(state in ('held','pending','dispatching','published','failed','uncertain','cancelled')),
 account_id text check(account_id ~ '^[A-Za-z0-9_-]{1,128}$'),
 channel text not null check(channel in ('instagram','facebook','pinterest')),
 release_approved_at timestamptz,
 release_approved_by uuid references auth.users(id) on delete restrict,
 rights_verified boolean not null default false,
 destination_verified boolean not null default false,
 disclosure_reviewed boolean not null default false,
 media_ready boolean not null default false,
 claim_token uuid,
 claimed_at timestamptz,
 external_id text check(length(external_id) between 1 and 256),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check(expires_at>scheduled_at),
 check((release_approved_at is null)=(release_approved_by is null)),
 check(state not in ('pending','dispatching') or (release_approved_at is not null and account_id is not null and rights_verified and destination_verified and disclosure_reviewed and media_ready)),
 check(state not in ('dispatching','published','uncertain') or (claim_token is not null and claimed_at is not null and account_id is not null)),
 check((state='published')=(external_id is not null))
);
create unique index marketing_execution_external_unique on public.marketing_execution_jobs(channel,account_id,external_id) where external_id is not null;
create index marketing_execution_due on public.marketing_execution_jobs(scheduled_at,id) where state='pending';
alter table public.marketing_execution_jobs enable row level security;
revoke all on public.marketing_execution_jobs from public,anon,authenticated;
grant select on public.marketing_execution_jobs to authenticated;
grant select,insert,update on public.marketing_execution_jobs to service_role;
create policy execution_owner_read on public.marketing_execution_jobs for select to authenticated using ((select exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner')));
create table public.marketing_execution_control (singleton boolean primary key default true check(singleton),enabled boolean not null default false);
insert into public.marketing_execution_control(singleton,enabled) values(true,false);
alter table public.marketing_execution_control enable row level security;
revoke all on public.marketing_execution_control from public,anon,authenticated;
grant select on public.marketing_execution_control to service_role;
-- Atomic claim is deliberately service-only. No API route or worker invokes it yet.
create function public.claim_marketing_execution(p_id uuid,p_account text)
returns setof public.marketing_execution_jobs language sql security invoker set search_path='' as $$
 update public.marketing_execution_jobs j
 set state='dispatching',claim_token=gen_random_uuid(),claimed_at=clock_timestamp(),updated_at=clock_timestamp()
 from public.marketing_social_plans p,public.marketing_campaign_drafts d,public.marketing_visual_assets a
 where j.id=p_id and j.state='pending' and j.account_id=p_account
 and exists(select 1 from public.marketing_execution_control where singleton and enabled)
 and j.release_approved_at<=now() and exists(select 1 from public.catalog_admins where user_id=j.release_approved_by and role='owner')
 and j.rights_verified and j.destination_verified and j.disclosure_reviewed and j.media_ready
 and j.scheduled_at<=now() and j.expires_at>now()
 and p.id=j.plan_id and p.status='prepared' and p.planned_on=(now() at time zone 'UTC')::date
 and d.id=p.draft_id and d.status='reviewed' and d.channel=j.channel
 and a.id=p.asset_id and a.status='reviewed' and a.template_version=1
 and ((j.channel='instagram' and a.format in ('square','portrait')) or (j.channel='facebook' and a.format in ('square','landscape')) or (j.channel='pinterest' and a.format='portrait'))
 returning j.*;
$$;
revoke all on function public.claim_marketing_execution(uuid,text) from public,anon,authenticated;
grant execute on function public.claim_marketing_execution(uuid,text) to service_role;
-- A lost worker is not automatically retried: the external outcome is unknown.
create function public.mark_uncertain_marketing_execution()
returns bigint language sql security invoker set search_path='' as $$
 with changed as (update public.marketing_execution_jobs set state='uncertain',updated_at=clock_timestamp()
 where state='dispatching' and claimed_at<now()-interval '15 minutes' returning id)
 select count(*) from changed;
$$;
revoke all on function public.mark_uncertain_marketing_execution() from public,anon,authenticated;
grant execute on function public.mark_uncertain_marketing_execution() to service_role;
-- Completion requires the original claim token. Unknown outcomes cannot be reset to pending.
create function public.finish_marketing_execution(p_id uuid,p_token uuid,p_state text,p_external_id text default null)
returns boolean language sql security invoker set search_path='' as $
 with changed as (
 update public.marketing_execution_jobs set state=p_state,external_id=p_external_id,updated_at=clock_timestamp()
 where id=p_id and claim_token=p_token and state in ('dispatching','uncertain')
 and p_state in ('published','failed','uncertain')
 and (state='dispatching' or p_state in ('published','uncertain'))
 and ((p_state='published' and length(btrim(p_external_id)) between 1 and 256 and length(p_external_id)<=256) or (p_state<>'published' and p_external_id is null))
 returning id
 ) select exists(select 1 from changed);
$;
revoke all on function public.finish_marketing_execution(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.finish_marketing_execution(uuid,uuid,text,text) to service_role;
commit;
