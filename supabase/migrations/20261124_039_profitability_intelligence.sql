-- Profitability evidence: immutable replacement amounts and exclusive cost allocation.
create table public.commerce_expense_reviews(
 id bigint generated always as identity primary key,
 expense_id bigint not null references public.commerce_expenses(id) on delete restrict,
 amount_cents bigint not null check(amount_cents between 0 and 100000000),
 pack_id uuid references public.product_campaign_packs(id) on delete restrict,
 channel text not null check(channel in ('unknown','organic_search','pinterest','instagram','facebook','tiktok','youtube','newsletter','creator','paid','other')),
 note text not null check(length(btrim(note)) between 25 and 1200),
 reviewer uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 check(pack_id is null or channel<>'unknown'),
 check(amount_cents>0 or (pack_id is null and channel='unknown'))
);
create index commerce_expense_review_latest on public.commerce_expense_reviews(expense_id,id desc);
create index commerce_expense_review_pack on public.commerce_expense_reviews(pack_id);
create index commerce_expense_review_reviewer on public.commerce_expense_reviews(reviewer);
alter table public.commerce_expense_reviews enable row level security;
revoke all on public.commerce_expense_reviews from public,anon,authenticated;
grant select on public.commerce_expense_reviews to authenticated;
create policy "owner reads expense revisions" on public.commerce_expense_reviews for select to authenticated using((select exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner')));
create function dealwovo_private.revise_commerce_expense(p_expense bigint,p_expected bigint,p_cents bigint,p_pack uuid,p_channel text,p_note text) returns bigint language plpgsql security definer set search_path='' as $$
declare e public.commerce_expenses%rowtype;v bigint;n bigint;
begin
 if auth.uid() is null or not exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner') then raise exception 'Owner required' using errcode='42501';end if;
 select * into e from public.commerce_expenses where id=p_expense for update;
 if not found then raise exception 'Expense not found' using errcode='22023';end if;
 select coalesce(max(id),0) into v from public.commerce_expense_reviews where expense_id=e.id;
 if p_expected is distinct from v then raise exception 'Expense changed; reload' using errcode='40001';end if;
 if p_pack is not null and not exists(select 1 from public.product_campaign_packs p where p.id=p_pack and exists(select 1 from public.product_campaign_reviews r where r.pack_id=p.id and r.status='reviewed')) then raise exception 'Reviewed campaign required' using errcode='23514';end if;
 insert into public.commerce_expense_reviews(expense_id,amount_cents,pack_id,channel,note,reviewer) values(e.id,p_cents,p_pack,p_channel,btrim(p_note),auth.uid()) returning id into n;return n;
end;$$;
create function public.revise_commerce_expense(p_expense bigint,p_expected bigint,p_cents bigint,p_pack uuid,p_channel text,p_note text) returns bigint language sql security invoker set search_path='' as $$select dealwovo_private.revise_commerce_expense(p_expense,p_expected,p_cents,p_pack,p_channel,p_note)$$;
create function dealwovo_private.profitability_report(p_days integer) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare d date:=(now() at time zone 'UTC')::date;result jsonb;
begin
 if auth.uid() is null or not exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner') then raise exception 'Owner required' using errcode='42501';end if;
 if p_days is null or p_days not in (30,90,365,0) then raise exception 'Invalid period' using errcode='22023';end if;
 with latest as materialized (select distinct on(source_id,transaction_ref) * from public.marketing_commission_entries order by source_id,transaction_ref,revision desc),
 income as materialized (select l.*,a.pack_id,coalesce(a.channel,'unknown') as channel from latest l left join lateral(select e.pack_id,e.channel from public.commission_attribution_evidence e where e.ledger_id=l.id order by e.id desc limit 1)a on true where l.currency='USD' and l.transaction_on<=d and (p_days=0 or l.transaction_on>=d-p_days+1)),
 costs_all as materialized (select e.id,e.expense_on,e.category,e.reference,e.amount_cents as original_cents,coalesce(r.amount_cents,e.amount_cents) as cents,coalesce(r.id,0) as review_id,r.pack_id,coalesce(r.channel,'unknown') as channel,r.note from public.commerce_expenses e left join lateral(select * from public.commerce_expense_reviews x where x.expense_id=e.id order by x.id desc limit 1)r on true),
 costs as materialized (select * from costs_all where expense_on<=d and (p_days=0 or expense_on>=d-p_days+1)),
 combined as (select i.source_id,i.pack_id,p.product_id,p.product_title,p.merchant,i.channel,i.commission_cents as income,0::bigint as cost from income i left join public.product_campaign_packs p on p.id=i.pack_id where i.status in ('approved','paid')
 union all select p.source_id,c.pack_id,p.product_id,p.product_title,p.merchant,c.channel,0::bigint,c.cents from costs c left join public.product_campaign_packs p on p.id=c.pack_id where c.cents>0),
 grouped as (select 'channel' as kind,channel as key,channel as label,sum(income) as earnings,sum(cost) as expenses from combined group by channel
 union all select 'product',coalesce(product_id::text,'unknown'),coalesce(max(product_title),'Unallocated'),sum(income),sum(cost) from combined group by product_id
 union all select 'campaign',coalesce(pack_id::text,'unknown'),coalesce(max(product_title),'Unallocated'),sum(income),sum(cost) from combined group by pack_id
 union all select 'source',coalesce(b.source_id::text,'unknown'),coalesce(max(s.name),'Unallocated'),sum(b.income),sum(b.cost) from combined b left join public.catalog_feed_sources s on s.id=b.source_id group by b.source_id
 union all select 'retailer',coalesce(merchant,'unknown'),coalesce(merchant,'Unallocated'),sum(income),sum(cost) from combined group by merchant),
 totals as (select count(*) as tx,count(*) filter(where status='reversed') as reversed,coalesce(sum(commission_cents) filter(where status='pending'),0) as pending,coalesce(sum(commission_cents) filter(where status='approved'),0) as approved,coalesce(sum(commission_cents) filter(where status='paid'),0) as paid from income),
 expense_total as (select count(*) as receipts,coalesce(sum(cents),0) as expenses,coalesce(sum(cents) filter(where pack_id is null),0) as not_product_allocated from costs)
 select jsonb_build_object('today',d,'days',p_days,'transactions',t.tx,'reversed',t.reversed,'pendingCents',t.pending::text,'approvedCents',t.approved::text,'paidCents',t.paid::text,'expenseCount',e.receipts,'expenseCents',e.expenses::text,'unallocatedProductCosts',e.not_product_allocated::text,'recordedContribution',(t.approved+t.paid-e.expenses)::text,
 'groups',coalesce((select jsonb_agg(to_jsonb(q)) from (select kind,key,label,earnings::text,expenses::text,(earnings-expenses)::text as contribution from (select *,row_number() over(partition by kind order by (key='unknown') desc,earnings desc,key) as rn from grouped)g where rn<=51 order by kind,rn)q),'[]'::jsonb),
 'expenses',coalesce((select jsonb_agg(to_jsonb(q)) from (select id::text,expense_on,category,reference,original_cents::text,cents::text,review_id::text,pack_id,channel,note from costs_all order by expense_on desc,id desc limit 100)q),'[]'::jsonb),
 'packs',coalesce((select jsonb_agg(to_jsonb(q)) from (select p.id,p.product_title,p.week_of,p.merchant from public.product_campaign_packs p where exists(select 1 from public.product_campaign_reviews r where r.pack_id=p.id and r.status='reviewed') order by p.created_at desc,p.id limit 100)q),'[]'::jsonb))
 into result from totals t cross join expense_total e;return result;
end;$$;
create function public.profitability_report(p_days integer) returns jsonb language sql stable security invoker set search_path='' as $$select dealwovo_private.profitability_report(p_days)$$;
revoke all on function dealwovo_private.revise_commerce_expense(bigint,bigint,bigint,uuid,text,text),public.revise_commerce_expense(bigint,bigint,bigint,uuid,text,text),dealwovo_private.profitability_report(integer),public.profitability_report(integer) from public,anon,authenticated;
grant execute on function dealwovo_private.revise_commerce_expense(bigint,bigint,bigint,uuid,text,text),public.revise_commerce_expense(bigint,bigint,bigint,uuid,text,text),dealwovo_private.profitability_report(integer),public.profitability_report(integer) to authenticated;
notify pgrst,'reload schema';
