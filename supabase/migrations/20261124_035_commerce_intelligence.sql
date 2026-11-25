-- Private evidence and commerce operations. No commercial authorization is implied.
create table public.commerce_opportunities(
 id uuid primary key default gen_random_uuid(),
 key text not null unique check(key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 title text not null check(length(title) between 3 and 180),
 department text not null check(department in ('electronics','home','kitchen','beauty','fashion','toys','wellness','sports','pets','office','travel','essentials')),
 research_note text not null check(length(research_note) between 10 and 1200),
 created_at timestamptz not null default now()
);
create table public.commerce_opportunity_evidence(
 id bigint generated always as identity primary key,
 opportunity_id uuid not null references public.commerce_opportunities(id) on delete restrict,
 dimension text not null check(dimension in ('demand','commission','price','seasonality','reliability','conversion','availability')),
 source_url text not null check(length(source_url) between 12 and 2000 and dealwovo_private.safe_feed_url(source_url)),
 observed_on date not null check(observed_on<=current_date),
 geography text not null check(length(btrim(geography)) between 2 and 100),
 note text not null check(length(btrim(note)) between 20 and 1200),
 rating smallint check(rating between 0 and 100),
 recorded_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now()
);
create index commerce_evidence_opportunity on public.commerce_opportunity_evidence(opportunity_id,dimension,observed_on desc,id desc);
create index commerce_evidence_recorder on public.commerce_opportunity_evidence(recorded_by);
alter table public.commerce_opportunities enable row level security;
alter table public.commerce_opportunity_evidence enable row level security;
revoke all on public.commerce_opportunities,public.commerce_opportunity_evidence from public,anon,authenticated;
grant select on public.commerce_opportunities,public.commerce_opportunity_evidence to authenticated;
grant insert(opportunity_id,dimension,source_url,observed_on,geography,note,rating) on public.commerce_opportunity_evidence to authenticated;
grant usage on sequence public.commerce_opportunity_evidence_id_seq to authenticated;
create policy "owner reads opportunities" on public.commerce_opportunities for select to authenticated using((select exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner')));
create policy "owner reads opportunity evidence" on public.commerce_opportunity_evidence for select to authenticated using((select exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner')));
create policy "owner appends evidence" on public.commerce_opportunity_evidence for insert to authenticated with check(recorded_by=auth.uid() and (select exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner')));
insert into public.commerce_opportunities(key,title,department,research_note) values
('gift-accessories','Practical winter accessories','fashion','Warm accessories as budget gift candidates; verify actual demand, size and returns.'),
('crossbody','Everyday crossbody bags','fashion','Research gifting intent and dimensions; avoid brand imitation.'),
('skincare','Personal-care gift sets','beauty','Research sealed non-medical gift sets, ingredients and actual retailer rights.'),
('hair-tools','Hair styling accessories','beauty','Research non-medical accessories; verify compatibility and safety.'),
('book-lights','Reading lights','electronics','Research reading-related gift intent; confirm electrical safety and availability.'),
('headphones','Wireless headphones','electronics','Research model-specific search intent, battery and compatibility; no demand score yet.'),
('charging','Charging accessories','electronics','Research compatible devices and certifications; no unsupported wattage claims.'),
('coffee','Coffee preparation accessories','kitchen','Research use case and compatibility; verify size/material.'),
('kitchen-storage','Kitchen organization tools','kitchen','Research dimensions and actual practical use.'),
('blankets','Cozy throws','home','Research gift budgets, material and care requirements.'),
('packing','Packing organizers','travel','Research travel use, dimensions and materials.'),
('desk','Desk organization accessories','office','Research work-from-home gift intent and dimensions.'),
('puzzles','Family puzzles and board games','toys','Research age guidance and safety documentation, not inferred suitability.'),
('pet','Pet travel accessories','pets','Research dimensions and safety; avoid medical or restraint claims.'),
('household','Reusable home organizers','essentials','Research durable everyday use and actual economics.') on conflict(key) do nothing;
-- Expense records are owner-attested and immutable; do not assume they are comprehensive.
create table public.commerce_expenses(
 id bigint generated always as identity primary key,
 expense_on date not null check(expense_on<=current_date),
 category text not null check(category in ('hosting','research','creative','marketing','email','other')),
 amount_cents bigint not null check(amount_cents between 1 and 100000000),
 reference text not null unique check(reference ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$'),
 note text not null check(length(btrim(note)) between 12 and 500),
 recorded_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now()
);
create index commerce_expenses_recorder on public.commerce_expenses(recorded_by);
alter table public.commerce_expenses enable row level security;
revoke all on public.commerce_expenses from public,anon,authenticated;
grant select on public.commerce_expenses to authenticated;
grant insert(expense_on,category,amount_cents,reference,note) on public.commerce_expenses to authenticated;
grant usage on sequence public.commerce_expenses_id_seq to authenticated;
create policy "owner reads expenses" on public.commerce_expenses for select to authenticated using((select exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner')));
create policy "owner appends expenses" on public.commerce_expenses for insert to authenticated with check(recorded_by=auth.uid() and (select exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner')));
-- Daily internal supervisor: factual snapshot, no LLM calls or external actions.
create table public.commerce_daily_briefs(
 brief_day date primary key,
 created_at timestamptz not null default now(),
 metrics jsonb not null
);
alter table public.commerce_daily_briefs enable row level security;
revoke all on public.commerce_daily_briefs from public,anon,authenticated;
grant select on public.commerce_daily_briefs to authenticated;
create policy "owner reads briefs" on public.commerce_daily_briefs for select to authenticated using((select exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner')));
create function dealwovo_private.prepare_commerce_brief() returns boolean language plpgsql security definer set search_path='' as $$
begin
 insert into public.commerce_daily_briefs(brief_day,metrics)
 select (now() at time zone 'UTC')::date,jsonb_build_object(
 'authorizedSources',(select count(*) from public.catalog_feed_sources where status='authorized'),
 'eligibleProducts',(select count(distinct p.id) from public.catalog_offers o join public.catalog_products p on p.id=o.product_id join public.catalog_categories c on c.id=p.category_id join public.catalog_merchants m on m.id=o.merchant_id where o.status='approved' and o.verified_at<=now() and o.expires_at>now() and o.expires_at<=o.verified_at+interval '30 days' and p.status='published' and c.status='published' and m.status='approved' and dealwovo_private.linked_offer_source_active(o.id)),
 'researchCandidates',(select count(*) from public.commerce_opportunities),
 'evidenceRecords',(select count(*) from public.commerce_opportunity_evidence),
 'reviewedCampaigns',(select count(*) from public.marketing_campaign_drafts where status='reviewed'),
 'recordedExpenseCents',(select coalesce(sum(amount_cents),0)::text from public.commerce_expenses),
 'approvedCommissionCents',(select coalesce(sum(commission_cents),0)::text from (select distinct on(source_id,transaction_ref) status,commission_cents,currency from public.marketing_commission_entries order by source_id,transaction_ref,revision desc) l where status in ('approved','paid') and currency='USD')
 ) on conflict(brief_day) do nothing;
 return found;
end;$$;
revoke all on function dealwovo_private.prepare_commerce_brief() from public,anon,authenticated,service_role;
select cron.schedule('dealwovo-daily-commercial-brief','30 13 * * *','select dealwovo_private.prepare_commerce_brief();');
notify pgrst,'reload schema';
