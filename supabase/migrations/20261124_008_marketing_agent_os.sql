-- Dealwovo Marketing Agent OS v1 (PREVIEW database ONLY).
-- Autonomous internal planning, NOT automatic public posting, messaging or ad spending.

create table public.marketing_agent_runs (
 id uuid primary key default gen_random_uuid(),
 initiated_by uuid references auth.users(id) on delete restrict,
 source text not null check(source in ('manual','scheduled')),
 period_start date,
 focus text not null check(focus in ('brand','gifts','tech','living')),
 created_at timestamptz not null default now(),
 stage text not null default 'completed' check(stage='completed'),
 verified_offer_count integer not null check(verified_offer_count>=0),
 product_count integer not null check(product_count>=0),
 feed_source_count integer not null check(feed_source_count>=0),
 draft_count integer not null check(draft_count between 0 and 12),
 trend_source_status text not null default 'not_connected' check(trend_source_status='not_connected'),
 conversion_tracking_status text not null default 'not_connected' check(conversion_tracking_status='not_connected'),
 summary text not null check(length(summary) between 1 and 1000),
 ai_summary text check(ai_summary is null or length(ai_summary)<=1800),
 constraint marketing_run_source check(
   (source='manual' and initiated_by is not null and period_start is null)
   or (source='scheduled' and initiated_by is null and period_start is not null)
 ),
 unique(source,period_start)
);
create index marketing_runs_by_created on public.marketing_agent_runs(created_at desc);
create index marketing_runs_initiator on public.marketing_agent_runs(initiated_by);

create table public.marketing_campaign_drafts (
 id uuid primary key default gen_random_uuid(),
 run_id uuid not null references public.marketing_agent_runs(id) on delete restrict,
 created_at timestamptz not null default now(),
 channel text not null check(channel in ('instagram','facebook','pinterest','blog')),
 agent text not null check(agent in ('campaign_strategist','content_studio','seo_guardian')),
 focus text not null check(focus in ('brand','gifts','tech','living')),
 campaign_name text not null check(length(campaign_name) between 5 and 130),
 hook text not null check(length(hook) between 8 and 180),
 body text not null check(length(body) between 20 and 1500),
 cta text not null check(length(cta) between 5 and 180),
 supporting_evidence text not null check(length(supporting_evidence) between 8 and 400),
 compliance_note text not null check(length(compliance_note) between 8 and 500),
 suggested_day date,
 status text not null default 'draft' check(status in ('draft','reviewed','archived')),
 reviewed_by uuid references auth.users(id) on delete restrict,
 reviewed_at timestamptz,
 constraint review_requires_reviewer check(status <> 'reviewed' or (reviewed_by is not null and reviewed_at is not null))
);
create index marketing_drafts_run on public.marketing_campaign_drafts(run_id);
create index marketing_drafts_status on public.marketing_campaign_drafts(status,created_at desc);
create index marketing_drafts_reviewer on public.marketing_campaign_drafts(reviewed_by);

create table public.marketing_review_events (
 id bigint generated always as identity primary key,
 draft_id uuid not null references public.marketing_campaign_drafts(id) on delete restrict,
 reviewer_id uuid not null references auth.users(id) on delete restrict,
 previous_status text not null,
 new_status text not null,
 created_at timestamptz not null default now()
);
create index marketing_review_events_by_draft on public.marketing_review_events(draft_id,created_at desc);

alter table public.marketing_agent_runs enable row level security;
alter table public.marketing_campaign_drafts enable row level security;
alter table public.marketing_review_events enable row level security;
revoke all on public.marketing_agent_runs,public.marketing_campaign_drafts,public.marketing_review_events from anon,authenticated;
grant select,insert on public.marketing_agent_runs, public.marketing_campaign_drafts to authenticated;
grant update(status,reviewed_by,reviewed_at) on public.marketing_campaign_drafts to authenticated;
grant select on public.marketing_review_events to authenticated;

create policy "marketing admins view runs" on public.marketing_agent_runs
 for select to authenticated using((select dealwovo_private.is_catalog_admin()));
create policy "marketing owner appends own runs" on public.marketing_agent_runs
 for insert to authenticated with check(
 initiated_by=(select auth.uid())
 and source='manual'
 and period_start is null
 and (select exists(select 1 from public.catalog_admins a where a.user_id=(select auth.uid()) and a.role='owner'))
);
create policy "marketing admins view drafts" on public.marketing_campaign_drafts
 for select to authenticated using((select dealwovo_private.is_catalog_admin()));
create policy "marketing owner appends drafts" on public.marketing_campaign_drafts
 for insert to authenticated with check(
 (select exists(select 1 from public.catalog_admins a where a.user_id=(select auth.uid()) and a.role='owner'))
 and status='draft' and reviewed_by is null and reviewed_at is null
 and exists (select 1 from public.marketing_agent_runs r where r.id=run_id and r.initiated_by=(select auth.uid()))
);
create policy "marketing owner reviews drafts" on public.marketing_campaign_drafts
 for update to authenticated
 using((select exists(select 1 from public.catalog_admins a where a.user_id=(select auth.uid()) and a.role='owner')))
 with check((select exists(select 1 from public.catalog_admins a where a.user_id=(select auth.uid()) and a.role='owner')))
;
create policy "marketing admins view review events" on public.marketing_review_events
 for select to authenticated using((select dealwovo_private.is_catalog_admin()));

