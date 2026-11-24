-- V1.8: private editorial calendar; no provider credentials, jobs, publishing or ad spending.
create table public.marketing_social_plans (
 id uuid primary key default gen_random_uuid(),
 draft_id uuid not null references public.marketing_campaign_drafts(id) on delete restrict,
 asset_id uuid not null references public.marketing_visual_assets(id) on delete restrict,
 planned_on date not null,
 status text not null default 'planned' check(status in ('planned','prepared','archived')),
 created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(),
 reviewed_by uuid references auth.users(id) on delete restrict,
 reviewed_at timestamptz,
 check((status='planned' and reviewed_by is null and reviewed_at is null) or (status in ('prepared','archived') and reviewed_by is not null and reviewed_at is not null)),
 unique(draft_id,planned_on)
);
create index marketing_social_calendar on public.marketing_social_plans(planned_on,id);
create index marketing_social_asset on public.marketing_social_plans(asset_id);
create index marketing_social_creator on public.marketing_social_plans(created_by);
create index marketing_social_reviewer on public.marketing_social_plans(reviewed_by);
create table public.marketing_social_events(
 id bigint generated always as identity primary key,
 plan_id uuid not null references public.marketing_social_plans(id) on delete restrict,
 reviewer_id uuid not null references auth.users(id) on delete restrict,
 previous_status text not null,
 new_status text not null,
 created_at timestamptz not null default now(),
 check((previous_status='planned' and new_status in ('prepared','archived')) or (previous_status='prepared' and new_status='archived'))
);
create index marketing_social_events_plan on public.marketing_social_events(plan_id,created_at,id);
create index marketing_social_events_reviewer on public.marketing_social_events(reviewer_id);
alter table public.marketing_social_plans enable row level security;
alter table public.marketing_social_events enable row level security;
revoke all on public.marketing_social_plans,public.marketing_social_events from public,anon,authenticated;
grant select on public.marketing_social_plans,public.marketing_social_events to authenticated;
grant insert(draft_id,asset_id,planned_on),update(status) on public.marketing_social_plans to authenticated;
create policy "social owner reads plans" on public.marketing_social_plans for select to authenticated using((select exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner')));
create policy "social owner creates plans" on public.marketing_social_plans for insert to authenticated with check(created_by=auth.uid() and status='planned' and (select exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner')));
create policy "social owner reviews plans" on public.marketing_social_plans for update to authenticated using((select exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner'))) with check((select exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner')));
create policy "social owner reads events" on public.marketing_social_events for select to authenticated using((select exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner')));
create function dealwovo_private.guard_social_plan() returns trigger language plpgsql security invoker set search_path='' as $$
declare d record; a record; today date:=(now() at time zone 'UTC')::date;
begin
 if auth.uid() is null or not exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner') then raise exception 'Owner required' using errcode='42501';end if;
 if tg_op='UPDATE' then
  if not ((old.status='planned' and new.status in ('prepared','archived')) or (old.status='prepared' and new.status='archived')) then raise exception 'Invalid transition' using errcode='23514';end if;
  new.reviewed_by:=auth.uid();new.reviewed_at:=clock_timestamp();
  if new.status='archived' then return new;end if;
 end if;
 if new.planned_on<today or new.planned_on>today+180 then raise exception 'Plan date must be within 180 days' using errcode='23514';end if;
 select channel,status into d from public.marketing_campaign_drafts where id=new.draft_id for share;
 select format,status,template_version into a from public.marketing_visual_assets where id=new.asset_id for share;
 if d.status is distinct from 'reviewed' or a.status is distinct from 'reviewed' or a.template_version is distinct from 1 then raise exception 'Reviewed copy and visual required' using errcode='23514';end if;
 if not ((d.channel='instagram' and a.format in ('square','portrait')) or (d.channel='facebook' and a.format in ('square','landscape')) or (d.channel='pinterest' and a.format='portrait')) then raise exception 'Unsupported editorial channel and format' using errcode='23514';end if;
 return new;
end;$$;
create function dealwovo_private.audit_social_plan() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.marketing_social_events(plan_id,reviewer_id,previous_status,new_status) values(new.id,auth.uid(),old.status,new.status);
 return new;
end;$$;
revoke all on function dealwovo_private.guard_social_plan(),dealwovo_private.audit_social_plan() from public,anon,authenticated;
create trigger social_guard before insert or update on public.marketing_social_plans for each row execute function dealwovo_private.guard_social_plan();
create trigger social_audit after update on public.marketing_social_plans for each row execute function dealwovo_private.audit_social_plan();
create function public.marketing_social_calendar(p_page integer default 1,p_filter text default 'all') returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb; today date:=(now() at time zone 'UTC')::date;
begin
 if auth.uid() is null or not exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner') then raise exception 'Owner required' using errcode='42501';end if;
 if p_page is null or p_page<1 or p_page>1000000 or p_filter is null or p_filter not in ('all','planned','prepared','archived') then raise exception 'Invalid page or filter' using errcode='22023';end if;
 with joined as (
 select p.id,p.planned_on,p.status,p.draft_id,p.asset_id,d.channel,d.campaign_name,d.hook,d.body,d.cta,d.status as copy_status,a.theme,a.format,a.palette,a.status as visual_status,
 case when p.status='archived' then 'archived' when d.status is distinct from 'reviewed' or a.status is distinct from 'reviewed' then 'source_review_required' when p.planned_on<today then 'date_elapsed' when p.status='prepared' then 'internally_prepared' else 'needs_review' end as readiness
 from public.marketing_social_plans p join public.marketing_campaign_drafts d on d.id=p.draft_id join public.marketing_visual_assets a on a.id=p.asset_id
 ), filtered as (select * from joined where p_filter='all' or status=p_filter),
 bounds as (select count(*) as matching,least(p_page::bigint,greatest(1,(count(*)+19)/20)) as page from filtered),
 page_rows as (select * from filtered order by planned_on,id limit 20 offset ((select page from bounds)-1)*20)
 select jsonb_build_object('today',today,'page',(select page from bounds),'pageSize',20,'matching',(select matching from bounds),
 'totals',jsonb_build_object('all',count(*),'planned',count(*) filter(where status='planned'),'prepared',count(*) filter(where status='prepared'),'archived',count(*) filter(where status='archived')),
 'items',coalesce((select jsonb_agg(to_jsonb(r)||jsonb_build_object('history',coalesce((select jsonb_agg(jsonb_build_object('previous_status',e.previous_status,'new_status',e.new_status,'created_at',e.created_at) order by e.created_at,e.id) from public.marketing_social_events e where e.plan_id=r.id),'[]'::jsonb)) order by r.planned_on,r.id) from page_rows r),'[]'::jsonb))
 into result from joined;
 return result;
end;$$;
revoke all on function public.marketing_social_calendar(integer,text) from public,anon,authenticated;
grant execute on function public.marketing_social_calendar(integer,text) to authenticated;
notify pgrst,'reload schema';
