-- Growth Overseer: deterministic, internal-only orchestration. No model/provider calls.
create table public.growth_supervisor_control(
 singleton boolean primary key default true check(singleton),
 mode text not null default 'observe' check(mode in ('paused','observe','internal')),
 updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id)
);
insert into public.growth_supervisor_control(singleton) values(true);
create table public.growth_supervisor_tasks(
 id uuid primary key default gen_random_uuid(),
 task_day date not null,
 task_key text not null check(task_key in ('source_access','catalog_pilot','research_evidence','seo_release','traffic_measurement','finance_evidence','dropship_hold','daily_brief','product_campaign','newsletter')),
 lane text not null check(lane in ('sourcing','research','seo','conversion','finance','fulfillment','supervisor','creative','retention')),
 priority smallint not null check(priority between 1 and 100),
 status text not null check(status in ('blocked','ready','deferred','completed','failed','exhausted','resolved')),
 detail text not null check(length(detail) between 1 and 1000),
 attempts integer not null default 0 check(attempts between 0 and 3),
 retry_at timestamptz,
 result jsonb,
 updated_at timestamptz not null default now(),
 unique(task_day,task_key)
);
create index growth_task_day_priority on public.growth_supervisor_tasks(task_day desc,priority,task_key);
create table public.growth_supervisor_events(
 id bigint generated always as identity primary key,
 task_id uuid references public.growth_supervisor_tasks(id) on delete restrict,
 event text not null check(event in ('mode_changed','executed','execution_failed','cycle')),
 detail jsonb not null,
 actor uuid references auth.users(id),
 created_at timestamptz not null default now()
);
create index growth_event_task on public.growth_supervisor_events(task_id,id desc);
create index growth_event_actor on public.growth_supervisor_events(actor);
alter table public.growth_supervisor_control enable row level security;
alter table public.growth_supervisor_tasks enable row level security;
alter table public.growth_supervisor_events enable row level security;
revoke all on public.growth_supervisor_control,public.growth_supervisor_tasks,public.growth_supervisor_events from public,anon,authenticated;
grant select on public.growth_supervisor_control,public.growth_supervisor_tasks,public.growth_supervisor_events to authenticated;
create policy "owner reads growth control" on public.growth_supervisor_control for select to authenticated using((select exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner')));
create policy "owner reads growth tasks" on public.growth_supervisor_tasks for select to authenticated using((select exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner')));
create policy "owner reads growth events" on public.growth_supervisor_events for select to authenticated using((select exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner')));
create function dealwovo_private.growth_cycle() returns jsonb language plpgsql security definer set search_path='' as $$
declare d date:=(now() at time zone 'UTC')::date; md text; sources integer; products integer; evidence integer; tx integer; tracking boolean; r record; n integer:=0; failed integer:=0; output jsonb;
begin
 if not pg_try_advisory_xact_lock(hashtextextended('dealwovo-growth-supervisor',0)) then return jsonb_build_object('state','busy');end if;
 select mode into md from public.growth_supervisor_control where singleton for update;
 if md is null or md='paused' then return jsonb_build_object('state','paused');end if;
 select count(*) into sources from public.catalog_feed_sources where status='authorized';
 select count(distinct product_id) into products from dealwovo_private.campaign_eligible_offers;
 select count(*) into evidence from public.commerce_opportunity_evidence where observed_on>=d-30 and observed_on<=d;
 select count(*) into tx from (select distinct on(source_id,transaction_ref) status,commission_cents from public.marketing_commission_entries order by source_id,transaction_ref,revision desc)q where status in ('approved','paid') and commission_cents>0;
 select enabled into tracking from dealwovo_private.attribution_activation where singleton;
 -- Manual work remains evidence-driven, re-evaluated on every cycle. No claim of external action.
 insert into public.growth_supervisor_tasks(task_day,task_key,lane,priority,status,detail)
 values
 (d,'source_access','sourcing',1,case when sources=0 then 'blocked' else 'resolved' end,case when sources=0 then 'Obtain actual affiliate account and advertiser approval; no authorized source recorded.' else 'Authorized source records exist; independently verify scope and account terms.' end),
 (d,'catalog_pilot','sourcing',2,case when products<10 then 'blocked' else 'resolved' end,products||' eligible source-linked products; initial target is 10 to 20. Review actual source rights and offers.'),
 (d,'research_evidence','research',3,case when evidence=0 then 'blocked' else 'ready' end,evidence||' recent research observations; collect dated demand, commission and retailer evidence. A record count does not establish complete research.'),
 (d,'seo_release','seo',4,'blocked','Indexing and production release remain separately held; verify domain, Search Console and candidate-specific legal/technical gates.'),
 (d,'traffic_measurement','conversion',5,case when tracking then 'ready' else 'blocked' end,case when tracking then 'Database measurement gate enabled; verify server configuration and real data before drawing conclusions.' else 'Collection held; complete privacy, partner and server configuration reviews.' end),
 (d,'finance_evidence','finance',6,case when tx=0 then 'blocked' else 'ready' end,tx||' positive latest approved/paid ledger entries. Reconcile genuine reports, costs and settlement; no bank verification implied.'),
 (d,'dropship_hold','fulfillment',100,'blocked','Direct-sale checkout, supplier fulfillment and spending remain outside supervisor permissions.')
 on conflict(task_day,task_key) do update set status=excluded.status,detail=excluded.detail,updated_at=now();
 -- Execution tasks are separate from human handoffs, and bounded to three internal functions per cycle.
 insert into public.growth_supervisor_tasks(task_day,task_key,lane,priority,status,detail)
 values(d,'daily_brief','supervisor',10,'deferred','Prepare factual internal commercial snapshot.'),
 (d,'product_campaign','creative',11,'deferred','Prepare product campaign drafts from eligible source-linked offers.'),
 (d,'newsletter','retention',12,'deferred','Prepare internal weekly newsletter drafts without accessing subscribers.')
 on conflict(task_day,task_key) do nothing;
 update public.growth_supervisor_tasks set status=case when task_key='product_campaign' and products=0 then 'blocked' when md='observe' then 'deferred' else 'ready' end,updated_at=now()
 where task_day=d and task_key in ('daily_brief','product_campaign','newsletter') and status in ('ready','deferred','blocked');
 if md='internal' then
  for r in select * from public.growth_supervisor_tasks where task_day=d and task_key in ('daily_brief','product_campaign','newsletter') and (status='ready' or (status='failed' and retry_at<=now())) and attempts<3 and (task_key<>'product_campaign' or products>0) order by priority limit 3 loop
   update public.growth_supervisor_tasks set attempts=attempts+1,updated_at=now() where id=r.id;
   begin
    case r.task_key
     when 'daily_brief' then output:=jsonb_build_object('created',dealwovo_private.prepare_commerce_brief());
     when 'product_campaign' then output:=jsonb_build_object('draftsCreated',dealwovo_private.prepare_product_campaigns(null));
     when 'newsletter' then output:=jsonb_build_object('draftsCreated',dealwovo_private.prepare_newsletter_week());
     else raise exception 'Task not allowed';
    end case;
    update public.growth_supervisor_tasks set status='completed',result=output,retry_at=null,updated_at=now() where id=r.id;
    insert into public.growth_supervisor_events(task_id,event,detail,actor) values(r.id,'executed',output,auth.uid());n:=n+1;
   exception when others then
    -- Subtransaction rolls back tool writes; expose only error code, not secret-bearing error text.
    update public.growth_supervisor_tasks set status=case when attempts>=3 then 'exhausted' else 'failed' end,retry_at=case when attempts>=3 then null else now()+interval '1 hour' end,result=jsonb_build_object('sqlstate',sqlstate),updated_at=now() where id=r.id;
    insert into public.growth_supervisor_events(task_id,event,detail,actor) values(r.id,'execution_failed',jsonb_build_object('sqlstate',sqlstate),auth.uid());failed:=failed+1;
   end;
  end loop;
 end if;
 output:=jsonb_build_object('state',md,'completed',n,'failed',failed,'authorizedSources',sources,'eligibleProducts',products,'externalActions',0,'modelCalls',0);
 insert into public.growth_supervisor_events(event,detail,actor) values('cycle',output,auth.uid());
 return output;
end;$$;
revoke all on function dealwovo_private.growth_cycle() from public,anon,authenticated,service_role;
create function dealwovo_private.owner_growth_cycle() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner') then raise exception 'Owner required' using errcode='42501';end if;
 return dealwovo_private.growth_cycle();
end;$$;
create function public.run_growth_cycle() returns jsonb language sql security invoker set search_path='' as $$select dealwovo_private.owner_growth_cycle()$$;
create function dealwovo_private.set_growth_mode(p_mode text) returns boolean language plpgsql security definer set search_path='' as $$
declare old_mode text;
begin
 if auth.uid() is null or not exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner') then raise exception 'Owner required' using errcode='42501';end if;
 if p_mode is null or p_mode not in ('paused','observe','internal') then raise exception 'Invalid mode' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('dealwovo-growth-supervisor',0));
 select mode into old_mode from public.growth_supervisor_control where singleton for update;
 if old_mode=p_mode then return false;end if;
 update public.growth_supervisor_control set mode=p_mode,updated_by=auth.uid(),updated_at=now() where singleton;
 insert into public.growth_supervisor_events(event,detail,actor) values('mode_changed',jsonb_build_object('from',old_mode,'to',p_mode),auth.uid());return true;
end;$$;
create function public.set_growth_mode(p_mode text) returns boolean language sql security invoker set search_path='' as $$select dealwovo_private.set_growth_mode(p_mode)$$;
revoke all on function dealwovo_private.owner_growth_cycle(),public.run_growth_cycle(),dealwovo_private.set_growth_mode(text),public.set_growth_mode(text) from public,anon,authenticated;
grant execute on function dealwovo_private.owner_growth_cycle(),public.run_growth_cycle(),dealwovo_private.set_growth_mode(text),public.set_growth_mode(text) to authenticated;
-- Consolidate the three existing draft/brief schedules into this overseer. Default internal is safe
-- because these exact workflows were already enabled. Keep independent catalog freshness, retention and legacy planning jobs.
update public.growth_supervisor_control set mode='internal' where singleton;
select cron.unschedule(jobid) from cron.job where jobname in ('dealwovo-daily-commercial-brief','dealwovo-product-campaign-drafts','dealwovo-weekly-newsletter-drafts');
select cron.schedule('dealwovo-growth-supervisor','50 * * * *','select dealwovo_private.growth_cycle();');
notify pgrst,'reload schema';
