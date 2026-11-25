-- Owner-attested normalized Awin statement reconciliation, not bank settlement.
create table public.awin_reconciliation_runs(
 id uuid primary key default gen_random_uuid(),
 source_id uuid not null references public.catalog_feed_sources(id) on delete restrict,
 statement_ref text not null check(statement_ref ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$'),
 statement_on date not null,
 recorded_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(),
 row_count integer not null check(row_count between 1 and 100),
 new_count integer not null check(new_count>=0),
 revision_count integer not null check(revision_count>=0),
 unchanged_count integer not null check(unchanged_count>=0),
 check(row_count=new_count+revision_count+unchanged_count)
);
create index awin_recon_source on public.awin_reconciliation_runs(source_id,created_at desc);
create index awin_recon_actor on public.awin_reconciliation_runs(recorded_by);
alter table public.awin_reconciliation_runs enable row level security;
revoke all on public.awin_reconciliation_runs from public,anon,authenticated;
grant select on public.awin_reconciliation_runs to authenticated;
create policy "owner reads reconciliation runs" on public.awin_reconciliation_runs for select to authenticated using((select exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner')));
create function dealwovo_private.reconcile_awin_statement(p_source uuid,p_ref text,p_on date,p_rows jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.catalog_feed_sources%rowtype;r record;prev public.marketing_commission_entries%rowtype;same public.marketing_commission_entries%rowtype;n integer;added integer:=0;revised integer:=0;skipped integer:=0;rid uuid;
begin
 if auth.uid() is null or not exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner') then raise exception 'Owner required' using errcode='42501';end if;
 if p_ref is null or p_ref !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$' or p_on is null or p_on>(now() at time zone 'UTC')::date or p_rows is null or jsonb_typeof(p_rows)<>'array' then raise exception 'Invalid statement' using errcode='22023';end if;
 n:=jsonb_array_length(p_rows);
 if n not between 1 and 100 or octet_length(p_rows::text)>50000 or (select count(distinct x->>'transaction_ref') from jsonb_array_elements(p_rows) x)<>n then raise exception 'Invalid or duplicate rows' using errcode='22023';end if;
 select * into s from public.catalog_feed_sources where id=p_source for share;
 if not found or s.provider<>'awin' or s.status<>'authorized' or s.awin_merchant_id is null then raise exception 'Authorized Awin program required' using errcode='23514';end if;
 for r in select * from jsonb_to_recordset(p_rows) as x(transaction_ref text,transaction_on date,status text,commission_cents bigint,currency text,advertiser_id text) order by transaction_ref loop
  if r.transaction_ref is null or r.transaction_ref !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$' or r.transaction_on is null or r.transaction_on>p_on or r.status is null or r.status not in ('pending','approved','paid','reversed') or r.commission_cents is null or r.commission_cents not between 0 and 100000000 or (r.status='reversed' and r.commission_cents<>0) or r.currency is distinct from 'USD' or r.advertiser_id is distinct from s.awin_advertiser_id then raise exception 'Invalid scoped commission row' using errcode='23514';end if;
  perform pg_advisory_xact_lock(hashtextextended(s.id::text||':'||r.transaction_ref,0));
  select * into same from public.marketing_commission_entries where source_id=s.id and transaction_ref=r.transaction_ref and statement_ref=p_ref;
  if found then
   if same.transaction_on is distinct from r.transaction_on or same.statement_on is distinct from p_on or same.status is distinct from r.status or same.commission_cents is distinct from r.commission_cents then raise exception 'Statement reference conflict' using errcode='23514';end if;
   skipped:=skipped+1;continue;
  end if;
  select * into prev from public.marketing_commission_entries where source_id=s.id and transaction_ref=r.transaction_ref order by revision desc limit 1;
  if found then
   if prev.transaction_on is distinct from r.transaction_on or p_on<prev.statement_on then raise exception 'Inconsistent or older statement' using errcode='23514';end if;
   if prev.status=r.status and prev.commission_cents=r.commission_cents then skipped:=skipped+1;continue;end if;
   -- The latest stored statement date is not necessarily the latest observation; no silent same-day revision.
   if p_on=prev.statement_on then raise exception 'Conflicting same-day statement; review individually' using errcode='23514';end if;
   revised:=revised+1;
  else added:=added+1;
  end if;
  insert into public.marketing_commission_entries(source_id,transaction_ref,statement_ref,transaction_on,statement_on,status,commission_cents) values(s.id,r.transaction_ref,p_ref,r.transaction_on,p_on,r.status,r.commission_cents);
 end loop;
 insert into public.awin_reconciliation_runs(source_id,statement_ref,statement_on,row_count,new_count,revision_count,unchanged_count) values(s.id,p_ref,p_on,n,added,revised,skipped) returning id into rid;
 return jsonb_build_object('run',rid,'new',added,'revised',revised,'unchanged',skipped);
end;$$;
create function public.reconcile_awin_statement(p_source uuid,p_ref text,p_on date,p_rows jsonb) returns jsonb language sql security invoker set search_path='' as $$select dealwovo_private.reconcile_awin_statement(p_source,p_ref,p_on,p_rows)$$;
revoke all on function dealwovo_private.reconcile_awin_statement(uuid,text,date,jsonb),public.reconcile_awin_statement(uuid,text,date,jsonb) from public,anon,authenticated;
grant execute on function dealwovo_private.reconcile_awin_statement(uuid,text,date,jsonb),public.reconcile_awin_statement(uuid,text,date,jsonb) to authenticated;
notify pgrst,'reload schema';
