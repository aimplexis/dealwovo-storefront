-- Privacy-minimized outbound navigation counters; collection disabled until independent activation.
create table dealwovo_private.attribution_activation(singleton boolean primary key default true check(singleton),enabled boolean not null default false);
insert into dealwovo_private.attribution_activation(singleton) values(true);
alter table dealwovo_private.attribution_activation enable row level security;
revoke all on dealwovo_private.attribution_activation from public,anon,authenticated,service_role;
create table dealwovo_private.outbound_daily(
 day date not null, offer_id uuid not null, product_id uuid not null,
 placement text not null check(placement in ('shop','home','product','gifts','assistant','compare','wishlist','daily','collection','unknown')),
 clicks integer not null check(clicks between 1 and 1000),
 primary key(day,offer_id,placement)
);
alter table dealwovo_private.outbound_daily enable row level security;
revoke all on dealwovo_private.outbound_daily from public,anon,authenticated,service_role;
-- Only trusted server credentials may invoke this. No IP, cookie, user agent, session or raw URL persisted.
create function public.record_outbound_navigation(p_offer uuid,p_placement text) returns boolean language plpgsql security definer set search_path='' as $$
declare d date:=(now() at time zone 'UTC')::date;pid uuid;
begin
 if not exists(select 1 from dealwovo_private.attribution_activation where singleton and enabled) then return false;end if;
 if p_placement is null or p_placement not in ('shop','home','product','gifts','assistant','compare','wishlist','daily','collection','unknown') then return false;end if;
 select product_id into pid from dealwovo_private.campaign_eligible_offers where offer_id=p_offer;
 if not found then return false;end if;
 perform pg_advisory_xact_lock(hashtextextended('dealwovo-outbound:'||d::text,0));
 if (select coalesce(sum(clicks),0) from dealwovo_private.outbound_daily where day=d)>=10000 then return false;end if;
 insert into dealwovo_private.outbound_daily(day,offer_id,product_id,placement,clicks) values(d,p_offer,pid,p_placement,1)
 on conflict(day,offer_id,placement) do update set clicks=dealwovo_private.outbound_daily.clicks+1 where dealwovo_private.outbound_daily.clicks<1000 and dealwovo_private.outbound_daily.product_id=excluded.product_id;
 return found;