-- Reject status changes without real owner review, even through a direct REST call.
create or replace function dealwovo_private.guard_marketing_review()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.status is distinct from old.status then
   if (select auth.uid()) is null or not exists(
     select 1 from public.catalog_admins a where a.user_id=(select auth.uid()) and a.role='owner'
   ) then raise exception 'owner review required' using errcode='42501'; end if;
   if new.reviewed_by is distinct from (select auth.uid()) or new.reviewed_at is null then
     raise exception 'review evidence required';
   end if;
   -- A reviewed draft may be archived. This is NOT approval to publish externally.
   if old.status='archived' then raise exception 'archived drafts are immutable';end if;
 elsif new.reviewed_by is distinct from old.reviewed_by or new.reviewed_at is distinct from old.reviewed_at then
   raise exception 'review metadata cannot change without status change';
 end if;
 return new;
end;
$$;
revoke all on function dealwovo_private.guard_marketing_review() from public,anon,authenticated;
create trigger marketing_guard_review before update on public.marketing_campaign_drafts
 for each row execute function dealwovo_private.guard_marketing_review();

create or replace function dealwovo_private.audit_marketing_review()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.status is distinct from new.status and (select auth.uid()) is not null then
  insert into public.marketing_review_events(draft_id,reviewer_id,previous_status,new_status)
  values(new.id,(select auth.uid()),old.status,new.status);
 end if;
 return new;
end;
$$;
revoke all on function dealwovo_private.audit_marketing_review() from public,anon,authenticated;
create trigger marketing_review_audit after update on public.marketing_campaign_drafts
 for each row execute function dealwovo_private.audit_marketing_review();

-- SQL-only weekly automatic planning. Called by pg_cron as the database operator,
-- never exposed through the public Data API. No external service or AI key.
create or replace function dealwovo_private.plan_marketing_week()
returns integer language plpgsql security invoker set search_path='' as $$
declare
 v_run_id uuid;
 v_week date:=date_trunc('week',now() at time zone 'UTC')::date;
 v_offers integer;
 v_products integer;
 v_sources integer;
begin
 select count(*)::int into v_offers from public.catalog_offers o
 join public.catalog_products p on p.id=o.product_id
 join public.catalog_categories c on c.id=p.category_id
 join public.catalog_merchants m on m.id=o.merchant_id
 where o.status='approved' and o.verified_at<=now() and o.expires_at>now()
 and p.status='published' and c.status='published' and m.status='approved';
 select count(*)::int into v_products from public.catalog_products;
 select count(*)::int into v_sources from public.catalog_feed_sources where status='authorized';
 insert into public.marketing_agent_runs (source,period_start,focus,verified_offer_count,product_count,feed_source_count,draft_count,summary)
 values('scheduled',v_week,'brand',v_offers,v_products,v_sources,4,
    case when v_offers=0 then 'Prelaunch: plan editorial content; do not promote unverified products.'
    else 'Verified offers exist: editorial drafts only; product-specific claims require separate evidence review.' end)
 on conflict(source,period_start) do nothing returning id into v_run_id;
 if v_run_id is null then return 0;end if;
 insert into public.marketing_campaign_drafts(run_id,channel,agent,focus,campaign_name,hook,body,cta,supporting_evidence,compliance_note,suggested_day)
 values
 (v_run_id,'instagram','content_studio','brand','The Good Finds Club','Your next favorite discovery starts with a little curiosity.',
  'Meet Dealwovo: a place to explore thoughtful gifts, clever ideas and everyday inspiration. We are curating verified retailer finds before opening the catalog. Discover More. Save Smarter.',
  'Explore Dealwovo at dealwovo.com.',
  'Brand website and prelaunch catalog; no verified offers represented.',
  'Editorial promotion only. No claimed discounts, testimonials or products; no automatic publication.',v_week),
 (v_run_id,'facebook','campaign_strategist','gifts','Gifting Without Guesswork','Some gifts say more because they feel more thoughtful.',
  'Finding the right gift can start with knowing what matters to someone. Explore Dealwovo’s gift inspiration and discover creative ways to celebrate. Product listings will only appear after verification.',
  'Explore gift ideas on Dealwovo.',
  'Gift Finder editorial page exists; no verified product recommendation implied.',
  'No fake product recommendation or pricing claims; independent editorial inspiration.',v_week+2),
 (v_run_id,'pinterest','content_studio','living','Small Everyday Wonders','Little upgrades. A more inspired everyday.',
  'Collect ideas for home, daily rituals and thoughtful everyday moments with Dealwovo. Our curated retailer catalog is being prepared.',
  'Browse everyday inspiration.',
  'Everyday category exists; not a live product promotion.',
  'Use only licensed imagery; do not imply stock, discounts or retailer approval.',v_week+4),
 (v_run_id,'blog','seo_guardian','tech','Editorial Guide','How to explore clever everyday tech without the hype',
  'Draft outline: start with a real problem; prioritize compatibility, accessibility, warranty and seller trust; compare options only with source evidence; disclose affiliate relationships near links. Do not publish without editorial review.',
  'Read the editorial standards and explore tech inspiration.',
  'Tech editorial category exists; no source-backed trend ranking is connected.',
  'Research citations and original writing are required before publishing.',v_week+4);
 return 4;
end;$$;
revoke all on function dealwovo_private.plan_marketing_week() from public,anon,authenticated;
comment on function dealwovo_private.plan_marketing_week() is 'Database-only scheduled editorial draft planner; outputs never publish or send messages.';
