-- V2.0: private owner-attested affiliate statement ledger, not verified bank receipts.
-- No visitor tracking, network credentials, automatic imports, or external requests.
create table public.marketing_commission_entries (
 id uuid primary key default gen_random_uuid(),
 source_id uuid not null references public.catalog_feed_sources(id) on delete restrict,
 transaction_ref text not null check(transaction_ref ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$'),
 statement_ref text not null check(statement_ref ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$'),
 transaction_on date not null,
 statement_on date not null,
 revision integer not null check(revision>=1),
 status text not null check(status in ('pending','approved','paid','reversed')),
 commission_cents bigint not null check(commission_cents between 0 and 100000000),
 currency text not null default 'USD' check(currency='USD'),
 recorded_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(),
 check(statement_on>=transaction_on),
 check(status<>'reversed' or commission_cents=0),
 unique(source_id,transaction_ref,revision),
 unique(source_id,transaction_ref,statement_ref)
);
create index marketing_commissions_recorded_by on public.marketing_commission_entries(recorded_by);
create index marketing_commissions_date on public.marketing_commission_entries(transaction_on desc);
alter table public.marketing_commission_entries enable row level security;
revoke all on public.marketing_commission_entries from public,anon,authenticated;
grant select on public.marketing_commission_entries to authenticated;
grant insert(source_id,transaction_ref,statement_ref,transaction_on,statement_on,status,commission_cents) on public.marketing_commission_entries to authenticated;
create policy "commission owner reads evidence" on public.marketing_commission_entries for select to authenticated using((select exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner')));
create policy "commission owner records evidence" on public.marketing_commission_entries for insert to authenticated with check(recorded_by=auth.uid() and (select exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner')));
create function dealwovo_private.guard_commission_entry() returns trigger language plpgsql security invoker set search_path='' as $$
declare s text; prev record; today date:=(now() at time zone 'UTC')::date;
begin
 if auth.uid() is null or not exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner') then raise exception 'Owner required' using errcode='42501';end if;
 if new.statement_on>today or new.transaction_on>today then raise exception 'Future evidence not allowed' using errcode='23514';end if;
 perform pg_advisory_xact_lock(hashtextextended(new.source_id::text||':'||new.transaction_ref,0));
 select status into s from public.catalog_feed_sources where id=new.source_id for share;
 select revision,transaction_on,statement_on into prev from public.marketing_commission_entries where source_id=new.source_id and transaction_ref=new.transaction_ref order by revision desc limit 1;
 if prev.revision is null then
  if s is distinct from 'authorized' then raise exception 'Authorized source required for new transaction' using errcode='23514';end if;
  new.revision:=1;
 else
  if new.transaction_on is distinct from prev.transaction_on or new.statement_on<prev.statement_on then raise exception 'Inconsistent or older statement' using errcode='23514';end if;
  new.revision:=prev.revision+1;
 end if;
 return new;
end;$$;
revoke all on function dealwovo_private.guard_commission_entry() from public,anon,authenticated;
create trigger commission_guard before insert on public.marketing_commission_entries for each row execute function dealwovo_private.guard_commission_entry();
create function public.marketing_revenue_report(p_days integer default 90,p_page integer default 1) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb; today date:=(now() at time zone 'UTC')::date;
begin
 if auth.uid() is null or not exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner') then raise exception 'Owner required' using errcode='42501';end if;
 if p_days is null or p_days not in (0,30,90,365) or p_page is null or p_page<1 or p_page>1000000 then raise exception 'Invalid report period or page' using errcode='22023';end if;
 with latest as materialized (
 select distinct on (source_id,transaction_ref) e.* from public.marketing_commission_entries e order by source_id,transaction_ref,revision desc
 ), filtered as materialized (
 select l.*,s.name as source_name,s.provider from latest l join public.catalog_feed_sources s on s.id=l.source_id where p_days=0 or transaction_on>=today-(p_days-1)
 ), bounds as (select count(*) as matching,least(p_page::bigint,greatest(1,(count(*)+24)/25)) as page from filtered),
 page_rows as (select * from filtered order by transaction_on desc,source_id,transaction_ref limit 25 offset ((select page from bounds)-1)*25),
 by_source as (select source_id,source_name,provider,count(*) as transactions,coalesce(sum(commission_cents) filter(where status='approved'),0)::text as approved_cents,coalesce(sum(commission_cents) filter(where status='paid'),0)::text as paid_cents from filtered group by source_id,source_name,provider)
 select jsonb_build_object('today',today,'days',p_days,'page',(select page from bounds),'pageSize',25,'matching',(select matching from bounds),
 'authorizedSources',(select count(*) from public.catalog_feed_sources where status='authorized'),
 'revisionCount',(select count(*) from public.marketing_commission_entries),
 'totals',jsonb_build_object('transactions',count(*),'pending',count(*) filter(where status='pending'),'approved',count(*) filter(where status='approved'),'paid',count(*) filter(where status='paid'),'reversed',count(*) filter(where status='reversed'),
 'pendingCents',coalesce(sum(commission_cents) filter(where status='pending'),0)::text,'approvedCents',coalesce(sum(commission_cents) filter(where status='approved'),0)::text,'paidCents',coalesce(sum(commission_cents) filter(where status='paid'),0)::text),
 'sources',coalesce((select jsonb_agg(to_jsonb(s) order by source_name,source_id) from (select * from by_source order by source_name,source_id limit 100) s),'[]'::jsonb),
 'sourceCount',(select count(*) from by_source),
 'items',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'source_id',r.source_id,'source_name',r.source_name,'provider',r.provider,'transaction_ref',r.transaction_ref,'statement_ref',r.statement_ref,'transaction_on',r.transaction_on,'statement_on',r.statement_on,'status',r.status,'revision',r.revision,'commission_cents',r.commission_cents::text,'history',coalesce((select jsonb_agg(to_jsonb(h) order by revision desc) from (select revision,statement_ref,statement_on,status,commission_cents::text,created_at from public.marketing_commission_entries e where e.source_id=r.source_id and e.transaction_ref=r.transaction_ref order by revision desc limit 10) h),'[]'::jsonb)) order by r.transaction_on desc,r.source_id,r.transaction_ref) from page_rows r),'[]'::jsonb))
 into result from filtered;
 return result;
end;$$;
revoke all on function public.marketing_revenue_report(integer,integer) from public,anon,authenticated;
grant execute on function public.marketing_revenue_report(integer,integer) to authenticated;
notify pgrst,'reload schema';