end;$$;
revoke all on function public.record_outbound_navigation(uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.record_outbound_navigation(uuid,text) to service_role;
-- Owner-attested network reporting evidence; no guesswork from click timing.
create table public.commission_attribution_evidence(
 id bigint generated always as identity primary key,
 ledger_id uuid not null references public.marketing_commission_entries(id) on delete restrict,
 pack_id uuid references public.product_campaign_packs(id) on delete restrict,
 channel text not null check(channel in ('unknown','organic_search','pinterest','instagram','facebook','tiktok','youtube','newsletter','creator','paid','other')),
 state text not null check(state in ('matched','unmatched')),
 evidence_note text not null check(length(btrim(evidence_note)) between 25 and 1200),
 reviewed_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 check((state='unmatched' and pack_id is null and channel='unknown') or (state='matched' and pack_id is not null and channel<>'unknown'))
);
create index commission_attr_ledger on public.commission_attribution_evidence(ledger_id,id desc);
create index commission_attr_pack on public.commission_attribution_evidence(pack_id);
create index commission_attr_reviewer on public.commission_attribution_evidence(reviewed_by);
alter table public.commission_attribution_evidence enable row level security;
revoke all on public.commission_attribution_evidence from public,anon,authenticated;
grant select on public.commission_attribution_evidence to authenticated;
create policy "owner reads attribution evidence" on public.commission_attribution_evidence for select to authenticated using((select exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner')));
create function dealwovo_private.append_commission_attribution(p_ledger uuid,p_pack uuid,p_channel text,p_note text) returns bigint language plpgsql security definer set search_path='' as $$
declare l public.marketing_commission_entries%rowtype;p public.product_campaign_packs%rowtype;n bigint;
begin
 if auth.uid() is null or not exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner') then raise exception 'Owner required' using errcode='42501';end if;
 select * into l from public.marketing_commission_entries where id=p_ledger;
 if not found or exists(select 1 from public.marketing_commission_entries x where x.source_id=l.source_id and x.transaction_ref=l.transaction_ref and x.revision>l.revision) then raise exception 'Latest ledger revision required' using errcode='22023';end if;
 if p_pack is not null then
  select * into p from public.product_campaign_packs where id=p_pack;
  if not found or p.source_id<>l.source_id or p.status not in ('reviewed','archived') or (p.created_at at time zone 'UTC')::date>l.transaction_on or not exists(select 1 from public.product_campaign_reviews r where r.pack_id=p.id and r.status='reviewed' and (r.created_at at time zone 'UTC')::date<=l.transaction_on) then raise exception 'Matching reviewed source campaign required' using errcode='23514';end if;
 end if;
 insert into public.commission_attribution_evidence(ledger_id,pack_id,channel,state,evidence_note,reviewed_by) values(l.id,p_pack,p_channel,case when p_pack is null then 'unmatched' else 'matched' end,btrim(p_note),auth.uid()) returning id into n;return n;
end;$$;
create function public.append_commission_attribution(p_ledger uuid,p_pack uuid,p_channel text,p_note text) returns bigint language sql security invoker set search_path='' as $$select dealwovo_private.append_commission_attribution(p_ledger,p_pack,p_channel,p_note)$$;
create function dealwovo_private.attribution_report(p_days integer) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare d date:=(now() at time zone 'UTC')::date;res jsonb;
begin
 if auth.uid() is null or not exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner') then raise exception 'Owner required' using errcode='42501';end if;
 if p_days is null or p_days not in (7,30,90) then raise exception 'Invalid period' using errcode='22023';end if;
 with clicks as (select * from dealwovo_private.outbound_daily where day between d-p_days+1 and d),
 latest as (select distinct on(source_id,transaction_ref) * from public.marketing_commission_entries order by source_id,transaction_ref,revision desc),
 matched as (select l.*,a.pack_id,coalesce(a.channel,'unknown') as channel,a.state from latest l left join lateral(select e.* from public.commission_attribution_evidence e where e.ledger_id=l.id order by e.id desc limit 1)a on true where l.transaction_on between d-p_days+1 and d and l.currency='USD')
 select jsonb_build_object('enabled',(select enabled from dealwovo_private.attribution_activation where singleton),
 'clicks',(select coalesce(sum(clicks),0) from clicks),
 'placements',coalesce((select jsonb_agg(to_jsonb(q)) from (select placement,sum(clicks) as clicks from clicks group by placement order by sum(clicks) desc,placement)q),'[]'::jsonb),
 'products',coalesce((select jsonb_agg(to_jsonb(q)) from (select c.product_id,coalesce(p.title,'Historical product') as title,sum(c.clicks) as clicks from clicks c left join public.catalog_products p on p.id=c.product_id group by c.product_id,p.title order by sum(c.clicks) desc,c.product_id limit 50)q),'[]'::jsonb),
 'channels',coalesce((select jsonb_agg(to_jsonb(q)) from (select channel,count(*) filter(where status in ('approved','paid') and commission_cents>0) as positive_transactions,coalesce(sum(commission_cents) filter(where status in ('approved','paid')),0)::text as commission_cents from matched group by channel order by channel)q),'[]'::jsonb),
 'matchedProducts',coalesce((select jsonb_agg(to_jsonb(q)) from (select p.product_id,max(p.product_title) as title,count(*) filter(where m.status in ('approved','paid') and m.commission_cents>0) as positive_transactions,coalesce(sum(m.commission_cents) filter(where m.status in ('approved','paid')),0)::text as commission_cents from matched m join public.product_campaign_packs p on p.id=m.pack_id where m.state='matched' group by p.product_id order by sum(m.commission_cents) desc,p.product_id limit 50)q),'[]'::jsonb),
 'ledger',coalesce((select jsonb_agg(to_jsonb(q)) from (select l.id,l.source_id,l.transaction_ref,l.transaction_on,l.status,l.revision from latest l order by l.transaction_on desc,l.id limit 100)q),'[]'::jsonb),
 'packs',coalesce((select jsonb_agg(to_jsonb(q)) from (select p.id,p.source_id,p.product_title,p.week_of from public.product_campaign_packs p where exists(select 1 from public.product_campaign_reviews r where r.pack_id=p.id and r.status='reviewed') order by p.created_at desc,p.id limit 100)q),'[]'::jsonb)
 ) into res;return res;
end;$$;
create function public.attribution_report(p_days integer) returns jsonb language sql stable security invoker set search_path='' as $$select dealwovo_private.attribution_report(p_days)$$;
revoke all on function dealwovo_private.append_commission_attribution(uuid,uuid,text,text),public.append_commission_attribution(uuid,uuid,text,text),dealwovo_private.attribution_report(integer),public.attribution_report(integer) from public,anon,authenticated;
grant execute on function dealwovo_private.append_commission_attribution(uuid,uuid,text,text),public.append_commission_attribution(uuid,uuid,text,text),dealwovo_private.attribution_report(integer),public.attribution_report(integer) to authenticated;
create function dealwovo_private.purge_outbound_daily() returns bigint language plpgsql security definer set search_path='' as $$
declare n bigint;begin delete from dealwovo_private.outbound_daily where day<(now() at time zone 'UTC')::date-89;get diagnostics n=row_count;return n;end;$$;
revoke all on function dealwovo_private.purge_outbound_daily() from public,anon,authenticated,service_role;
select cron.schedule('dealwovo-outbound-retention','10 3 * * *','select dealwovo_private.purge_outbound_daily();');
notify pgrst,'reload schema';
